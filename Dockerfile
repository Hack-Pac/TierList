# Multi-stage build for production optimization
FROM python:3.11-slim as builder

# Set build arguments
ARG BUILD_DATE
ARG VERSION=1.0.0
ARG VCS_REF

# Add metadata labels
LABEL maintainer="TierList App" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="tierlist" \
      org.label-schema.description="A secure tier list maker application" \
      org.label-schema.version=$VERSION \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.schema-version="1.0"

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Install security updates and required system packages
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    dumb-init \
    curl \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r tierlist && \
    useradd -r -g tierlist -u 1001 -s /bin/false -c "TierList App User" tierlist

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/logs /app/static /app/templates && \
    chown -R tierlist:tierlist /app

# Copy application files
COPY --chown=tierlist:tierlist . /app/

# Set secure permissions
RUN chmod -R 755 /app && \
    chmod -R 644 /app/*.py /app/*.txt /app/*.md && \
    chmod 755 /app && \
    chmod 755 /app/uploads /app/logs

# Create healthcheck script
RUN echo '#!/bin/sh\ncurl -f http://localhost:${PORT:-5000}/health || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh && \
    chown tierlist:tierlist /app/healthcheck.sh

# Switch to non-root user
USER tierlist

# Set environment variables
ENV FLASK_ENV=production \
    FLASK_APP=app.py \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000 \
    WEB_CONCURRENCY=4 \
    GUNICORN_WORKERS=4 \
    GUNICORN_THREADS=2 \
    GUNICORN_MAX_REQUESTS=1000 \
    GUNICORN_MAX_REQUESTS_JITTER=100 \
    GUNICORN_TIMEOUT=30 \
    GUNICORN_KEEPALIVE=5

# Expose port
EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /app/healthcheck.sh

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Run gunicorn with production settings
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "4", \
     "--threads", "2", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--timeout", "30", \
     "--keepalive", "5", \
     "--preload", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "--capture-output", \
     "wsgi:application"] 