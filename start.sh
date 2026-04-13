#!/bin/bash
set -e

echo "🚀 Starting DotZero CR Portal..."

# 1. Ensure Docker is running
if ! docker info &>/dev/null; then
  echo "⏳ Starting Docker Desktop..."
  open -a Docker
  echo "   Waiting for Docker to be ready..."
  until docker info &>/dev/null; do sleep 2; done
  echo "✅ Docker is ready"
fi

# 2. Ensure PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q '^dotzero_postgres$'; then
  echo "⏳ Starting PostgreSQL container..."
  docker start dotzero_postgres
  sleep 3
fi
echo "✅ PostgreSQL is running"

# 3. Kill any existing processes on ports 3000 and 4000
lsof -ti:3000 -ti:4000 | xargs kill -9 2>/dev/null || true

# 4. Start backend server
echo "⏳ Starting backend server..."
cd "$(dirname "$0")/server"
export DATABASE_URL='postgresql://dotzero:dotzero@localhost:5432/dotzero_crms'
export JWT_SECRET='dotzero_dev_secret_key_replace_in_production_min32'
export SENDGRID_API_KEY=''
export EMAIL_FROM='hareem.rehan@nextgeni.com'
export SMTP_USER='hareem.rehan@nextgeni.com'
export SMTP_PASS='ofzl lwvc iwfv fzcf'
export CLIENT_URL='http://localhost:3000'
export NODE_ENV='development'
export PORT='4000'
export S3_BUCKET='dotzero-cr-attachments'
export S3_REGION='us-east-1'
/opt/homebrew/bin/node ./node_modules/.bin/ts-node -r tsconfig-paths/register src/server.ts &>/tmp/dotzero-server.log &
SERVER_PID=$!

# 5. Start frontend client
echo "⏳ Starting frontend client..."
cd "$(dirname "$0")/client"
/opt/homebrew/bin/node ./node_modules/.bin/next dev --port 3000 &>/tmp/dotzero-client.log &
CLIENT_PID=$!

# 6. Wait and verify
sleep 6
if grep -q "running on port 4000" /tmp/dotzero-server.log && grep -q "Ready" /tmp/dotzero-client.log; then
  echo ""
  echo "✅ DotZero CR Portal is running!"
  echo "   Frontend → http://localhost:3000"
  echo "   Backend  → http://localhost:4000"
  echo ""
  echo "   Logs: /tmp/dotzero-server.log | /tmp/dotzero-client.log"
else
  echo "❌ Something went wrong. Check logs:"
  echo "   Server: tail /tmp/dotzero-server.log"
  echo "   Client: tail /tmp/dotzero-client.log"
fi
