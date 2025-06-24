#!/bin/bash

# Get commit information
COMMIT_AUTHOR=$(git log -2 --pretty=format:'%an' | tail -n 1)
COMMIT_MESSAGE=$(git log -2 --pretty=format:'%s' | tail -n 1)

# Store the response and HTTP code
response=$(curl -v --silent --show-error --fail --location --request \
  POST https://release-management.awellhealth.com/api/deployments/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${RELEASE_MANAGEMENT_API_KEY}" \
  -d '{
    "application": "panels",
    "environment": "development",
    "version": "'"$1"'"
  }' 2>&1)

# Get the exit code
exit_code=$?

# If curl failed, print the full response and exit with the same code
if [ $exit_code -ne 0 ]; then
    echo "❌ Curl command failed with exit code: $exit_code"
    echo "Detailed response:"
    echo "$response"
    exit $exit_code
fi

echo "✅ Deployment request sent successfully"