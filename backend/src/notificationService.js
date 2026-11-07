// Person 4 - notification service.
//
// Notifications are created by backend events (a user joining a queue, or a user
// getting close to being served) and read back per user. Rows live in the
// Notification table with kind = 'notification'. A repository is injected so the
// unit tests use the in-memory version while the running API uses MySQL.
// The shape returned here matches the frontend: { id, message, read, createdAt }.

import { createInMemoryNotificationRepository } from './notificationRepository.js'

function toNotification(row) {
  return {
    id: row.id,
    message: row.message,
    read: row.status === 'viewed',
    createdAt: row.createdAt,
  }
}

export function createNotificationService({ notificationRepository = createInMemoryNotificationRepository() } = {}) {
  const repository = notificationRepository

  // store a new unread notification for a user
  async function add(userId, message) {
    const row = await repository.insert({
      userId,
      kind: 'notification',
      message: String(message),
      status: 'sent',
    })
    return toNotification(row)
  }

  // the user's notifications (newest first)
  async function list(userId) {
    const rows = await repository.listByUser(userId, 'notification')
    return rows.map(toNotification)
  }

  // mark one notification as read
  async function markRead(userId, notificationId) {
    const id = Number(notificationId)
    const row = Number.isInteger(id) && id > 0
      ? await repository.markRead(userId, id)
      : null

    if (!row) {
      return { error: 'Notification not found.', status: 404 }
    }

    return toNotification(row)
  }

  // mark every notification for a user as read, returns how many changed
  async function markAllRead(userId) {
    return repository.markAllRead(userId)
  }

  // remove all notifications for a user
  async function clear(userId) {
    await repository.clearNotifications(userId)
  }

  // how many unread notifications the user has
  async function unreadCount(userId) {
    return repository.countUnread(userId)
  }

  return { add, list, markRead, markAllRead, clear, unreadCount }
}
