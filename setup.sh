#!/usr/bin/env bash
# =============================================
# ClaimsAI — Local Development Setup Script
# =============================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 ClaimsAI Setup${NC}"
echo "=================================="

# Check Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
NODE_VER=$(node -v)
echo -e "✅ Node.js: $NODE_VER"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
  echo -e "${YELLOW}⚠️  MongoDB not running locally. You can use MongoDB Atlas or Docker:${NC}"
  echo "   docker run -d -p 27017:27017 mongo:7"
fi

# Setup backend
echo -e "\n${GREEN}📦 Installing backend dependencies...${NC}"
cd backend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}📋 Created backend/.env — please add your API keys!${NC}"
fi
mkdir -p uploads logs
cd ..

# Setup frontend
echo -e "\n${GREEN}🎨 Installing frontend dependencies...${NC}"
cd frontend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created frontend/.env"
fi
cd ..

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${YELLOW}Before starting, add your API keys to:${NC}"
echo -e "  📄 backend/.env"
echo -e "     GEMINI_API_KEY=..."
echo -e "     GOOGLE_VISION_API_KEY= (or GOOGLE_CLOUD_KEY_FILE=)"
echo -e "     MONGODB_URI=mongodb://localhost:27017/claims_processor"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  Start backend:   ${GREEN}cd backend && npm run dev${NC}"
echo -e "  Start frontend:  ${GREEN}cd frontend && npm start${NC}"
echo ""
echo -e "  Or with Docker:  ${GREEN}docker-compose up${NC}"
echo ""
