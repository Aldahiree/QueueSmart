import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { services } from '../data/mockData';
import { STATUS_STEPS, getStatus } from '../utils/queueStatus';
import './QueueTracking.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function QueueStatus({ activeQueue, token, onStatusChange, onLeave }) {
  const [queueInfo, setQueueInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const serviceId = activeQueue?.serviceId;


  //get the user's real position from the backend
  useEffect(() => {
    if (serviceId == null || !token) {
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      setLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/queues/${serviceId}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Could not load queue status.');
        }

        if (!cancelled) {
          setQueueInfo(data);
          setError('');

          onStatusChange?.(data);
        }

      } catch (error) {
        if (!cancelled) {
          setError(error.message);
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };

  }, [serviceId, token, refresh, onStatusChange]);


  if (!activeQueue) {
    return (
      <div className="page-container">
        <h1>Queue Status</h1>
        <section className="card">
          <p>You are not in a queue right now.</p>
          <p>
            <Link to="/join-queue">Join a queue</Link> to track your position here.
          </p>
        </section>
      </div>
    );
  }


  const service = services.find((s) => s.id === activeQueue.serviceId);

  const currentInfo = queueInfo?.serviceId === String(serviceId)
    ? queueInfo
    : null;

  const position = currentInfo?.position ?? activeQueue.position;
  const status = currentInfo?.status === 'served'
    ? 'served'
    : getStatus(position);

  const currentStep = STATUS_STEPS.findIndex((step) => step.key === status);
  const peopleAhead = Math.max(position - 1, 0);
  const waitTime = peopleAhead * (service?.duration ?? 0);


  return (
    <div className="page-container">
      <h1>Queue Status</h1>

      <p>Track your place in line for {service?.name ?? 'your service'}.</p>

      <section className="card" aria-labelledby="status-title">
        <h2 id="status-title">{service?.name ?? 'Queue'}</h2>

        <ol className="status-steps" aria-label="Queue progress">
          {STATUS_STEPS.map((step, index) => (
            <li
              key={step.key}
              className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''}
              aria-current={index === currentStep ? 'step' : undefined}
            >
              {step.label}
            </li>
          ))}
        </ol>

        {error && (
          <p style={{ color: '#c0392b' }} role="alert">
            {error}
          </p>
        )}

        {loading && <p>Checking queue status...</p>}

        {status === 'served' ? (
          <div>
            <p>
              <strong>It's your turn.</strong>
            </p>

            <p>
              <Link to="/history">View your history</Link> or{' '}
              <Link to="/join-queue">join another queue</Link>.
            </p>
          </div>
        ) : (
          <>
            <div className="status-stats">
              <div className="status-stat">
                <span className="status-stat-label">Your position</span>
                <span className="status-stat-value">{position}</span>
              </div>

              <div className="status-stat">
                <span className="status-stat-label">People ahead</span>
                <span className="status-stat-value">{peopleAhead}</span>
              </div>

              <div className="status-stat">
                <span className="status-stat-label">Estimated wait</span>
                <span className="status-stat-value">
                  {peopleAhead === 0 ? "You're next" : `${waitTime} min`}
                </span>
              </div>
            </div>

            <p className="status-message" role="status">
              {status === 'almost ready'
                ? 'It is almost your turn.'
                : 'You are waiting. We will notify you when it is almost your turn.'}
            </p>

            <div className="status-actions">
              <button
                type="button"
                onClick={() => setRefresh((value) => value + 1)}
                disabled={loading}
              >
                Refresh Status
              </button>

              <button type="button" onClick={onLeave}>
                Leave queue
              </button>
            </div>
          </>
        )}
      </section>

      <p>
        <Link to="/notifications">View all notifications</Link>
      </p>
    </div>
  );
}