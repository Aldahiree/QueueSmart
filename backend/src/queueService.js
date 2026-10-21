export function createQueueService() {

    const queues = new Map()
    let nextOrder = 0


    //get the users waiting for a specific service
    function getQueue(serviceId) {
        const queue = queues.get(String(serviceId)) || []

        return [...queue]
            .sort((a, b) => b.priority - a.priority || a.order - b.order)
            .map((entry, index) => ({
                userId: entry.userId,
                serviceId: entry.serviceId,
                joinedAt: entry.joinedAt,
                priority: entry.priority,
                position: index + 1
            }))
    }


    //add the user to the queue
    function joinQueue(serviceId, userId, isOpen, priority = 0) {

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

        const entry = {
            serviceId: id,
            userId: user,
            joinedAt: new Date().toISOString(),
            priority: Number.isFinite(priority) ? priority : 0,
            order: nextOrder++
        }

        queue.push(entry)
        queues.set(id, queue)

        const position = getQueue(id).find(entry => entry.userId === user)

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

        const queue = getQueue(serviceId)

        if (queue.length === 0) {
            return { error: "The queue is empty.", status: 409 }
        }

        const nextUser = queue[0]

        leaveQueue(serviceId, nextUser.userId)

        return {
            message: "The next user is being served.",
            user: nextUser,
            queue: getQueue(serviceId)
        }
    }


    return {
        getQueue,
        joinQueue,
        leaveQueue,
        serveNext
    }
}