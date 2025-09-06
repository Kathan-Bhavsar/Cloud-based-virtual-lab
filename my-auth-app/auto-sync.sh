#!/bin/bash
# AUTO-SAVE JUPYTER FILES TO S3 - PERSISTENT STORAGE

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

# ✅ DEBUG: Show what we received
echo "Environment variable JUPYTER_USER = $JUPYTER_USER"
echo "Using email: $USER_EMAIL"

# Clean email for S3 path (replace @ with _)
CLEAN_EMAIL=$(echo "$USER_EMAIL" | tr '@' '_')
S3_BUCKET="virtual-lab-secure-files-kb"
S3_PATH="s3://$S3_BUCKET/users/$CLEAN_EMAIL/"

echo "User: $USER_EMAIL"
echo "Clean Email: $CLEAN_EMAIL"
echo "S3 Path: $S3_PATH"

# ✅ 1. FIRST: Create user folder in S3
echo "Creating user folder in S3..."
aws s3api put-object --bucket "$S3_BUCKET" --key "users/$CLEAN_EMAIL/" || echo "Folder may already exist"

# ✅ 2. SECOND: DOWNLOAD existing files from S3 (if any)
echo "Downloading existing files from S3..."
aws s3 sync "$S3_PATH" /home/jupyter/ --quiet
echo "✅ Download completed"

# ✅ 3. THIRD: Setup auto-UPLOAD (no --delete flag!)
sync_files() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] 🔄 Uploading files to S3..."
    
    if [ "$(ls -A /home/jupyter 2>/dev/null)" ]; then
        # ✅ UPLOAD ONLY - NO --delete flag!
        aws s3 sync /home/jupyter/ "$S3_PATH" --quiet
        echo "✅ Upload completed"
    else
        echo "📭 No files to upload"
    fi
}

# ✅ 4. Initial upload of any new files
sync_files

# ✅ 5. Continuous upload every 2 minutes
echo "⏰ Starting auto-upload (every 2 minutes)..."
while true; do
    sleep 120
    sync_files
done &

echo "=== ✅ Auto-save process started successfully ==="
echo "📁 Local files: /home/jupyter/"
echo "📁 S3 location: $S3_PATH"
echo "💡 Files will persist between lab sessions!"

# Keep the script running
wait