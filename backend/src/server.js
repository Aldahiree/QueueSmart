import { createApp } from './app.js'
import { createAuthService } from './authService.js'
import { createDatabasePool } from './database.js'
import { createMySqlUserRepository } from './mysqlUserRepository.js'
import { createMySqlServiceRepository } from './mysqlServiceRepository.js'

// Person 3: QueueEntry database repository
import { createMySqlQueueEntryRepository } from './mysqlQueueEntryRepository.js'

// Person 4: Notification/History database repository
import { createMySqlNotificationRepository } from './mysqlNotificationRepository.js'

const port = Number(process.env.PORT ?? 3001)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.')
}

const database = createDatabasePool()

await database.query('SELECT 1')

const authService = createAuthService({
  userRepository: createMySqlUserRepository(database),
})

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

if (Boolean(adminEmail) !== Boolean(adminPassword)) {
  throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to seed an administrator.')
}

if (adminEmail && adminPassword) {
  await authService.seedAdministrator({
    email: adminEmail,
    password: adminPassword
  })
}

const app = createApp({
  authService,

  serviceRepository: createMySqlServiceRepository(database),

  // Person 3: Connect queue entries to MySQL
  queueEntryRepository: createMySqlQueueEntryRepository(database),

  // Person 4: Connect notifications and history to MySQL
  notificationRepository: createMySqlNotificationRepository(database),

  frontendOrigin: process.env.FRONTEND_ORIGIN,
})

const server = app.listen(port, () => {
  console.log(`QueueSmart API listening on http://localhost:${port}`)
})

function closeServer() {
  server.close(async (error) => {
    if (error) {
      console.error('Failed to stop the HTTP server cleanly.', error)
      process.exitCode = 1
    }

    await database.end()
  })
}

process.once('SIGINT', closeServer)
process.once('SIGTERM', closeServer)