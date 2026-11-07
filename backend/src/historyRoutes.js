import { Router } from 'express'

// Person 4 - history endpoint. Returns the signed-in user's queue participation
// history (joined / left / served), newest first.

export function createHistoryRoutes({ historyService }) {

  const router = Router()

  router.get('/', async (request, response) => {
    return response.json({ history: await historyService.list(request.user.id) })
  })

  return router
}
