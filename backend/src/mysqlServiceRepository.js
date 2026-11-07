//MySQL storage for the Service and Queue tables

const SERVICE_COLUMNS = `
  s.id, s.name, s.description, s.duration_minutes, s.priority,
  q.id AS open_queue_id`

//turn a database row into the shape the frontend already uses
function toService(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        duration: row.duration_minutes,
        priority: row.priority,
        isOpen: row.open_queue_id !== null && row.open_queue_id !== undefined,
        queueId: row.open_queue_id ?? null
    }
}

function toQueue(row) {
    return {
        id: row.id,
        serviceId: row.service_id,
        status: row.status,
        createdAt: row.created_at,
        closedAt: row.closed_at ?? null
    }
}

export function createMySqlServiceRepository(pool) {

    async function findServiceById(id, connection = pool) {
        const [rows] = await connection.execute(
            `SELECT ${SERVICE_COLUMNS}
             FROM Service s
             LEFT JOIN Queue q ON q.service_id = s.id AND q.status = 'open'
             WHERE s.id = ?`,
            [id]
        )
        return rows[0] ? toService(rows[0]) : null
    }

    async function listServices() {
        const [rows] = await pool.execute(
            `SELECT ${SERVICE_COLUMNS}
             FROM Service s
             LEFT JOIN Queue q ON q.service_id = s.id AND q.status = 'open'
             ORDER BY s.id`
        )
        return rows.map(toService)
    }

    //add a service and open its first queue in one transaction
    async function insertService(fields, { open = true } = {}) {
        const connection = await pool.getConnection()
        let transactionStarted = false
        try {
            await connection.beginTransaction()
            transactionStarted = true
            const [result] = await connection.execute(
                `INSERT INTO Service (name, description, duration_minutes, priority)
                 VALUES (?, ?, ?, ?)`,
                [fields.name, fields.description, fields.duration, fields.priority]
            )
            if (open) {
                await connection.execute(
                    `INSERT INTO Queue (service_id, status) VALUES (?, 'open')`,
                    [result.insertId]
                )
            }
            await connection.commit()
            transactionStarted = false
            return findServiceById(result.insertId)
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback()
            }
            throw error
        } finally {
            connection.release()
        }
    }

    async function updateService(id, fields) {
        const columns = {
            name: 'name',
            description: 'description',
            duration: 'duration_minutes',
            priority: 'priority'
        }
        const sets = []
        const values = []
        for (const [key, column] of Object.entries(columns)) {
            if (fields[key] !== undefined) {
                sets.push(`${column} = ?`)
                values.push(fields[key])
            }
        }
        if (sets.length > 0) {
            await pool.execute(
                `UPDATE Service SET ${sets.join(', ')} WHERE id = ?`,
                [...values, id]
            )
        }
        return findServiceById(id)
    }

    async function getOpenQueue(serviceId) {
        const [rows] = await pool.execute(
            `SELECT id, service_id, status, created_at, closed_at
             FROM Queue WHERE service_id = ? AND status = 'open'`,
            [serviceId]
        )
        return rows[0] ? toQueue(rows[0]) : null
    }

    async function listQueues(serviceId) {
        const [rows] = await pool.execute(
            `SELECT id, service_id, status, created_at, closed_at
             FROM Queue WHERE service_id = ? ORDER BY id DESC`,
            [serviceId]
        )
        return rows.map(toQueue)
    }

    async function openQueue(serviceId) {
        await pool.execute(
            `INSERT INTO Queue (service_id, status) VALUES (?, 'open')`,
            [serviceId]
        )
        return getOpenQueue(serviceId)
    }

    async function closeQueue(serviceId) {
    const connection = await pool.getConnection()

    try {
        await connection.beginTransaction()

        // Lock the open queue so nobody can join while it closes.
        const [rows] = await connection.execute(
            `SELECT id
             FROM Queue
             WHERE service_id = ?
               AND status = 'open'
             FOR UPDATE`,
            [serviceId]
        )

        if (rows.length > 0) {
            const queueId = rows[0].id

            // Remove everyone still waiting.
            await connection.execute(
                `UPDATE QueueEntry
                 SET status = 'left',
                     finished_at = CURRENT_TIMESTAMP(3)
                 WHERE queue_id = ?
                   AND status = 'waiting'`,
                [queueId]
            )

            // Close the queue.
            await connection.execute(
                `UPDATE Queue
                 SET status = 'closed',
                     closed_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [queueId]
            )
        }

        await connection.commit()

    } catch (error) {
        await connection.rollback()
        throw error

    } finally {
        connection.release()
    }
}

    return {
        listServices,
        findServiceById,
        insertService,
        updateService,
        getOpenQueue,
        listQueues,
        openQueue,
        closeQueue
    }
}
