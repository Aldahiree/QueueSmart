import { useEffect, useState } from 'react'
import { services } from '../data/mockData'
import './Admin.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function QueueManagement({ token }) {
  const [selectedServices, setSelectedServices] = useState(services[0].name)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [serving, setServing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refresh, setRefresh] = useState(0)

  const selectedService = services.find(
    (service) => service.name === selectedServices
  )


  //load the queue from the backend
  useEffect(() => {
    let cancelled = false

    async function loadQueue() {
      if (!token) {
        setQueue([])
        setError('Please log in as an administrator.')
        return
      }

      setLoading(true)
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

  }, [selectedServices, selectedService?.id, token, refresh])


  //serve the first user waiting in the queue
  async function serveNext() {
    if (queue.length === 0 || serving) {
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


  //refresh the waiting list
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
          value={selectedServices}
          onChange={(event) => {
            setSelectedServices(event.target.value)
            setMessage('')
          }}
        >
          {services.map((service) => (
            <option key={service.id} value={service.name}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <h2>{selectedServices} Queue</h2>

      <p>
        People Waiting: <strong>{queue.length}</strong>
      </p>

      {error && (
        <p style={{ color: '#c0392b' }}>{error}</p>
      )}

      {message && (
        <p style={{ color: 'green' }}>{message}</p>
      )}

      <button
        onClick={serveNext}
        disabled={queue.length === 0 || loading || serving}
      >
        {serving ? 'Serving...' : 'Serve Next User'}
      </button>

      <button onClick={refreshQueue} disabled={loading}>
        Refresh Queue
      </button>

      {loading ? (
        <p>Loading queue...</p>
      ) : queue.length > 0 ? (
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
