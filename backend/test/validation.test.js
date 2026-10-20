import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLogin, validateRegistration } from '../src/validation.js'

test('registration requires a valid name, email, and password', () => {
  assert.deepEqual(validateRegistration({
    name: '  Alex Example  ',
    email: 'alex@example.com',
    password: 'valid-password',
  }), {})

  assert.deepEqual(validateRegistration({
    name: 'A',
    email: 'not-an-email',
    password: 'short',
  }), {
    name: 'Name must be between 2 and 80 characters.',
    email: 'Enter a valid email address.',
    password: 'Password must be between 8 and 128 characters.',
  })
})

test('login rejects malformed credentials', () => {
  assert.deepEqual(validateLogin({
    email: 'alex@example.com',
    password: 'valid-password',
  }), {})
  assert.deepEqual(validateLogin({ email: 'invalid', password: '' }), {
    email: 'Enter a valid email address.',
    password: 'Enter a password of 128 characters or fewer.',
  })
})
