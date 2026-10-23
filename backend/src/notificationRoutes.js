import { Router } from 'express'

// Person 4 - notification endpoints. All routes are scoped to the signed-in user
// (request.user is set by the authentication middleware in app.js).

export function createNotificationRoutes({ notificationService }) {

  const router = Router()

  // the signed-in user's notifications, newest first
  router.get('/', (request, response) => {
    return response.json({
      notifications: notificationService.list(request.user.id),
      unreadCount: notificationService.unreadCount(request.user.id),
    })
  })

  // mark one notification as read
  router.patch('/:id/read', (request, response) => {
    const result = notificationService.markRead(request.user.id, request.params.id)

    if (result.error) {
      return response.status(result.status).json({ message: result.error })
    }

    return response.json({ notification: result })
  })

  // mark every notification as read
  router.post('/read-all', (request, response) => {
    const updated = notificationService.markAllRead(request.user.id)
    return response.json({ updated })
  })

  // clear all of the user's notifications
  router.delete('/', (request, response) => {
    notificationService.clear(request.user.id)
    return response.status(204).end()
  })

  return router
}
