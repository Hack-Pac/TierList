#!/bin/bash

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Production Deployment Script for TierList Application
# This script handles secure deployment with proper validation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="tierlist"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root (security check)
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "Do not run this script as root for security reasons!"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker service."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please install Docker Compose."
    fi
    
    # Set compose command
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    else
        DOCKER_COMPOSE="docker compose"
    fi
    
    success "Prerequisites check passed"
}

# Generate secure secrets
generate_secrets() {
    log "Checking environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log "Creating environment file from template..."
        if [[ -f "env.template" ]]; then
            cp env.template "$ENV_FILE"
        else
            error "Environment template file not found. Please create $ENV_FILE manually."
        fi
    fi
    
    # Check if secrets need to be generated
    if grep -q "REPLACE_WITH_SECURE" "$ENV_FILE"; then
        log "Generating secure secrets..."
        
        # Generate SECRET_KEY
        SECRET_KEY=$(openssl rand -base64 32)
        sed -i "s/SECRET_KEY=REPLACE_WITH_SECURE_SECRET_KEY/SECRET_KEY=$SECRET_KEY/" "$ENV_FILE"
        
        # Generate REDIS_PASSWORD
        REDIS_PASSWORD=$(openssl rand -base64 24)
        sed -i "s/REDIS_PASSWORD=REPLACE_WITH_SECURE_REDIS_PASSWORD/REDIS_PASSWORD=$REDIS_PASSWORD/" "$ENV_FILE"
        sed -i "s/:secure_redis_password@/:$REDIS_PASSWORD@/g" "$ENV_FILE"
        
        success "Secure secrets generated"
    else
        log "Secrets already configured"
    fi
}

# Validate environment file
validate_environment() {
    log "Validating environment configuration..."
    
    # Check for required variables
    required_vars=("SECRET_KEY" "REDIS_PASSWORD" "FLASK_ENV")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            error "Required environment variable $var not found in $ENV_FILE"
        fi
    done
    
    # Check SECRET_KEY length
    SECRET_KEY_VALUE=$(grep "^SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    if [[ ${#SECRET_KEY_VALUE} -lt 32 ]]; then
        error "SECRET_KEY must be at least 32 characters long"
    fi
    
    success "Environment validation passed"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Create SSL directory if it doesn't exist
    mkdir -p ssl
    
    # Create uploads directory with proper permissions
    mkdir -p uploads
    chmod 755 uploads
    
    # Create logs directory
    mkdir -p logs
    chmod 755 logs
    
    success "Directories configured"
}

# SSL Certificate setup
setup_ssl() {
    if [[ ! -f "ssl/tierlist.crt" ]] || [[ ! -f "ssl/tierlist.key" ]]; then
        warn "SSL certificates not found. Generating self-signed certificates for development..."
        warn "For production, please replace with proper SSL certificates from a CA."
        
        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/tierlist.key \
            -out ssl/tierlist.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
            2>/dev/null
        
        chmod 600 ssl/tierlist.key
        chmod 644 ssl/tierlist.crt
        
        success "Self-signed SSL certificates generated"
    else
        log "SSL certificates found"
    fi
}

# Backup existing data
backup_data() {
    if $DOCKER_COMPOSE ps | grep -q "Up"; then
        log "Creating backup of existing data..."
        
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        
        # Create backup of volumes
        docker run --rm \
            -v "${PWD}_uploads_data:/data/uploads:ro" \
            -v "${PWD}_logs_data:/data/logs:ro" \
            -v "$BACKUP_DIR:/backup" \
            alpine:latest \
            tar czf "/backup/$(basename "$BACKUP_FILE")" /data
        
        success "Backup created: $BACKUP_FILE"
    else
        log "No running containers found, skipping backup"
    fi
}

# Security validation
security_check() {
    log "Running security checks..."
    
    # Check file permissions
    if [[ -f "$ENV_FILE" ]]; then
        ENV_PERMS=$(stat -c "%a" "$ENV_FILE")
        if [[ "$ENV_PERMS" != "600" ]]; then
            warn "Environment file permissions are too open. Setting to 600..."
            chmod 600 "$ENV_FILE"
        fi
    fi
    
    # Check for default passwords
    if grep -q "password123\|admin\|default" "$ENV_FILE" 2>/dev/null; then
        error "Default or weak passwords detected in environment file"
    fi
    
    # Validate Docker Compose file
    if ! $DOCKER_COMPOSE config > /dev/null 2>&1; then
        error "Docker Compose file validation failed"
    fi
    
    success "Security checks passed"
}

# Deploy application
deploy() {
    log "Starting deployment..."
    
    # Pull latest images
    log "Pulling latest base images..."
    $DOCKER_COMPOSE pull --quiet
    
    # Build application
    log "Building application..."
    $DOCKER_COMPOSE build --no-cache
    
    # Start services
    log "Starting services..."
    $DOCKER_COMPOSE up -d
    
    # Wait for services to be healthy
    log "Waiting for services to become healthy..."
    sleep 30
    
    # Check service health
    if ! $DOCKER_COMPOSE ps | grep -q "Up (healthy)"; then
        warn "Some services may not be healthy. Check logs with: $DOCKER_COMPOSE logs"
    fi
    
    success "Deployment completed"
}

# Post-deployment verification
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if services are running
    if ! $DOCKER_COMPOSE ps | grep -q "Up"; then
        error "Services are not running properly"
    fi
    
    # Test health endpoint
    sleep 10
    if curl -f http://localhost:${HOST_PORT:-8080}/health > /dev/null 2>&1; then
        success "Health check passed"
    else
        warn "Health check failed. Service may still be starting up."
    fi
    
    # Display running services
    log "Running services:"
    $DOCKER_COMPOSE ps
    
    success "Deployment verification completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Remove unused images
    docker image prune -f > /dev/null 2>&1 || true
    
    # Remove old backups (keep last 10)
    find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f | sort -r | tail -n +11 | xargs rm -f
    
    success "Cleanup completed"
}

# Main deployment process
main() {
    log "Starting TierList production deployment"
    
    check_user
    check_prerequisites
    generate_secrets
    validate_environment
    setup_directories
    setup_ssl
    backup_data
    security_check
    deploy
    verify_deployment
    cleanup
    
    success "TierList application deployed successfully!"
    log "Access your application at: http://localhost:${HOST_PORT:-8080}"
    log "HTTPS access: https://localhost:${NGINX_HTTPS_PORT:-443}"
    log ""
    log "Useful commands:"
    log "  View logs: $DOCKER_COMPOSE logs -f"
    log "  Stop services: $DOCKER_COMPOSE down"
    log "  Restart services: $DOCKER_COMPOSE restart"
    log "  Update application: $0"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@" 