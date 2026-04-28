# Cricket Team Registration

A responsive React frontend with an Express + MongoDB backend for registering cricket teams of 8 players.

## Features

- Team registration form for 8 players
- Admin panel to approve or reject registrations
- Approved registrations display `Ok`; rejected registrations display `Sorry`
- Responsive UI built with React and CSS
- MongoDB Atlas integration for persistent data storage

## Local Development Setup

1. Copy `server/.env.example` to `server/.env` and set your MongoDB connection string.

```powershell
cd d:\CTR\server
cp .env.example .env
# Edit .env with your MONGODB_URI and PORT
```

2. In `server`, install dependencies and start the backend.

```powershell
npm install
npm start
```

3. In `client`, install dependencies and start the React app (in a new terminal).

```powershell
cd d:\CTR\client
npm install
npm run dev
```

4. Open the app in your browser at `http://localhost:3000`.

## Deployment to Vercel

### Frontend Deployment (React Client)

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Create a new project and import your repository.
4. Set the root directory: `client`
5. Environment variables:
   - `VITE_API_BASE`: Your backend API URL (e.g., `https://my-backend.railway.app/api`)
   - `VITE_UPLOAD_BASE`: Your backend uploads URL (e.g., `https://my-backend.railway.app/uploads`)
6. Deploy!

### Backend Deployment Options

**Option A: Deploy to Railway (Recommended for Node.js)**
1. Sign up at [railway.app](https://railway.app)
2. Create a new project and select GitHub
3. Deploy the `server` folder
4. Set environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `PORT`: 4000
5. Copy the public URL and update Vercel environment variables with this URL

**Option B: Deploy to Render**
1. Sign up at [render.com](https://render.com)
2. Create a new Web Service from GitHub
3. Select the repository and set root directory to `server`
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables (same as Option A)

**Option C: Deploy API to Vercel (Serverless)**
- The `api/index.js` file is ready for Vercel serverless deployment
- Use the `vercel.json` config provided

## Environment Variables

### Server (.env)
```
PORT=4000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
```

### Client (.env.production)
```
VITE_API_BASE=https://your-api-url.com/api
VITE_UPLOAD_BASE=https://your-api-url.com/uploads
```

## Notes

- The backend connects using `MONGODB_URI` and creates the `registrations` collection on first insert.
- Use the admin panel to select `Approve` or `Reject` for each submitted team.
- MongoDB Atlas is connected and synced with local JSON fallback.
- Frontend will be available at your Vercel domain; update backend URL in Vercel env vars after deployment.

## GCT Registration System
