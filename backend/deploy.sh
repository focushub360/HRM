#!/bin/bash
echo "Starting backend deployment..."

# Pull latest code from main branch
git reset --hard
git pull origin main

# Install new dependencies if any
npm install

# Restart PM2 process
pm2 restart ecosystem.config.cjs --update-env

echo "Backend deployment finished successfully!"
