import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import { loginAccount, logoutAccount, registerAccount } from './api/auth'

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} from './api/notifications'

import { getHistory } from './api/history'
import { services } from './data/mockData'

import Navbar from './components/Navbar'
import Toasts from './components/Toasts'

import Login from './pages/Login'
import Register from './pages/Register'
import UserDashboard from './pages/UserDashboard'
import JoinQueue from './pages/JoinQueue'
import QueueStatus from './pages/QueueStatus'
import History from './pages/History'
import NotificationsPage from './pages/NotificationsPage'
import AdminDashboard from './pages/AdminDashboard'
import ServiceManagement from './pages/ServiceManagement'
import QueueManagement from './pages/QueueManagement'
import Profile from './pages/Profile'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const SESSION_TOKEN_KEY = 'queuesmart_session_token'


function AdminOnly({ currentUser, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return currentUser.role === 'Administrator'
    ? children
    : <Navigate to="/dashboard" replace />
}


// Only regular users can access these pages
function UserOnly({ currentUser, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return currentUser.role === 'User'
    ? children
    : <Navigate to="/admin" replace />
}


function App() {

  const [session, setSession] = useState(null)

  // Check whether we have a saved login session
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(sessionStorage.getItem(SESSION_TOKEN_KEY))
  )

  // Tracks whether the active queue has been loaded for this session
  const [queueLoadedForToken, setQueueLoadedForToken] = useState(null)

  const currentUser = session?.user ?? null

  // Current queue the user is in
  const [activeQueue, setActiveQueue] = useState(null)

  // Notifications and history from Person 4's backend APIs
  const [notifications, setNotifications] = useState([])
  const [history, setHistory] = useState([])
  const [toasts, setToasts] = useState([])

  const nextId = useRef(1000)

  const activeService = activeQueue &&
    services.find((service) => service.id === activeQueue.serviceId)

  const inQueue = activeQueue !== null && activeQueue.position > 0

  const restoringQueue = Boolean(
    session?.token &&
    session.user?.role === 'User' &&
    queueLoadedForToken !== session.token
  )

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length


  // Remove a toast message
  function dismissToast(id) {
    setToasts((existing) =>
      existing.filter((toast) => toast.id !== id)
    )
  }


  // Display a temporary notification
  function showToast(message) {
    const id = nextId.current++

    setToasts((existing) => [
      ...existing,
      { id, message }
    ])

    setTimeout(() => dismissToast(id), 5000)
  }


  // Refresh notifications and history
  const refreshActivity = useCallback(async (token) => {
    if (!token) {
      return
    }

    try {
      const [notificationData, historyData] = await Promise.all([
        getNotifications(token),
        getHistory(token),
      ])

      setNotifications(notificationData.notifications)
      setHistory(historyData.history)

    } catch (error) {
      // Keep existing information if the server is unavailable
    }
  }, [])


  // Person 3: Restore login after refreshing the browser
  useEffect(() => {

    const token = sessionStorage.getItem(SESSION_TOKEN_KEY)

    if (!token) {
      setCheckingSession(false)
      return
    }

    let cancelled = false

    async function restoreSession() {
      try {

        // Verify the saved token with the backend
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        if (!response.ok) {

          // Remove tokens rejected by the backend
          if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem(SESSION_TOKEN_KEY)
          }

          throw new Error('Could not restore your login session.')
        }

        const data = await response.json()

        if (!cancelled) {
          setSession({
            token,
            user: data.user
          })
        }

      } catch (error) {

        if (!cancelled) {
          console.error(error)
          setSession(null)
        }

      } finally {

        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }

  }, [])


  // Person 3: Restore the user's active queue from MySQL
  useEffect(() => {

    const token = session?.token

    // Clear queue information when no regular user is logged in
    if (!token || session.user?.role !== 'User') {
      setActiveQueue(null)
      setQueueLoadedForToken(null)
      return
    }

    let cancelled = false

    setActiveQueue(null)

    async function restoreActiveQueue() {
      try {

        const response = await fetch(
          `${API_URL}/api/queues/me/active`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        if (!response.ok) {
          throw new Error('Could not restore your queue status.')
        }

        const data = await response.json()

        if (!cancelled) {

          // The backend gets the actual queue from MySQL
          setActiveQueue(data.activeQueue ?? null)

        }

      } catch (error) {

        if (!cancelled) {
          console.error(error)

          showToast(
            'Could not load your active queue. Please refresh to try again.'
          )
        }

      } finally {

        if (!cancelled) {
          setQueueLoadedForToken(token)
        }
      }
    }

    restoreActiveQueue()

    return () => {
      cancelled = true
    }

  }, [session?.token, session?.user?.role])


  // Load notifications and history when the session changes
  useEffect(() => {

    if (session?.token && session.user?.role === 'User') {
      refreshActivity(session.token)

    } else {
      setNotifications([])
      setHistory([])
    }

  }, [session, refreshActivity])


  // Update the user's queue after joining
  function handleJoinQueue(serviceId, position) {

    const service = services.find(
      (service) => service.id === serviceId
    )

    setActiveQueue({
      serviceId: serviceId,
      position: position
    })

    showToast(
      service
        ? `You joined the ${service.name} queue.`
        : 'You joined the queue.'
    )

    refreshActivity(session?.token)
  }


  // Update the user's queue after leaving
  function handleLeaveQueue() {

    if (!activeQueue) {
      return
    }

    showToast(
      activeService
        ? `You left the ${activeService.name} queue.`
        : 'You left the queue.'
    )

    setActiveQueue(null)

    refreshActivity(session?.token)
  }


  // Leave the queue from the Queue Status page
  async function handleLeaveFromStatus() {

    if (!activeQueue || !session?.token) {
      return
    }

    try {

      const response = await fetch(
        `${API_URL}/api/queues/${activeQueue.serviceId}/leave`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        }
      )

      if (!response.ok) {
        const data = await response.json()

        showToast(
          data.message || 'Could not leave the queue.'
        )

        return
      }

      handleLeaveQueue()

    } catch (error) {
      showToast('Could not connect to the server.')
    }
  }


  // Update the user's position from the backend
  const handleQueueStatusChange = useCallback((data) => {

    setActiveQueue((current) => {

      if (
        !current ||
        String(current.serviceId) !== String(data.serviceId)
      ) {
        return current
      }

      if (data.status === 'not_in_queue') {
        return null
      }

      if (current.position === data.position) {
        return current
      }

      return {
        ...current,
        position: data.position
      }
    })

  }, [])


  // Mark a notification as read
  async function handleMarkRead(id) {

    if (!session?.token) {
      return
    }

    setNotifications((existing) =>
      existing.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    )

    try {
      await markNotificationRead(session.token, id)

    } catch (error) {
      showToast('Could not update the notification.')
    }
  }


  // Mark all notifications as read
  async function handleMarkAllRead() {

    if (!session?.token) {
      return
    }

    setNotifications((existing) =>
      existing.map((notification) => ({
        ...notification,
        read: true
      }))
    )

    try {
      await markAllNotificationsRead(session.token)

    } catch (error) {
      showToast('Could not update the notifications.')
    }
  }


  // Clear notifications
  async function handleClearNotifications() {

    if (!session?.token) {
      return
    }

    setNotifications([])

    try {
      await clearNotifications(session.token)

    } catch (error) {
      showToast('Could not clear the notifications.')
    }
  }


  // Register a new user
  async function handleRegister(credentials) {

    const newSession = await registerAccount(credentials)

    // Remember this session during browser refreshes
    sessionStorage.setItem(
      SESSION_TOKEN_KEY,
      newSession.token
    )

    setSession(newSession)
    setActiveQueue(null)

    return {
      success: true,
      user: newSession.user
    }
  }


  // Log in
  async function handleLogin(credentials) {

    const newSession = await loginAccount(credentials)

    // Remember this session during browser refreshes
    sessionStorage.setItem(
      SESSION_TOKEN_KEY,
      newSession.token
    )

    setSession(newSession)
    setActiveQueue(null)

    return {
      success: true,
      user: newSession.user
    }
  }


  // Log out
  async function handleLogout() {

    try {

      if (session?.token) {
        await logoutAccount(session.token)
      }

    } finally {

      // Clear the saved session and queue information
      sessionStorage.removeItem(SESSION_TOKEN_KEY)

      setSession(null)
      setActiveQueue(null)
      setQueueLoadedForToken(null)
    }
  }


  // Update the profile after editing
  function handleProfileUpdated(profile) {

    setSession((current) =>
      current
        ? { ...current, user: profile }
        : current
    )
  }


  return (
    <BrowserRouter>
      <div className="app-shell">

        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          unreadCount={unreadCount}
        />

        <main className="app-main">

          {checkingSession || restoringQueue ? (

            <div className="page-container">
              Loading your account and queue...
            </div>

          ) : (

            <Routes>

              <Route
                path="/"
                element={
                  <Navigate
                    to={
                      !currentUser
                        ? '/login'
                        : currentUser.role === 'Administrator'
                          ? '/admin'
                          : '/dashboard'
                    }
                    replace
                  />
                }
              />

              <Route
                path="/dashboard"
                element={
                  <UserOnly currentUser={currentUser}>
                    <UserDashboard
                      activeQueue={activeQueue}
                      notifications={notifications}
                    />
                  </UserOnly>
                }
              />

              <Route
                path="/profile"
                element={
                  currentUser
                    ? (
                      <Profile
                        token={session.token}
                        onProfileUpdated={handleProfileUpdated}
                      />
                    )
                    : <Navigate to="/login" replace />
                }
              />

              <Route
                path="/join-queue"
                element={
                  <UserOnly currentUser={currentUser}>
                    <JoinQueue
                      activeQueue={inQueue ? activeQueue : null}
                      onJoin={handleJoinQueue}
                      onLeave={handleLeaveQueue}
                      token={session?.token}
                    />
                  </UserOnly>
                }
              />

              <Route
                path="/queue-status"
                element={
                  <UserOnly currentUser={currentUser}>
                    <QueueStatus
                      activeQueue={activeQueue}
                      token={session?.token}
                      onStatusChange={handleQueueStatusChange}
                      onLeave={handleLeaveFromStatus}
                    />
                  </UserOnly>
                }
              />

              <Route
                path="/history"
                element={
                  <UserOnly currentUser={currentUser}>
                    <History history={history} />
                  </UserOnly>
                }
              />

              <Route
                path="/notifications"
                element={
                  <UserOnly currentUser={currentUser}>
                    <NotificationsPage
                      notifications={notifications}
                      onMarkRead={handleMarkRead}
                      onMarkAllRead={handleMarkAllRead}
                      onClear={handleClearNotifications}
                    />
                  </UserOnly>
                }
              />

              <Route
                path="/admin"
                element={
                  <AdminOnly currentUser={currentUser}>
                    <AdminDashboard
                      token={session?.token}
                    />
                  </AdminOnly>
                }
              />

              <Route
                path="/admin/services"
                element={
                  <AdminOnly currentUser={currentUser}>
                    <ServiceManagement
                      token={session?.token}
                    />
                  </AdminOnly>
                }
              />

              <Route
                path="/admin/queue"
                element={
                  <AdminOnly currentUser={currentUser}>
                    <QueueManagement
                      token={session?.token}
                    />
                  </AdminOnly>
                }
              />

              <Route
                path="/login"
                element={
                  currentUser
                    ? (
                      <Navigate
                        to={
                          currentUser.role === 'Administrator'
                            ? '/admin'
                            : '/dashboard'
                        }
                        replace
                      />
                    )
                    : <Login onLogin={handleLogin} />
                }
              />

              <Route
                path="/register"
                element={
                  currentUser
                    ? (
                      <Navigate
                        to={
                          currentUser.role === 'Administrator'
                            ? '/admin'
                            : '/dashboard'
                        }
                        replace
                      />
                    )
                    : <Register onRegister={handleRegister} />
                }
              />

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />

            </Routes>

          )}

        </main>

        <Toasts
          toasts={toasts}
          onDismiss={dismissToast}
        />

      </div>
    </BrowserRouter>
  )
}

export default App