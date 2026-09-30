import { useState } from 'react'
import { services } from '../data/mockData'

export default function JoinQueue() {
  const [selectedId, setSelectedId] = useState('')
  const [joinedId, setJoinedId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const openServices = services.filter((s) => s.isOpen)
  const selected = services.find((s) => s.id === Number(selectedId))
  const joined = services.find((s) => s.id === joinedId)

  const waitTime = (service) => service.queueLength * service.duration

  function handleJoin() {
    if (!selectedId) {
      setError('Please select a service before joining.')
      return
    }
    if (joinedId) {
      setError('You are already in a queue. Leave it before joining another.')
      return
    }
    setError('')
    setJoinedId(selected.id)
    setMessage(`You joined the ${selected.name} queue.`)
  }

  function handleLeave() {
    setMessage(`You left the ${joined.name} queue.`)
    setJoinedId(null)
    setSelectedId('')
  }

  return (
    <div className="page-container">
      <h1>Join a Queue</h1>

      {message && <div className="card">{message}</div>}

      <div className="card">
        <label htmlFor="service">Select a service</label>
        <select
          id="service"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value)
            setError('')
          }}
          disabled={joinedId !== null}
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
              <strong>People in line:</strong> {selected.queueLength}
            </p>
            <p>
              <strong>Estimated wait:</strong> {waitTime(selected)} minutes
            </p>
          </div>
        )}

        {joinedId ? (
          <button onClick={handleLeave}>Leave Queue</button>
        ) : (
          <button onClick={handleJoin}>Join Queue</button>
        )}
      </div>
    </div>
  )
}