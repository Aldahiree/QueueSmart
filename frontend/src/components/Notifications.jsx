import '../pages/QueueTracking.css';

// Shared in-app notification list. Set a limit to show only newest few / specific amt
export default function Notifications({
  title = 'Notifications',
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClear,
  limit,
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = limit ? notifications.slice(0, limit) : notifications;

  return (
    <section className="card" aria-labelledby="notifications-title">
      <div className="notifications-header">
        <h2 id="notifications-title">
          {title}{' '}
          {unreadCount > 0 && <span className="notification-count">{unreadCount} new</span>}
        </h2>
        <div className="notifications-actions">
          {onMarkAllRead && unreadCount > 0 && (
            <button type="button" onClick={onMarkAllRead}>
              Mark all as read
            </button>
          )}
          {onClear && notifications.length > 0 && (
            <button type="button" onClick={onClear}>
              Clear notifications
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <ul className="notification-list" aria-live="polite">
          {visible.map((n) => (
            <li key={n.id} className={n.read ? 'notification' : 'notification unread'}>
              <span>{n.message}</span>
              {!n.read && onMarkRead && (
                <button type="button" onClick={() => onMarkRead(n.id)}>
                  Mark as read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
