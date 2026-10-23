// Person 4 - in-memory queue participation history.
//
// Records each time a user joins, leaves, or is served for a service. The shape
// returned here matches the frontend History table:
//   { id, serviceId, serviceName, date: "YYYY-MM-DD", outcome, createdAt }

// Outcomes are kept as display-ready strings so the frontend can show them directly.
export const HISTORY_OUTCOMES = ['Joined', 'Left queue', 'Served']

export function createHistoryService() {
  const entriesByUser = new Map() // userId -> array, newest first
  const allowedOutcomes = new Set(HISTORY_OUTCOMES)
  let nextId = 1

  // add a history entry for a user
  function record({ userId, serviceId = null, serviceName, outcome }) {
    if (!allowedOutcomes.has(outcome)) {
      throw new Error(`Unknown history outcome: ${outcome}`)
    }

    const key = String(userId)
    const now = new Date()
    const entry = {
      id: nextId++,
      serviceId: serviceId === null ? null : String(serviceId),
      serviceName: serviceName || 'Unknown service',
      date: now.toLocaleDateString('en-CA'), // YYYY-MM-DD, same format the UI uses
      outcome,
      createdAt: now.toISOString(),
    }

    const list = entriesByUser.get(key) ?? []
    list.unshift(entry)
    entriesByUser.set(key, list)

    return entry
  }

  // return a copy of the user's history (newest first)
  function list(userId) {
    return [...(entriesByUser.get(String(userId)) ?? [])]
  }

  return { record, list }
}
