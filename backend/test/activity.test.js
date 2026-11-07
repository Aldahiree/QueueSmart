import test from 'node:test'
import assert from 'node:assert/strict'

import { createQueueService } from '../src/queueService.js'
import { createNotificationService } from '../src/notificationService.js'
import { createHistoryService } from '../src/historyService.js'
import { createInMemoryNotificationRepository } from '../src/notificationRepository.js'
import { withQueueActivity } from '../src/queueActivity.js'


// build a wrapped queue service with a fixed set of fake services
function setup() {
  // both stores share one repository, just like they share one table in MySQL
  const notificationRepository = createInMemoryNotificationRepository()
  const notificationService = createNotificationService({ notificationRepository })
  const historyService = createHistoryService({ notificationRepository })
  const services = new Map([
    ['1', { id: '1', name: 'Advising' }],
    ['2', { id: '2', name: 'Financial Aid' }],
  ])

  const queueService = withQueueActivity(createQueueService(), {
    notificationService,
    historyService,
    getService: (id) => services.get(String(id)),
  })

  return { queueService, notificationService, historyService }
}


// joining records history and a confirmation notification
test('joining a queue records history and notifies the user', async () => {
  const { queueService, notificationService, historyService } = setup()

  await queueService.joinQueue('1', 'user1', true)

  const history = await historyService.list('user1')
  assert.equal(history[0].outcome, 'Joined')
  assert.equal(history[0].serviceName, 'Advising')

  const messages = (await notificationService.list('user1')).map((n) => n.message)
  assert.ok(messages.some((m) => m.includes('joined the Advising queue')))
})


// leaving records history and a notification
test('leaving a queue records history and notifies the user', async () => {
  const { queueService, historyService, notificationService } = setup()

  await queueService.joinQueue('1', 'user1', true)
  await queueService.leaveQueue('1', 'user1')

  assert.equal((await historyService.list('user1'))[0].outcome, 'Left queue')
  assert.ok((await notificationService.list('user1')).some((n) => n.message.includes('left the Advising queue')))
})


// a user at the front is told they are close to being served
test('the next user is notified they are close to being served', async () => {
  const { queueService, notificationService } = setup()

  await queueService.joinQueue('1', 'user1', true)
  await queueService.joinQueue('1', 'user2', true)

  // user2 starts at position 2 and should be warned they are close
  assert.ok(
    (await notificationService.list('user2')).some((n) => n.message.includes('almost up')),
    'user2 should get a near-front notification'
  )
})


// serving records a 'Served' outcome and notifies, and moves the next user up
test('serving the next user records history and advances the queue', async () => {
  const { queueService, notificationService, historyService } = setup()

  await queueService.joinQueue('1', 'user1', true)
  await queueService.joinQueue('1', 'user2', true)

  const result = await queueService.serveNext('1')
  assert.equal(result.user.userId, 'user1')

  assert.equal((await historyService.list('user1'))[0].outcome, 'Served')
  assert.ok((await notificationService.list('user1')).some((n) => n.message.includes('being served')))

  // user2 is now at the front and should have a "next in line" notification
  assert.ok((await notificationService.list('user2')).some((n) => n.message.includes('next in line')))
})


// a closed service does not create notifications or history
test('a failed join does not record anything', async () => {
  const { queueService, notificationService, historyService } = setup()

  const result = await queueService.joinQueue('1', 'user1', false) // closed

  assert.equal(result.status, 409)
  assert.equal((await historyService.list('user1')).length, 0)
  assert.equal((await notificationService.list('user1')).length, 0)
})


// history rows and notifications live in one store but never mix
test('history and notifications are kept apart', async () => {
  const { queueService, notificationService, historyService } = setup()

  await queueService.joinQueue('1', 'user1', true)

  const history = await historyService.list('user1')
  const notifications = await notificationService.list('user1')

  assert.equal(history.length, 1)
  assert.ok(history.every((entry) => entry.outcome === 'Joined'))
  assert.ok(notifications.every((n) => !n.message.startsWith('Joined:')))
})
