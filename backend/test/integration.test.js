import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'

import { createApp } from '../src/app.js'
import { createAuthService } from '../src/authService.js'
import { createInMemoryNotificationRepository } from '../src/notificationRepository.js'


// Person 4 - cross-feature integration tests.
//
// Part 1 drives two separate app instances that share the same notification
// repository and login service. Everything the user does through the first app
// (register -> join -> be served) must be readable through the second app, which
// is what happens when the API restarts and reads the Notification table again.
//
// Part 2 talks to a real MySQL database and only runs when the DB_* settings are
// present, for example:  node --env-file=.env --test test/integration.test.js

const authService = createAuthService()
const notificationRepository = createInMemoryNotificationRepository()

const firstApp = createApp({ authService, notificationRepository })
const secondApp = createApp({ authService, notificationRepository })

const servers = []
let firstUrl
let secondUrl
let adminToken
let userToken


async function listen(app) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  servers.push(server)
  return `http://127.0.0.1:${server.address().port}`
}


async function request(baseUrl, path, { token, body, ...options } = {}) {
  const headers = new Headers()
  if (body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}


before(async () => {
  await authService.seedAdministrator({ email: 'admin@example.com', password: 'test-admin-password' })
  firstUrl = await listen(firstApp)
  secondUrl = await listen(secondApp)

  const admin = await request(firstUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@example.com', password: 'test-admin-password' },
  })
  adminToken = (await admin.json()).token

  const user = await request(firstUrl, '/api/auth/register', {
    method: 'POST',
    body: { name: 'Integration User', email: 'integration@example.com', password: 'User1234!' },
  })
  userToken = (await user.json()).token
})


after(async () => {
  for (const server of servers) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})


// auth -> service -> queue -> notification/history all work together
test('joining and being served flows through every feature', async () => {
  const join = await request(firstUrl, '/api/queues/1/join', { method: 'POST', token: userToken })
  assert.equal(join.status, 201)

  const serve = await request(firstUrl, '/api/queues/1/next', { method: 'POST', token: adminToken })
  assert.equal(serve.status, 200)

  const history = await (await request(firstUrl, '/api/history', { token: userToken })).json()
  assert.deepEqual(history.history.map((entry) => entry.outcome), ['Served', 'Joined'])
  assert.equal(history.history[0].serviceName, 'Academic Advising')
})


// rows written through one app are read back through another (persistence)
test('notifications and history persist across app instances', async () => {
  const notifications = await (await request(secondUrl, '/api/notifications', { token: userToken })).json()
  const history = await (await request(secondUrl, '/api/history', { token: userToken })).json()

  assert.ok(notifications.notifications.some((n) => n.message.includes('joined')))
  assert.ok(notifications.notifications.some((n) => n.message.includes('being served')))
  assert.equal(history.history.length, 2)
})


// a change made through one app is visible through the other
test('marking read in one app is visible from the other', async () => {
  const before = await (await request(firstUrl, '/api/notifications', { token: userToken })).json()
  const target = before.notifications.find((n) => !n.read)

  const marked = await request(firstUrl, `/api/notifications/${target.id}/read`, { method: 'PATCH', token: userToken })
  assert.equal(marked.status, 200)

  const after = await (await request(secondUrl, '/api/notifications', { token: userToken })).json()
  assert.equal(after.notifications.find((n) => n.id === target.id).read, true)
  assert.equal(after.unreadCount, before.unreadCount - 1)
})


// users only ever see their own rows
test('one user cannot read another user\'s notifications or history', async () => {
  const other = await request(firstUrl, '/api/auth/register', {
    method: 'POST',
    body: { name: 'Other User', email: 'other@example.com', password: 'User1234!' },
  })
  const otherToken = (await other.json()).token

  const notifications = await (await request(secondUrl, '/api/notifications', { token: otherToken })).json()
  const history = await (await request(secondUrl, '/api/history', { token: otherToken })).json()

  assert.equal(notifications.notifications.length, 0)
  assert.equal(history.history.length, 0)
})


// ---------------------------------------------------------------------------
// Live MySQL persistence test (skipped unless the database settings are set)
// ---------------------------------------------------------------------------

const databaseConfigured = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
  .every((name) => Boolean(process.env[name]))

test('MySQL: a notification row is saved, read back, updated, and cleared', {
  skip: databaseConfigured ? false : 'Set the DB_* settings and start MySQL to run this test',
}, async () => {
  const { createDatabasePool } = await import('../src/database.js')
  const { createMySqlUserRepository } = await import('../src/mysqlUserRepository.js')
  const { createMySqlNotificationRepository } = await import('../src/mysqlNotificationRepository.js')

  const pool = createDatabasePool()
  const users = createAuthService({ userRepository: createMySqlUserRepository(pool) })
  const repository = createMySqlNotificationRepository(pool)

  const session = await users.register({
    name: 'Integration User',
    email: `integration-${Date.now()}@example.com`,
    password: 'User1234!',
  })
  const userId = session.user.id

  try {
    const saved = await repository.insert({
      userId, kind: 'notification', message: 'Integration test', status: 'sent', serviceId: 1,
    })
    assert.ok(saved.id)
    assert.equal(saved.serviceName, 'Academic Advising')

    const listed = await repository.listByUser(userId, 'notification')
    assert.equal(listed[0].id, saved.id)
    assert.equal(await repository.countUnread(userId), 1)

    const read = await repository.markRead(userId, saved.id)
    assert.equal(read.status, 'viewed')
    assert.equal(await repository.countUnread(userId), 0)

    assert.equal(await repository.clearNotifications(userId), 1)
    assert.equal((await repository.listByUser(userId, 'notification')).length, 0)
  } finally {
    // removing the user cascades to any remaining Notification rows
    await pool.execute('DELETE FROM UserCredentials WHERE id = ?', [userId])
    await pool.end()
  }
})
