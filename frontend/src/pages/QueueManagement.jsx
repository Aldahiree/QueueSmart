import { useState } from 'react'
import { services, queues as mockQueues } from '../data/mockData'
import './Admin.css'

function QueueManagement() {
  const [selectedServices, setSelectedServices] = useState(services[0].name)
  const [queues, setQueues] = useState(mockQueues)

  const queue = queues[selectedServices]

  function serveNext() {
    if(queue.length > 0) {
      const updatedQueue = queue.slice(1)
      setQueues({...queues, [selectedServices]: updatedQueue})
    }
  }

  function removeUser(id) {
    const updatedQueue = queue.filter(
      (user) => user.id !==id
    )

    setQueues({
      ...queues, [selectedServices]: updatedQueue
    })
  }

  function moveUp(index) {
    if(index === 0) {
      return
    }
    const updatedQueue = [...queue]
    const temp = updatedQueue[index - 1]
    updatedQueue[index - 1] = updatedQueue[index]
    updatedQueue[index] = temp

    setQueues({
      ...queues, [selectedServices]: updatedQueue
    })
  }
  function moveDown(index) {
    if(index === queue.length - 1) {
      return
    }
    const updatedQueue = [...queue]
    const temp = updatedQueue[index + 1]
    updatedQueue[index + 1] = updatedQueue[index]
    updatedQueue[index] = temp

    setQueues({
      ...queues, [selectedServices]: updatedQueue
    })
  }

  return(
    <div className='admin-page'>
      <h1>Queue Management</h1>
      <p>
        Select a service and manage the users currently waiting.
      </p>
      <div className='service-select'>
        <label>Choose Service</label>
        <select
        value={selectedServices}
        onChange={(event) => setSelectedServices(event.target.value)}>
          {services.map((service) => (
            <option key={service.id} value={service.name}>
              {service.name}
            </option>
          ))}
        </select>
      </div>
      <h2>{selectedServices} Queue</h2>
      <p>
        People Waiting: <strong>{queue.length}</strong>
      </p>
      <button onClick={serveNext} disabled = {queue.length === 0}>Serve Next User</button>
      {queue.length > 0 ? (
        <table className='queue-table'>
          <thead>
            <tr>
              <th>Position</th>
              <th>Name</th>
              <th>Estimated Wait</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {queue.map((user, index) =>( 
              <tr key={user.id}>
                <td>{index + 1}</td>

                <td>{user.name}</td>

                <td>{user.waitTime} minutes</td>
                <td>
                <button onClick={() => moveUp(index)} disabled={index===0}>Up</button>
                <button onClick={() => moveDown(index)} disabled={index===queue.length - 1}>Down</button>
                <button onClick={() => removeUser(user.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ):(
        <p className='empty-message'>
          No users are currently waiting.
        </p>
      )}
    </div>
  )
}

export default QueueManagement
