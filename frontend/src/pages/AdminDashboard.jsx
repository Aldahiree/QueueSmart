import { useEffect, useState } from 'react'
import { getDashboard } from '../api/dashboard'
import { setServiceStatus } from '../api/services'
import './Admin.css'

function AdminDashboard({ token }) {
  const [services, setServices] = useState([])
  const [error, setError] = useState('')

  //load the live dashboard (services + queue counts) from the backend
  async function loadDashboard() {
    try {
      const data = await getDashboard(token)
      setServices(data.services)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load the dashboard.')
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  //open or close a service, then refresh the counts
  async function changeStatus(id, isOpen) {
    try {
      await setServiceStatus(token, id, !isOpen)
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Could not update the service.')
    }
  }

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p>View services and change availability.</p>

      {error && <p role="alert">{error}</p>}

      <div className="service-list">
        {services.map((service) => (
          <div className="service-card" key={service.id}>
            <h2>{service.name}</h2>

            <p>
              Queue Length: <strong>{service.queueLength}</strong>
            </p>

            <p>
              Status: <strong>{service.isOpen ? 'Open' : 'Closed'}</strong>
            </p>

            {/* button to change the service status */}
            <button onClick={() => changeStatus(service.id, service.isOpen)}>
              {service.isOpen ? 'Close Queue' : 'Open Queue'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboard
