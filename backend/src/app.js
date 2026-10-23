import cors from 'cors'
import express from 'express'
import { AuthError } from './authService.js'
import { createQueueService } from './queueService.js'
import { createQueueRoutes } from './queueRoutes.js'
import { createServiceService } from './serviceService.js'
import { createServiceRoutes } from './serviceRoutes.js'
import { createNotificationService } from './notificationService.js'
import { createHistoryService } from './historyService.js'
import { withQueueActivity } from './queueActivity.js'
import { createNotificationRoutes } from './notificationRoutes.js'
import { createHistoryRoutes } from './historyRoutes.js'
import { createDashboardRoutes } from './dashboardRoutes.js'

function authenticationRequired(authService) {
  return (request, response, next) => {
    const authorization = request.get('authorization') ?? ''
    const match = /^Bearer\s+(\S+)$/.exec(authorization)

    if (!match) {
      return response.status(401).json({ message: 'Authentication required.' })
    }

    const user = authService.getUserForToken(match[1])
    if (!user) {
      return response.status(401).json({ message: 'Session is invalid or expired.' })
    }

    request.authToken = match[1]
    request.user = user
    return next()
  }
}

export function createApp({ authService, frontendOrigin } = {}) {
  if (!authService) {
    throw new Error('An authentication service is required.')
  }

  const app = express()
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(frontendOrigin ? [frontendOrigin] : []),
  ]

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('Origin is not allowed by CORS.'))
    },
  }))
  app.use(express.json({ limit: '10kb' }))

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' })
  })

  app.post('/api/auth/register', async (request, response) => {
    const session = await authService.register(request.body)
    response.status(201).json(session)
  })

  app.post('/api/auth/login', async (request, response) => {
    const session = await authService.login(request.body)
    response.json(session)
  })

  const requireAuthentication = authenticationRequired(authService)
  app.get('/api/auth/me', requireAuthentication, (request, response) => {
    response.json({ user: request.user })
  })

  app.post('/api/auth/logout', requireAuthentication, (request, response) => {
    authService.revokeToken(request.authToken)
    response.status(204).end()
  })


  //create the service management system
  const serviceService = createServiceService()

  //Person 4 - notification and history stores
  const notificationService = createNotificationService()
  const historyService = createHistoryService()

  //create the queue system, wrapped so Person 4 can react to join/leave/serve
  const queueService = withQueueActivity(createQueueService(), {
    notificationService,
    historyService,
    getService: (id) => serviceService.getService(id)
  })

  //connect the service routes with the existing login system
  app.use('/api/services', requireAuthentication, createServiceRoutes({
    serviceService,
    queueService
  }))

  //connect the queue routes and use the real services
  app.use('/api/queues', requireAuthentication, createQueueRoutes({
    queueService,
    getService: (id) => serviceService.getService(id)
  }))

  //Person 4 - notifications, history and the admin dashboard
  app.use('/api/notifications', requireAuthentication, createNotificationRoutes({
    notificationService
  }))
  app.use('/api/history', requireAuthentication, createHistoryRoutes({
    historyService
  }))
  app.use('/api/dashboard', requireAuthentication, createDashboardRoutes({
    serviceService,
    queueService
  }))


  app.use((error, request, response, next) => {
    if (response.headersSent) {
      return next(error)
    }

    if (error instanceof AuthError) {
      return response.status(error.status).json({
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      })
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return response.status(400).json({ message: 'Request body must be valid JSON.' })
    }

    if (error.status === 413) {
      return response.status(413).json({ message: 'Request body is too large.' })
    }

    console.error(error)
    return response.status(500).json({ message: 'An unexpected server error occurred.' })
  })

  return app
}