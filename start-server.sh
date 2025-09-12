#!/bin/bash

# Kill any existing processes on port 9002
lsof -ti:9002 | xargs kill -9 2>/dev/null

# Clear Next.js cache
rm -rf .next

# Start Next.js without Turbopack
exec npx next dev -p 9002 --hostname 0.0.0.0