import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login({ onLogin }) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const navigate = useNavigate()

	function handleSubmit(event) {
		event.preventDefault()
		const result = onLogin({ email, password })
		if (!result.success) {
			setError(result.message)
			return
		}
		navigate('/join-queue')
	}

	return (
		<div className="page-container auth-page">
			<section className="card auth-card" aria-labelledby="login-title">
				<h1 id="login-title">Welcome back</h1>
				<p>Log in to continue to QueueSmart.</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label htmlFor="login-email">Email address</label>
					<input
						autoComplete="email"
						id="login-email"
						name="email"
						type="email"
						value={email}
						onChange={(event) => {
							setEmail(event.target.value)
							setError('')
						}}
						required
					/>

					<label htmlFor="login-password">Password</label>
					<input
						autoComplete="current-password"
						id="login-password"
						name="password"
						type="password"
						value={password}
						onChange={(event) => {
							setPassword(event.target.value)
							setError('')
						}}
						required
					/>

					{error && <p className="auth-error" role="alert">{error}</p>}
					<button className="auth-submit" type="submit">Log in</button>
				</form>

				<p className="auth-switch">
					New to QueueSmart? <Link to="/register">Create an account</Link>
				</p>
			</section>
		</div>
	)
}
