import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'
import { createAuthService } from '../src/authService.js'

const authService = createAuthService()
const app = createApp({ authService })
let server
let baseUrl

before(async () => {
  await authService.seedAdministrator({
    email: 'admin@example.com',
    password: 'test-admin-password',
  })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${baseUrl}${path}`, { ...options, headers })
}

test('health endpoint confirms the API is running', async () => {
  const response = await request('/api/health')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('registration, login, and logout use server-side sessions', async () => {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: '  Alex Example ',
      email: 'Alex@Example.com',
      password: 'valid-password',
      role: 'Administrator',
    }),
  })
  assert.equal(registration.status, 201)
  const session = await registration.json()
  assert.equal(session.user.name, 'Alex Example')
  assert.equal(session.user.email, 'alex@example.com')
  assert.equal(session.user.role, 'User')
  assert.ok(session.token)
  assert.equal('password' in session.user, false)
  assert.equal('passwordHash' in session.user, false)

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Alex Example',
      email: 'alex@example.com',
      password: 'valid-password',
    }),
  })
  assert.equal(duplicate.status, 409)

  const me = await request('/api/auth/me', { token: session.token })
  assert.equal(me.status, 200)
  assert.equal((await me.json()).user.id, session.user.id)

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'ALEX@example.com',
      password: 'valid-password',
    }),
  })
  assert.equal(login.status, 200)
  assert.equal((await login.json()).user.id, session.user.id)

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    token: session.token,
  })
  assert.equal(logout.status, 204)
  const expiredSession = await request('/api/auth/me', { token: session.token })
  assert.equal(expiredSession.status, 401)
})

test('registration reports field validation errors', async () => {
  const response = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'A', email: 'bad', password: 'short' }),
  })
  assert.equal(response.status, 400)
  const result = await response.json()
  assert.equal(result.message, 'Check the registration details and try again.')
  assert.ok(result.errors.name)
  assert.ok(result.errors.email)
  assert.ok(result.errors.password)
})

test('administrator role is assigned only to the configured seed account', async () => {
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'ADMIN@example.com',
      password: 'test-admin-password',
    }),
  })
  assert.equal(login.status, 200)
  assert.equal((await login.json()).user.role, 'Administrator')
})

test('failed login does not reveal whether an email exists', async () => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alex@example.com',
      password: 'wrong-password',
    }),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    message: 'Email or password is incorrect.',
  })
})
