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
    throw new Error(result.message || 'The request failed.')
  }
  return result
}

export function getNotifications(token) {
  return request('/api/notifications', { token })
}

export function markNotificationRead(token, id) {
  return request(`/api/notifications/${id}/read`, { method: 'PATCH', token })
}

export function markAllNotificationsRead(token) {
  return request('/api/notifications/read-all', { method: 'POST', token })
}

export function clearNotifications(token) {
  return request('/api/notifications', { method: 'DELETE', token })
}
