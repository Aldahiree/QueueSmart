import test from 'node:test'
import assert from 'node:assert/strict'

import { createServiceService, estimateWaitTime } from '../src/serviceService.js'


//check that the starting services are loaded
test('lists the seeded services', () => {
    const service = createServiceService()

    const services = service.listServices()

    assert.equal(services.length, 3)
    assert.equal(services[0].name, 'Academic Advising')
})


//check that an admin can create a valid service
test('creates a valid service', () => {
    const service = createServiceService()

    const result = service.createService({
        name: 'Tutoring',
        description: 'Help with coursework',
        duration: 30,
        priority: 'Low'
    })

    assert.equal(result.service.name, 'Tutoring')
    assert.equal(result.service.isOpen, true)
    assert.equal(service.listServices().length, 4)
})


//check that a missing name is rejected
test('rejects a service with no name', () => {
    const service = createServiceService()

    const result = service.createService({
        description: 'Help with coursework',
        duration: 30,
        priority: 'Low'
    })

    assert.equal(result.status, 400)
    assert.ok(result.errors.name)
})


//check the wait time for the person at the front
test('wait time is zero at position 1', () => {
    const result = estimateWaitTime(1, 15)

    assert.equal(result.waitMinutes, 0)
})


//check that a duration of 0 is rejected
test('rejects a duration of 0', () => {
    const service = createServiceService()

    const result = service.createService({
        name: 'Tutoring',
        description: 'Help with coursework',
        duration: 0,
        priority: 'Low'
    })

    assert.equal(result.status, 400)
    assert.ok(result.errors.duration)
})


//check that a duration that is not a number is rejected
test('rejects a duration that is not a number', () => {
    const service = createServiceService()

    const result = service.createService({
        name: 'Tutoring',
        description: 'Help with coursework',
        duration: 'abc',
        priority: 'Low'
    })

    assert.equal(result.status, 400)
    assert.ok(result.errors.duration)
})


//check that an unknown priority is rejected
test('rejects an unknown priority', () => {
    const service = createServiceService()

    const result = service.createService({
        name: 'Tutoring',
        description: 'Help with coursework',
        duration: 30,
        priority: 'Urgent'
    })

    assert.equal(result.status, 400)
    assert.ok(result.errors.priority)
})


//check that a name over 100 characters is rejected
test('rejects a name that is too long', () => {
    const service = createServiceService()

    const result = service.createService({
        name: 'a'.repeat(101),
        description: 'Help with coursework',
        duration: 30,
        priority: 'Low'
    })

    assert.equal(result.status, 400)
    assert.ok(result.errors.name)
})


//check that a missing description is rejected
test('rejects a service with no description', () => {
    const service = createServiceService()

    const result = service.createService({
        name: 'Tutoring',
        duration: 30,
        priority: 'Low'
    })

    assert.equal(result.status, 400)
    assert.ok(result.errors.description)
})


//check that empty input is rejected
test('rejects empty service input', () => {
    const service = createServiceService()

    const result = service.createService(null)

    assert.equal(result.status, 400)
})


//check that an admin can update a service
test('updates a service duration', () => {
    const service = createServiceService()

    const result = service.updateService(1, { duration: 25 })

    assert.equal(result.service.duration, 25)
    assert.equal(service.getService(1).duration, 25)
})


//check that updating one field leaves the others alone
test('update keeps the fields that were not changed', () => {
    const service = createServiceService()

    service.updateService(1, { priority: 'High' })

    const updated = service.getService(1)
    assert.equal(updated.priority, 'High')
    assert.equal(updated.name, 'Academic Advising')
})


//check that an invalid update is rejected and nothing changes
test('rejects an invalid update', () => {
    const service = createServiceService()

    const result = service.updateService(1, { duration: -5 })

    assert.equal(result.status, 400)
    assert.equal(service.getService(1).duration, 15)
})


//check that updating a service that does not exist fails
test('cannot update a service that does not exist', () => {
    const service = createServiceService()

    const result = service.updateService(99, { duration: 25 })

    assert.equal(result.status, 404)
})


//check that getting a missing service returns nothing
test('getService returns undefined for a missing service', () => {
    const service = createServiceService()

    assert.equal(service.getService(99), undefined)
})


//check that an admin can close a service
test('admin can close a service', () => {
    const service = createServiceService()

    const result = service.setServiceStatus(1, false)

    assert.equal(result.service.isOpen, false)
})


//check that an admin can open a closed service
test('admin can open a closed service', () => {
    const service = createServiceService()

    const result = service.setServiceStatus(3, true)

    assert.equal(result.service.isOpen, true)
})


//check that the open status must be true or false
test('rejects an open status that is not true or false', () => {
    const service = createServiceService()

    const result = service.setServiceStatus(1, 'yes')

    assert.equal(result.status, 400)
    assert.equal(service.getService(1).isOpen, true)
})


//check the wait time for someone further back
test('wait time counts the people ahead', () => {
    const result = estimateWaitTime(3, 15)

    assert.equal(result.waitMinutes, 30)
})


//check that position 0 is rejected
test('wait time rejects position 0', () => {
    const result = estimateWaitTime(0, 15)

    assert.equal(result.status, 400)
})


//check that a bad duration is rejected
test('wait time rejects an invalid duration', () => {
    const result = estimateWaitTime(2, 0)

    assert.equal(result.status, 400)
})