import test from 'node:test'
import assert from 'node:assert/strict'

import { createHistoryService } from '../src/historyService.js'


// joining, leaving and being served are all recorded
test('records joined, left and served outcomes', () => {
  const history = createHistoryService()

  history.record({ userId: 'user1', serviceId: '1', serviceName: 'Advising', outcome: 'Joined' })
  history.record({ userId: 'user1', serviceId: '1', serviceName: 'Advising', outcome: 'Served' })

  const list = history.list('user1')

  assert.equal(list.length, 2)
  assert.equal(list[0].outcome, 'Served') // newest first
  assert.equal(list[1].outcome, 'Joined')
})


// an entry carries the fields the frontend table needs
test('a history entry has service name, date and outcome', () => {
  const history = createHistoryService()

  const entry = history.record({
    userId: 'user1',
    serviceId: '2',
    serviceName: 'Financial Aid',
    outcome: 'Left queue',
  })

  assert.equal(entry.serviceName, 'Financial Aid')
  assert.equal(entry.outcome, 'Left queue')
  assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
})


// an unknown outcome is rejected so bad data never reaches the UI
test('an unknown outcome throws', () => {
  const history = createHistoryService()

  assert.throws(() => {
    history.record({ userId: 'user1', serviceName: 'Advising', outcome: 'Exploded' })
  })
})


// history is kept separate per user
test('history is kept separate per user', () => {
  const history = createHistoryService()

  history.record({ userId: 'user1', serviceName: 'Advising', outcome: 'Joined' })
  history.record({ userId: 'user2', serviceName: 'IT Help Desk', outcome: 'Joined' })

  assert.equal(history.list('user1').length, 1)
  assert.equal(history.list('user2').length, 1)
  assert.equal(history.list('user1')[0].serviceName, 'Advising')
})
