import { useState } from 'react'
import { Link } from 'react-router-dom'
import { services } from '../data/mockData'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export default function JoinQueue({ activeQueue, onJoin, onLeave, token }) {
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinedQueue, setJoinedQueue] = useState(null)
  const [queueInfo, setQueueInfo] = useState(null)

  const joinedId = activeQueue?.serviceId ?? joinedQueue

  const openServices = services.filter((s) => s.isOpen)
  const selected = services.find((s) => s.id === Number(joinedId ?? selectedId))
  const joined = services.find((s) => s.id === Number(joinedId))

  const waitTime = selected && queueInfo
    ? Math.max(0, queueInfo.position - 1) * selected.duration
    : null


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

      onJoin?.(Number(selectedId))

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
          disabled={joinedId != null || loading}
        >
          <option value="">Choose a service</option>

          {openServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {error && <p style={{ color: '#c0392b' }}>{error}</p>}

        {selected && (
          <div>
            <p>{selected.description}</p>

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
          <button onClick={handleJoin} disabled={loading}>
            {loading ? 'Joining...' : 'Join Queue'}
          </button>
        )}
      </div>
    </div>
  )
}