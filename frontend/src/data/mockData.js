export const services = [
  { id: 1, name: 'Academic Advising', description: 'Meet with an advisor', duration: 15, priority: 'medium', queueLength: 4, isOpen: true },
  { id: 2, name: 'Financial Aid', description: 'Help with aid and billing', duration: 20, priority: 'high', queueLength: 7, isOpen: true },
  { id: 3, name: 'IT Help Desk', description: 'Tech and account support', duration: 10, priority: 'low', queueLength: 2, isOpen: false },
]

export const currentQueue = {
  serviceId: 1,
  position: 3,
  status: 'waiting',
}

export const notifications = [
  { id: 1, message: 'You moved up to position 3', read: false },
  { id: 2, message: 'Financial Aid queue is now open', read: true },
]