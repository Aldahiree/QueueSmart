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


export function createServiceService() {

    const services = new Map()
    let nextId = 1

    //save a service using the shape the frontend already expects
    function addService(input) {
        const service = {
            id: nextId++,
            name: input.name.trim(),
            description: input.description.trim(),
            duration: Number(input.duration),
            priority: input.priority,
            isOpen: input.isOpen ?? true
        }
        services.set(service.id, service)
        return service
    }

    //start with the same services as the mock data
    addService({ name: 'Academic Advising', description: 'Meet with an advisor', duration: 15, priority: 'Medium', isOpen: true })
    addService({ name: 'Financial Aid', description: 'Help with aid and billing', duration: 20, priority: 'High', isOpen: true })
    addService({ name: 'IT Help Desk', description: 'Tech and account support', duration: 10, priority: 'Low', isOpen: false })


    function listServices() {
        return [...services.values()].map(service => ({ ...service }))
    }


    function getService(id) {
        const service = services.get(Number(id))
        return service ? { ...service } : undefined
    }


    function createService(input) {
        const errors = validateService(input)
        if (Object.keys(errors).length > 0) {
            return { error: 'Invalid service details.', errors, status: 400 }
        }

        return { service: addService(input) }
    }


    function updateService(id, input) {
        const service = services.get(Number(id))
        if (!service) {
            return { error: 'Service not found.', status: 404 }
        }

        const errors = validateService(input, { partial: true })
        if (Object.keys(errors).length > 0) {
            return { error: 'Invalid service details.', errors, status: 400 }
        }

        if (input.name !== undefined) service.name = input.name.trim()
        if (input.description !== undefined) service.description = input.description.trim()
        if (input.duration !== undefined) service.duration = Number(input.duration)
        if (input.priority !== undefined) service.priority = input.priority
        if (input.isOpen !== undefined) service.isOpen = input.isOpen

        return { service: { ...service } }
    }


    //admins open or close a service
    function setServiceStatus(id, isOpen) {
        if (typeof isOpen !== 'boolean') {
            return { error: 'Open status must be true or false.', status: 400 }
        }
        return updateService(id, { isOpen })
    }


    return {
        listServices,
        getService,
        createService,
        updateService,
        setServiceStatus
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