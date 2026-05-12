#!/bin/bash

# Check if server is running
echo "🔍 Checking if server is running..."

response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health 2>/dev/null)

if [ "$response" = "200" ]; then
    echo "✅ Server is running on http://localhost:5000"
    exit 0
else
    echo "❌ Server is NOT running!"
    echo ""
    echo "Please start the server first:"
    echo "  npm run dev"
    echo ""
    echo "Expected server on: http://localhost:5000"
    exit 1
fi
