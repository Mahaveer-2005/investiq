# ⚡ InvestIQ - Smart Investment Learning Platform

## 🚀 Quick Setup (Run these commands in order)

### Prerequisites
- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- npm

---

## Step 1: Setup Backend

```bash
cd investiq/backend
cp .env.example .env
npm install
npm run dev
```

Backend runs at: http://localhost:5000

---

## Step 2: Setup Frontend (new terminal)

```bash
cd investiq/frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

---

## Step 3: Open Browser
Go to: **http://localhost:3000**

Register a new account → Get **₹1,00,000 virtual coins FREE!**

---

## Features Included ✅
- 🔐 User Auth (Register/Login with JWT)
- 🪙 Virtual Coins (₹1,00,000 on signup)
- 📈 50+ Indian Stocks (BSE/NSE) with live mock prices
- 📊 Market Indices (SENSEX, NIFTY, Bank NIFTY)
- 🚀 IPO Center (Apply with virtual coins)
- 🏘️ Real Estate (Properties with broker contacts)
- 💼 Portfolio Dashboard with P&L tracking
- 🤖 AI Chatbot for investment advice
- 📉 Stock Charts (30-day history)
- 📝 Transaction History

## MongoDB Database
- Database name: **investiq**
- Connection: mongodb://localhost:27017/investiq

## Folder Structure
```
investiq/
├── backend/
│   ├── models/User.js
│   ├── routes/ (auth, stocks, ipo, realestate, portfolio, chat, market)
│   ├── middleware/auth.js
│   └── server.js
└── frontend/
    └── src/
        ├── pages/ (Dashboard, Stocks, StockDetail, IPO, RealEstate, Portfolio)
        ├── components/ (Navbar, ChatBot)
        └── context/AuthContext.js
```
