const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.message || 'The request failed.')
  }
  return result
}

export function getHistory(token) {
  return request('/api/history', { token })
}
