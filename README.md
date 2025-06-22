# 🏆 Tier List Maker

A modern web application for creating interactive tier lists with drag-and-drop functionality. Built with Flask, Tailwind CSS, and DaisyUI.

## Features

- **🎨 Beautiful UI**: Modern design with DaisyUI components and Coffee theme
- **📁 File Upload**: Support for PNG, JPG, GIF images and MP3, WAV, OGG, M4A, AAC audio files up to 5MB each
- **🎯 Drag & Drop**: Intuitive drag-and-drop interface for organizing items
- **⚙️ Customizable Tiers**: Adjust tier count (3-8) and edit tier labels
- **🌙 Theme Support**: Toggle between Coffee, Dark, and Light themes
- **💾 Save/Import Functionality**: Export tier lists as JSON files and reimport them later
- **📱 Responsive**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Python 3.11 + Flask + Gunicorn (production)
- **Frontend**: HTML5, Vanilla JavaScript
- **Styling**: Tailwind CSS + DaisyUI 5.0
- **File Storage**: Local file system
- **Caching**: Redis (production) / Simple cache (development)
- **Compression**: Gzip compression enabled
- **Reverse Proxy**: Nginx (production)

## Setup Instructions

### Prerequisites

- Python 3.11 or higher
- Node.js and npm

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd TierList
   ```

2. **Set up Python virtual environment**:
   ```bash
   # Windows
   .\.venv\Scripts\Activate.ps1
   
   # Linux/Mac
   source .venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

5. **Build Tailwind CSS**:
   ```bash
   npm run build-css
   # Or manually:
   npx tailwindcss -i ./static/css/input.css -o ./static/css/output.css
   ```

### Running the Application

#### Development Mode

1. **Start the Flask development server**:
   ```bash
   python app.py
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:5000
   ```

#### Production Mode

1. **Install production dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   export FLASK_ENV=production
   export SECRET_KEY=your-super-secret-key
   export CACHE_TYPE=redis
   ```

3. **Run with Gunicorn**:
   ```bash
   gunicorn --config gunicorn.conf.py wsgi:app
   ```

4. **Or use the deployment script**:
   ```bash
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

### Development Mode

For development with automatic CSS rebuilding:

```bash
# Terminal 1: Watch and rebuild CSS
npm run build-css

# Terminal 2: Run Flask server
python app.py
```

## Usage Guide
### Creating a Tier List

1. **Upload Media**: 
   - Click the upload area or drag and drop media files
   - Supported formats: PNG, JPG, GIF, MP3, WAV, OGG, M4A, AAC (max 5MB each)
   - Audio files display with playback controls

2. **Customize Tiers**:
   - Use the slider to adjust the number of tiers (3-8)
   - Click on tier labels to edit them (S, A, B, C, etc.)

3. **Organize Items**:
   - Drag media files from the upload area to tier containers
   - Drag files between different tiers
   - Hover over files to see delete buttons
   - Audio files can be played directly in tiers

4. **Save & Import**:
   - Click "Save Tier List" to download as JSON
   - Click "Import Tier List" to load a previously saved tier list
   - Theme preference is saved automatically

### Interface Elements

- **Header**: App title and theme toggle dropdown
- **Upload Section**: File drop zone and preview grid
- **Tier Controls**: Slider for tier count, import and save buttons
- **Tier List**: Interactive tier containers with labels

## Project Structure

```
TierList/
├── app.py                  # Flask application
├── requirements.txt        # Python dependencies
├── package.json           # Node.js dependencies
├── tailwind.config.js     # Tailwind configuration
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── README.md             # Project documentation
├── static/               # Static assets
│   ├── css/
│   │   ├── input.css     # Tailwind input
│   │   └── output.css    # Generated CSS
│   └── js/
│       └── app.js        # Main JavaScript
├── templates/            # HTML templates
│   └── index.html        # Main page
└── uploads/              # Uploaded images
```

## Configuration
### Environment Variables (.env)
```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-in-production
MAX_CONTENT_LENGTH=5242880  # 5MB file size limit
```

### Tailwind Config

The application uses DaisyUI with these themes:
- ☕ Coffee (default)
- 🌙 Dark
- ☀️ Light

## API Endpoints

- `GET /` - Main application page (cached)
- `POST /upload` - File upload endpoint with validation
- `POST /import` - Tier list import endpoint
- `GET /uploads/<filename>` - Serve uploaded files (cached with range support)
- `GET /health` - Health check endpoint for load balancers

## File Upload Details

- **Allowed Types**: PNG, JPG, JPEG, GIF, MP3, WAV, OGG, M4A, AAC
- **Size Limit**: 5MB per file
- **Storage**: Local `uploads/` directory
- **Naming**: Unique filenames to prevent conflicts
- **Audio Playback**: HTML5 audio controls for supported formats

## Performance Optimizations

Based on [DigitalOcean's Flask optimization guide](https://www.digitalocean.com/community/tutorials/how-to-optimize-flask-performance), this application includes:

### ⚡ **Caching Strategy**
- **Route caching**: Main page cached for 1 hour
- **File caching**: Media files cached for 24 hours with proper headers
- **Redis support**: Production-ready caching with Redis backend
- **Browser caching**: Optimized cache headers for static assets

### 🗜️ **Compression**
- **Gzip compression**: Automatic compression for all responses
- **Static file optimization**: Long-term caching for CSS/JS files
- **Media optimization**: Efficient serving with range request support

### 🛡️ **Security & Headers**
- **Security headers**: XSS protection, content type sniffing prevention
- **CSRF protection**: Built-in Flask security features
- **File validation**: Strict file type and size validation
- **Error handling**: Comprehensive error responses

### 🚀 **Production Deployment**
- **Gunicorn WSGI**: Multi-worker production server
- **Nginx reverse proxy**: Load balancing and static file serving
- **Health checks**: Monitoring endpoint for load balancers
- **Process management**: Systemd service configuration

### 📊 **Scalability Features**
- **Multi-worker support**: CPU-based worker scaling
- **Connection pooling**: Optimized database connections
- **Memory management**: Worker recycling to prevent leaks
- **Load balancing**: Ready for horizontal scaling

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **CSS not loading**: Run `npm run build-css` to rebuild styles
2. **Upload fails**: Check file size (max 5MB) and format (PNG/JPG/GIF/MP3/WAV/OGG/M4A/AAC)
3. **Virtual environment**: Ensure you've activated the `.venv` environment

### Development

- Use browser dev tools to debug JavaScript
- Check Flask console for backend errors
- Verify file permissions for `uploads/` directory

## License

This project is open source and available under the MIT License. 

