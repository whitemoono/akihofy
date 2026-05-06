# AKIHO - AI Companion Core Engine
# Multi-stage build for smaller production image

# ============== Stage 1: Builder ==============
FROM rust:1.77-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build Rust core
COPY akiho-core/Cargo.toml akiho-core/
COPY akiho-core/Cargo.lock akiho-core/ 2>/dev/null || true
COPY akiho-core/src akiho-core/src/

WORKDIR /app/akiho-core
RUN cargo build --release 2>&1 || echo "Rust build skipped (source not ready)"

# ============== Stage 2: Python Runtime ==============
FROM python:3.11-slim as runtime

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY engine/ ./engine/
COPY api_server.py .
COPY config.py .

# Copy Rust core (if built)
RUN cp /app/akiho-core/target/release/libakiho_core.so ./engine/ 2>/dev/null || echo "Rust core not built yet"

# Copy web build (if exists)
RUN cp -r web/dist ./web/dist 2>/dev/null || echo "Web build not included"

# Create directories for data and logs
RUN mkdir -p /app/data/memories /app/data/cache /app/logs && \
    chown -R appuser:appuser /app

USER appuser

# Expose ports
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command (can be overridden)
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
