const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (response.status === 204) {
    return null
  }

  const result = await response.json()
  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors)[0]
      : null
    throw new Error(validationMessage || result.message || 'The request failed.')
  }
  return result
}

export function registerAccount({ name, email, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function loginAccount({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logoutAccount(token) {
  return request('/api/auth/logout', { method: 'POST', token })
}
