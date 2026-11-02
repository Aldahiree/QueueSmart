import { useEffect, useState } from 'react'
import { getProfile, saveProfile } from '../api/auth'

export default function Profile({ token, onProfileUpdated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    getProfile(token)
      .then(({ profile }) => {
        if (active) {
          setName(profile.name)
          setEmail(profile.email)
          setRole(profile.role)
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Unable to load your profile.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [token])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const { profile } = await saveProfile(token, { name })
      setName(profile.name)
      setEmail(profile.email)
      setRole(profile.role)
      onProfileUpdated(profile)
      setNotice('Your profile was saved.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container auth-page">
      <section className="card auth-card" aria-labelledby="profile-title">
        <h1 id="profile-title">Your profile</h1>
        <p>Update your account name. Email and role are managed separately.</p>

        {loading ? (
          <p>Loading profile...</p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-name">Full name</label>
            <input
              autoComplete="name"
              id="profile-name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
                setNotice('')
              }}
              minLength={2}
              maxLength={80}
              required
            />

            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" name="email" type="email" value={email} readOnly />

            <label htmlFor="profile-role">Role</label>
            <input id="profile-role" name="role" value={role} readOnly />

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            <button className="auth-submit" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
