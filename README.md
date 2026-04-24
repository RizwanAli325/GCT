# Cricket Team Registration

A responsive React frontend with an Express + MySQL backend for registering cricket teams of 8 players.

## Features

- Team registration form for 8 players
- Admin panel to approve or reject registrations
- Approved registrations display `Ok`; rejected registrations display `Sorry`
- Responsive UI built with React and CSS

## Setup

1. Copy `server/.env.example` to `server/.env` and fill in your MySQL credentials.
2. In `server`, install dependencies and start the backend.

```powershell
cd d:\CTR\server
npm install
npm start
```

3. In `client`, install dependencies and start the React app.

```powershell
cd d:\CTR\client
npm install
npm run dev
```

4. Open the Vite app in your browser at the address shown in the terminal (usually `http://localhost:3000`).

## Notes

- The backend will automatically create the `cricket_registration` database and `registrations` table if they do not already exist.
- Use the admin panel to select `Approve` or `Reject` for each submitted team.
