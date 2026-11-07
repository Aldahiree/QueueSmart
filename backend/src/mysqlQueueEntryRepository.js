export function createMySqlQueueEntryRepository(pool) {

    // Find the currently open queue for a service
    async function getOpenQueue(serviceId, connection = pool) {
        const [rows] = await connection.execute(
            `SELECT id
             FROM Queue
             WHERE service_id = ? AND status = 'open'
             LIMIT 1`,
            [serviceId]
        )

        return rows[0] ?? null
    }


    // Get everyone waiting in a queue
    async function getWaitingEntries(queueId, connection = pool) {
        const [rows] = await connection.execute(
            `SELECT
                e.id,
                e.user_id AS userId,
                p.name,
                q.service_id AS serviceId,
                e.priority,
                e.joined_at AS joinedAt
             FROM QueueEntry e
             JOIN Queue q ON e.queue_id = q.id
             LEFT JOIN UserProfile p ON e.user_id = p.user_id
             WHERE e.queue_id = ?
               AND e.status = 'waiting'
             ORDER BY
                e.priority DESC,
                e.joined_at ASC,
                e.id ASC`,
            [queueId]
        )

        return rows.map((entry, index) => ({
            ...entry,
            userId: String(entry.userId),
            serviceId: String(entry.serviceId),
            name: entry.name ?? '',
            joinedAt: entry.joinedAt instanceof Date
                ? entry.joinedAt.toISOString()
                : entry.joinedAt,
            position: index + 1
        }))
    }


    // Check if the user is already waiting in any queue
    async function getActiveEntry(userId, connection = pool) {
        const [rows] = await connection.execute(
            `SELECT
                e.id,
                e.queue_id AS queueId,
                q.service_id AS serviceId
             FROM QueueEntry e
             JOIN Queue q ON e.queue_id = q.id
             WHERE e.user_id = ?
               AND e.status = 'waiting'
             LIMIT 1`,
            [userId]
        )

        return rows[0] ?? null
    }


    // Find the user's most recent entry in a queue
    async function getLatestEntry(queueId, userId, connection = pool) {
        const [rows] = await connection.execute(
            `SELECT id, status
             FROM QueueEntry
             WHERE queue_id = ?
               AND user_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [queueId, userId]
        )

        return rows[0] ?? null
    }


    // Save a new queue entry
    async function insertEntry(queueId, userId, priority = 0, connection = pool) {
        const [result] = await connection.execute(
            `INSERT INTO QueueEntry (
                queue_id,
                user_id,
                priority,
                status
             )
             VALUES (?, ?, ?, 'waiting')`,
            [queueId, userId, priority]
        )

        return result.insertId
    }


    // Remove a waiting user from the queue
    async function leaveQueue(queueId, userId, connection = pool) {
        const [result] = await connection.execute(
            `UPDATE QueueEntry
             SET status = 'left',
                 finished_at = CURRENT_TIMESTAMP(3)
             WHERE queue_id = ?
               AND user_id = ?
               AND status = 'waiting'`,
            [queueId, userId]
        )

        return result.affectedRows > 0
    }


    // Mark a queue entry as served
    async function markServed(entryId, connection = pool) {
        const [result] = await connection.execute(
            `UPDATE QueueEntry
             SET status = 'served',
                 finished_at = CURRENT_TIMESTAMP(3)
             WHERE id = ?
               AND status = 'waiting'`,
            [entryId]
        )

        return result.affectedRows > 0
    }


    // Run related database operations in one transaction
    async function withTransaction(callback) {
        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            const result = await callback(connection)

            await connection.commit()

            return result
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }


    return {
        getOpenQueue,
        getWaitingEntries,
        getActiveEntry,
        getLatestEntry,
        insertEntry,
        leaveQueue,
        markServed,
        withTransaction
    }
}