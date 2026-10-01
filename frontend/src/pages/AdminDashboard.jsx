import { useState } from 'react'
import { services as mockServices } from '../data/mockData'
import './Admin.css'

function AdminDashboard() {
  const [services, setServices] = useState(mockServices)

  function changeStatus(id) {                  //this function changes the service status by taking the id from the mock data as a parameter
    const updateServices = services.map((service)=>{
      if(service.id === id){
        return { ...service, isOpen: !service.isOpen }
      }
      return service
    })
    setServices(updateServices)
  }
  return(
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p>View services and change availability.</p>

      <div className="service-list">
        {services.map((service)=> (
          <div className="service-card" key = {service.id}>
            <h2>{service.name}</h2>

            <p>
              Queue Length: <strong>{service.queueLength}</strong>
            </p>

            <p>
              Status: <strong>{service.isOpen ? 'Open' : 'Closed'}</strong>
            </p>

            {/* button to change the service status */}
            <button onClick={() => changeStatus(service.id)}>
              {service.isOpen
              ? 'Close Queue'
              : 'Open Queue'}
            </button>
          </div>
        )
        )}
      </div>
    </div>
  )
}

export default AdminDashboard

