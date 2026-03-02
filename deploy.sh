#!/bin/bash
# Quick deployment setup script

echo "🚀 TeenSpace Deployment Quick Start"
echo "===================================="
echo ""

echo "1️⃣  Setting up environment files..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "   👉 Edit .env and add your DATABASE_URL and SESSION_SECRET"
else
  echo "✅ .env already exists"
fi

echo ""
echo "2️⃣  Checking if git is initialized..."
if [ -d .git ]; then
  echo "✅ Git is initialized"
else
  echo "⚠️  Git not initialized. Run: git init"
fi

echo ""
echo "3️⃣  NPM dependencies..."
echo "   Run: npm install"

echo ""
echo "4️⃣  Database setup..."
echo "   Run: npm run db:push"

echo ""
echo "5️⃣  Test locally..."
echo "   Run: npm run dev"

echo ""
echo "=================================="
echo "🌐 DEPLOYMENT STEPS:"
echo "=================================="
echo ""
echo "BACKEND (Render):"
echo "  1. Create PostgreSQL at Neon (neon.tech)"
echo "  2. Go to render.com/new"
echo "  3. Connect GitHub repo"
echo "  4. Add env vars:"
echo "     - DATABASE_URL (from Neon)"
echo "     - SESSION_SECRET (random 32+ chars)"
echo "     - NODE_ENV=production"
echo "  5. Deploy!"
echo ""
echo "FRONTEND (Vercel):"
echo "  1. Go to vercel.com/new"
echo "  2. Import GitHub repo"
echo "  3. Framework: Vite"
echo "  4. Add env var:"
echo "     - VITE_API_URL=https://your-render-url.onrender.com"
echo "  5. Deploy!"
echo ""
echo "📖 Full guide: See DEPLOYMENT.md"
echo ""
