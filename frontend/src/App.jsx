import { useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import {
  services,
  currentQueue,
  notifications as mockNotifications,
  history as mockHistory
} from './data/mockData'

import { getStatus } from './utils/queueStatus'
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

function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  // Current queue the user is in
  const [activeQueue, setActiveQueue] = useState(
    currentQueue
      ? {
          serviceId: currentQueue.serviceId,
          position: currentQueue.position
        }
      : null
  )

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

  function handleJoinQueue(serviceId) {
    const service = services.find((service) => service.id === serviceId)

    if (!service) {
      return
    }

    setActiveQueue({
      serviceId: serviceId,
      position: service.queueLength + 1
    })

    notify(`You joined the ${service.name} queue.`)
  }

  function handleLeaveQueue() {
    if (!activeQueue || !activeService) {
      return
    }

    addHistory(activeService.name, 'Left queue')
    notify(`You left the ${activeService.name} queue.`)
    setActiveQueue(null)
  }

  // Simulates the queue moving forward since there is no backend yet
  function handleAdvanceQueue() {
    if (!activeQueue || !activeService || activeQueue.position <= 0) {
      return
    }

    const oldStatus = getStatus(activeQueue.position)
    const newPosition = activeQueue.position - 1
    const newStatus = getStatus(newPosition)

    setActiveQueue({
      ...activeQueue,
      position: newPosition
    })

    if (newStatus === 'served') {
      addHistory(activeService.name, 'Served')
      notify(`It is now your turn. You are being served at ${activeService.name}.`)
    } else {
      notify(`You moved up to position ${newPosition}.`)

      if (newStatus !== oldStatus) {
        notify(`Status changed: You are almost ready for ${activeService.name}.`)
      }
    }
  }

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

  function handleRegister({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase()

    if (users.some((user) => user.email === normalizedEmail)) {
      return {
        success: false,
        message: 'An account with this email already exists.'
      }
    }

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: password
    }

    setUsers((existingUsers) => [...existingUsers, newUser])

    setCurrentUser({
      name: newUser.name,
      email: newUser.email
    })

    return { success: true }
  }

  function handleLogin({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase()

    const user = users.find(
      (savedUser) =>
        savedUser.email === normalizedEmail &&
        savedUser.password === password
    )

    if (!user) {
      return {
        success: false,
        message: 'Email or password is incorrect.'
      }
    }

    setCurrentUser({
      name: user.name,
      email: user.email
    })

    return { success: true }
  }

  function handleLogout() {
    setCurrentUser(null)
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/dashboard"
              element={
                <UserDashboard
                  activeQueue={activeQueue}
                  notifications={notifications}
                />
              }
            />

            <Route
              path="/join-queue"
              element={
                <JoinQueue
                  activeQueue={inQueue ? activeQueue : null}
                  onJoin={handleJoinQueue}
                  onLeave={handleLeaveQueue}
                />
              }
            />

            <Route
              path="/queue-status"
              element={
                <QueueStatus
                  activeQueue={activeQueue}
                  onAdvance={handleAdvanceQueue}
                  onLeave={handleLeaveQueue}
                />
              }
            />

            <Route path="/history" element={<History history={history} />} />

            <Route
              path="/notifications"
              element={
                <NotificationsPage
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                  onClear={() => setNotifications([])}
                />
              }
            />

            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/services" element={<ServiceManagement />} />
            <Route path="/admin/queue" element={<QueueManagement />} />

            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onRegister={handleRegister} />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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