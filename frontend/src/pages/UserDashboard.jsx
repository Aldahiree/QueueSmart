import { Link } from 'react-router-dom'
import { services, currentQueue, notifications } from '../data/mockData'

export default function UserDashboard() {
  const activeServices = services.filter((s) => s.isOpen)
  const queueService = services.find((s) => s.id === currentQueue?.serviceId)
  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="page-container">
      <h1>User Dashboard</h1>

      <div className="card">
        <h2>Current Queue Status</h2>
        {queueService ? (
          <>
            <p><strong>Service:</strong> {queueService.name}</p>
            <p><strong>Position:</strong> {currentQueue.position}</p>
            <p><strong>Status:</strong> {currentQueue.status}</p>
            <p>
              <strong>Estimated wait:</strong>{' '}
              {currentQueue.position * queueService.duration} minutes
            </p>
          </>
        ) : (
          <p>You are not in any queue right now.</p>
        )}
      </div>

      <div className="card">
        <h2>Active Services</h2>
        {activeServices.map((s) => (
          <p key={s.id}>
            <strong>{s.name}</strong>: {s.queueLength} in line
          </p>
        ))}
        <Link to="/join-queue">
          <button>Join a Queue</button>
        </Link>
      </div>

      <div className="card">
        <h2>Notifications</h2>
        <p>You have {unread.length} unread notification(s).</p>
        {notifications.map((n) => (
          <p key={n.id}>{n.read ? n.message : <strong>{n.message}</strong>}</p>
        ))}
      </div>
    </div>
  )
}