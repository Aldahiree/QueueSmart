import test from 'node:test'
import assert from 'node:assert/strict'

import { createHistoryService } from '../src/historyService.js'


// joining, leaving and being served are all recorded
test('records joined, left and served outcomes', async () => {
  const history = createHistoryService()

  await history.record({ userId: 'user1', serviceId: '1', serviceName: 'Advising', outcome: 'Joined' })
  await history.record({ userId: 'user1', serviceId: '1', serviceName: 'Advising', outcome: 'Served' })

  const list = await history.list('user1')

  assert.equal(list.length, 2)
  assert.equal(list[0].outcome, 'Served') // newest first
  assert.equal(list[1].outcome, 'Joined')
})


// an entry carries the fields the frontend table needs
test('a history entry has service name, date and outcome', async () => {
  const history = createHistoryService()

  const entry = await history.record({
    userId: 'user1',
    serviceId: '2',
    serviceName: 'Financial Aid',
    outcome: 'Left queue',
  })

  assert.equal(entry.serviceId, '2')
  assert.equal(entry.serviceName, 'Financial Aid')
  assert.equal(entry.outcome, 'Left queue')
  assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
})


// an unknown outcome is rejected so bad data never reaches the table
test('an unknown outcome is rejected', async () => {
  const history = createHistoryService()

  await assert.rejects(
    history.record({ userId: 'user1', serviceName: 'Advising', outcome: 'Exploded' }),
    /Unknown history outcome/
  )
})


// history is kept separate per user
test('history is kept separate per user', async () => {
  const history = createHistoryService()

  await history.record({ userId: 'user1', serviceName: 'Advising', outcome: 'Joined' })
  await history.record({ userId: 'user2', serviceName: 'IT Help Desk', outcome: 'Joined' })

  assert.equal((await history.list('user1')).length, 1)
  assert.equal((await history.list('user2')).length, 1)
  assert.equal((await history.list('user1'))[0].serviceName, 'Advising')
})
