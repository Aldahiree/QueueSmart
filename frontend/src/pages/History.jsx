import { useState } from 'react'
import './QueueTracking.css'

const OUTCOMES = ['Served', 'Left queue', 'Missed turn']

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function History({ history }) {
  const [outcome, setOutcome] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  let error = ''
  if (fromDate && toDate && fromDate > toDate) {
    error = '"From" date cannot be after the "To" date.'
  } else if (fromDate > today || toDate > today) {
    error = 'Dates cannot be in the future.'
  }

  const filtered = [...history]
    .filter((entry) => !outcome || entry.outcome === outcome)
    .filter((entry) => error || !fromDate || entry.date >= fromDate)
    .filter((entry) => error || !toDate || entry.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  function clearFilters() {
    setOutcome('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="page-container">
      <h1>History</h1>
      <p>Past queues you have joined.</p>

      <section className="card" aria-label="Filter history">
        <div className="history-filters">
          <div>
            <label htmlFor="history-outcome">Outcome</label>
            <select id="history-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="">All outcomes</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="history-from">From</label>
            <input
              id="history-from"
              type="date"
              max={today}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="history-to">To</label>
            <input
              id="history-to"
              type="date"
              max={today}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="history-error" role="alert">
            {error}
          </p>
        )}

        <button type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </section>

      <section className="card" aria-label="Past queues">
        {filtered.length === 0 ? (
          <p>No past queues match these filters.</p>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Service</th>
                  <th scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date)}</td>
                    <td>{entry.serviceName}</td>
                    <td>{entry.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
