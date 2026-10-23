// Person 4 - connects queue events to notifications and history.
//
// This WRAPS an existing queue service instead of changing it, so Person 3's
// queueService.js stays untouched. join / leave / serveNext are intercepted to
// record history and raise notifications; every other method passes straight through.

const NEAR_FRONT_POSITION = 2 // "close to being served" means position 1 or 2

export function withQueueActivity(queueService, { notificationService, historyService, getService }) {
  // per service: userId -> best (lowest) position we've already notified them about,
  // so each user hears "almost up" (pos 2) and "you're next" (pos 1) at most once each.
  const notifiedByService = new Map()

  function serviceName(serviceId) {
    const service = getService?.(serviceId)
    return service?.name ?? 'the service'
  }

  function notifiedMap(serviceId) {
    const key = String(serviceId)
    if (!notifiedByService.has(key)) {
      notifiedByService.set(key, new Map())
    }
    return notifiedByService.get(key)
  }

  // after any change to a queue, notify users who just got closer to the front
  function notifyNearFront(serviceId) {
    const queue = queueService.getQueue(serviceId)
    const notified = notifiedMap(serviceId)
    const stillWaiting = new Set(queue.map((entry) => entry.userId))

    // forget people who left or were served so they start fresh if they ever return
    for (const userId of notified.keys()) {
      if (!stillWaiting.has(userId)) {
        notified.delete(userId)
      }
    }

    const name = serviceName(serviceId)
    for (const entry of queue) {
      if (entry.position > NEAR_FRONT_POSITION) {
        continue
      }

      // skip if we already told them about this position or a closer one
      const best = notified.get(entry.userId)
      if (best !== undefined && best <= entry.position) {
        continue
      }

      notified.set(entry.userId, entry.position)
      const message = entry.position === 1
        ? `You're next in line for ${name}.`
        : `You're almost up for ${name} - ${entry.position - 1} ahead of you.`
      notificationService.add(entry.userId, message)
    }
  }

  return {
    ...queueService,

    joinQueue(serviceId, userId, isOpen, priority = 0, name = '') {
      const result = queueService.joinQueue(serviceId, userId, isOpen, priority, name)

      if (!result.error) {
        const service = serviceName(serviceId)
        historyService.record({ userId, serviceId, serviceName: service, outcome: 'Joined' })
        notificationService.add(userId, `You joined the ${service} queue.`)
        notifyNearFront(serviceId)
      }

      return result
    },

    leaveQueue(serviceId, userId) {
      const service = serviceName(serviceId) // capture before the entry is gone
      const result = queueService.leaveQueue(serviceId, userId)

      if (!result.error) {
        historyService.record({ userId, serviceId, serviceName: service, outcome: 'Left queue' })
        notificationService.add(userId, `You left the ${service} queue.`)
        notifyNearFront(serviceId) // people behind them may now be close
      }

      return result
    },

    serveNext(serviceId) {
      const service = serviceName(serviceId)
      const result = queueService.serveNext(serviceId)

      if (!result.error && result.user) {
        const servedUserId = result.user.userId
        historyService.record({ userId: servedUserId, serviceId, serviceName: service, outcome: 'Served' })
        notificationService.add(servedUserId, `It's your turn at ${service} - you're being served now.`)
        notifyNearFront(serviceId) // the next person is now at the front
      }

      return result
    },
  }
}
