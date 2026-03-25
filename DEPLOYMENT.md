# Unified Render Deployment Guide

This project is now configured to hide all complexity behind a single **Render Web Service**. The backend Express server will build and serve your React frontend automatically.

## Deployment Strategy: Unified Web Service
You will deploy the **Root Directory** as a single service. Render will build both the frontend and backend dependencies in one go.

- **Platform:** Render (Web Service)
- **Runtime:** Node
- **Build Command:** `npm run render-build`
- **Start Command:** `npm start`

### Required Environment Variables:
| Variable | Description |
|---|---|
| `PORT` | Set automatically by Render (usually 10000). |
| `MONGO_URI` | Your MongoDB Atlas connection string. |
| `JWT_SECRET` | A secure random string for authentication. |
| `VITE_GEMINI_API_KEY` | Your Google Gemini API Key. |

> [!NOTE]
> You no longer need `ALLOWED_ORIGINS` or `VITE_API_URL` environment variables because the app is now a "Single-Origin" application. The frontend automatically connects to the server it is hosted on.

---

## 🔧 Production Verification
1.  **Dashboard:** Ensure the Render "Build Status" shows success for the `render-build` script.
2.  **Navigation:** Once deployed, visit your Render URL. You should see the landing page.
3.  **Real-Time:** Log in and test the Video Call. It will now connect via the same domain, ensuring zero CORS issues.
