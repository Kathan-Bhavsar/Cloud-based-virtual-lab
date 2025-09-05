#!/bin/bash
# AUTO-SAVE JUPYTER FILES TO S3 EVERY 2 MINUTES

echo "=== Jupyter Auto-Save to S3 Started ==="

# Install AWS CLI if not already installed
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    pip install awscli
fi

# Set AWS region
export AWS_DEFAULT_REGION=ap-south-1

# Get user email from environment variable
if [ -z "$JUPYTER_USER" ]; then
    echo "⚠️ JUPYTER_USER not set. Using default email."
    USER_EMAIL="default_user@example.com"
else
    USER_EMAIL="$JUPYTER_USER"
fi

# ✅ DEBUG LINES ADDED HERE ✅
echo "Environment variable JUPYTER_USER = $JUPYTER_USER"
echo "Using email: $USER_EMAIL"

# Clean email for S3 path (replace @ with _)
CLEAN_EMAIL=$(echo "$USER_EMAIL" | tr '@' '_')
S3_BUCKET="virtual-lab-secure-files-kb"  # ✅ YOUR BUCKET NAME
S3_PATH="s3://$S3_BUCKET/users/$CLEAN_EMAIL/"

echo "User: $USER_EMAIL"
echo "Clean Email: $CLEAN_EMAIL"
echo "S3 Path: $S3_PATH"

# Function to sync files to S3
sync_files() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] Syncing files to S3..."
    
    # Only sync if workspace has files
    if [ "$(ls -A /home/jupyter 2>/dev/null)" ]; then
        echo "Found files, syncing..."
        # ✅ FIXED: Removed --quiet flag
        aws s3 sync /home/jupyter/ "$S3_PATH" --delete
        echo "✅ Sync completed"
    else
        echo "No files to sync"
    fi
}

# Create user folder in S3 first
echo "Creating user folder in S3..."
aws s3api put-object --bucket "$S3_BUCKET" --key "users/$CLEAN_EMAIL/" || echo "Folder may already exist"

# Initial sync
sync_files

# Auto-sync every 2 minutes
while true; do
    sleep 120
    sync_files
done &

echo "=== Auto-save background process started ==="
wait