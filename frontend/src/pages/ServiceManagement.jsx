import { useEffect, useState } from 'react'
import {
  createService,
  getServices,
  setServiceStatus,
  updateService,
} from '../api/services'
import './Admin.css'

function ServiceManagement({ token }) {
  const [services, setServices] = useState([])

  const[name, setName] = useState('')
  const[description, setDescription] = useState('')
  const[duration, setDuration] = useState('')
  const[priority, setPriority] = useState('Low')
  const[editId, setEditId] = useState(null)
  const[error, setError] = useState('')
  const[loading, setLoading] = useState(true)

  //load the services from the backend
  useEffect(() => {
    if (!token) return

    getServices(token)
      .then((data) => setServices(data.services))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  function resetForm() {
    setName('')
    setDescription('')
    setDuration('')
    setPriority('Low')
    setEditId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const service = {
      name: name,
      description: description,
      duration: Number(duration),
      priority: priority
    }

    try {
      if (editId === null) {
        const data = await createService(token, service)
        setServices([...services, data.service])
      } else {
        const data = await updateService(token, editId, service)
        setServices(services.map((s) => s.id === editId ? data.service : s))
      }
      resetForm()
    } catch (err) {
      setError(err.message)
    }
  }

  function editService(service) {
    setName(service.name)
    setDescription(service.description)
    setDuration(service.duration)
    setPriority(service.priority)
    setEditId(service.id)
  }

  //admin opens or closes a service
  async function toggleStatus(service) {
    setError('')
    try {
      const data = await setServiceStatus(token, service.id, !service.isOpen)
      setServices(services.map((s) => s.id === service.id ? data.service : s))
    } catch (err) {
      setError(err.message)
    }
  }

  return(
    <div className='admin-page'>
      <h1>Service Management</h1>
      <p>Create a new service or edit an existing one.</p>

      {error && <p className='empty-message' role='alert'>{error}</p>}

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
        maxLength="500"
        placeholder="Describe the service"
        required
        />

        <label>Expected Duration (minutes)</label>
        <input
        type="number"
        value={duration}
        onChange={(event) => setDuration(event.target.value)}
        min="1"
        max="480"
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
          {editId === null
          ? 'Create service'
          : 'Save changes'}
        </button>
        {editId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <h2>Current Services</h2>

      {loading && <p className='empty-message'>Loading services...</p>}

      <div className='service-list'>
        {services.map((service) => (
          <div className='service-card' key={service.id}>
            <h3>{service.name}</h3>

            <p>{service.description}</p>

              <p>
                Duration: <strong>{service.duration} minutes</strong>
              </p>
              <p>
                Priority: <strong>{service.priority}</strong>
              </p>
              <p>
                Status: <strong>{service.isOpen ? 'Open' : 'Closed'}</strong>
              </p>
              <button onClick={() => editService(service)}>
                Edit
              </button>
              <button onClick={() => toggleStatus(service)}>
                {service.isOpen ? 'Close service' : 'Open service'}
              </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServiceManagement