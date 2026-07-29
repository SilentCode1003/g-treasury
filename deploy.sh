#!/bin/bash
set -e

echo "------------------------------------------"
echo "🛠️  Refreshing Services: EMAIS System"
echo "------------------------------------------"

echo "🧹 Clearing lockfile to prevent Linux binary errors..."
rm -f package-lock.json

echo "📦 Installing workspace dependencies..."
npm install

if [ ! -f .env ]; then
    echo "❌ ERROR: Root .env file missing! Create it before running."
    exit 1
fi

echo "🔄 Managing Backend Process..."
if pm2 show "EMAIS SERVER" > /dev/null; then
    echo "♻️  Resetting EMAIS SERVER to apply new config..."
    pm2 delete "EMAIS SERVER"
fi

echo "✨ Starting EMAIS SERVER..."
pm2 start server/server.js --name "EMAIS SERVER" --cwd $(pwd) --node-args="-r dotenv/config"

echo "🌐 Managing Frontend Process..."
echo "🏗️  Building optimized production client..."
npm run build -w client

if pm2 show "EMAIS CLIENT" > /dev/null; then
    echo "♻️  Resetting EMAIS CLIENT..."
    pm2 delete "EMAIS CLIENT"
fi

echo "✨ Starting EMAIS CLIENT (Preview Mode)..."
pm2 start "npm run start -w client" --name "EMAIS CLIENT"

pm2 save

echo "------------------------------------------"
echo "✅ Refresh Complete!"
echo "⚠️  Note: Remember to run migrations manually if you changed the DB."
pm2 list
echo "------------------------------------------"