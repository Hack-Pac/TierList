import os
import uuid
import json
import time
import hashlib
import secrets
from flask import Flask, render_template, request, jsonify, url_for, send_from_directory, make_response, abort
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_caching import Cache
from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import logging
from logging.handlers import RotatingFileHandler
from config import config

app = Flask(__name__)

# Load configuration based on environment
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Security middleware setup
if env == 'production':
    # Trust proxy headers in production
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # Content Security Policy for production
    csp = {
        'default-src': "'self'",
        'script-src': [
            "'self'",
            "'unsafe-inline'",  # Required for inline scripts in HTML
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
            "https://ai.hackclub.com"  # Required for AI image recognition
        ],
        'font-src': ["'self'", "data:"],
        'object-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'"
    }
    
    # Initialize Talisman for security headers
    Talisman(app, 
        force_https=True,
        strict_transport_security=True,
        content_security_policy=csp,
        content_security_policy_nonce_in=['script-src', 'style-src'],
        session_cookie_secure=True
    )

# Rate limiting
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=app.config.get('CACHE_REDIS_URL', 'memory://')
)

# Initialize extensions
cache = Cache(app)
compress = Compress(app)

# Logging setup for production
if env == 'production' and not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    file_handler = RotatingFileHandler(
        'logs/tierlist.log', 
        maxBytes=10240000, 
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('TierList application startup')

# Enhanced file validation
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'm4a', 'aac'}
ALLOWED_MIMES = {
    'png': 'image/png',
    'jpg': 'image/jpeg', 
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac'
}
MAX_FILES_PER_REQUEST = 10
MAX_FILENAME_LENGTH = 100

def validate_file(file):
    """Enhanced file validation with security checks"""
    if not file or not file.filename:
        return False, "No file provided"
    
    # Check filename length
    if len(file.filename) > MAX_FILENAME_LENGTH:
        return False, "Filename too long"
    
    # Check file extension
    if not allowed_file(file.filename):
        return False, f"File type not allowed: {file.filename}"
    
    # Validate MIME type
    if hasattr(file, 'content_type') and file.content_type:
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        expected_mime = ALLOWED_MIMES.get(ext)
        if expected_mime and not file.content_type.startswith(expected_mime.split('/')[0]):
            return False, f"MIME type mismatch for {file.filename}"
    
    return True, "Valid file"
def allowed_file(filename):
    """check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_audio_file(filename):
    """check if file is an audio file"""
    audio_extensions = {'mp3', 'wav', 'ogg', 'm4a', 'aac'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in audio_extensions

def generate_secure_filename(original_filename):
    """Generate a secure filename with hash"""
    secured = secure_filename(original_filename)
    name, ext = os.path.splitext(secured)
    
    # Create a hash of the original filename + timestamp for uniqueness
    hash_input = f"{original_filename}{time.time()}{secrets.token_hex(8)}"
    file_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:12]
    
    return f"{name}_{file_hash}{ext}"

@app.route('/')
@cache.cached(timeout=3600)  #cache for 1 hour
def index():
    """main page with tier list interface"""
    response = make_response(render_template('index.html'))
    #add caching headers for static content
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response

@app.route('/upload', methods=['POST'])
@limiter.limit("20 per minute")  # Rate limit uploads
def upload_files():
    """handle multiple file uploads with enhanced validation and security"""
    try:
        if 'files' not in request.files:
            app.logger.warning(f"Upload attempt without files from {get_remote_address()}")
            return jsonify({'error': 'No files uploaded'}), 400
        
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files selected'}), 400
        
        # Limit number of files per request
        if len(files) > MAX_FILES_PER_REQUEST:
            app.logger.warning(f"Too many files uploaded: {len(files)} from {get_remote_address()}")
            return jsonify({'error': f'Too many files. Maximum {MAX_FILES_PER_REQUEST} allowed per request'}), 400
        
        uploaded_files = []
        errors = []
        total_size = 0
        
        for file in files:
            if file.filename == '':
                continue
                
            # Validate file
            is_valid, message = validate_file(file)
            if not is_valid:
                errors.append(message)
                continue
            # Check total size
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            total_size += file_size
            
            if total_size > app.config['MAX_CONTENT_LENGTH']:
                errors.append(f'Total upload size too large')
                break
                
            try:
                #generate secure filename
                unique_filename = generate_secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                
                # Ensure upload directory exists and is secure
                os.makedirs(app.config['UPLOAD_FOLDER'], mode=0o755, exist_ok=True)
                
                #save file with error handling
                file.save(file_path)
                
                # Set secure file permissions
                os.chmod(file_path, 0o644)
                
                app.logger.info(f"File uploaded successfully: {unique_filename} by {get_remote_address()}")
                
                uploaded_files.append({
                    'filename': unique_filename,
                    'original_name': secure_filename(file.filename),
                    'url': url_for('uploaded_file', filename=unique_filename),
                    'is_audio': is_audio_file(unique_filename),
                    'size': file_size
                })
                
            except Exception as e:
                app.logger.error(f"Failed to upload {file.filename}: {str(e)}")
                errors.append(f'Failed to upload {file.filename}: Server error')
        
        if errors and not uploaded_files:
            return jsonify({'error': '; '.join(errors)}), 400
        
        response_data = {'files': uploaded_files}
        if errors:
            response_data['warnings'] = errors
            
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Upload failed due to server error'}), 500

@app.route('/uploads/<filename>')
@cache.cached(timeout=86400)  #cache for 24 hours
@limiter.limit("100 per minute")  # Rate limit file access
def uploaded_file(filename):
    """serve uploaded files with security checks"""
    try:
        # Validate filename for path traversal attacks
        secured_filename = secure_filename(filename)
        if secured_filename != filename:
            app.logger.warning(f"Suspicious filename access attempt: {filename} from {get_remote_address()}")
            abort(404)
        
        # Check if file exists and is in uploads directory
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], secured_filename)
        if not os.path.exists(file_path) or not os.path.commonpath([app.config['UPLOAD_FOLDER'], file_path]) == app.config['UPLOAD_FOLDER']:
            app.logger.warning(f"Invalid file access attempt: {filename} from {get_remote_address()}")
            abort(404)
        
        response = make_response(send_from_directory(app.config['UPLOAD_FOLDER'], secured_filename))
        
        #add security and caching headers
        response.headers['Cache-Control'] = 'public, max-age=86400'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Accept-Ranges'] = 'bytes'
        
        return response
        
    except FileNotFoundError:
        abort(404)
    except Exception as e:
        app.logger.error(f"File serve error: {str(e)}")
        abort(500)

@app.route('/import', methods=['POST'])
@limiter.limit("5 per minute")  # Rate limit imports
def import_tierlist():
    """import a previously exported tierlist JSON file with enhanced validation"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.json'):
            app.logger.warning(f"Invalid import file type: {file.filename} from {get_remote_address()}")
            return jsonify({'error': 'Invalid file type. Please upload a JSON file.'}), 400
        
        #parse JSON content with size limit
        content = file.read()
        if len(content) > 1024 * 1024:  #1MB limit for JSON
            app.logger.warning(f"Oversized JSON import attempt: {len(content)} bytes from {get_remote_address()}")
            return jsonify({'error': 'JSON file too large (max 1MB)'}), 400
        
        content_str = content.decode('utf-8')
        tierlist_data = json.loads(content_str)
        
        #validate structure with security checks
        if not isinstance(tierlist_data, dict) or 'tiers' not in tierlist_data:
            return jsonify({'error': 'Invalid tierlist format: missing tiers data'}), 400
        
        if not isinstance(tierlist_data['tiers'], list) or len(tierlist_data['tiers']) > 20:
            return jsonify({'error': 'Invalid tierlist format: invalid tiers structure'}), 400
        #collect all referenced files and check if they exist
        missing_files = []
        available_files = []
        
        for tier in tierlist_data['tiers']:
            if not isinstance(tier, dict):
                continue
                
            #support both new 'files' format and legacy 'images' format
            media_items = tier.get('files', []) or tier.get('images', [])
            if not isinstance(media_items, list):
                continue
                
            for file_data in media_items:
                if not isinstance(file_data, dict):
                    continue
                    
                filename = file_data.get('filename')
                if filename and isinstance(filename, str):
                    # Validate filename for security
                    secured_filename = secure_filename(filename)
                    if secured_filename == filename:
                        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        if os.path.exists(file_path):
                            available_files.append({
                                'filename': filename,
                                'original_name': file_data.get('original_name', filename),
                                'url': url_for('uploaded_file', filename=filename),
                                'is_audio': file_data.get('is_audio', False)
                            })
                        else:
                            missing_files.append(filename)
        
        app.logger.info(f"Tierlist imported successfully by {get_remote_address()}")
        return jsonify({
            'tierlist': tierlist_data,
            'available_files': available_files,
            'missing_files': missing_files
        })
        
    except json.JSONDecodeError:
        app.logger.warning(f"Invalid JSON import attempt from {get_remote_address()}")
        return jsonify({'error': 'Invalid JSON format'}), 400
    except UnicodeDecodeError:
        return jsonify({'error': 'File encoding not supported'}), 400
    except Exception as e:
        app.logger.error(f"Import error: {str(e)}")
        return jsonify({'error': 'Error processing file'}), 500

# Enhanced security headers
@app.after_request
def after_request(response):
    """add comprehensive security headers to all responses"""
    # Basic security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Additional security headers for production
    if env == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['X-Permitted-Cross-Domain-Policies'] = 'none'
        response.headers['X-Download-Options'] = 'noopen'
        
    # Remove server information
    response.headers.pop('Server', None)
    
    return response

# Enhanced error handlers
@app.errorhandler(413)
def too_large(e):
    """handle file too large error"""
    app.logger.warning(f"File too large error from {get_remote_address()}")
    return jsonify({'error': 'File too large. Maximum size is 5MB per file.'}), 413

@app.errorhandler(404)
def not_found(e):
    """handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    """handle rate limit errors"""
    app.logger.warning(f"Rate limit exceeded by {get_remote_address()}: {e.description}")
    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429

@app.errorhandler(500)
def internal_error(e):
    """handle internal server errors"""
    app.logger.error(f"Internal server error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500

# Health check endpoint for load balancers
@app.route('/health')
@limiter.exempt  # Don't rate limit health checks
def health_check():
    """health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'timestamp': int(time.time()),
        'version': '1.0.0'
    })

# Security endpoint for monitoring
@app.route('/security-info')
@limiter.limit("1 per minute")
def security_info():
    """provide basic security information"""
    return jsonify({
        'security_headers': True,
        'rate_limiting': True,
        'file_validation': True,
        'secure_uploads': True
    })

if __name__ == '__main__':
    #ensure upload directory exists with secure permissions
    os.makedirs(app.config['UPLOAD_FOLDER'], mode=0o755, exist_ok=True)
    #run with appropriate settings
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.environ.get('PORT', 5000))) 


































