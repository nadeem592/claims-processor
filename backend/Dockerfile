FROM node:20-alpine

WORKDIR /app

# Install system dependencies for sharp
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads logs

EXPOSE 5000

CMD ["node", "src/server.js"]
