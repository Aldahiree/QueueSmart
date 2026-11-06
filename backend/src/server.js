import { createApp } from './app.js'
import { createAuthService } from './authService.js'
import { createDatabasePool } from './database.js'
import { createMySqlUserRepository } from './mysqlUserRepository.js'

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
  await authService.seedAdministrator({ email: adminEmail, password: adminPassword })
}

const app = createApp({
  authService,
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
