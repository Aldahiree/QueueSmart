import Notifications from '../components/Notifications'

export default function NotificationsPage({ notifications, onMarkRead, onMarkAllRead, onClear }) {
  return (
    <div className="page-container">
      <h1>Notifications</h1>
      <p>Queue updates and status changes.</p>

      <Notifications
        title="All notifications"
        notifications={notifications}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onClear={onClear}
      />
    </div>
  )
}
