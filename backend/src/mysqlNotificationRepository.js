// Person 4 - MySQL storage for the Notification table (notifications + history).
// Same interface as notificationRepository.js so the services do not care which
// one they are given.

const COLUMNS = `
  n.id, n.user_id, n.kind, n.message, n.status, n.service_id, n.created_at,
  s.name AS service_name`

// turn a database row into the shape the services expect
function toRow(row) {
  return {
    id: Number(row.id),
    userId: String(row.user_id),
    kind: row.kind,
    message: row.message,
    status: row.status,
    serviceId: row.service_id === null || row.service_id === undefined ? null : Number(row.service_id),
    serviceName: row.service_name ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

export function createMySqlNotificationRepository(pool) {

  // one row that belongs to the given user
  async function findById(userId, id) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS}
       FROM Notification n
       LEFT JOIN Service s ON s.id = n.service_id
       WHERE n.id = ? AND n.user_id = ?`,
      [id, userId]
    )
    return rows[0] ? toRow(rows[0]) : null
  }

  async function insert({ userId, kind, message, status, serviceId = null }) {
    const service = Number(serviceId)
    const [result] = await pool.execute(
      `INSERT INTO Notification (user_id, kind, message, status, service_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, kind, message, status, Number.isInteger(service) && service > 0 ? service : null]
    )
    return findById(userId, result.insertId)
  }

  async function listByUser(userId, kind) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS}
       FROM Notification n
       LEFT JOIN Service s ON s.id = n.service_id
       WHERE n.user_id = ? AND n.kind = ?
       ORDER BY n.id DESC`,
      [userId, kind]
    )
    return rows.map(toRow)
  }

  // look the row up first so marking an already-read notification is not a 404
  async function markRead(userId, id) {
    const existing = await findById(userId, id)
    if (!existing || existing.kind !== 'notification') {
      return null
    }
    await pool.execute(
      `UPDATE Notification SET status = 'viewed' WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return { ...existing, status: 'viewed' }
  }

  async function markAllRead(userId) {
    const [result] = await pool.execute(
      `UPDATE Notification SET status = 'viewed'
       WHERE user_id = ? AND kind = 'notification' AND status = 'sent'`,
      [userId]
    )
    return result.affectedRows
  }

  async function clearNotifications(userId) {
    const [result] = await pool.execute(
      `DELETE FROM Notification WHERE user_id = ? AND kind = 'notification'`,
      [userId]
    )
    return result.affectedRows
  }

  async function countUnread(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS unread FROM Notification
       WHERE user_id = ? AND kind = 'notification' AND status = 'sent'`,
      [userId]
    )
    return Number(rows[0]?.unread ?? 0)
  }

  return { insert, listByUser, markRead, markAllRead, clearNotifications, countUnread }
}
