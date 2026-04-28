# How to Share Your Cricket Registration Project

## Option 1: Share Vercel Deployment Link (Best for Production)

After deploying to Vercel, you'll get a public URL like:
```
https://your-project-name.vercel.app
```

**To find your Vercel link:**
1. Go to [vercel.com](https://vercel.com) → Dashboard
2. Click your project
3. Copy the URL from the top or "Visit" button
4. Share this link with others via:
   - Email: `Join our cricket team registration: https://your-project-name.vercel.app`
   - WhatsApp, Telegram, Teams, Slack
   - QR code (generate from URL using qr-code-generator.com)
   - Social media posts

**Example:**
```
Hi, please register your cricket team here: https://my-cricket-app.vercel.app
Fill in team name, 8 player names, and upload photos for each player.
```

## Option 2: Custom Domain (Professional)

On Vercel, you can add a custom domain:
1. Vercel Dashboard → Project Settings → Domains
2. Add your domain (e.g., `registrations.mysite.com`)
3. Follow Vercel's DNS setup instructions
4. Share: `https://registrations.mysite.com`

## Option 3: Share GitHub Link (For Developers)

If others want to run it locally or deploy themselves:
```
https://github.com/your-username/your-repo
```

They can:
1. Clone the repo
2. Follow the README setup steps
3. Run locally or deploy to their own Vercel/Railway account

## Option 4: Share Local Project (Development Only)

If you want to share while still developing locally, use **ngrok**:

```powershell
# Install ngrok from https://ngrok.com
# Then in your project:

cd client
npm run dev
# This runs on http://localhost:3000

# In another terminal:
ngrok http 3000
# Output: https://abc123.ngrok.io
```

Share the ngrok URL with others. It expires after 2 hours (free tier).

## Option 5: Share as Docker Container

Containerize the project for easy setup:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy entire project
COPY . .

# Install all dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Build client
RUN cd client && npm run build

# Start server
WORKDIR /app/server
CMD ["npm", "start"]

EXPOSE 4000
```

Then others can:
```bash
docker pull your-docker-image
docker run -p 4000:4000 your-docker-image
```

## Recommended Flow for Your Project

1. **Deploy backend to Railway/Render** (see DEPLOYMENT.md)
   - Get backend URL: `https://your-backend.railway.app`

2. **Deploy frontend to Vercel**
   - Set `VITE_API_BASE=https://your-backend.railway.app/api`
   - Get Vercel URL: `https://your-cricket-app.vercel.app`

3. **Share Vercel URL** with:
   - Team captains
   - Club members
   - Via social media or email
   - Create QR code pointing to it

4. **Optional: Add custom domain** for professional look

## Security Tips

- Keep `.env` files private (don't commit to GitHub)
- Use strong MongoDB passwords
- Enable MongoDB IP whitelist for your backend server
- Consider adding a login/admin password
- Rate limit API endpoints to prevent abuse

## Monitor Submissions

1. Go to Vercel → Deployments to check traffic
2. Monitor MongoDB Atlas → Collections → registrations
3. Approve/reject teams via the admin panel in the app

## Link Format Examples

**For WhatsApp/Social:**
```
🏏 Register Your Cricket Team!

Dear Players,

Please register your team for the upcoming tournament:

🔗 https://your-cricket-app.vercel.app

📋 You need:
   • Team name
   • 8 player names (with Captain)
   • Photo for each player

⏰ Deadline: [Your Date]

Questions? Contact: [Your Email]
```

**QR Code:**
1. Go to https://qr-code-generator.com
2. Paste your Vercel URL
3. Download and share the QR code image

Done! Anyone with the link can now register their cricket team.
