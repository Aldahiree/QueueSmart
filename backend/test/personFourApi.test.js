import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'

import { createApp } from '../src/app.js'
import { createAuthService } from '../src/authService.js'


// End-to-end test for Person 4: drives the real app so the queue -> notification/history
// integration and the admin dashboard are all exercised together (task 8).

const authService = createAuthService()
const app = createApp({ authService })
let server
let baseUrl
let adminToken
let userToken


before(async () => {
  await authService.seedAdministrator({
    email: 'admin@example.com',
    password: 'test-admin-password',
  })

  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const admin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@example.com', password: 'test-admin-password' },
  })
  adminToken = (await admin.json()).token

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email: 'user@example.com', password: 'User1234!' },
  })
  userToken = (await user.json()).token
})


after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})


async function request(path, { token, body, ...options } = {}) {
  const headers = new Headers()
  if (body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}


// endpoints require a login
test('notifications, history and dashboard require authentication', async () => {
  assert.equal((await request('/api/notifications')).status, 401)
  assert.equal((await request('/api/history')).status, 401)
  assert.equal((await request('/api/dashboard')).status, 401)
})


// joining a queue produces a notification and a history entry for the user
test('joining a queue produces a notification and history entry', async () => {
  const join = await request('/api/queues/1/join', { method: 'POST', token: userToken })
  assert.equal(join.status, 201)

  const notifications = await (await request('/api/notifications', { token: userToken })).json()
  assert.ok(notifications.notifications.some((n) => n.message.includes('joined')))
  assert.ok(notifications.unreadCount >= 1)

  const history = await (await request('/api/history', { token: userToken })).json()
  assert.equal(history.history[0].outcome, 'Joined')
})


// marking a notification as read lowers the unread count
test('a user can mark a notification as read', async () => {
  const before = await (await request('/api/notifications', { token: userToken })).json()
  const target = before.notifications.find((n) => !n.read)

  const marked = await request(`/api/notifications/${target.id}/read`, {
    method: 'PATCH',
    token: userToken,
  })
  assert.equal(marked.status, 200)
  assert.equal((await marked.json()).notification.read, true)
})


// the admin dashboard shows the live queue length
test('the admin dashboard reports the live queue length', async () => {
  const response = await request('/api/dashboard', { token: adminToken })
  const data = await response.json()

  assert.equal(response.status, 200)
  const serviceOne = data.services.find((service) => service.id === 1)
  assert.equal(serviceOne.queueLength, 1) // the user joined service 1 above
})


// regular users cannot see the admin dashboard
test('regular users cannot see the dashboard', async () => {
  const response = await request('/api/dashboard', { token: userToken })
  assert.equal(response.status, 403)
})


// serving the user records a "Served" history entry for them
test('serving the next user records a served outcome', async () => {
  const serve = await request('/api/queues/1/next', { method: 'POST', token: adminToken })
  assert.equal(serve.status, 200)

  const history = await (await request('/api/history', { token: userToken })).json()
  assert.equal(history.history[0].outcome, 'Served')
})
