#!/bin/bash
echo "Starting InvestIQ..."
# Start backend in background
cd backend && npm run dev &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
sleep 3
# Start frontend
cd ../frontend && npm start
