# QueueSmart backend

This is the Assignment 3 Express API for authentication. Users and login sessions
are kept in server memory, so they are cleared when the server restarts. Passwords
are stored as salted scrypt hashes; the original password is never returned.

## Run locally (PowerShell)

Open two terminals in the repository.

In terminal 1, start the API:

```powershell
cd "C:\Users\John\OneDrive\Desktop\COSC 4353\QueueSmart\backend"
npm.cmd install
Copy-Item .env.example .env
# Edit .env and replace the example administrator email and password.
npm.cmd run dev
```

The API listens on `http://localhost:3001`. The `.env` file is ignored by Git.
The optional `ADMIN_EMAIL` and `ADMIN_PASSWORD` settings create one
Administrator account when the server starts. Public registration always
creates a `User` account, even if the request includes a `role` field.

In terminal 2, run the UI:

```powershell
cd "C:\Users\John\OneDrive\Desktop\COSC 4353\QueueSmart\frontend"
npm.cmd run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).
The UI calls the API at `http://localhost:3001`; set `VITE_API_URL` in the
frontend environment if you run the API elsewhere.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the API is running |
| `POST` | `/api/auth/register` | Create a User account and sign in |
| `POST` | `/api/auth/login` | Sign in; returns a session token and public user |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `POST` | `/api/auth/logout` | Revoke the current session token |

Send registration and login data as JSON. Authenticated endpoints require
`Authorization: Bearer <token>`. Registration expects a 2–80 character name, a
valid email, and a password of 8–128 characters. The Login and Register screens
display server validation and authentication errors.

## Test

```powershell
npm.cmd test
```

These tests use Node's built-in test runner and make real HTTP requests to an
ephemeral local Express server; no database or test database is needed.
