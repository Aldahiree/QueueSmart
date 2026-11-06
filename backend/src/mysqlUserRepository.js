export function createMySqlUserRepository(pool) {
  async function findById(id, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT c.id, p.name, c.email, c.role, c.password_salt AS salt,
              c.password_hash AS passwordHash
       FROM UserCredentials c
       JOIN UserProfile p ON p.user_id = c.id
       WHERE c.id = ?`,
      [id],
    )
    return rows[0] ?? null
  }

  return {
    async createUser(user) {
      const connection = await pool.getConnection()
      let transactionStarted = false
      try {
        await connection.beginTransaction()
        transactionStarted = true
        await connection.execute(
          `INSERT INTO UserCredentials
             (id, email, password_salt, password_hash, role)
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, user.email, user.salt, user.passwordHash, user.role],
        )
        await connection.execute(
          'INSERT INTO UserProfile (user_id, name) VALUES (?, ?)',
          [user.id, user.name],
        )
        await connection.commit()
        transactionStarted = false
        return user
      } catch (error) {
        if (transactionStarted) {
          await connection.rollback()
        }
        throw error
      } finally {
        connection.release()
      }
    },

    async findByEmail(email) {
      const [rows] = await pool.execute(
        `SELECT c.id, p.name, c.email, c.role, c.password_salt AS salt,
                c.password_hash AS passwordHash
         FROM UserCredentials c
         JOIN UserProfile p ON p.user_id = c.id
         WHERE c.email = ?`,
        [email],
      )
      return rows[0] ?? null
    },

    findById,

    async updateProfileName(id, name) {
      await pool.execute(
        'UPDATE UserProfile SET name = ? WHERE user_id = ?',
        [name, id],
      )
      return findById(id)
    },
  }
}
