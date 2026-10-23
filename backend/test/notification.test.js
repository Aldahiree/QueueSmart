import test from 'node:test'
import assert from 'node:assert/strict'

import { createNotificationService } from '../src/notificationService.js'


// a new notification starts unread and shows up in the list
test('adding a notification stores it as unread', () => {
  const notifications = createNotificationService()

  const created = notifications.add('user1', 'You joined the queue.')

  assert.equal(created.read, false)
  assert.equal(created.message, 'You joined the queue.')

  const list = notifications.list('user1')
  assert.equal(list.length, 1)
  assert.equal(list[0].message, 'You joined the queue.')
})


// the newest notification comes first
test('notifications are listed newest first', () => {
  const notifications = createNotificationService()

  notifications.add('user1', 'first')
  notifications.add('user1', 'second')

  const list = notifications.list('user1')

  assert.equal(list[0].message, 'second')
  assert.equal(list[1].message, 'first')
})


// one user cannot see another user's notifications
test('notifications are kept separate per user', () => {
  const notifications = createNotificationService()

  notifications.add('user1', 'for user1')
  notifications.add('user2', 'for user2')

  assert.equal(notifications.list('user1').length, 1)
  assert.equal(notifications.list('user2').length, 1)
  assert.equal(notifications.list('user1')[0].message, 'for user1')
})


// marking one as read updates only that notification
test('a notification can be marked as read', () => {
  const notifications = createNotificationService()

  const created = notifications.add('user1', 'hello')
  const result = notifications.markRead('user1', created.id)

  assert.equal(result.read, true)
  assert.equal(notifications.unreadCount('user1'), 0)
})


// marking an unknown id returns an error
test('marking a missing notification returns a 404 error', () => {
  const notifications = createNotificationService()

  const result = notifications.markRead('user1', 999)

  assert.equal(result.status, 404)
})


// mark-all clears the unread count
test('marking all as read clears the unread count', () => {
  const notifications = createNotificationService()

  notifications.add('user1', 'one')
  notifications.add('user1', 'two')

  const count = notifications.markAllRead('user1')

  assert.equal(count, 2)
  assert.equal(notifications.unreadCount('user1'), 0)
})


// clearing removes everything for the user
test('clearing removes all notifications for the user', () => {
  const notifications = createNotificationService()

  notifications.add('user1', 'one')
  notifications.clear('user1')

  assert.equal(notifications.list('user1').length, 0)
})
