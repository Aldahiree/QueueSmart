import { Link, NavLink } from 'react-router-dom'

export default function Navbar({ currentUser, onLogout }) {
	return (
		<header className="navbar">
			<div className="navbar-inner">
				<Link className="navbar-brand" to="/join-queue" aria-label="QueueSmart home">
					<h2>QueueSmart</h2>
				</Link>

				<nav className="navbar-links" aria-label="Main navigation">
					<NavLink to="/join-queue">Join Queue</NavLink>
					<NavLink to="/admin">Admin Dashboard</NavLink>
					<NavLink to="/admin/services">Services</NavLink>
					<NavLink to="/admin/queue">Queue Management</NavLink>
				</nav>

				<div className="navbar-account">
					{currentUser ? (
						<>
							<span className="navbar-user">{currentUser.name}</span>
							<button className="navbar-action" type="button" onClick={onLogout}>
								Log out
							</button>
						</>
					) : (
						<>
							<Link className="navbar-login" to="/login">Log in</Link>
							<Link className="navbar-register" to="/register">Register</Link>
						</>
					)}
				</div>
			</div>
		</header>
	)
}
