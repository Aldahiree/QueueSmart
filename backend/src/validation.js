const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function validateRegistration(input) {
  const errors = {}

  if (!isRecord(input)) {
    return { name: 'Provide your name, email, and password.' }
  }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Name must be between 2 and 80 characters.'
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (password.length < 8 || password.length > 128) {
    errors.password = 'Password must be between 8 and 128 characters.'
  }

  return errors
}

export function validateLogin(input) {
  const errors = {}

  if (!isRecord(input)) {
    return { email: 'Provide your email address and password.' }
  }

  const email = typeof input.email === 'string' ? input.email.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!password || password.length > 128) {
    errors.password = 'Enter a password of 128 characters or fewer.'
  }

  return errors
}
