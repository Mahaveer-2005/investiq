# InvestIQ deployment checklist

This project is split into a Create React App frontend, an Express/Mongoose API, and an optional Flask ML service.

## 1. Before deploying

- Rotate any API keys that were ever committed to Git history.
- Never commit `.env`, `backend/.env`, real API keys, MongoDB credentials, or JWT secrets.
- Keep the tracked Python model files under `backend/ml/models`; the ML service loads them at startup.
- Install dependencies from `package-lock.json` and `backend/ml/requirements.txt`, not from checked-in `node_modules`.

## 2. MongoDB Atlas

Create a database named `investiq`, create a database user, and configure network access for your hosting provider. Use the Atlas connection string as `MONGODB_URI` in Render. Restrict network access as tightly as the hosting platform allows.

## 3. Render

The root `render.yaml` defines two web services:

- `investiq-api`: root directory `backend`, build `npm ci`, start `node server.js`.
- `investiq-ml`: root directory `backend/ml`, install `requirements.txt`, start Gunicorn.

Configure the following API-service environment variables in Render:

- Required: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`.
- ML integration: `ML_SERVER_URL=https://<your-ml-service>.onrender.com`.
- Optional email: `RESEND_API_KEY` and `EMAIL_FROM`, or `EMAIL_USER` and `EMAIL_PASS`.
- Optional AI: `GROQ_API_KEY`.
- Optional payment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `MERCHANT_UPI_ID`, `MERCHANT_NAME`.

Generate a unique JWT secret locally with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Deploy the ML service first if you want ML behavior analysis enabled, then set `ML_SERVER_URL` on the API service. If the ML service is unreachable, the behavior route is designed to fall back to rule-based analysis.

## 4. Vercel frontend

- Set the project root directory to `frontend`.
- Use the Create React App build command `npm run build`.
- Set `REACT_APP_API_URL` to the complete Render API URL, for example `https://investiq-api.onrender.com`, without a trailing slash.
- Set the API's `CLIENT_URL` to the exact deployed Vercel origin, without a trailing slash.
- Redeploy after changing `REACT_APP_API_URL`; Create React App embeds it at build time.

The `frontend/vercel.json` file adds a single-page-app fallback so direct navigation and refreshes on React Router paths resolve to the app.

## 5. Verification after deployment

1. Open `https://<api-service>.onrender.com/health`; expect HTTP 200 and `status: ok`, with `database: connected`.
2. Check Render logs for MongoDB connection and optional provider configuration messages.
3. Test register, OTP verification, login, and password reset. Resend's shared sandbox sender is not suitable for arbitrary production recipients; verify a sending domain and set `EMAIL_FROM` to that domain.
4. Open the frontend and refresh a nested route such as `/portfolio`.
5. Check browser Network/Console for failed API calls and CORS errors.
6. Test behavior analysis and confirm its response indicates ML or rules fallback as expected.
7. Test market/IPO data providers separately; third-party sources can rate-limit or block cloud IPs.
8. Test payments with Razorpay test credentials only until live credentials and required business verification are complete.

A successful build does not prove every third-party API works. Verify actual deployment logs and each user flow after deployment.
