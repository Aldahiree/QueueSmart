export const STATUS_STEPS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'almost ready', label: 'Almost ready' },
  { key: 'served', label: 'Served' },
]

export function getStatus(position) {
  if (position <= 0) return 'served'
  if (position <= 2) return 'almost ready'
  return 'waiting'
}
