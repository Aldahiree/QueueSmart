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

function AdminOnly({ currentUser, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return currentUser.role === 'Administrator'
    ? children
    : <Navigate to="/dashboard" replace />
}

//only regular users can access these pages
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
  const currentUser = session?.user ?? null

  // Current queue the user is in
  const [activeQueue, setActiveQueue] = useState(null)

  // Notifications and history now come from the backend (Person 4 APIs)
  const [notifications, setNotifications] = useState([])
  const [history, setHistory] = useState([])
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1000)

  const activeService = activeQueue &&
    services.find((service) => service.id === activeQueue.serviceId)

  const inQueue = activeQueue !== null && activeQueue.position > 0
  const unreadCount = notifications.filter((notification) => !notification.read).length

  function dismissToast(id) {
    setToasts((existing) => existing.filter((toast) => toast.id !== id))
  }

  // Shows a short-lived pop-up. The lasting record lives in the backend notifications.
  function showToast(message) {
    const id = nextId.current++

    setToasts((existing) => [
      ...existing,
      { id, message }
    ])

    setTimeout(() => dismissToast(id), 5000)
  }

  // Pull the latest notifications and history for the signed-in user
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
      // keep whatever we already have if the server is unreachable
    }
  }, [])

  // Load (or clear) activity whenever the session changes
  useEffect(() => {
    if (session?.token && session.user?.role === 'User') {
      refreshActivity(session.token)
    } else {
      setNotifications([])
      setHistory([])
    }
  }, [session, refreshActivity])

  //update the user's queue after joining
  function handleJoinQueue(serviceId, position) {
    const service = services.find((service) => service.id === serviceId)

    setActiveQueue({
      serviceId: serviceId,
      position: position
    })

    showToast(service ? `You joined the ${service.name} queue.` : 'You joined the queue.')
    refreshActivity(session?.token)
  }

  //update the user's queue after leaving
  function handleLeaveQueue() {
    if (!activeQueue) {
      return
    }

    showToast(activeService ? `You left the ${activeService.name} queue.` : 'You left the queue.')
    setActiveQueue(null)
    refreshActivity(session?.token)
  }

  //leave the queue from the queue status page
  async function handleLeaveFromStatus() {
    if (!activeQueue || !session?.token) {
      return
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/queues/${activeQueue.serviceId}/leave`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        }
      )

      if (!response.ok) {
        const data = await response.json()
        showToast(data.message || 'Could not leave the queue.')
        return
      }

      handleLeaveQueue()

    } catch (error) {
      showToast('Could not connect to the server.')
    }
  }

  //update the user's position from the backend
  const handleQueueStatusChange = useCallback((data) => {
    setActiveQueue((current) => {
      if (!current || String(current.serviceId) !== String(data.serviceId)) {
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

  async function handleMarkRead(id) {
    if (!session?.token) {
      return
    }

    // update the view right away, then persist to the backend
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

  async function handleRegister(credentials) {
    const newSession = await registerAccount(credentials)
    setSession(newSession)
    setActiveQueue(null)
    return { success: true, user: newSession.user }
  }

  async function handleLogin(credentials) {
    const newSession = await loginAccount(credentials)
    setSession(newSession)
    setActiveQueue(null)
    return { success: true, user: newSession.user }
  }

  async function handleLogout() {
    try {
      if (session?.token) {
        await logoutAccount(session.token)
      }
    } finally {
      setSession(null)
      setActiveQueue(null)
    }
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
                  <AdminDashboard token={session?.token} />
                </AdminOnly>
              }
            />

            <Route
              path="/admin/services"
              element={
                <AdminOnly currentUser={currentUser}>
                  <ServiceManagement token={session?.token} />
                </AdminOnly>
              }
            />

            <Route
              path="/admin/queue"
              element={
                <AdminOnly currentUser={currentUser}>
                  <QueueManagement token={session?.token} />
                </AdminOnly>
              }
            />

            <Route
              path="/login"
              element={
                currentUser
                  ? <Navigate to={currentUser.role === 'Administrator' ? '/admin' : '/dashboard'} replace />
                  : <Login onLogin={handleLogin} />
              }
            />

            <Route
              path="/register"
              element={
                currentUser
                  ? <Navigate to={currentUser.role === 'Administrator' ? '/admin' : '/dashboard'} replace />
                  : <Register onRegister={handleRegister} />
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
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
