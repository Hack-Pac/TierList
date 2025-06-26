import os
import uuid
import json
import time
from flask import Flask, render_template, request, jsonify, url_for, send_from_directory, make_response
from werkzeug.utils import secure_filename
from flask_caching import Cache
from flask_compress import Compress
from config import config

app = Flask(__name__)

# Load configuration based on environment
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Initialize extensions
cache = Cache(app)
compress = Compress(app)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'm4a', 'aac'}
def allowed_file(filename):
    """check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_audio_file(filename):
    """check if file is an audio file"""
    audio_extensions = {'mp3', 'wav', 'ogg', 'm4a', 'aac'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in audio_extensions
@app.route('/')
@cache.cached(timeout=3600)  #cache for 1 hour
def index():
    """main page with tier list interface"""
    response = make_response(render_template('index.html'))
    #add caching headers for static content
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response
@app.route('/upload', methods=['POST'])
def upload_files():
    """handle multiple file uploads with validation and optimization"""
    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400
    
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files selected'}), 400
    
    uploaded_files = []
    errors = []
    for file in files:
        if file.filename == '':
            continue
        if not file or not allowed_file(file.filename):
            errors.append(f'Invalid file type: {file.filename}')
            continue
            
        try:
            #generate unique filename to prevent conflicts
            original_filename = secure_filename(file.filename)
            name, ext = os.path.splitext(original_filename)
            unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            
            #save file with error handling
            file.save(file_path)
            uploaded_files.append({
                'filename': unique_filename,
                'original_name': original_filename,
                'url': url_for('uploaded_file', filename=unique_filename),
                'is_audio': is_audio_file(unique_filename)
            })
        except Exception as e:
            errors.append(f'Failed to upload {file.filename}: {str(e)}')
    
    if errors and not uploaded_files:
        return jsonify({'error': '; '.join(errors)}), 400
    response_data = {'files': uploaded_files}
    if errors:
        response_data['warnings'] = errors
    
    return jsonify(response_data)

@app.route('/uploads/<filename>')
@cache.cached(timeout=86400)  #cache for 24 hours
def uploaded_file(filename):
    """serve uploaded files with optimized headers"""
    try:
        response = make_response(send_from_directory(app.config['UPLOAD_FOLDER'], filename))
        #add caching headers for media files
        response.headers['Cache-Control'] = 'public, max-age=86400'  #24 hours
        response.headers['Expires'] = 'Thu, 31 Dec 2037 23:55:55 GMT'
        #enable range requests for audio/video streaming
        response.headers['Accept-Ranges'] = 'bytes'
        return response
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
@app.route('/import', methods=['POST'])
def import_tierlist():
    """import a previously exported tierlist JSON file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.json'):
        return jsonify({'error': 'Invalid file type. Please upload a JSON file.'}), 400
    
    try:
        #parse JSON content with size limit
        content = file.read()
        if len(content) > 1024 * 1024:  #1MB limit for JSON
            return jsonify({'error': 'JSON file too large (max 1MB)'}), 400
        
        content_str = content.decode('utf-8')
        tierlist_data = json.loads(content_str)
        
        #validate structure
        if 'tiers' not in tierlist_data:
            return jsonify({'error': 'Invalid tierlist format: missing tiers data'}), 400
        #collect all referenced files and check if they exist
        missing_files = []
        available_files = []
        
        for tier in tierlist_data['tiers']:
            #support both new 'files' format and legacy 'images' format
            media_items = tier.get('files', []) or tier.get('images', [])
            for file_data in media_items:
                filename = file_data.get('filename')
                if filename:
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
        
        return jsonify({
            'tierlist': tierlist_data,
            'available_files': available_files,
            'missing_files': missing_files
        })
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON format'}), 400
    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500
# Security headers and error handlers
@app.after_request
def after_request(response):
    """add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

@app.errorhandler(413)
def too_large(e):
    """handle file too large error"""
    return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    """handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """handle internal server errors"""
    return jsonify({'error': 'Internal server error'}), 500

# Health check endpoint for load balancers
@app.route('/health')
def health_check():
    """health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': int(time.time())})

if __name__ == '__main__':
    #ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    #run with appropriate settings
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.environ.get('PORT', 5000))) 
































