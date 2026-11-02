import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import {
  validateLogin,
  validateProfile,
  validateRegistration,
} from './validation.js'

const scrypt = promisify(scryptCallback)
const PASSWORD_KEY_LENGTH = 64

export class AuthError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function hashPassword(password, salt) {
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH)
  return derivedKey.toString('hex')
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

function createInMemoryUserRepository() {
  const usersByEmail = new Map()
  const usersById = new Map()

  return {
    async createUser(user) {
      if (usersByEmail.has(user.email)) {
        const error = new Error('Duplicate email address.')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      usersByEmail.set(user.email, user)
      usersById.set(user.id, user)
      return user
    },
    async findByEmail(email) {
      return usersByEmail.get(email) ?? null
    },
    async findById(id) {
      return usersById.get(id) ?? null
    },
    async updateProfileName(id, name) {
      const user = usersById.get(id)
      if (!user) {
        return null
      }
      user.name = name
      return user
    },
  }
}

export function createAuthService({ userRepository = createInMemoryUserRepository() } = {}) {
  const sessions = new Map()
  const dummySalt = randomBytes(16).toString('hex')
  const dummyHash = hashPassword('not-a-real-account-password', dummySalt)

  async function addUser({ name, email, password, role }) {
    const normalizedEmail = email.trim().toLowerCase()
    const salt = randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(password, salt)

    try {
      return await userRepository.createUser({
        id: randomBytes(16).toString('hex'),
        name: name.trim(),
        email: normalizedEmail,
        role,
        salt,
        passwordHash,
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new AuthError(409, 'An account with this email already exists.')
      }
      throw error
    }
  }

  async function createSession(user) {
    const token = randomBytes(32).toString('base64url')
    sessions.set(token, user.id)
    return { token, user: publicUser(user) }
  }

  return {
    async register(input) {
      const errors = validateRegistration(input)
      if (Object.keys(errors).length > 0) {
        throw new AuthError(400, 'Check the registration details and try again.', errors)
      }

      const user = await addUser({
        name: input.name,
        email: input.email,
        password: input.password,
        role: 'User',
      })
      return createSession(user)
    },

    async login(input) {
      const errors = validateLogin(input)
      if (Object.keys(errors).length > 0) {
        throw new AuthError(400, 'Check the login details and try again.', errors)
      }

      const email = input.email.trim().toLowerCase()
      const user = await userRepository.findByEmail(email)
      const expectedHash = user ? user.passwordHash : await dummyHash
      const salt = user ? user.salt : dummySalt
      const actualHash = await hashPassword(input.password, salt)
      const hashesMatch = timingSafeEqual(
        Buffer.from(actualHash, 'hex'),
        Buffer.from(expectedHash, 'hex'),
      )

      if (!user || !hashesMatch) {
        throw new AuthError(401, 'Email or password is incorrect.')
      }

      return createSession(user)
    },

    async getUserForToken(token) {
      const userId = sessions.get(token)
      const user = userId ? await userRepository.findById(userId) : null
      if (!user) {
        sessions.delete(token)
      }
      return user ? publicUser(user) : null
    },

    async getProfile(userId) {
      const user = await userRepository.findById(userId)
      if (!user) {
        throw new AuthError(404, 'User profile was not found.')
      }
      return publicUser(user)
    },

    async updateProfile(userId, input) {
      const errors = validateProfile(input)
      if (Object.keys(errors).length > 0) {
        throw new AuthError(400, 'Check the profile details and try again.', errors)
      }

      const user = await userRepository.updateProfileName(userId, input.name.trim())
      if (!user) {
        throw new AuthError(404, 'User profile was not found.')
      }
      return publicUser(user)
    },

    revokeToken(token) {
      sessions.delete(token)
    },

    async seedAdministrator({ email, password }) {
      const errors = validateRegistration({
        name: 'QueueSmart Administrator',
        email,
        password,
      })
      if (Object.keys(errors).length > 0) {
        throw new Error(`Invalid administrator configuration: ${JSON.stringify(errors)}`)
      }

      const normalizedEmail = email.trim().toLowerCase()
      const existing = await userRepository.findByEmail(normalizedEmail)
      if (existing) {
        if (existing.role !== 'Administrator') {
          throw new Error('The configured administrator email belongs to a non-administrator account.')
        }
        return
      }

      await addUser({
        name: 'QueueSmart Administrator',
        email,
        password,
        role: 'Administrator',
      })
    },
  }
}
