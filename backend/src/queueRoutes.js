import { Router } from 'express'


export function createQueueRoutes({
    queueService,
    getService,
    getPriority = () => 0
}) {

    const router = Router()


    // Send the response depending on whether the request worked
    function sendResult(response, result, status = 200) {
        if (result.error) {
            return response.status(result.status).json({
                message: result.error
            })
        }

        return response.status(status).json(result)
    }


    // Check if the person is an administrator
    function adminOnly(request, response, next) {
        if (request.user.role !== 'Administrator') {
            return response.status(403).json({
                message: 'Only administrators can do this.'
            })
        }

        next()
    }


    // Person 3: Restore the user's active queue after refreshing
    router.get('/me/active', async (request, response) => {

        if (request.user.role !== 'User') {
            return response.status(403).json({
                message: 'Only users can check their queue.'
            })
        }

        const result = await queueService.getMyActiveQueue(
            request.user.id
        )

        return response.json(result)
    })


    // Let a user join a queue
    router.post('/:serviceId/join', async (request, response) => {

        if (request.user.role !== 'User') {
            return response.status(403).json({
                message: 'Only users can join queues.'
            })
        }

        const service = await getService(request.params.serviceId)

        if (!service) {
            return response.status(404).json({
                message: 'Service not found.'
            })
        }

        // Get the service status from the backend
        const isOpen = service.isOpen === true ||
            String(service.status).toLowerCase() === 'open'

        const priority = getPriority(request.user, service)

        const result = await queueService.joinQueue(
            request.params.serviceId,
            request.user.id,
            isOpen,
            priority,
            request.user.name
        )

        return sendResult(response, result, 201)
    })


    // Let a user leave their queue
    router.post('/:serviceId/leave', async (request, response) => {

        if (request.user.role !== 'User') {
            return response.status(403).json({
                message: 'Only users can leave queues.'
            })
        }

        const result = await queueService.leaveQueue(
            request.params.serviceId,
            request.user.id
        )

        return sendResult(response, result)
    })


    // Let users check their own queue status
    router.get('/:serviceId/status', async (request, response) => {

        if (request.user.role !== 'User') {
            return response.status(403).json({
                message: 'Only users can check their queue status.'
            })
        }

        const service = await getService(request.params.serviceId)

        if (!service) {
            return response.status(404).json({
                message: 'Service not found.'
            })
        }

        const result = await queueService.getUserStatus(
            request.params.serviceId,
            request.user.id
        )

        return response.json(result)
    })


    // Allow an admin to see everyone waiting
    router.get('/:serviceId', adminOnly, async (request, response) => {

        const service = await getService(request.params.serviceId)

        if (!service) {
            return response.status(404).json({
                message: 'Service not found.'
            })
        }

        const queue = await queueService.getQueue(
            request.params.serviceId
        )

        return response.json({
            serviceId: request.params.serviceId,
            queueLength: queue.length,
            queue
        })
    })


    // Admin serves the next user in the queue
    router.post('/:serviceId/next', adminOnly, async (request, response) => {

        const service = await getService(request.params.serviceId)

        if (!service) {
            return response.status(404).json({
                message: 'Service not found.'
            })
        }

        const result = await queueService.serveNext(
            request.params.serviceId
        )

        return sendResult(response, result)
    })


    return router
}