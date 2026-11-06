import { Router } from 'express'

// Person 4 - admin dashboard. Combines each service with its live queue length
// so administrators can see service statuses and how many people are waiting.

// Pure helper so the logic can be unit tested without starting a server.
export async function buildDashboard({ serviceService, queueService }) {
  const services = []
  for (const service of await serviceService.listServices()) {
    const queue = await queueService.getQueue(service.id)
    services.push({ ...service, queueLength: queue.length })
  }

  const totals = {
    serviceCount: services.length,
    openServices: services.filter((service) => service.isOpen).length,
    waiting: services.reduce((sum, service) => sum + service.queueLength, 0),
  }

  return { services, totals }
}

export function createDashboardRoutes({ serviceService, queueService }) {

  const router = Router()

  // only administrators can view the dashboard
  function adminOnly(request, response, next) {
    if (request.user.role !== 'Administrator') {
      return response.status(403).json({ message: 'Only administrators can do this.' })
    }
    next()
  }

  router.get('/', adminOnly, async (request, response) => {
    return response.json(await buildDashboard({ serviceService, queueService }))
  })

  return router
}
