// Person 4 - in-memory notification store.
//
// Notifications are created by backend events (a user joining a queue, or a user
// getting close to being served) and read back per user. The shape returned here
// matches what the frontend expects: { id, message, read, createdAt }.

export function createNotificationService() {
  const notificationsByUser = new Map() // userId -> array, newest first
  let nextId = 1

  // store a new unread notification for a user
  function add(userId, message) {
    const key = String(userId)
    const notification = {
      id: nextId++,
      message: String(message),
      read: false,
      createdAt: new Date().toISOString(),
    }

    const list = notificationsByUser.get(key) ?? []
    list.unshift(notification)
    notificationsByUser.set(key, list)

    return notification
  }

  // return a copy of the user's notifications (newest first)
  function list(userId) {
    return [...(notificationsByUser.get(String(userId)) ?? [])]
  }

  // mark one notification as read
  function markRead(userId, notificationId) {
    const list = notificationsByUser.get(String(userId)) ?? []
    const target = list.find((item) => item.id === Number(notificationId))

    if (!target) {
      return { error: 'Notification not found.', status: 404 }
    }

    target.read = true
    return target
  }

  // mark every notification for a user as read, returns how many existed
  function markAllRead(userId) {
    const list = notificationsByUser.get(String(userId)) ?? []
    list.forEach((item) => { item.read = true })
    return list.length
  }

  // remove all notifications for a user
  function clear(userId) {
    notificationsByUser.delete(String(userId))
  }

  // how many unread notifications the user has
  function unreadCount(userId) {
    const list = notificationsByUser.get(String(userId)) ?? []
    return list.filter((item) => !item.read).length
  }

  return { add, list, markRead, markAllRead, clear, unreadCount }
}
