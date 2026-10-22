import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'

export default function Navbar({ currentUser, onLogout, unreadCount = 0 }) {
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setLogoutError('')
    try {
      await onLogout()
    } catch (error) {
      setLogoutError(error.message || 'Unable to log out. Please try again.')
    }
  }

  const homePage = !currentUser
    ? '/login'
    : currentUser.role === 'Administrator'
      ? '/admin'
      : '/dashboard'

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-brand" to={homePage} aria-label="QueueSmart home">
          <h2>QueueSmart</h2>
        </Link>

        <nav className="navbar-links" aria-label="Main navigation">

          {currentUser?.role === 'User' && (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/join-queue">Join Queue</NavLink>
              <NavLink to="/queue-status">Queue Status</NavLink>
              <NavLink to="/history">History</NavLink>

              <NavLink to="/notifications">
                Notifications{unreadCount > 0 && ` (${unreadCount})`}
              </NavLink>
            </>
          )}

          {currentUser?.role === 'Administrator' && (
            <>
              <NavLink to="/admin">Admin Dashboard</NavLink>
              <NavLink to="/admin/services">Services</NavLink>
              <NavLink to="/admin/queue">Queue Management</NavLink>
            </>
          )}
        </nav>

        <div className="navbar-account">
          {currentUser ? (
            <>
              <span className="navbar-user">{currentUser.name}</span>

              <button
                className="navbar-action"
                type="button"
                onClick={handleLogout}
              >
                Log out
              </button>

              {logoutError && <span role="alert">{logoutError}</span>}
            </>
          ) : (
            <>
              <Link className="navbar-login" to="/login">
                Log in
              </Link>

              <Link className="navbar-register" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
