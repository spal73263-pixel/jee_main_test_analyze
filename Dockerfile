# Multi-Stage Dockerfile for Full-Stack Production Deployment (Zero Database Required)

# Stage 1: Build the React (Vite) Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Node.js + Express Stateless File-Extraction & SPA Server
FROM node:20-alpine

WORKDIR /app

# Install Backend Node dependencies (production only)
COPY backend/package*.json ./backend/
RUN cd ./backend && npm install --omit=dev --no-audit --no-fund

# Copy Backend Application Code & Sample Files
COPY backend/ ./backend/
COPY sample_tests/ ./sample_tests/

# Copy Compiled React Frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "server.js"]
