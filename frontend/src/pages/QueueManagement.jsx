import { useEffect, useState } from 'react'
import './Admin.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function QueueManagement({ token }) {
  const [services, setServices] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [queue, setQueue] = useState([])

  const [loadingServices, setLoadingServices] = useState(true)
  const [loading, setLoading] = useState(false)
  const [serving, setServing] = useState(false)

  const [serviceError, setServiceError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refresh, setRefresh] = useState(0)

  const selectedService = services.find(
    (service) => String(service.id) === String(selectedServiceId)
  )


  //load the actual services from the backend
  useEffect(() => {
    let cancelled = false

    async function loadServices() {
      if (!token) {
        setServices([])
        setSelectedServiceId('')
        setLoadingServices(false)
        setServiceError('Please log in as an administrator.')
        return
      }

      setLoadingServices(true)
      setServiceError('')

      try {
        const response = await fetch(`${API_URL}/api/services`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Could not load services.')
        }

        if (!cancelled) {
          const list = Array.isArray(data.services) ? data.services : []

          setServices(list)

          setSelectedServiceId((current) => {
            const exists = list.some(
              (service) => String(service.id) === String(current)
            )

            return exists ? current : String(list[0]?.id ?? '')
          })
        }

      } catch (error) {
        if (!cancelled) {
          setServices([])
          setSelectedServiceId('')
          setServiceError(error.message)
        }

      } finally {
        if (!cancelled) {
          setLoadingServices(false)
        }
      }
    }

    loadServices()

    return () => {
      cancelled = true
    }

  }, [token, refresh])


  //load the selected queue from the backend
  useEffect(() => {
    let cancelled = false

    async function loadQueue() {
      if (!token || !selectedService) {
        setQueue([])
        setLoading(false)
        return
      }

      setLoading(true)
      setQueue([])
      setError('')

      try {
        const response = await fetch(
          `${API_URL}/api/queues/${selectedService.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Could not load the queue.')
        }

        if (!cancelled) {
          setQueue(data.queue || [])
        }

      } catch (error) {
        if (!cancelled) {
          setQueue([])
          setError(error.message)
        }

      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadQueue()

    return () => {
      cancelled = true
    }

  }, [selectedServiceId, token, refresh])


  //serve the first user waiting in the queue
  async function serveNext() {
    if (!selectedService || queue.length === 0 || serving) {
      return
    }

    setError('')
    setMessage('')
    setServing(true)

    try {
      const response = await fetch(
        `${API_URL}/api/queues/${selectedService.id}/next`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not serve the next user.')
      }

      setQueue(data.queue || [])
      setMessage('The next user is now being served.')

    } catch (error) {
      setError(error.message)

    } finally {
      setServing(false)
    }
  }


  //refresh both the services and waiting list
  function refreshQueue() {
    setMessage('')
    setRefresh((value) => value + 1)
  }


  return (
    <div className='admin-page'>
      <h1>Queue Management</h1>

      <p>
        Select a service and manage the users currently waiting.
      </p>

      <div className='service-select'>
        <label>Choose Service</label>

        <select
          value={selectedServiceId}
          disabled={loadingServices || serving}
          onChange={(event) => {
            setSelectedServiceId(event.target.value)
            setMessage('')
            setError('')
          }}
        >
          {services.length === 0 && (
            <option value="">No services available</option>
          )}

          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      {loadingServices && (
        <p>Loading services...</p>
      )}

      {serviceError && (
        <p style={{ color: '#c0392b' }}>{serviceError}</p>
      )}

      {selectedService && (
        <>
          <h2>{selectedService.name} Queue</h2>

          <p>
            Service Status:{' '}
            <strong>
              {selectedService.isOpen ? 'Open' : 'Closed'}
            </strong>
          </p>

          <p>
            People Waiting: <strong>{queue.length}</strong>
          </p>
        </>
      )}

      {error && (
        <p style={{ color: '#c0392b' }}>{error}</p>
      )}

      {message && (
        <p style={{ color: 'green' }}>{message}</p>
      )}

      <button
        onClick={serveNext}
        disabled={!selectedService || queue.length === 0 || loading || serving}
      >
        {serving ? 'Serving...' : 'Serve Next User'}
      </button>

      <button
        onClick={refreshQueue}
        disabled={loading || loadingServices || serving}
      >
        Refresh Queue
      </button>

      {loading ? (
        <p>Loading queue...</p>
      ) : selectedService && queue.length > 0 ? (
        <table className='queue-table'>
          <thead>
            <tr>
              <th>Position</th>
              <th>Name / User ID</th>
              <th>Estimated Wait</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {queue.map((user, index) => (
              <tr key={user.userId}>
                <td>{user.position}</td>

                <td>{user.name || user.userId}</td>

                <td>
                  {index * selectedService.duration} minutes
                </td>

                <td>
                  <button disabled title="Backend support not added yet">
                    Up
                  </button>

                  <button disabled title="Backend support not added yet">
                    Down
                  </button>

                  <button disabled title="Backend support not added yet">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className='empty-message'>
          No users are currently waiting.
        </p>
      )}
    </div>
  )
}

export default QueueManagement