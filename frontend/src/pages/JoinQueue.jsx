import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export default function JoinQueue({ activeQueue, onJoin, onLeave, token }) {
  const [services, setServices] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [serviceError, setServiceError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingServices, setLoadingServices] = useState(true)
  const [joinedQueue, setJoinedQueue] = useState(null)
  const [queueInfo, setQueueInfo] = useState(null)
  const [refresh, setRefresh] = useState(0)

  const joinedId = activeQueue?.serviceId ?? joinedQueue

  const openServices = services.filter(
    (service) => service.isOpen || String(service.id) === String(joinedId)
  )

  const selected = services.find(
    (service) => String(service.id) === String(joinedId ?? selectedId)
  )

  const joined = services.find(
    (service) => String(service.id) === String(joinedId)
  )

  const position = activeQueue?.position ?? queueInfo?.position

  const waitTime = selected && position > 0
    ? Math.max(0, position - 1) * selected.duration
    : null


  //load the actual services from the backend
  useEffect(() => {
    let cancelled = false

    async function loadServices() {
      if (!token) {
        setServices([])
        setServiceError('Please log in to view services.')
        setLoadingServices(false)
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

          setSelectedId((current) => {
            if (!current) return ''

            const exists = list.some(
              (service) => String(service.id) === String(current)
            )

            return exists ? current : ''
          })
        }

      } catch (error) {
        if (!cancelled) {
          setServices([])
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


  //join the selected queue
  async function handleJoin() {
    if (!selectedId) {
      setError('Please select a service before joining.')
      return
    }

    if (joinedId != null) {
      setError('You are already in a queue. Leave it before joining another.')
      return
    }

    if (!token) {
      setError('Please log in before joining a queue.')
      return
    }

    if (!selected?.isOpen) {
      setError('This service is currently closed.')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/queues/${selectedId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not join the queue.')
      }

      setJoinedQueue(Number(selectedId))

      setQueueInfo({
        position: data.position,
        queueLength: data.queueLength
      })

      onJoin?.(Number(selectedId), data.position)

      setMessage(`You joined the ${selected.name} queue.`)

    } catch (error) {
      setError(error.message)

    } finally {
      setLoading(false)
    }
  }


  //leave the current queue
  async function handleLeave() {
    if (!token || joinedId == null) {
      setError('Please log in to leave the queue.')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/queues/${joinedId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not leave the queue.')
      }

      setMessage(`You left the ${joined?.name ?? 'selected'} queue.`)

      setJoinedQueue(null)
      setQueueInfo(null)
      setSelectedId('')

      onLeave?.()

    } catch (error) {
      setError(error.message)

    } finally {
      setLoading(false)
    }
  }


  //refresh the service list
  function refreshServices() {
    setError('')
    setMessage('')
    setRefresh((value) => value + 1)
  }


  return (
    <div className="page-container">
      <h1>Join a Queue</h1>

      {message && <div className="card">{message}</div>}

      <div className="card">
        <label htmlFor="service">Select a service</label>

        <select
          id="service"
          value={joinedId ?? selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value)
            setError('')
          }}
          disabled={joinedId != null || loading || loadingServices}
        >
          <option value="">Choose a service</option>

          {openServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        {loadingServices && (
          <p>Loading services...</p>
        )}

        {serviceError && (
          <p style={{ color: '#c0392b' }}>{serviceError}</p>
        )}

        {!loadingServices && !serviceError && openServices.length === 0 && (
          <p>No services are currently open.</p>
        )}

        <button
          type="button"
          onClick={refreshServices}
          disabled={loadingServices || loading}
        >
          Refresh Services
        </button>

        {error && (
          <p style={{ color: '#c0392b' }}>{error}</p>
        )}

        {selected && (
          <div>
            <p>{selected.description}</p>

            <p>
              <strong>Service Status:</strong>{' '}
              {selected.isOpen ? 'Open' : 'Closed'}
            </p>

            <p>
              <strong>People in line:</strong>{' '}
              {queueInfo ? queueInfo.queueLength : 'Available after joining'}
            </p>

            <p>
              <strong>Estimated wait:</strong>{' '}
              {waitTime !== null ? `${waitTime} minutes` : 'Available after joining'}
            </p>
          </div>
        )}

        {joinedId != null ? (
          <>
            <p>
              You are in this queue.{' '}
              <Link to="/queue-status">Track your position</Link>
            </p>

            <button onClick={handleLeave} disabled={loading}>
              {loading ? 'Leaving...' : 'Leave Queue'}
            </button>
          </>
        ) : (
          <button
            onClick={handleJoin}
            disabled={loading || loadingServices || !selected?.isOpen}
          >
            {loading ? 'Joining...' : 'Join Queue'}
          </button>
        )}
      </div>
    </div>
  )
}