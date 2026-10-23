import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'

import { createApp } from '../src/app.js'
import { createAuthService } from '../src/authService.js'


const authService = createAuthService()
const app = createApp({ authService })
let server
let baseUrl
let adminToken
let userToken


//start the server and log in as an admin and a user
before(async () => {
    await authService.seedAdministrator({
        email: 'admin@example.com',
        password: 'test-admin-password'
    })

    server = app.listen(0, '127.0.0.1')
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`

    const admin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: 'admin@example.com', password: 'test-admin-password' }
    })
    adminToken = (await admin.json()).token

    const user = await request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Test User', email: 'user@example.com', password: 'User1234!' }
    })
    userToken = (await user.json()).token
})


after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
    })
})


//helper to call the API
async function request(path, { token, body, ...options } = {}) {
    const headers = new Headers()
    if (body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        body: body ? JSON.stringify(body) : undefined
    })
}


//check that logged in users can see the services
test('GET /api/services lists services', async () => {
    const response = await request('/api/services', { token: userToken })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.services.length, 3)
})


//check that you must log in first
test('GET /api/services requires login', async () => {
    const response = await request('/api/services')

    assert.equal(response.status, 401)
})


//check getting one service and a missing one
test('GET /api/services/:id returns one service or 404', async () => {
    const found = await request('/api/services/1', { token: userToken })
    const missing = await request('/api/services/99', { token: userToken })

    assert.equal(found.status, 200)
    assert.equal((await found.json()).service.name, 'Academic Advising')
    assert.equal(missing.status, 404)
})


//check that only admins can create services
test('regular users cannot create services', async () => {
    const response = await request('/api/services', {
        method: 'POST',
        token: userToken,
        body: { name: 'Tutoring', description: 'Help', duration: 30, priority: 'Low' }
    })

    assert.equal(response.status, 403)
})


//check that an admin can create a service
test('admin can create a service', async () => {
    const response = await request('/api/services', {
        method: 'POST',
        token: adminToken,
        body: { name: 'Tutoring', description: 'Help', duration: 30, priority: 'Low' }
    })
    const data = await response.json()

    assert.equal(response.status, 201)
    assert.equal(data.service.name, 'Tutoring')
})


//check that bad input returns the field errors
test('creating an invalid service returns 400 with errors', async () => {
    const response = await request('/api/services', {
        method: 'POST',
        token: adminToken,
        body: { name: '', duration: -1 }
    })
    const data = await response.json()

    assert.equal(response.status, 400)
    assert.ok(data.errors.name)
    assert.ok(data.errors.duration)
})


//check that an admin can update a service
test('admin can update a service', async () => {
    const response = await request('/api/services/2', {
        method: 'PUT',
        token: adminToken,
        body: { duration: 25 }
    })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.service.duration, 25)
})


//check that closing a service blocks people from joining
test('closed services cannot be joined', async () => {
    const close = await request('/api/services/2/status', {
        method: 'PATCH',
        token: adminToken,
        body: { isOpen: false }
    })
    const join = await request('/api/queues/2/join', {
        method: 'POST',
        token: userToken
    })

    assert.equal(close.status, 200)
    assert.equal(join.status, 409)
})


//check that a user gets their wait time after joining
test('user gets a wait time after joining a queue', async () => {
    const notInQueue = await request('/api/services/1/wait-time', { token: userToken })
    assert.equal(notInQueue.status, 404)

    await request('/api/queues/1/join', { method: 'POST', token: userToken })

    const response = await request('/api/services/1/wait-time', { token: userToken })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.position, 1)
    assert.equal(data.waitMinutes, 0)
})