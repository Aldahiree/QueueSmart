import { useState } from 'react'
import { services as mockServices } from '../data/mockData'
import './Admin.css'

function ServiceManagement() {
  const [services, setServices] = useState(mockServices)

  const[name, setName] = useState('')
  const[description, setDescription] = useState('')
  const[duration, setDuration] = useState('')
  const[priority, setPriority] = useState('Low')
  const[editIndex, setEditIndex] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    const service = {
      name: name,
      description: description,
      duration: duration,
      priority: priority
  }
  if(editIndex === null) {
    setServices([...services, service])
  } else {
    const updateServices = [...services]
    updateServices[editIndex] = service
    setServices(updateServices)
    setEditIndex(null)
  }
  setName('')
  setDescription('')
  setDuration('')
  setPriority('Low')


  }
  function editService(index) {
    const service = services[index]
    setName(service.name)
    setDescription(service.description)
    setDuration(service.duration)
    setPriority(service.priority)
    setEditIndex(index)
  }

  return(
    <div className='admin-page'>
      <h1>Service Management</h1>
      <p>Create a new service or edit an existing one.</p>

      <form className='service-form' onSubmit={handleSubmit}>
        <label>Service Name</label>
        <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength="100"
        placeholder="Example: Academic Advising"
        required
        />

        <label>Description</label>
        <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Describe the service"
        required
        />

        <label>Expected Duration (minutes)</label>
        <input
        type="number"
        value={duration}
        onChange={(event) => setDuration(event.target.value)}
        min="1"
        placeholder='Example: 15'
        required
        />
        <label>Priority</label>
        <select
        value={priority}
        onChange={(event) => setPriority(event.target.value)}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        <button type="submit">
          {editIndex === null
          ? 'Create service'
          : 'Save changes'}
        </button>
      </form>

      <h2>Current Services</h2>

      <div className='service-list'>
        {services.map((service, index) => (
          <div className='service-card' key={index}>
            <h3>{service.name}</h3>

            <p>{service.description}</p>

              <p>
                Duration: <strong>{service.duration} minutes</strong>
              </p>
              <p>
                Priority: <strong>{service.priority}</strong>
              </p>
              <button onClick={() => editService(index)}>
                Edit
              </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServiceManagement