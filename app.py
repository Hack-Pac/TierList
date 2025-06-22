import os
import uuid
from flask import Flask, render_template, request, jsonify, url_for, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 5242880))  #5MB
app.config['UPLOAD_FOLDER'] = 'uploads'

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    """check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
@app.route('/')
def index():
    """main page with tier list interface"""
    return render_template('index.html')
@app.route('/upload', methods=['POST'])
def upload_files():
    """handle multiple file uploads with validation"""
    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400
    files = request.files.getlist('files')
    uploaded_files = []
    for file in files:
        if file.filename == '':
            continue
        if file and allowed_file(file.filename):
            #generate unique filename to prevent conflicts
            original_filename = secure_filename(file.filename)
            name, ext = os.path.splitext(original_filename)
            unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            uploaded_files.append({
                'filename': unique_filename,
                'original_name': original_filename,
                'url': url_for('uploaded_file', filename=unique_filename)
            })
        else:
            return jsonify({'error': f'Invalid file type: {file.filename}'}), 400
    return jsonify({'files': uploaded_files})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
if __name__ == '__main__':
    #ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True) 
