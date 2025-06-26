# TierList Production Deployment Guide

This guide covers secure deployment of the TierList application using Docker with comprehensive security measures.

## 🛡️ Security Features

### Application Security
- **Rate Limiting**: Comprehensive rate limiting on all endpoints
- **Input Validation**: Enhanced file validation with MIME type checking
- **File Security**: Secure filename generation and path traversal protection
- **CSRF Protection**: Cross-Site Request Forgery protection
- **Security Headers**: Complete set of security headers (HSTS, CSP, etc.)
- **Content Security Policy**: Strict CSP with whitelisted domains
- **Non-root Container**: Application runs as non-privileged user

### Infrastructure Security
- **HTTPS by Default**: SSL/TLS encryption for all traffic
- **Nginx Reverse Proxy**: Additional security layer with rate limiting
- **Redis Authentication**: Password-protected Redis instance
- **Secret Management**: Secure secret generation and management
- **File Permissions**: Proper file and directory permissions
- **Container Isolation**: Network isolation between services

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- OpenSSL (for certificate generation)
- curl (for health checks)
- At least 1GB RAM
- 5GB disk space

## 🚀 Quick Start

### 1. Clone and Prepare

```bash
git clone <repository>
cd TierList
chmod +x deploy-production.sh
```

### 2. Deploy

```bash
./deploy-production.sh
```

The script will:
- ✅ Check prerequisites
- 🔐 Generate secure secrets
- 📁 Set up directories
- 🔒 Create SSL certificates
- 💾 Backup existing data
- 🛡️ Run security checks
- 🚀 Deploy the application
- ✅ Verify deployment

### 3. Access

- **HTTP**: `http://localhost:8080`
- **HTTPS**: `https://localhost:443`
- **Health Check**: `http://localhost:8080/health`

## ⚙️ Manual Configuration

### Environment Variables

Copy the template and customize:

```bash
cp env.template .env
```

Key variables to configure:

```bash
# Security (REQUIRED - generate secure values)
SECRET_KEY=your-32-character-minimum-secret-key
REDIS_PASSWORD=your-secure-redis-password

# File Upload Limits
MAX_CONTENT_LENGTH=5242880  # 5MB
MAX_FILES_PER_REQUEST=10
MAX_FILENAME_LENGTH=100

# Performance
WEB_CONCURRENCY=4
GUNICORN_WORKERS=4
GUNICORN_THREADS=2

# Network
HOST_PORT=8080
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### SSL Certificates

For production, replace self-signed certificates:

```bash
# Place your certificates in the ssl/ directory
ssl/tierlist.crt  # Certificate file
ssl/tierlist.key  # Private key file
```

### Manual Deployment

```bash
# Generate secrets
openssl rand -base64 32  # For SECRET_KEY
openssl rand -base64 24  # For REDIS_PASSWORD

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## 🔍 Monitoring and Management

### Health Checks

```bash
# Application health
curl http://localhost:8080/health

# Service status
docker-compose ps

# View logs
docker-compose logs -f tierlist
docker-compose logs -f redis
docker-compose logs -f nginx
```

### Security Monitoring

```bash
# Check security configuration
curl http://localhost:8080/security-info

# View nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Monitor rate limiting
docker-compose exec nginx tail -f /var/log/nginx/error.log | grep limit
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# Application metrics
docker-compose exec tierlist ps aux
docker-compose exec redis redis-cli info memory
```

## 📊 Scaling

### Horizontal Scaling

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  tierlist:
    deploy:
      replicas: 3
    environment:
      - GUNICORN_WORKERS=2  # Reduce per container
```

### Vertical Scaling

```yaml
# Increase container resources
services:
  tierlist:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## 🔧 Maintenance

### Updates

```bash
# Update application
./deploy-production.sh

# Update base images
docker-compose pull
docker-compose up -d
```

### Backups

```bash
# Manual backup
docker run --rm \
  -v tierlist_uploads_data:/data/uploads:ro \
  -v tierlist_logs_data:/data/logs:ro \
  -v $(pwd)/backups:/backup \
  alpine:latest \
  tar czf /backup/manual-backup-$(date +%Y%m%d).tar.gz /data

# Restore backup
docker run --rm \
  -v tierlist_uploads_data:/data/uploads \
  -v tierlist_logs_data:/data/logs \
  -v $(pwd)/backups:/backup \
  alpine:latest \
  tar xzf /backup/backup-file.tar.gz -C /
```

### Log Rotation

```bash
# Clean old logs
docker-compose exec tierlist find /app/logs -name "*.log" -mtime +30 -delete

# Rotate nginx logs
docker-compose exec nginx nginx -s reopen
```

## 🚨 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose logs tierlist

# Check environment
docker-compose config

# Restart services
docker-compose restart
```

**Redis connection issues:**
```bash
# Test Redis connectivity
docker-compose exec tierlist python -c "import redis; r=redis.from_url('redis://:password@redis:6379/0'); print(r.ping())"

# Check Redis logs
docker-compose logs redis
```

**SSL/HTTPS issues:**
```bash
# Regenerate certificates
rm ssl/*
./deploy-production.sh

# Check certificate
openssl x509 -in ssl/tierlist.crt -text -noout
```

**Performance issues:**
```bash
# Monitor resources
docker stats

# Check rate limiting
docker-compose logs nginx | grep limit

# Adjust worker count
# Edit .env: GUNICORN_WORKERS=8
docker-compose restart tierlist
```

### Security Incidents

**Suspicious activity:**
```bash
# Check access logs
docker-compose exec nginx grep "suspicious-ip" /var/log/nginx/access.log

# Block IP in nginx
# Add to nginx.conf: deny suspicious-ip;
docker-compose restart nginx

# Review rate limiting
docker-compose logs nginx | grep "limiting requests"
```

## 📁 File Structure

```
TierList/
├── app.py                    # Main application
├── config.py                 # Configuration classes
├── wsgi.py                   # WSGI entry point
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container definition
├── docker-compose.yml       # Service orchestration
├── nginx.conf              # Nginx configuration
├── deploy-production.sh     # Deployment script
├── env.template            # Environment template
├── .dockerignore           # Docker ignore rules
├── static/                 # Static assets
├── templates/              # HTML templates
├── uploads/                # User uploads (volume)
├── logs/                   # Application logs (volume)
├── ssl/                    # SSL certificates
└── backups/               # Backup storage
```

## 🔒 Security Checklist

- [ ] Changed default SECRET_KEY
- [ ] Set strong REDIS_PASSWORD
- [ ] Configured proper SSL certificates
- [ ] Set file permissions correctly
- [ ] Reviewed rate limiting settings
- [ ] Enabled logging and monitoring
- [ ] Configured backup strategy
- [ ] Tested disaster recovery
- [ ] Documented access procedures
- [ ] Set up security monitoring

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review application logs
3. Verify configuration
4. Check Docker and system resources

## 🔄 Version Information

- **Application**: v1.0.0
- **Docker**: Multi-stage build
- **Python**: 3.11-slim
- **Nginx**: Alpine
- **Redis**: 7-alpine 