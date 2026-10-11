#!/bin/bash
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   InvestIQ - Setup Script                 ║"
echo "║   AI-Powered Investing Companion          ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Backend
echo "📦 Installing backend dependencies..."
cd backend && npm install
echo "✅ Backend ready"

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install
echo "✅ Frontend ready"

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   Setup Complete! Start with:             ║"
echo "║                                           ║"
echo "║   Terminal 1: cd backend && npm run dev   ║"
echo "║   Terminal 2: cd frontend && npm start    ║"
echo "║                                           ║"
echo "║   Then open: http://localhost:3000        ║"
echo "╚═══════════════════════════════════════════╝"
