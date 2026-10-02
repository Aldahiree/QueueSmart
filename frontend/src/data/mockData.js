export const services = [
  { id: 1, name: 'Academic Advising', description: 'Meet with an advisor', duration: 15, priority: 'Medium', queueLength: 3, isOpen: true },
  { id: 2, name: 'Financial Aid', description: 'Help with aid and billing', duration: 20, priority: 'High', queueLength: 2, isOpen: true },
  { id: 3, name: 'IT Help Desk', description: 'Tech and account support', duration: 10, priority: 'Low', queueLength: 2, isOpen: false },
]

export const queues = {
  'Academic Advising': [
    { id: 1, name: 'John doe', waitTime: 5 },
    { id: 2, name: 'Katarina Noxus', waitTime: 10 },
    { id: 3, name: 'Thomas Anderson', waitTime: 15 },
  ],

  'Financial Aid': [
    { id: 4, name: 'Sarah Lee', waitTime: 8 },
    { id: 5, name: 'Aziz Aldraje', waitTime: 14 },
  ],

  'IT Help Desk': [
    { id: 6, name: 'Ali Manfar', waitTime: 6 },
    { id: 7, name: 'Mando Allhide', waitTime: 7 },
  ],
}

export const currentQueue = {
  serviceId: 1,
  position: 3,
  status: 'waiting',
}

export const notifications = [
  { id: 1, message: 'You joined the Academic Advising queue.', read: false },
  { id: 2, message: 'Financial Aid queue is now open', read: true },
]

export const history = [
  { id: 1, serviceName: 'Academic Advising', date: '2026-09-28', outcome: 'Served' },
  { id: 2, serviceName: 'IT Help Desk', date: '2026-09-22', outcome: 'Left queue' },
  { id: 3, serviceName: 'Financial Aid', date: '2026-09-15', outcome: 'Served' },
  { id: 4, serviceName: 'Academic Advising', date: '2026-09-03', outcome: 'Missed turn' },
  { id: 5, serviceName: 'Financial Aid', date: '2026-08-26', outcome: 'Served' },
]
