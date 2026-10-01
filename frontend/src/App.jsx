import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'

import JoinQueue from './pages/JoinQueue'
import AdminDashboard from './pages/AdminDashboard'
import ServiceManagement from './pages/ServiceManagement'
import QueueManagement from './pages/QueueManagement'

function App() {
  return (
    <BrowserRouter>

      <nav className="navbar">
        <h2>QueueSmart</h2>

        <Link to="/join-queue">Join Queue</Link>
        <Link to="/admin">Admin Dashboard</Link>
        <Link to="/admin/services">Service Management</Link>
        <Link to="/admin/queue">Queue Management</Link>
      </nav>

      <Routes>
        <Route path="/" element={<JoinQueue />} />
        <Route path="/join-queue" element={<JoinQueue />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/services" element={<ServiceManagement />} />
        <Route path="/admin/queue" element={<QueueManagement />} />
      </Routes>

    </BrowserRouter>
  )
}

export default App