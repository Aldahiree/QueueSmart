import test from 'node:test'
import assert from 'node:assert/strict'

import { createServiceService } from '../src/serviceService.js'
import { createQueueService } from '../src/queueService.js'
import { buildDashboard } from '../src/dashboardRoutes.js'


// the dashboard lists every service with its live queue length
test('dashboard reports queue length per service', () => {
  const serviceService = createServiceService()
  const queueService = createQueueService()

  // service 1 is open (seeded), put two people in its queue
  queueService.joinQueue(1, 'user1', true)
  queueService.joinQueue(1, 'user2', true)

  const dashboard = buildDashboard({ serviceService, queueService })
  const serviceOne = dashboard.services.find((service) => service.id === 1)

  assert.equal(serviceOne.queueLength, 2)
  assert.equal(dashboard.totals.waiting, 2)
})


// totals summarise the services
test('dashboard totals count services and open ones', () => {
  const serviceService = createServiceService()
  const queueService = createQueueService()

  const dashboard = buildDashboard({ serviceService, queueService })

  // seed data has 3 services, 2 open (IT Help Desk starts closed)
  assert.equal(dashboard.totals.serviceCount, 3)
  assert.equal(dashboard.totals.openServices, 2)
  assert.equal(dashboard.totals.waiting, 0)
})


// each dashboard service keeps the fields the frontend card needs
test('dashboard services expose name, status and queue length', () => {
  const serviceService = createServiceService()
  const queueService = createQueueService()

  const dashboard = buildDashboard({ serviceService, queueService })
  const service = dashboard.services[0]

  assert.ok('name' in service)
  assert.ok('isOpen' in service)
  assert.ok('queueLength' in service)
})
