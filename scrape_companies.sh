#!/usr/bin/env bash

# Exit immediately if a command fails, treat unset variables as an error
set -eo pipefail

# Ensure standard PATH for cron execution
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# Resolve the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo "[$TIMESTAMP] Starting ATS Daily Scrape Pipeline"
echo "=================================================="

# 1. Start Docker containers if they are not already running
echo "1. Ensuring Docker containers are running..."
docker compose up -d --no-build

# 2. Wait for the Python backend to become ready
ENDPOINT_URL="http://127.0.0.1:8080/scrape_ats"
HEALTH_URL="http://127.0.0.1:8080/companies"

echo "2. Waiting for backend service to be responsive..."
MAX_RETRIES=30
RETRY_COUNT=0
SERVICE_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f -m 3 "$HEALTH_URL" > /dev/null 2>&1; then
        SERVICE_READY=true
        echo "Backend is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

if [ "$SERVICE_READY" = false ]; then
    echo "Warning: Healthcheck timed out after 60s. Proceeding to trigger endpoint directly..."
fi

# 3. Trigger ATS Scrape
echo "3. Sending GET request to $ENDPOINT_URL..."
HTTP_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$ENDPOINT_URL" || true)

HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -e '$d')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1 | sed -e 's/HTTP_STATUS://')

echo "Response Status: $HTTP_STATUS"
echo "Response Body: $HTTP_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "[$TIMESTAMP] Daily ATS Scrape completed successfully."
else
    echo "[$TIMESTAMP] Daily ATS Scrape finished with status code: $HTTP_STATUS"
fi

echo "=================================================="
