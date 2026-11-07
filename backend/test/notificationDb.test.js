import test from 'node:test'
import assert from 'node:assert/strict'

import { createMySqlNotificationRepository } from '../src/mysqlNotificationRepository.js'


// a fake MySQL pool that records the SQL and returns canned rows (same idea as
// the Person 2 repository tests), so these run without a database
function fakePool(responses = []) {
  const calls = []
  return {
    calls,
    async execute(sql, values) {
      calls.push({ sql, values })
      const next = responses.shift()
      if (next instanceof Error) throw next
      return [next ?? []]
    },
  }
}

const row = {
  id: 5,
  user_id: 'abc123',
  kind: 'notification',
  message: 'You joined the Advising queue.',
  status: 'sent',
  service_id: 1,
  created_at: new Date('2026-11-06T10:00:00.000Z'),
  service_name: 'Advising',
}


// rows come back in the shape the services expect
test('mysql repository maps notification rows', async () => {
  const pool = fakePool([[row, { ...row, id: 4, status: 'viewed', service_id: null, service_name: null }]])
  const repository = createMySqlNotificationRepository(pool)

  const rows = await repository.listByUser('abc123', 'notification')

  assert.deepEqual(rows[0], {
    id: 5,
    userId: 'abc123',
    kind: 'notification',
    message: 'You joined the Advising queue.',
    status: 'sent',
    serviceId: 1,
    serviceName: 'Advising',
    createdAt: '2026-11-06T10:00:00.000Z',
  })
  assert.equal(rows[1].serviceId, null)
  assert.match(pool.calls[0].sql, /ORDER BY n\.id DESC/)
  assert.deepEqual(pool.calls[0].values, ['abc123', 'notification'])
})


// inserting saves the row and reads it back with the service name joined in
test('mysql repository inserts a row and reads it back', async () => {
  const pool = fakePool([{ insertId: 5 }, [row]])
  const repository = createMySqlNotificationRepository(pool)

  const saved = await repository.insert({
    userId: 'abc123',
    kind: 'notification',
    message: 'You joined the Advising queue.',
    status: 'sent',
    serviceId: '1',
  })

  assert.match(pool.calls[0].sql, /INSERT INTO Notification/)
  assert.deepEqual(pool.calls[0].values, ['abc123', 'notification', 'You joined the Advising queue.', 'sent', 1])
  assert.equal(saved.id, 5)
  assert.equal(saved.serviceName, 'Advising')
})


// a row with no usable service id stores NULL instead of breaking the foreign key
test('mysql repository stores NULL for a missing service id', async () => {
  const pool = fakePool([{ insertId: 6 }, [{ ...row, id: 6, service_id: null, service_name: null }]])
  const repository = createMySqlNotificationRepository(pool)

  await repository.insert({ userId: 'abc123', kind: 'history', message: 'Joined', status: 'joined', serviceId: 'abc' })

  assert.equal(pool.calls[0].values[4], null)
})


// marking read checks the row belongs to the user first
test('mysql repository marks a notification as read', async () => {
  const pool = fakePool([[row], {}])
  const repository = createMySqlNotificationRepository(pool)

  const updated = await repository.markRead('abc123', 5)

  assert.equal(updated.status, 'viewed')
  assert.match(pool.calls[1].sql, /SET status = 'viewed'/)
  assert.deepEqual(pool.calls[1].values, [5, 'abc123'])
})


// a notification that is not the user's returns null
test('mysql repository returns null when marking a missing notification', async () => {
  const repository = createMySqlNotificationRepository(fakePool([[]]))

  assert.equal(await repository.markRead('abc123', 99), null)
})


// bulk operations report how many rows changed
test('mysql repository marks all read, clears, and counts unread', async () => {
  const pool = fakePool([{ affectedRows: 2 }, { affectedRows: 3 }, [{ unread: 1 }]])
  const repository = createMySqlNotificationRepository(pool)

  assert.equal(await repository.markAllRead('abc123'), 2)
  assert.equal(await repository.clearNotifications('abc123'), 3)
  assert.equal(await repository.countUnread('abc123'), 1)

  assert.match(pool.calls[0].sql, /status = 'sent'/)
  assert.match(pool.calls[1].sql, /DELETE FROM Notification/)
  assert.match(pool.calls[1].sql, /kind = 'notification'/)
  assert.match(pool.calls[2].sql, /COUNT\(\*\)/)
})
