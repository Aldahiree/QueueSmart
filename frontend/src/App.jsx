import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import JoinQueue from './pages/JoinQueue'
import AdminDashboard from './pages/AdminDashboard'
import ServiceManagement from './pages/ServiceManagement'
import QueueManagement from './pages/QueueManagement'

function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  function handleRegister({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase()
    if (users.some((user) => user.email === normalizedEmail)) {
      return { success: false, message: 'An account with this email already exists.' }
    }

    const newUser = { name: name.trim(), email: normalizedEmail, password }
    setUsers((existingUsers) => [...existingUsers, newUser])
    setCurrentUser({ name: newUser.name, email: newUser.email })
    return { success: true }
  }

  function handleLogin({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase()
    const user = users.find(
      (savedUser) => savedUser.email === normalizedEmail && savedUser.password === password,
    )
    if (!user) {
      return { success: false, message: 'Email or password is incorrect.' }
    }

    setCurrentUser({ name: user.name, email: user.email })
    return { success: true }
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<JoinQueue />} />
            <Route path="/join-queue" element={<JoinQueue />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/services" element={<ServiceManagement />} />
            <Route path="/admin/queue" element={<QueueManagement />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onRegister={handleRegister} />} />
            <Route path="*" element={<Navigate to="/join-queue" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App