// Person 4 - queue participation history.
//
// Each join / leave / serve is saved as a history row in the Notification table
// (kind = 'history', status = joined / left / served, service_id -> Service).
// A repository is injected so the unit tests use the in-memory version while the
// running API uses MySQL. The shape returned here matches the frontend History
// table: { id, serviceId, serviceName, date: "YYYY-MM-DD", outcome, createdAt }

import { createInMemoryNotificationRepository } from './notificationRepository.js'

// Outcomes are kept as display-ready strings so the frontend can show them directly.
export const HISTORY_OUTCOMES = ['Joined', 'Left queue', 'Served']

const STATUS_BY_OUTCOME = { 'Joined': 'joined', 'Left queue': 'left', 'Served': 'served' }
const OUTCOME_BY_STATUS = { joined: 'Joined', left: 'Left queue', served: 'Served' }

function toHistoryEntry(row) {
  return {
    id: row.id,
    serviceId: row.serviceId === null ? null : String(row.serviceId),
    serviceName: row.serviceName || 'Unknown service',
    date: new Date(row.createdAt).toLocaleDateString('en-CA'), // YYYY-MM-DD, same format the UI uses
    outcome: OUTCOME_BY_STATUS[row.status] ?? row.status,
    createdAt: row.createdAt,
  }
}

export function createHistoryService({ notificationRepository = createInMemoryNotificationRepository() } = {}) {
  const repository = notificationRepository

  // add a history entry for a user
  async function record({ userId, serviceId = null, serviceName, outcome }) {
    const status = STATUS_BY_OUTCOME[outcome]
    if (!status) {
      throw new Error(`Unknown history outcome: ${outcome}`)
    }

    const name = serviceName || 'Unknown service'
    const row = await repository.insert({
      userId,
      kind: 'history',
      status,
      serviceId,
      serviceName: name,
      message: `${outcome}: ${name}`,
    })
    return toHistoryEntry(row)
  }

  // the user's history (newest first)
  async function list(userId) {
    const rows = await repository.listByUser(userId, 'history')
    return rows.map(toHistoryEntry)
  }

  return { record, list }
}
