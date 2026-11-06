import { Router } from 'express'

import { estimateWaitTime } from './serviceService.js'


export function createServiceRoutes({ serviceService, queueService }) {

    const router = Router()


    //send the response depending on whether the request worked
    function sendResult(response, result, status = 200) {
        if (result.error) {
            return response.status(result.status).json({
                message: result.error,
                ...(result.errors ? { errors: result.errors } : {})
            })
        }

        return response.status(status).json(result)
    }


    //check if the person is an administrator
    function adminOnly(request, response, next) {
        if (request.user.role !== 'Administrator') {
            return response.status(403).json({
                message: 'Only administrators can do this.'
            })
        }

        next()
    }


    //anyone logged in can see the list of services
    router.get('/', async (request, response) => {
        return response.json({ services: await serviceService.listServices() })
    })


    //anyone logged in can see one service
    router.get('/:id', async (request, response) => {
        const service = await serviceService.getService(request.params.id)

        if (!service) {
            return response.status(404).json({
                message: 'Service not found.'
            })
        }

        return response.json({ service })
    })


    //admin creates a new service
    router.post('/', adminOnly, async (request, response) => {
        const result = await serviceService.createService(request.body)
        return sendResult(response, result, 201)
    })


    //admin updates a service
    router.put('/:id', adminOnly, async (request, response) => {
        const result = await serviceService.updateService(request.params.id, request.body)
        return sendResult(response, result)
    })


    //admin sees every queue a service has had (open and closed)
    router.get('/:id/queues', adminOnly, async (request, response) => {
        const result = await serviceService.listQueues(request.params.id)
        return sendResult(response, result)
    })


    //admin opens or closes a service
    router.patch('/:id/status', adminOnly, async (request, response) => {
        const result = await serviceService.setServiceStatus(request.params.id, request.body?.isOpen)
        return sendResult(response, result)
    })


    //user checks their estimated wait time
    router.get('/:id/wait-time', async (request, response) => {
        const service = await serviceService.getService(request.params.id)

        if (!service) {
            return response.status(404).json({
                message: 'Service not found.'
            })
        }

        const status = await queueService.getUserStatus(request.params.id, request.user.id)

        if (status.status !== 'waiting') {
            return response.status(404).json({
                message: 'You are not waiting in this queue.'
            })
        }

        const result = estimateWaitTime(status.position, service.duration)

        if (result.error) {
            return sendResult(response, result)
        }

        return response.json({
            serviceId: service.id,
            position: status.position,
            waitMinutes: result.waitMinutes
        })
    })


    return router
}