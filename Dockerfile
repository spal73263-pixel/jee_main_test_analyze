# Multi-Stage Dockerfile for Unified Full-Stack Production Deployment

# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend with OpenCV & OCR support
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application code
COPY backend/ ./backend/
COPY sample_tests/ ./sample_tests/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Seed database if needed and run production server
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "python seed_data.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
