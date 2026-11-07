export function createQueueService() {

    const queues = new Map()
    const servedUsers = new Map()
    let nextOrder = 0


    //get the users waiting for a specific service
    function getQueue(serviceId) {
        const queue = queues.get(String(serviceId)) || []

        return [...queue]
            .sort((a, b) => b.priority - a.priority || a.order - b.order)
            .map((entry, index) => ({
                userId: entry.userId,
                name: entry.name,
                serviceId: entry.serviceId,
                joinedAt: entry.joinedAt,
                priority: entry.priority,
                position: index + 1
            }))
    }


    //get the user's current position and status
    function getUserStatus(serviceId, userId) {
        const id = String(serviceId)
        const user = String(userId)
        const queue = getQueue(id)

        const entry = queue.find(
            entry => entry.userId === user
        )

        if (entry) {
            return {
                serviceId: id,
                status: 'waiting',
                position: entry.position,
                queueLength: queue.length
            }
        }

        //check if the user was already served
        if (servedUsers.get(id)?.has(user)) {
            return {
                serviceId: id,
                status: 'served',
                position: 0,
                queueLength: queue.length
            }
        }

        return {
            serviceId: id,
            status: 'not_in_queue',
            position: null,
            queueLength: queue.length
        }
    }


    // Find the queue this user is currently waiting in
    function getMyActiveQueue(userId) {
        const user = String(userId)

        for (const [serviceId] of queues) {
            const queue = getQueue(serviceId)

            const entry = queue.find(
                item => item.userId === user
            )

            if (entry) {
                return {
                    activeQueue: {
                        serviceId: Number(serviceId),
                        position: entry.position,
                        queueLength: queue.length
                    }
                }
            }
        }

        return { activeQueue: null }
    }


    //add the user to the queue
    function joinQueue(serviceId, userId, isOpen, priority = 0, name = '') {

        const id = String(serviceId)
        const user = String(userId)

        if (!isOpen) {
            return { error: "This service is closed.", status: 409 }
        }

        const queue = queues.get(id) || []

        //check if the user is already waiting
        if (queue.some(entry => entry.userId === user)) {
            return { error: "You are already in this queue.", status: 409 }
        }

        //check if the user is waiting in another service
        for (const [otherId, otherQueue] of queues) {
            if (
                otherId !== id &&
                otherQueue.some(entry => entry.userId === user)
            ) {
                return {
                    error: "You are already waiting in another queue.",
                    status: 409
                }
            }
        }

        const entry = {
            serviceId: id,
            userId: user,
            name: name,
            joinedAt: new Date().toISOString(),
            priority: Number.isFinite(priority) ? priority : 0,
            order: nextOrder++
        }

        queue.push(entry)
        queues.set(id, queue)

        //clear the old served status if the user joins again
        servedUsers.get(id)?.delete(user)

        const position = getQueue(id).find(
            entry => entry.userId === user
        )

        return {
            message: "You joined the queue.",
            position: position.position,
            queueLength: queue.length
        }
    }


    //remove the user when they leave the queue
    function leaveQueue(serviceId, userId) {

        const id = String(serviceId)
        const queue = queues.get(id) || []

        const index = queue.findIndex(
            entry => entry.userId === String(userId)
        )

        if (index === -1) {
            return {
                error: "You are not in this queue.",
                status: 404
            }
        }

        queue.splice(index, 1)

        return {
            message: "You left the queue.",
            queue: getQueue(id)
        }
    }


    //get the next person waiting and remove them from the queue
    function serveNext(serviceId) {

        const id = String(serviceId)
        const queue = getQueue(id)

        if (queue.length === 0) {
            return {
                error: "The queue is empty.",
                status: 409
            }
        }

        const nextUser = queue[0]

        leaveQueue(id, nextUser.userId)

        //remember which user was served
        const served = servedUsers.get(id) || new Set()

        served.add(nextUser.userId)
        servedUsers.set(id, served)

        return {
            message: "The next user is being served.",
            user: nextUser,
            queue: getQueue(id)
        }
    }


    return {
        getQueue,
        getUserStatus,
        getMyActiveQueue,
        joinQueue,
        leaveQueue,
        serveNext
    }
}


// Person 3: Database-backed queue management
// Uses QueueEntry instead of storing users in memory

export function createDatabaseQueueService(repository) {

    // Get everyone waiting for a service
    async function getQueue(serviceId) {

        const openQueue = await repository.getOpenQueue(serviceId)

        if (!openQueue) {
            return []
        }

        return repository.getWaitingEntries(openQueue.id)
    }


    // Get the user's current queue position and status
    async function getUserStatus(serviceId, userId) {

        const openQueue = await repository.getOpenQueue(serviceId)

        const queue = openQueue
            ? await repository.getWaitingEntries(openQueue.id)
            : []

        const entry = queue.find(
            item => item.userId === String(userId)
        )

        if (entry) {
            return {
                serviceId: String(serviceId),
                status: 'waiting',
                position: entry.position,
                queueLength: queue.length
            }
        }

        const latest = openQueue
            ? await repository.getLatestEntry(openQueue.id, userId)
            : null

        return {
            serviceId: String(serviceId),
            status: latest?.status === 'served'
                ? 'served'
                : 'not_in_queue',
            position: latest?.status === 'served' ? 0 : null,
            queueLength: queue.length
        }
    }


    // Find the queue this user is currently waiting in
    // This lets the frontend restore the active queue after refreshing
    async function getMyActiveQueue(userId) {

        const active = await repository.getActiveEntry(userId)

        if (!active) {
            return { activeQueue: null }
        }

        const queue = await repository.getWaitingEntries(
            active.queueId
        )

        const entry = queue.find(
            item => item.userId === String(userId)
        )

        if (!entry) {
            return { activeQueue: null }
        }

        return {
            activeQueue: {
                serviceId: Number(active.serviceId),
                position: entry.position,
                queueLength: queue.length
            }
        }
    }


    // Lock the open queue while changing its entries
    // This prevents two requests from serving the same user
    async function lockOpenQueue(serviceId, connection) {

        const [rows] = await connection.execute(
            `SELECT id
             FROM Queue
             WHERE service_id = ?
               AND status = 'open'
             FOR UPDATE`,
            [serviceId]
        )

        return rows[0] ?? null
    }


    // Join a queue
    async function joinQueue(serviceId, userId, isOpen, priority = 0) {

        if (!isOpen) {
            return {
                error: 'This service is closed.',
                status: 409
            }
        }

        try {
            return await repository.withTransaction(
                async connection => {

                    const openQueue = await lockOpenQueue(
                        serviceId,
                        connection
                    )

                    if (!openQueue) {
                        return {
                            error: 'This service is closed.',
                            status: 409
                        }
                    }

                    // Prevent duplicate active entries
                    const existing = await repository.getActiveEntry(
                        userId,
                        connection
                    )

                    if (existing) {
                        return {
                            error:
                                Number(existing.serviceId) === Number(serviceId)
                                    ? 'You are already in this queue.'
                                    : 'You are already waiting in another queue.',
                            status: 409
                        }
                    }

                    // Save the entry in MySQL
                    await repository.insertEntry(
                        openQueue.id,
                        userId,
                        Number.isFinite(priority) ? priority : 0,
                        connection
                    )

                    // Calculate the user's new position
                    const queue = await repository.getWaitingEntries(
                        openQueue.id,
                        connection
                    )

                    const entry = queue.find(
                        item => item.userId === String(userId)
                    )

                    return {
                        message: 'You joined the queue.',
                        position: entry.position,
                        queueLength: queue.length
                    }
                }
            )

        } catch (error) {

            // The database also prevents duplicate active entries
            if (error.code === 'ER_DUP_ENTRY') {
                return {
                    error: 'You are already waiting in a queue.',
                    status: 409
                }
            }

            throw error
        }
    }


    // Leave a queue
    async function leaveQueue(serviceId, userId) {

        return repository.withTransaction(async connection => {

            const existing = await repository.getActiveEntry(
                userId,
                connection
            )

            if (
                !existing ||
                Number(existing.serviceId) !== Number(serviceId)
            ) {
                return {
                    error: 'You are not in this queue.',
                    status: 404
                }
            }

            // Lock this queue before changing its entries
            await connection.execute(
                'SELECT id FROM Queue WHERE id = ? FOR UPDATE',
                [existing.queueId]
            )

            const changed = await repository.leaveQueue(
                existing.queueId,
                userId,
                connection
            )

            if (!changed) {
                return {
                    error: 'You are not in this queue.',
                    status: 404
                }
            }

            const openQueue = await repository.getOpenQueue(
                serviceId,
                connection
            )

            const queue = openQueue
                ? await repository.getWaitingEntries(
                    openQueue.id,
                    connection
                )
                : []

            return {
                message: 'You left the queue.',
                queue
            }
        })
    }


    // Serve the next waiting user
    async function serveNext(serviceId) {

        return repository.withTransaction(async connection => {

            const openQueue = await lockOpenQueue(
                serviceId,
                connection
            )

            if (!openQueue) {
                return {
                    error: 'The queue is empty.',
                    status: 409
                }
            }

            const waiting = await repository.getWaitingEntries(
                openQueue.id,
                connection
            )

            if (waiting.length === 0) {
                return {
                    error: 'The queue is empty.',
                    status: 409
                }
            }

            // First user has the highest priority
            const nextUser = waiting[0]

            const changed = await repository.markServed(
                nextUser.id,
                connection
            )

            if (!changed) {
                return {
                    error: 'Could not serve this user. Try again.',
                    status: 409
                }
            }

            const queue = await repository.getWaitingEntries(
                openQueue.id,
                connection
            )

            return {
                message: 'The next user is being served.',
                user: nextUser,
                queue
            }
        })
    }


    return {
        getQueue,
        getUserStatus,
        getMyActiveQueue,
        joinQueue,
        leaveQueue,
        serveNext
    }
}