import os
import secrets
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration with security defaults"""
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_urlsafe(32)
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600
    
    # File upload settings
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5242880))  #5MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # Caching
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'simple')
    CACHE_REDIS_URL = os.environ.get('CACHE_REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get('CACHE_DEFAULT_TIMEOUT', 300))
    
    # Rate limiting
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/1')
    
    # Security headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    CACHE_TYPE = 'simple'
    RATELIMIT_STORAGE_URL = 'memory://'
    
    # Relaxed settings for development
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration with enhanced security"""
    DEBUG = False
    TESTING = False
    
    # Cache settings
    CACHE_TYPE = 'redis'
    
    # Security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 1800  # 30 minutes
    
    # HTTPS enforcement
    PREFERRED_URL_SCHEME = 'https'
    
    # Additional security headers for production
    SECURITY_HEADERS = {
        **Config.SECURITY_HEADERS,
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'X-Download-Options': 'noopen',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
    
    # Content Security Policy
    CSP = {
        'default-src': "'self'",
        'script-src': [
            "'self'",
            "'unsafe-inline'",  # Required for inline scripts
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'",  # Required for Tailwind CSS
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
        ],
        'img-src': ["'self'", "data:", "blob:"],
        'media-src': ["'self'", "data:", "blob:"],
        'connect-src': [
            "'self'",
            "https://ai.hackclub.com"  # Required for AI features
        ],
        'font-src': ["'self'", "data:"],
        'object-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
        'frame-ancestors': "'none'"
    }
    
    # File upload restrictions for production
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5242880))  # 5MB
    MAX_FILES_PER_REQUEST = int(os.environ.get('MAX_FILES_PER_REQUEST', 10))
    MAX_FILENAME_LENGTH = int(os.environ.get('MAX_FILENAME_LENGTH', 100))
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/tierlist.log')

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    CACHE_TYPE = 'null'
    RATELIMIT_STORAGE_URL = 'memory://'
    WTF_CSRF_ENABLED = False
    
    # Use in-memory storage for testing
    UPLOAD_FOLDER = '/tmp/test_uploads'

class DockerConfig(ProductionConfig):
    """Docker-specific production configuration"""
    # Override paths for container environment
    UPLOAD_FOLDER = '/app/uploads'
    LOG_FILE = '/app/logs/tierlist.log'
    
    # Use Redis container for caching and rate limiting
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/1')

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'docker': DockerConfig,
    'default': DevelopmentConfig
} 