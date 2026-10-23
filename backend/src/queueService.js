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
        if (otherId !== id && otherQueue.some(entry => entry.userId === user)) {
        return { error: "You are already waiting in another queue.", status: 409 }
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
            return { error: "You are not in this queue.", status: 404 }
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
            return { error: "The queue is empty.", status: 409 }
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
        joinQueue,
        leaveQueue,
        serveNext
    }
}