import mysql from 'mysql2/promise'

function requiredEnvironment(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set to connect to MySQL.`)
  }
  return value
}

export function createDatabasePool() {
  const port = Number(process.env.DB_PORT ?? 3306)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.')
  }

  return mysql.createPool({
    host: requiredEnvironment('DB_HOST'),
    port,
    user: requiredEnvironment('DB_USER'),
    password: requiredEnvironment('DB_PASSWORD'),
    database: requiredEnvironment('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
}
