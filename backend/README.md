# QueueSmart authentication and user profiles

This backend connects the Assignment 3 Express API to MySQL. User accounts and
profiles are stored in MySQL; passwords are stored as salted scrypt hashes.
Session tokens remain in server memory and are revoked at logout or server
restart.

## 1. Prerequisites

- Node.js 22 or newer
- Docker Desktop with Docker Compose

Run the following commands in PowerShell from the repository root.

## 2. Configure MySQL and the API

```powershell
if (-not (Test-Path backend\.env)) {
  Copy-Item backend\.env.example backend\.env
}
```

Edit `backend\.env`. Set unique values for `DB_PASSWORD`,
`MYSQL_ROOT_PASSWORD`, and `ADMIN_PASSWORD`. The configured administrator is
created on API startup. Public registration always assigns the `User` role;
clients cannot register as an administrator. If you already have a
`backend\.env`, keep it and add any missing database settings from
`backend\.env.example` rather than overwriting your existing configuration.

## 3. Start MySQL

```powershell
docker compose --env-file backend\.env up -d --wait
```

Compose starts MySQL 8.4, creates the `queuesmart` database and application
user, and loads [`sql/schema.sql`](./sql/schema.sql) to create the tables.
MySQL data is kept in the named `queuesmart_mysql_data` volume across container
restarts.

The schema has two tables:

- `UserCredentials`: primary key `id`, unique email, password salt/hash, and a
  constrained `User`/`Administrator` role.
- `UserProfile`: `user_id` is both its primary key and a foreign key to
  `UserCredentials.id`; deleting credentials cascades to the profile.

Registration inserts both rows in one transaction. Passwords never appear in
API responses. Email addresses are normalized to lowercase and the unique
constraint prevents duplicate accounts.

## 4. Start the API and frontend

In one PowerShell terminal:

```powershell
Set-Location backend
npm.cmd install
npm.cmd run dev
```

In a second terminal:

```powershell
Set-Location frontend
npm.cmd run dev
```

Open the Vite URL (normally `http://localhost:5173`). The frontend sends
requests to `http://localhost:3001`; configure `VITE_API_URL` if the API runs
elsewhere. The backend reads its database and administrator settings from
`backend\.env`.

## 5. Authentication and profile endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API availability |
| `POST` | `/api/auth/register` | Register a regular user and create a session |
| `POST` | `/api/auth/login` | Verify credentials and create a session |
| `GET` | `/api/auth/me` | Return the authenticated user's public details |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `GET` | `/api/auth/profile` | Retrieve the signed-in user's profile |
| `PUT` | `/api/auth/profile` | Save the signed-in user's profile name |

Authenticated routes require `Authorization: Bearer <token>`. Registration
requires a 2–80 character name, valid email, and 8–128 character password.
Profile updates accept a 2–80 character `name`; email and role are read-only
and cannot be changed through this endpoint.

Example profile update:

```powershell
$token = "<token returned by login or registration>"
Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3001/api/auth/profile `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name":"Alex Example"}'
```

## 6. Run tests

```powershell
Set-Location backend
npm.cmd test
```

The API tests cover registration, duplicate emails, role restrictions, login,
invalid registration/profile inputs, authentication, and profile retrieval and
saving. They use the in-memory repository for isolation and do not require a
running MySQL service; the running API uses the MySQL repository.

## 7. Stop the database

```powershell
docker compose --env-file backend\.env down
```

This stops the container but preserves database data. To intentionally reset
all local database data, remove the named volume separately with
`docker compose --env-file backend\.env down -v`.

The schema file is applied automatically only when the MySQL data volume is
first created. For subsequent schema changes, apply a migration to the existing
database instead of expecting the initialization script to run again.
