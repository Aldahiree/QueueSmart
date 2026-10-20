import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import { validateLogin, validateRegistration } from './validation.js'

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

export function createAuthService() {
  const usersByEmail = new Map()
  const usersById = new Map()
  const sessions = new Map()
  const dummySalt = randomBytes(16).toString('hex')
  const dummyHash = hashPassword('not-a-real-account-password', dummySalt)

  async function addUser({ name, email, password, role }) {
    const normalizedEmail = email.trim().toLowerCase()
    const salt = randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(password, salt)
    if (usersByEmail.has(normalizedEmail)) {
      throw new AuthError(409, 'An account with this email already exists.')
    }

    const user = {
      id: randomBytes(16).toString('hex'),
      name: name.trim(),
      email: normalizedEmail,
      role,
      salt,
      passwordHash,
    }

    usersByEmail.set(user.email, user)
    usersById.set(user.id, user)
    return user
  }

  function createSession(user) {
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
      const user = usersByEmail.get(email)
      const expectedHash = user
        ? user.passwordHash
        : await dummyHash
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

    getUserForToken(token) {
      const userId = sessions.get(token)
      const user = userId ? usersById.get(userId) : undefined
      return user ? publicUser(user) : null
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

      await addUser({
        name: 'QueueSmart Administrator',
        email,
        password,
        role: 'Administrator',
      })
    },
  }
}
