const PRIORITIES = ['Low', 'Medium', 'High']

//check the service fields and return any errors
export function validateService(input, { partial = false } = {}) {
    const errors = {}

    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return { name: 'Provide the service details.' }
    }

    if (!partial || input.name !== undefined) {
        const name = typeof input.name === 'string' ? input.name.trim() : ''
        if (name.length < 2 || name.length > 100) {
            errors.name = 'Service name must be between 2 and 100 characters.'
        }
    }

    if (!partial || input.description !== undefined) {
        const description = typeof input.description === 'string' ? input.description.trim() : ''
        if (description.length < 1 || description.length > 500) {
            errors.description = 'Description must be between 1 and 500 characters.'
        }
    }

    if (!partial || input.duration !== undefined) {
        const duration = Number(input.duration)
        if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
            errors.duration = 'Expected duration must be a whole number of minutes from 1 to 480.'
        }
    }

    if (!partial || input.priority !== undefined) {
        if (!PRIORITIES.includes(input.priority)) {
            errors.priority = 'Priority must be Low, Medium, or High.'
        }
    }

    if (input.isOpen !== undefined && typeof input.isOpen !== 'boolean') {
        errors.isOpen = 'Open status must be true or false.'
    }

    return errors
}


//in-memory storage used by unit tests when no database is passed in
export function createInMemoryServiceRepository() {

    const services = new Map()
    const queues = []
    let nextServiceId = 1
    let nextQueueId = 1

    function duplicateName(name, ignoreId) {
        for (const service of services.values()) {
            if (service.id !== ignoreId && service.name.toLowerCase() === name.toLowerCase()) {
                const error = new Error('Duplicate service name.')
                error.code = 'ER_DUP_ENTRY'
                throw error
            }
        }
    }

    function findOpen(serviceId) {
        return queues.find(queue => queue.serviceId === serviceId && queue.status === 'open')
    }

    function toService(service) {
        const open = findOpen(service.id)
        return { ...service, isOpen: Boolean(open), queueId: open ? open.id : null }
    }

    async function openQueue(serviceId) {
        const id = Number(serviceId)
        if (findOpen(id)) {
            const error = new Error('Queue already open.')
            error.code = 'ER_DUP_ENTRY'
            throw error
        }
        const queue = {
            id: nextQueueId++,
            serviceId: id,
            status: 'open',
            createdAt: new Date().toISOString(),
            closedAt: null
        }
        queues.push(queue)
        return { ...queue }
    }

    return {
        async listServices() {
            return [...services.values()].map(toService)
        },
        async findServiceById(id) {
            const service = services.get(Number(id))
            return service ? toService(service) : null
        },
        async insertService(fields, { open = true } = {}) {
            duplicateName(fields.name)
            const service = { id: nextServiceId++, ...fields }
            services.set(service.id, service)
            if (open) await openQueue(service.id)
            return toService(service)
        },
        async updateService(id, fields) {
            const service = services.get(Number(id))
            if (!service) return null
            if (fields.name !== undefined) duplicateName(fields.name, service.id)
            for (const key of ['name', 'description', 'duration', 'priority']) {
                if (fields[key] !== undefined) service[key] = fields[key]
            }
            return toService(service)
        },
        async getOpenQueue(serviceId) {
            const open = findOpen(Number(serviceId))
            return open ? { ...open } : null
        },
        async listQueues(serviceId) {
            return queues
                .filter(queue => queue.serviceId === Number(serviceId))
                .reverse()
                .map(queue => ({ ...queue }))
        },
        openQueue,
        async closeQueue(serviceId) {
            const open = findOpen(Number(serviceId))
            if (open) {
                open.status = 'closed'
                open.closedAt = new Date().toISOString()
            }
        }
    }
}


//start the in-memory version with the same services as the mock data
function seededInMemoryRepository() {
    const repository = createInMemoryServiceRepository()
    const seeds = [
        [{ name: 'Academic Advising', description: 'Meet with an advisor', duration: 15, priority: 'Medium' }, true],
        [{ name: 'Financial Aid', description: 'Help with aid and billing', duration: 20, priority: 'High' }, true],
        [{ name: 'IT Help Desk', description: 'Tech and account support', duration: 10, priority: 'Low' }, false]
    ]
    for (const [fields, open] of seeds) {
        repository.insertService(fields, { open })
    }
    return repository
}


function isValidId(id) {
    const number = Number(id)
    return Number.isInteger(number) && number > 0
}


export function createServiceService({ serviceRepository = seededInMemoryRepository() } = {}) {

    const repository = serviceRepository

    function duplicateNameResult() {
        return {
            error: 'A service with that name already exists.',
            errors: { name: 'A service with that name already exists.' },
            status: 409
        }
    }

    async function listServices() {
        return repository.listServices()
    }


    async function getService(id) {
        if (!isValidId(id)) return undefined
        const service = await repository.findServiceById(Number(id))
        return service ?? undefined
    }


    async function createService(input) {
        const errors = validateService(input)
        if (Object.keys(errors).length > 0) {
            return { error: 'Invalid service details.', errors, status: 400 }
        }

        try {
            const service = await repository.insertService({
                name: input.name.trim(),
                description: input.description.trim(),
                duration: Number(input.duration),
                priority: input.priority
            }, { open: input.isOpen ?? true })
            return { service }
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return duplicateNameResult()
            throw error
        }
    }


    async function updateService(id, input) {
        const existing = await getService(id)
        if (!existing) {
            return { error: 'Service not found.', status: 404 }
        }

        const errors = validateService(input, { partial: true })
        if (Object.keys(errors).length > 0) {
            return { error: 'Invalid service details.', errors, status: 400 }
        }

        const fields = {}
        if (input.name !== undefined) fields.name = input.name.trim()
        if (input.description !== undefined) fields.description = input.description.trim()
        if (input.duration !== undefined) fields.duration = Number(input.duration)
        if (input.priority !== undefined) fields.priority = input.priority

        try {
            await repository.updateService(existing.id, fields)
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return duplicateNameResult()
            throw error
        }

        if (input.isOpen !== undefined && input.isOpen !== existing.isOpen) {
            return setServiceStatus(existing.id, input.isOpen)
        }

        return { service: await getService(existing.id) }
    }


    //admins open or close a service by opening or closing its queue
    async function setServiceStatus(id, isOpen) {
        if (typeof isOpen !== 'boolean') {
            return { error: 'Open status must be true or false.', status: 400 }
        }

        const service = await getService(id)
        if (!service) {
            return { error: 'Service not found.', status: 404 }
        }

        if (isOpen && !service.isOpen) {
            try {
                await repository.openQueue(service.id)
            } catch (error) {
                //another request opened it first, which is the result we wanted
                if (error.code !== 'ER_DUP_ENTRY') throw error
            }
        } else if (!isOpen && service.isOpen) {
            await repository.closeQueue(service.id)
        }

        return { service: await getService(service.id) }
    }


    //the open queue for a service, used when users join
    async function getOpenQueue(serviceId) {
        if (!isValidId(serviceId)) return null
        return repository.getOpenQueue(Number(serviceId))
    }


    //every queue a service has had, newest first
    async function listQueues(serviceId) {
        const service = await getService(serviceId)
        if (!service) {
            return { error: 'Service not found.', status: 404 }
        }
        return { serviceId: service.id, queues: await repository.listQueues(service.id) }
    }


    return {
        listServices,
        getService,
        createService,
        updateService,
        setServiceStatus,
        getOpenQueue,
        listQueues
    }
}


//estimate wait time from the number of people ahead of you
export function estimateWaitTime(position, duration) {
    if (!Number.isInteger(position) || position < 1) {
        return { error: 'Position must be a whole number of 1 or more.', status: 400 }
    }
    if (!Number.isFinite(duration) || duration < 1) {
        return { error: 'Duration must be a positive number.', status: 400 }
    }

    return { waitMinutes: (position - 1) * duration }
}