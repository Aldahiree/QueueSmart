import test from 'node:test'
import assert from 'node:assert/strict'

import { createQueueService } from '../src/queueService.js'


//check if someone can join a queue
test('user can join a queue', () => {
    const service = createQueueService()

    const result = service.joinQueue(1, 'user1', true)

    assert.equal(result.position, 1)
    assert.equal(service.getQueue(1).length, 1)
})


//check that the same user cannot join twice
test('user cannot join the same queue twice', () => {
    const service = createQueueService()

    service.joinQueue(1, 'user1', true)

    const result = service.joinQueue(1, 'user1', true)

    assert.equal(result.status, 409)
    assert.equal(service.getQueue(1).length, 1)
})


//check that closed services do not accept users
test('cannot join a closed service', () => {
    const service = createQueueService()

    const result = service.joinQueue(1, 'user1', false)

    assert.equal(result.status, 409)
    assert.equal(service.getQueue(1).length, 0)
})


//check if the user can leave
test('user can leave their queue', () => {
    const service = createQueueService()

    service.joinQueue(1, 'user1', true)
    service.leaveQueue(1, 'user1')

    assert.equal(service.getQueue(1).length, 0)
})


//check if the users stay in arrival order
test('users are ordered by arrival time', () => {
    const service = createQueueService()

    service.joinQueue(1, 'user1', true)
    service.joinQueue(1, 'user2', true)

    const queue = service.getQueue(1)

    assert.equal(queue[0].userId, 'user1')
    assert.equal(queue[1].userId, 'user2')
})


//check if higher priority users move ahead
test('higher priority users go first', () => {
    const service = createQueueService()

    service.joinQueue(1, 'user1', true, 0)
    service.joinQueue(1, 'user2', true, 2)

    const queue = service.getQueue(1)

    assert.equal(queue[0].userId, 'user2')
})


//check if the admin serves the correct person
test('serve next removes the first waiting user', () => {
    const service = createQueueService()

    service.joinQueue(1, 'user1', true)
    service.joinQueue(1, 'user2', true)

    const result = service.serveNext(1)

    assert.equal(result.user.userId, 'user1')
    assert.equal(service.getQueue(1).length, 1)
})


//check that different services have separate queues
test('each service has its own queue', () => {
    const service = createQueueService()

    service.joinQueue(1, 'user1', true)
    service.joinQueue(2, 'user2', true)

    assert.equal(service.getQueue(1)[0].userId, 'user1')
    assert.equal(service.getQueue(2)[0].userId, 'user2')
})