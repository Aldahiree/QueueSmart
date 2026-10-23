const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

//send a request to the service API with the login token
async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const result = await response.json()

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors)[0]
      : null
    throw new Error(validationMessage || result.message || 'The request failed.')
  }
  return result
}

export function getServices(token) {
  return request('/api/services', { token })
}

export function createService(token, service) {
  return request('/api/services', {
    method: 'POST',
    token,
    body: JSON.stringify(service),
  })
}

export function updateService(token, id, service) {
  return request(`/api/services/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(service),
  })
}

export function setServiceStatus(token, id, isOpen) {
  return request(`/api/services/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ isOpen }),
  })
}