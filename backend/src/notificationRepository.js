// Person 4 - in-memory version of the Notification table.
//
// The Notification table stores both notifications and queue participation
// history for a user. `kind` tells them apart; `status` is unread/read for a
// notification and joined/left/served for a history row. Unit tests use this
// so they need no database. The running API uses mysqlNotificationRepository.js,
// which returns rows in exactly the same shape.

export function createInMemoryNotificationRepository() {
  const rows = [] // every row, in insert order
  let nextId = 1

  function matches(row, userId, kind) {
    return row.userId === String(userId) && row.kind === kind
  }

  return {
    async insert({ userId, kind, message, status, serviceId = null, serviceName = null }) {
      const service = Number(serviceId)
      const row = {
        id: nextId++,
        userId: String(userId),
        kind,
        message: String(message),
        status,
        serviceId: Number.isInteger(service) && service > 0 ? service : null,
        serviceName: serviceName ?? null,
        createdAt: new Date().toISOString(),
      }
      rows.push(row)
      return { ...row }
    },

    // newest first, like the MySQL query
    async listByUser(userId, kind) {
      return rows
        .filter((row) => matches(row, userId, kind))
        .sort((a, b) => b.id - a.id)
        .map((row) => ({ ...row }))
    },

    async markRead(userId, id) {
      const row = rows.find((item) => item.id === Number(id) && matches(item, userId, 'notification'))
      if (!row) {
        return null
      }
      row.status = 'viewed'
      return { ...row }
    },

    async markAllRead(userId) {
      let changed = 0
      for (const row of rows) {
        if (matches(row, userId, 'notification') && row.status === 'sent') {
          row.status = 'viewed'
          changed++
        }
      }
      return changed
    },

    async clearNotifications(userId) {
      let removed = 0
      for (let index = rows.length - 1; index >= 0; index--) {
        if (matches(rows[index], userId, 'notification')) {
          rows.splice(index, 1)
          removed++
        }
      }
      return removed
    },

    async countUnread(userId) {
      return rows.filter((row) => matches(row, userId, 'notification') && row.status === 'sent').length
    },
  }
}
