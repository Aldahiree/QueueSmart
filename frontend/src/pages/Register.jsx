import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register({ onRegister }) {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmation, setConfirmation] = useState('')
	const [error, setError] = useState('')
	const navigate = useNavigate()

	function handleSubmit(event) {
		event.preventDefault()
		if (name.trim().length < 2) {
			setError('Enter a name with at least 2 characters.')
			return
		}
		if (password !== confirmation) {
			setError('Passwords do not match.')
			return
		}

		const result = onRegister({ name, email, password })
		if (!result.success) {
			setError(result.message)
			return
		}
		navigate('/join-queue')
	}

	return (
		<div className="page-container auth-page">
			<section className="card auth-card" aria-labelledby="register-title">
				<h1 id="register-title">Create your account</h1>
				<p>Register to join and manage your queues.</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label htmlFor="register-name">Full name</label>
					<input
						autoComplete="name"
						id="register-name"
						name="name"
						type="text"
						value={name}
						onChange={(event) => setName(event.target.value)}
						minLength={2}
						maxLength={80}
						required
					/>

					<label htmlFor="register-email">Email address</label>
					<input
						autoComplete="email"
						id="register-email"
						name="email"
						type="email"
						value={email}
						onChange={(event) => {
							setEmail(event.target.value)
							setError('')
						}}
						required
					/>

					<label htmlFor="register-password">Password</label>
					<input
						autoComplete="new-password"
						id="register-password"
						name="password"
						type="password"
						value={password}
						onChange={(event) => {
							setPassword(event.target.value)
							setError('')
						}}
						minLength={8}
						required
					/>

					<label htmlFor="register-confirmation">Confirm password</label>
					<input
						autoComplete="new-password"
						id="register-confirmation"
						name="passwordConfirmation"
						type="password"
						value={confirmation}
						onChange={(event) => {
							setConfirmation(event.target.value)
							setError('')
						}}
						minLength={8}
						required
					/>

					{error && <p className="auth-error" role="alert">{error}</p>}
					<button className="auth-submit" type="submit">Create account</button>
				</form>

				<p className="auth-switch">
					Already registered? <Link to="/login">Log in</Link>
				</p>
			</section>
		</div>
	)
}
