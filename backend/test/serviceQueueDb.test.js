import test from 'node:test'
import assert from 'node:assert/strict'

import { createServiceService, createInMemoryServiceRepository } from '../src/serviceService.js'
import { createMySqlServiceRepository } from '../src/mysqlServiceRepository.js'


//a fresh service layer with no seeded data
function emptyService() {
    return createServiceService({ serviceRepository: createInMemoryServiceRepository() })
}

const tutoring = { name: 'Tutoring', description: 'Help with coursework', duration: 30, priority: 'Low' }


//check that service names must be unique
test('rejects a duplicate service name', async () => {
    const service = emptyService()
    await service.createService(tutoring)

    const result = await service.createService({ ...tutoring, name: 'tutoring' })

    assert.equal(result.status, 409)
    assert.ok(result.errors.name)
})


//check that renaming to a taken name is rejected
test('rejects renaming a service to a name that is taken', async () => {
    const service = emptyService()
    await service.createService(tutoring)
    const other = await service.createService({ ...tutoring, name: 'Advising' })

    const result = await service.updateService(other.service.id, { name: 'Tutoring' })

    assert.equal(result.status, 409)
})


//check that a new service opens its first queue
test('creating a service opens a queue for it', async () => {
    const service = emptyService()
    const { service: created } = await service.createService(tutoring)

    const queue = await service.getOpenQueue(created.id)

    assert.equal(created.isOpen, true)
    assert.equal(queue.status, 'open')
    assert.equal(created.queueId, queue.id)
})


//check that a service can be created closed
test('a service created closed has no open queue', async () => {
    const service = emptyService()
    const { service: created } = await service.createService({ ...tutoring, isOpen: false })

    assert.equal(created.isOpen, false)
    assert.equal(await service.getOpenQueue(created.id), null)
})


//check that closing then reopening keeps the old queue as history
test('closing and reopening creates a new queue and keeps the old one', async () => {
    const service = emptyService()
    const { service: created } = await service.createService(tutoring)

    await service.setServiceStatus(created.id, false)
    await service.setServiceStatus(created.id, true)
    const result = await service.listQueues(created.id)

    assert.equal(result.queues.length, 2)
    assert.equal(result.queues[0].status, 'open')
    assert.equal(result.queues[1].status, 'closed')
    assert.ok(result.queues[1].closedAt)
})


//check that opening an open service does not make a second queue
test('opening an already open service keeps one queue', async () => {
    const service = emptyService()
    const { service: created } = await service.createService(tutoring)

    await service.setServiceStatus(created.id, true)

    assert.equal((await service.listQueues(created.id)).queues.length, 1)
})


//check that isOpen can be changed through a normal update
test('update with isOpen closes the queue', async () => {
    const service = emptyService()
    const { service: created } = await service.createService(tutoring)

    const result = await service.updateService(created.id, { isOpen: false, duration: 40 })

    assert.equal(result.service.isOpen, false)
    assert.equal(result.service.duration, 40)
})


//check missing services for the queue functions
test('queue functions handle a missing service', async () => {
    const service = emptyService()

    assert.equal((await service.setServiceStatus(5, true)).status, 404)
    assert.equal((await service.listQueues(5)).status, 404)
    assert.equal(await service.getOpenQueue('abc'), null)
    assert.equal(await service.getService('abc'), undefined)
})


//check that unexpected storage errors are not hidden
test('unexpected database errors are passed on', async () => {
    const broken = createInMemoryServiceRepository()
    broken.insertService = async () => { throw new Error('connection lost') }
    const service = createServiceService({ serviceRepository: broken })

    await assert.rejects(service.createService(tutoring), /connection lost/)
})


//a fake MySQL pool that records the SQL and returns canned rows
function fakePool(responses = []) {
    const calls = []
    const connection = {
        calls,
        committed: false,
        rolledBack: false,
        released: false,
        async beginTransaction() {},
        async commit() { this.committed = true },
        async rollback() { this.rolledBack = true },
        release() { this.released = true },
        async execute(sql, values) {
            calls.push({ sql, values })
            const next = responses.shift()
            if (next instanceof Error) throw next
            return [next ?? []]
        }
    }
    return {
        calls,
        connection,
        execute: connection.execute.bind(connection),
        async getConnection() { return connection }
    }
}

const row = {
    id: 1, name: 'Advising', description: 'Meet', duration_minutes: 15,
    priority: 'Medium', open_queue_id: 7
}


//check that MySQL rows are turned into the frontend shape
test('mysql repository maps service rows', async () => {
    const pool = fakePool([[row, { ...row, id: 2, open_queue_id: null }]])
    const repository = createMySqlServiceRepository(pool)

    const services = await repository.listServices()

    assert.deepEqual(services[0], {
        id: 1, name: 'Advising', description: 'Meet', duration: 15,
        priority: 'Medium', isOpen: true, queueId: 7
    })
    assert.equal(services[1].isOpen, false)
    assert.match(pool.calls[0].sql, /LEFT JOIN Queue/)
})


//check that a missing service returns null
test('mysql repository returns null for a missing service', async () => {
    const repository = createMySqlServiceRepository(fakePool([[]]))

    assert.equal(await repository.findServiceById(9), null)
})


//check that inserting a service also opens a queue and commits
test('mysql repository inserts a service and its queue in a transaction', async () => {
    const pool = fakePool([{ insertId: 4 }, {}, [{ ...row, id: 4 }]])
    const repository = createMySqlServiceRepository(pool)

    const service = await repository.insertService({ name: 'Advising', description: 'Meet', duration: 15, priority: 'Medium' })

    assert.equal(service.id, 4)
    assert.match(pool.calls[0].sql, /INSERT INTO Service/)
    assert.deepEqual(pool.calls[1].values, [4])
    assert.equal(pool.connection.committed, true)
    assert.equal(pool.connection.released, true)
})


//check that a failed insert is rolled back
test('mysql repository rolls back a failed insert', async () => {
    const duplicate = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' })
    const pool = fakePool([duplicate])
    const repository = createMySqlServiceRepository(pool)

    await assert.rejects(repository.insertService({ name: 'A', description: 'B', duration: 1, priority: 'Low' }, { open: false }))
    assert.equal(pool.connection.rolledBack, true)
    assert.equal(pool.connection.released, true)
})


//check that updates only change the fields given
test('mysql repository updates only the given columns', async () => {
    const pool = fakePool([{}, [row]])
    const repository = createMySqlServiceRepository(pool)

    await repository.updateService(1, { duration: 20, priority: 'High' })

    assert.match(pool.calls[0].sql, /SET duration_minutes = \?, priority = \? WHERE id = \?/)
    assert.deepEqual(pool.calls[0].values, [20, 'High', 1])
})


//check that an empty update skips the UPDATE statement
test('mysql repository skips an empty update', async () => {
    const pool = fakePool([[row]])
    await createMySqlServiceRepository(pool).updateService(1, {})

    assert.equal(pool.calls.length, 1)
    assert.match(pool.calls[0].sql, /^\s*SELECT/)
})


//check opening, closing, and listing queues
// Check opening, closing, and listing queues
test('mysql repository opens, closes, and lists queues', async () => {

    const queueRow = {
        id: 7,
        service_id: 1,
        status: 'open',
        created_at: 'now',
        closed_at: null
    }

    const pool = fakePool([
        {},                         // Open queue
        [queueRow],                 // Retrieve open queue
        [{ id: 7 }],                // Lock queue
        {},                         // Update waiting QueueEntry records
        {},                         // Close queue
        [
            queueRow,
            {
                ...queueRow,
                id: 6,
                status: 'closed',
                closed_at: 'then'
            }
        ],                         // List queues
        []                          // No open queue
    ])

    const repository = createMySqlServiceRepository(pool)

    const opened = await repository.openQueue(1)

    await repository.closeQueue(1)

    const queues = await repository.listQueues(1)

    const none = await repository.getOpenQueue(1)

    // Check the queue was opened
    assert.equal(opened.id, 7)

    // Check the queue was locked
    assert.match(pool.calls[2].sql, /FOR UPDATE/)

    // Check waiting users were removed
    assert.match(pool.calls[3].sql, /UPDATE QueueEntry/)
    assert.match(pool.calls[3].sql, /status = 'left'/)

    // Check the queue was closed
    assert.match(pool.calls[4].sql, /SET status = 'closed'/)

    // Verify the transaction completed
    assert.equal(pool.connection.committed, true)
    assert.equal(pool.connection.released, true)

    // Verify the returned queue information
    assert.equal(queues[1].closedAt, 'then')
    assert.equal(none, null)
})