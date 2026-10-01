import { useState } from 'react'
import './Admin.css'

function AdminDashboard() {
  const [services, setServices] = useState([
    {                                                    //Mock data
      id: 1,
      name: 'Academic Advising',
      queueLength: 6,
      status: 'Open'
    },
    {
      id: 2,
      name: 'Financial Aid',
      queueLength: 4,
      status: 'Open'
    },
    {
      id: 3,
      name: 'IT Help Desk',
      queueLength: 2,
      status: 'Closed'
    }
  ])
  function changeStatus(id) {                  //this function changes the service status by taking the id from the mock data as a parameter
    const updateServices = services.map((service)=>{
      if(service.id === id){
        if(service.status === 'Open') {
          return { ...service, status: 'Closed' }
        } else {
          return { ...service, status: 'Open' }
        }
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
              Status: <strong>{service.status}</strong>
            </p>

            {/* button to change the service status */}
            <button onClick={() => changeStatus(service.id)}>
              {service.status === 'Open'
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


