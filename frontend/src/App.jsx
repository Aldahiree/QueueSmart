import { useCallback, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { loginAccount, logoutAccount, registerAccount } from './api/auth'

import {
  services,
  notifications as mockNotifications,
  history as mockHistory
} from './data/mockData'

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

  const [notifications, setNotifications] = useState(mockNotifications)
  const [history, setHistory] = useState(mockHistory)
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1000)

  const activeService = activeQueue &&
    services.find((service) => service.id === activeQueue.serviceId)

  const inQueue = activeQueue !== null && activeQueue.position > 0
  const unreadCount = notifications.filter((notification) => !notification.read).length

  function dismissToast(id) {
    setToasts((existing) => existing.filter((toast) => toast.id !== id))
  }

  // Adds the notification to the list and shows a pop-up
  function notify(message) {
    const id = nextId.current++

    setNotifications((existing) => [
      { id, message, read: false },
      ...existing
    ])

    setToasts((existing) => [
      ...existing,
      { id, message }
    ])

    setTimeout(() => dismissToast(id), 5000)
  }

  function addHistory(serviceName, outcome) {
    const entry = {
      id: nextId.current++,
      serviceName: serviceName,
      date: new Date().toLocaleDateString('en-CA'),
      outcome: outcome
    }

    setHistory((existing) => [entry, ...existing])
  }

  //update the user's queue after joining
  function handleJoinQueue(serviceId, position) {
    const service = services.find((service) => service.id === serviceId)

    if (!service) {
      return
    }

    setActiveQueue({
      serviceId: serviceId,
      position: position
    })

    notify(`You joined the ${service.name} queue.`)
  }

  //update the user's queue after leaving
  function handleLeaveQueue() {
    if (!activeQueue || !activeService) {
      return
    }

    addHistory(activeService.name, 'Left queue')
    notify(`You left the ${activeService.name} queue.`)
    setActiveQueue(null)
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
        notify(data.message || 'Could not leave the queue.')
        return
      }

      handleLeaveQueue()

    } catch (error) {
      notify('Could not connect to the server.')
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

  function handleMarkRead(id) {
    setNotifications((existing) =>
      existing.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  function handleMarkAllRead() {
    setNotifications((existing) =>
      existing.map((notification) => ({
        ...notification,
        read: true
      }))
    )
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
                    onClear={() => setNotifications([])}
                  />
                </UserOnly>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminOnly currentUser={currentUser}>
                  <AdminDashboard />
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