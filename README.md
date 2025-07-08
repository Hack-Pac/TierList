<div align="center">
  <a href="https://shipwrecked.hackclub.com/?t=ghrm" target="_blank">
    <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png" 
         alt="This project is part of Shipwrecked, the world's first hackathon on an island!" 
         style="width: 35%;">
  </a>
</div>

# Interactive Tier List Maker

TierList is a functional redesigned tier-list maker, optimized for activities with friends. It is fully deployed and brings multiple relevant features, such as image recognition, voice control, in-app music, and 3 unique themes. TierList also allows people to import and export existing ones, bringing versatility and compatibility, unlike widely available paid tools.

## Overview

This application addresses the common need for ranking and categorizing items in a visual, interactive format. Whether you're ranking video games, comparing restaurants, evaluating products, or organizing any collection of items, this tier list maker provides an intuitive interface with powerful automation features.

The application stands out through its integration of artificial intelligence for both voice command processing and automatic image recognition, making it accessible and efficient for users across different interaction preferences and accessibility needs.

## Key Features

### Core Functionality
- **Multi-format media support**: Handles both images (PNG, JPG, GIF) and audio files (MP3, WAV, OGG, M4A, AAC) up to 5MB each. Please note that audio files will not be processed through the AI
- **Flexible tier system**: Customizable tier count from 3 to 8 levels with editable tier labels
- **Drag-and-drop interface**: Seamless item organization between tiers and upload area
- **Import/export capabilities**: Save tier lists as JSON files for backup and sharing
- **Responsive design**: Optimized for desktop, tablet, and mobile devices

### Advanced Voice Control
- **Cross-platform compatibility**: Native Web Speech API support with multiple fallback options
- **AI-powered command parsing**: Uses Hack Club AI API for intelligent voice command interpretation. PLEASE NOTE that the Hack Club AI API endpoint uses "meta-llama/llama-4-maverick-17b-128e-instruct", which may not always identify the images correctly due to the model size. However, the specific name given by the image recognition function is the one that works for voice control.
- **Browser-specific optimizations**: Specialized support for Chrome, Edge, Safari, and experimental Firefox support
- **Text command fallback**: Alternative input method for unsupported browsers or environments
- **Natural language processing**: Handles variations in command phrasing and synonyms

### AI Image Recognition
- **Automatic content analysis**: Real-time image recognition during upload process
- **Smart labeling system**: Single-word content descriptions (shop, street, person, food, etc.)
- **Voice integration**: Use AI-generated labels as voice command identifiers
- **Toggle control**: Enable or disable recognition features as needed
- **Fallback mechanisms**: Filename-based recognition when AI analysis fails

### User Experience
- **Multiple themes**: Coffee, Dark, and Light themes with DaisyUI components
- **Real-time feedback**: Visual and audio feedback for all interactions
- **Error handling**: Comprehensive error messages and recovery suggestions
- **Performance optimization**: Caching, compression, and efficient asset delivery

## Technology Stack

### Backend Architecture
The server-side application is built with Python 3.11+ using the Flask framework. This choice provides flexibility while maintaining simplicity for deployment and maintenance.

**Core Components:**
- **Flask 2.3+**: Lightweight web framework with extensive plugin ecosystem
- **Gunicorn**: Production WSGI server with multi-worker support
- **Flask-Caching**: Intelligent caching layer supporting Redis and memory backends
- **Flask-Limiter**: Rate limiting for API endpoints and file uploads
- **Flask-Talisman**: Security headers and CSP management
- **Werkzeug**: Secure file handling and routing utilities

**Security Features:**
- Input validation and sanitization for all user data
- Secure filename generation with hash-based uniqueness
- Rate limiting on uploads and API endpoints
- Comprehensive security headers including CSP, HSTS, and XSS protection
- File type validation with MIME type checking

### Frontend Implementation
The client-side application uses vanilla JavaScript for maximum compatibility and performance, styled with utility-first CSS frameworks.

**Core Technologies:**
- **Vanilla JavaScript ES6+**: No framework dependencies, ensuring fast loading and broad compatibility
- **Tailwind CSS 3.4+**: Utility-first CSS framework with JIT compilation
- **DaisyUI 5.0+**: Component library providing pre-styled UI elements
- **Web Speech API**: Native browser speech recognition capabilities
- **Canvas API**: Image processing for AI analysis

**JavaScript Libraries:**
- **Annyang.js 2.6+**: Enhanced voice command pattern matching
- **SpeechKITT**: Voice control user interface improvements
- **Mozilla SpeakToMe**: Experimental Firefox speech recognition support

### AI Integration
The application integrates multiple AI services to provide intelligent automation features.

**Voice Command Processing:**
- Primary: Hack Club AI API for natural language understanding
- Fallback: Pattern matching with regular expressions
- Error handling: Graceful degradation to manual input

**Image Recognition:**
- Primary: Hack Club AI Vision API with multiple request format attempts
- Fallback: Filename-based pattern matching using keyword dictionaries
- Optimization: Image resizing and format conversion for API efficiency

### Production Infrastructure
The application is designed for scalable production deployment with modern DevOps practices.

**Performance Features:**
- HTTP caching with appropriate cache headers
- Gzip compression for all responses
- Static asset optimization and caching
- Redis caching for production environments
- Health check endpoints for monitoring

**Deployment Support:**
- Nginx reverse proxy configuration
- Systemd service management
- Docker containerization support
- Environment-based configuration management

## Example Use Cases

### Content Creator Ranking Gaming Characters

A gaming content creator wants to rank fighting game characters for a video series. They upload character portraits and use voice commands to organize them quickly.

**Workflow:**
1. Upload 20 character images (PNG format, various sizes)
2. AI automatically recognizes and labels characters as "person"
3. Use voice commands: "Move person to S tier", "Put person in A tier"
4. Fine-tune placement with drag-and-drop
5. Export final tier list as JSON for video description

**Voice Commands Used:**
```
"Move Ryu to S tier"
"Put person in A tier"  
"Move fighter to B tier"
```

The AI system understands these commands and maps them to the appropriate character images based on the recognition labels.

### Restaurant Review Aggregation

A food blogger consolidates restaurant photos from multiple review sites to create neighborhood dining tier lists.

**Workflow:**
1. Upload 30 restaurant images from various sources
2. AI recognizes food establishments and labels them as "shop" or "food"
3. Organize using voice: "Move shop to A tier", "Put food in C tier"
4. Add audio clips of signature dishes to relevant tiers
5. Share JSON file with readers for interactive exploration

**Technical Implementation:**
The application handles mixed media gracefully, displaying food images with AI-generated labels while providing audio controls for sound clips. The voice recognition system adapts to the user's accent and speaking patterns through the AI processing layer.

### Product Comparison for E-commerce

An e-commerce analyst compares product images for a category review, organizing them by quality and value.

**Workflow:**
1. Upload product images from multiple vendors
2. AI labels products appropriately (vehicle, document, etc.)
3. Create custom tier labels: "Best Value", "Premium", "Budget", "Avoid"
4. Use voice commands for rapid sorting: "Move vehicle to Best Value tier"
5. Export analysis for team review

**API Integration Benefits:**
The Hack Club AI API provides consistent labeling across different product types, enabling reliable voice command mapping even with diverse product catalogs.

## Installation and Setup

### Prerequisites

Before installing the application, ensure your system meets these requirements:

**System Requirements:**
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+ recommended)
- **Python**: Version 3.11 or higher (3.12 recommended for performance)
- **Node.js**: Version 18 or higher for asset compilation
- **Browser**: Modern browser with JavaScript enabled (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Network**: HTTPS connection required for voice recognition features (Web Speech API requirement)
- **Memory**: Minimum 512MB RAM available for the application
- **Storage**: At least 1GB free space for uploads and application files

### Development Installation

**Step 1: Environment Setup**

Clone the repository and create a virtual environment:

```bash
# Clone the repository
git clone https://github.com/your-username/tierlist-maker.git
cd tierlist-maker

# Create and activate Python virtual environment
# On Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# On Windows (Command Prompt)
python -m venv .venv
.venv\Scripts\activate.bat

# On macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

**Step 2: Install Dependencies**

Install both Python and Node.js dependencies:

```bash
# Install Python packages
pip install --upgrade pip
pip install -r requirements.txt

# Install Node.js packages for CSS compilation
npm install
```

**Step 3: Environment Configuration**

Create a `.env` file in the project root directory:

```env
# Application Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-development-secret-key-change-this

# File Upload Configuration
MAX_CONTENT_LENGTH=5242880  # 5MB in bytes
UPLOAD_FOLDER=uploads

# Caching Configuration
CACHE_TYPE=simple  # Use 'redis' for production
CACHE_DEFAULT_TIMEOUT=300

# Security Configuration (development)
WTF_CSRF_ENABLED=false  # Disabled for development convenience

# Logging Configuration
LOG_LEVEL=INFO
```

**Step 4: Asset Compilation**

Build the CSS assets using Tailwind CSS:

```bash
# Build CSS for production
npm run build-css

# For development with file watching
npm run watch-css  # Run in separate terminal
```

**Step 5: Directory Setup**

Create necessary directories with proper permissions:

```bash
# Create uploads directory
mkdir uploads

# Set permissions (macOS/Linux only)
chmod 755 uploads

# Create logs directory for production use
mkdir logs
chmod 755 logs
```

**Step 6: Launch Development Server**

Start the Flask development server:

```bash
# Activate virtual environment if not already active
source .venv/bin/activate  # macOS/Linux
# or
.\.venv\Scripts\Activate.ps1  # Windows PowerShell

# Start the development server
python app.py
```

The application will be available at `http://localhost:5000`. For voice recognition features to work properly, you'll need to access the application via HTTPS. For development, you can use a tunneling service like ngrok:

```bash
# Install ngrok (https://ngrok.com/)
ngrok http 5000
# Use the provided HTTPS URL for full functionality
```
### Development Setup

#### Environment Configuration

Create a `.env` file in the project root:
```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-in-production
MAX_CONTENT_LENGTH=5242880  # 5MB file size limit
CACHE_TYPE=simple  # Use 'redis' for production
```

#### CSS Development

For active CSS development with auto-rebuilding:
```bash
# Watch mode for Tailwind CSS
npm run watch-css

# Or manually rebuild when needed
npm run build-css
```

#### File Structure Setup

Ensure proper directory structure:
```bash
# Create uploads directory if it doesn't exist
mkdir uploads

# Set proper permissions (Linux/macOS)
chmod 755 uploads
```

### Production Deployment

#### Environment Setup

1. **Production environment variables**:
   ```env
   FLASK_ENV=production
   SECRET_KEY=your-super-secure-random-secret-key
   CACHE_TYPE=redis
   REDIS_URL=redis://localhost:6379/0
   ```

2. **Install production dependencies**:
   ```bash
   pip install -r requirements.txt
   pip install redis gunicorn
   ```

#### Using Gunicorn

1. **Basic Gunicorn setup**:
   ```bash
   gunicorn --config gunicorn.conf.py wsgi:app
   ```

2. **Production configuration** (already included in `gunicorn.conf.py`):
   - Multi-worker setup based on CPU cores
   - Memory optimization and worker recycling
   - Proper logging and error handling
   - Health check support

#### Nginx Reverse Proxy

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /path/to/your/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /uploads/ {
        alias /path/to/your/app/uploads/;
        expires 24h;
        add_header Cache-Control "public";
    }
}
```

#### Docker Deployment (Optional)

Create a `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN npm install && npm run build-css

EXPOSE 8000
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
```

### Development Tips

#### CSS Development
- Use `npm run watch-css` during development for automatic rebuilds
- Tailwind JIT mode is enabled for fast compilation
- Custom utilities are available in `static/css/input.css`

#### JavaScript Development
- All functionality is in vanilla JavaScript (no build step required)
- Use browser dev tools for debugging
- Voice control logging is available in console

#### File Upload Testing
- Test with various file types (images and audio)
- Verify 5MB size limit enforcement
- Check file naming and conflict resolution

#### Voice Control Development
- Test in different browsers to verify fallback behavior
- Check microphone permissions and HTTPS requirements
- Monitor network requests to AI API for debugging

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

5. **Voice Control**:
   - Click "🎤 Voice Control" to activate voice commands
   - Say commands like "Move [item name] to S tier" or "Put [item] in A tier"
   - AI processes your voice commands and automatically moves items
   - Works with partial file names (e.g., "Move cat to S tier" will find "cat_photo.jpg")

### Interface Elements

- **Header**: App title and theme toggle dropdown
- **Upload Section**: File drop zone and preview grid
- **Tier Controls**: Slider for tier count, voice control, import and save buttons
- **Tier List**: Interactive tier containers with labels
- **Voice Control**: AI-powered voice command system for hands-free tier management

## Voice Control System

The application features an advanced AI-powered voice control system that allows hands-free tier list management.

### How It Works

1. **Speech Recognition**: Uses the browser's built-in Web Speech API to capture voice commands
2. **AI Processing**: Sends voice transcripts to Hack Club's AI API for intelligent parsing
3. **Command Execution**: Automatically moves items based on interpreted commands

### Supported Commands

- "Move [item name] to [tier] tier"
- "Put [item name] in [tier] tier"
- "Let's move [item name] into [tier] tier"
- "[item name] should go to [tier] tier"

### Features

- **Smart Matching**: Finds files using partial names (e.g., "cat" matches "cat_photo.jpg")
- **Tier Recognition**: Understands all tier labels (S, A, B, C, etc.)
- **Error Handling**: Provides clear feedback when commands can't be processed
- **Browser Support**: Works in Chrome, Edge, and other Chromium-based browsers

### Usage Tips

- Speak clearly and at a normal pace
- Use the exact tier labels you've set (S, A, B, C, etc.)
- File names don't need to be exact - partial matches work
- The system provides visual and audio feedback for all actions

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
## 📁 Project Structure

```
TierList/
├── app.py                # Main Flask application
├── wsgi.py              # WSGI entry point for production
├── config.py            # Configuration settings
├── gunicorn.conf.py     # Gunicorn configuration
├── requirements.txt     # Python dependencies
├── package.json         # Node.js dependencies
├── tailwind.config.js   # Tailwind CSS configuration
├── deploy.sh           # Deployment script
├── static/             # Static assets
│   ├── css/
│   │   ├── input.css   # Tailwind input styles
│   │   └── output.css  # Compiled CSS output
│   └── js/
│       └── app.js      # Main JavaScript application
├── templates/          # Jinja2 templates
│   └── index.html     # Main application template
└── uploads/           # User uploaded media files
```

## 🔌 API Endpoints

### Core Application Routes

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/` | Main application page | HTML page (cached 1hr) |
| `GET` | `/health` | Health check for load balancers | JSON status |

### File Operations

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| `POST` | `/upload` | Upload media files | Multipart form data | JSON with file info |
| `GET` | `/uploads/<filename>` | Serve uploaded files | - | File content (cached) |
| `POST` | `/import` | Import tier list | JSON file | JSON with import status |

### Upload Endpoint Details

**POST /upload**
```json
// Request: multipart/form-data with file(s)
// Response:
{
  "files": [
    {
      "filename": "unique_filename.ext",
      "original_name": "user_filename.ext", 
      "url": "/uploads/unique_filename.ext",
      "is_audio": false,
      "size": 1024576
    }
  ]
}
```

**Error Responses**:
- `400`: Invalid file type or size
- `413`: File too large (>5MB)
- `500`: Server error during upload

### Import Endpoint Details

**POST /import**
```json
// Request:
{
  "tierlist": {
    "tiers": [
      {
        "label": "S",
        "files": [{"filename": "file1.jpg"}]
      }
    ]
  }
}

// Response:
{
  "available_files": [...],
  "missing_files": [...],  // Files not found on server
  "tierlist": {...}        // Processed tier list data
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development  # or 'production'
SECRET_KEY=your-secret-key-change-in-production

# File Upload Settings
MAX_CONTENT_LENGTH=5242880  # 5MB file size limit

# Caching Configuration
CACHE_TYPE=simple      # Use 'redis' for production
REDIS_URL=redis://localhost:6379/0  # If using Redis

# Voice Control (Optional)
HACKCLUB_AI_API_URL=https://ai.hackclub.com/chat/completions
```

### Theme Configuration

The application includes three built-in DaisyUI themes:

- **☕ Coffee** (Default): Warm brown color scheme with high contrast
- **🌙 Dark**: High contrast dark mode with blue accents  
- **☀️ Light**: Clean bright theme with subtle colors

Themes are stored in localStorage and persist across sessions.

### Tailwind CSS Configuration

The `tailwind.config.js` includes:
- DaisyUI plugin with custom theme configurations
- JIT mode for fast compilation
- Custom component classes for drag-and-drop interfaces
- Responsive breakpoints optimized for tier list layouts

### File Upload Configuration

**Allowed File Types**:
```python
ALLOWED_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif',  # Images
    'mp3', 'wav', 'ogg', 'm4a', 'aac'  # Audio
}
```

**Security Settings**:
- File size limit: 5MB per file
- Unique filename generation to prevent conflicts
- File type validation based on extension and MIME type
- Secure filename handling to prevent directory traversal

### Caching Configuration

**Development**:
```python
CACHE_CONFIG = {
    'CACHE_TYPE': 'simple',
    'CACHE_DEFAULT_TIMEOUT': 300
}
```

**Production**:
```python
CACHE_CONFIG = {
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': 'redis://localhost:6379/0',
    'CACHE_DEFAULT_TIMEOUT': 3600
}
```

### Voice Control Configuration

The voice control system automatically configures based on browser detection:

**Chrome/Edge**:
- Native Web Speech API with continuous recognition
- Enhanced with Annyang.js pattern matching
- SpeechKITT UI integration

**Firefox**:
- Experimental speech recognition when enabled
- Automatic fallback to text input mode
- Custom error handling and user guidance

**Safari**:
- Basic Web Speech API where supported
- Graceful degradation to text-only mode

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

## 🎤 Voice Control System

The Tier List Maker features a sophisticated multi-layer voice control system that works across different browsers and platforms.

### Voice Command Examples
- **"Move cat to S tier"** - Moves any file with "cat" in the name to S tier
- **"Put my song in A tier"** - Moves audio files containing "song" to A tier  
- **"Dog goes to B tier"** - Moves files with "dog" in the name to B tier
- **"Move picture to C tier"** - Moves image files with "picture" to C tier

### How It Works

#### 1. **AI-Powered Command Processing**
- Uses Hack Club AI API to parse natural language voice commands
- Intelligently matches partial file names and fuzzy matching
- Handles various command phrasings and synonyms
- Falls back to simple pattern matching if AI parsing fails

#### 2. **Multi-Layer Browser Support**
The app automatically detects your browser and uses the best available voice recognition:

**Chrome/Edge (Recommended)**
- Native Web Speech API with continuous recognition
- Enhanced with Annyang.js for better pattern matching
- SpeechKITT integration for visual feedback
- Real-time voice command processing

**Firefox (Experimental)**
- Automatic detection of Firefox speech recognition support
- Falls back to text input interface when speech isn't available
- Special Firefox-specific optimizations and error handling
- Clear instructions for enabling experimental speech features

**Safari (Limited)**
- Basic Web Speech API support where available
- Graceful degradation to text input mode
- Mobile Safari considerations for iOS devices

#### 3. **Text Command Fallback**
- Always-available text input field for typing commands
- Same AI processing as voice commands
- Perfect for environments where voice isn't practical
- Keyboard shortcut support (Enter to execute)

### Browser Compatibility Matrix

| Browser | Voice Recognition | AI Processing | Text Fallback | Status |
|---------|------------------|---------------|---------------|---------|
| **Chrome 90+** | ✅ Full Support | ✅ Yes | ✅ Yes | **Recommended** |
| **Edge 90+** | ✅ Full Support | ✅ Yes | ✅ Yes | **Recommended** |
| **Firefox 88+** | ⚠️ Experimental* | ✅ Yes | ✅ Yes | **Supported** |
| **Safari 14+** | ⚠️ Limited | ✅ Yes | ✅ Yes | **Basic** |
| **Mobile Chrome** | ✅ Full Support | ✅ Yes | ✅ Yes | **Good** |
| **Mobile Safari** | ⚠️ Limited | ✅ Yes | ✅ Yes | **Basic** |

*\*Firefox requires manual activation of speech recognition features*

### Setting Up Voice Control

#### For Chrome/Edge Users
1. **Grant Microphone Permission**: Click "Allow" when prompted
2. **Click Voice Control Button**: The 🎤 button will turn active (green/blue)
3. **Start Speaking**: Say commands like "Move cat to S tier"
4. **Visual Feedback**: Watch for recognition status and command confirmations

#### For Firefox Users

Firefox requires manual activation of experimental speech features:

1. **Enable Speech Recognition**:
   - Open `about:config` in Firefox
   - Search for `media.webspeech.recognition.enable`
   - Set the value to `true`
   - Search for `media.webspeech.recognition.force_enable`
   - Set the value to `true`

2. **Alternative Text Input**:
   - If speech doesn't work, use the text input field
   - Type commands like "Move cat to S tier"
   - Press Enter or click the ▶ button

3. **Restart Firefox** after changing settings

#### For Safari Users
- **Desktop Safari**: Basic speech recognition may work
- **Mobile Safari**: Use text input mode for best experience
- **Permission Required**: Grant microphone access when prompted

### Troubleshooting Voice Control

#### Common Issues
1. **"Voice control not working"**
   - Check microphone permissions in browser settings
   - Ensure you're using HTTPS (required for speech API)
   - Try refreshing the page and re-granting permissions

2. **"Commands not recognized"**
   - Speak clearly and avoid background noise
   - Use the exact file names or close approximations
   - Try the text input fallback if voice continues to fail

3. **"Firefox speech not available"**
   - Follow the Firefox setup instructions above
   - Use the text input field as an alternative
   - Consider using Chrome/Edge for full voice features

4. **"Network errors during AI processing"**
   - Check your internet connection
   - The app will retry failed requests automatically
   - Use simple pattern matching as fallback

#### Voice Control Best Practices
- **Speak Clearly**: Use normal speaking pace and volume
- **Use File Names**: Reference actual file names or close matches
- **Be Specific**: Say "Move [filename] to [tier] tier" format
- **Wait for Feedback**: Look for confirmation notifications
- **Try Text Mode**: Use keyboard input if voice becomes unreliable

## 🌐 Browser Support & Platform Compatibility

## 🛠 Usage Guide

### Basic Tier List Creation

1. **Upload Media Files**:
   - Click the upload area or drag files directly
   - Supports images (PNG, JPG, GIF) and audio (MP3, WAV, OGG, M4A, AAC)
   - Maximum 5MB per file
   - Files appear in the upload area as thumbnails
   - **AI Recognition**: Images are automatically analyzed and labeled (when enabled)

2. **AI Image Recognition** (Optional):
   - Click the 🔍 **AI Vision** button to toggle automatic image recognition
   - Uploaded images get analyzed and labeled with content descriptions
   - Labels appear as overlays on images (e.g., "shop", "street", "person", "food")
   - Helps organize and identify content in your tier lists

3. **Organize Your Tiers**:
   - **Drag & Drop**: Click and drag items between tiers and upload area
   - **Tier Management**: Use the slider to adjust tier count (3-8 tiers)
   - **Label Editing**: Click tier labels to rename them
   - **Return Items**: Drag items back to upload area to remove from tiers

4. **Voice Control** (Optional):
   - Click the 🎤 **Voice Control** button
   - Grant microphone permission when prompted
   - Say commands like: *"Move cat picture to S tier"*
   - Or use text input: Type commands and press Enter

5. **Save Your Work**:
   - Click **💾 Save Tier List** to download as JSON
   - Click **📂 Import Tier List** to load previously saved lists
   - All media files and tier arrangements are preserved

### Advanced Features

#### AI Image Recognition
- **Automatic Analysis**: Images are analyzed when uploaded (if enabled)
- **Smart Labeling**: Single-word descriptions identify content (shop, street, person, food, etc.)
- **Visual Overlays**: Recognition results appear as small badges on images
- **Toggle Control**: Enable/disable with the 🔍 AI Vision button
- **Performance**: Uses Hack Club AI API for accurate content detection

#### Voice Commands
- **Natural Language**: *"Put the dog photo in A tier"*
- **Partial Matching**: *"Move song to B tier"* (matches any file with "song")
- **Flexible Phrasing**: *"Cat goes to S tier"* or *"Move cat to S tier"*

#### Keyboard Shortcuts
- **Enter** in text input field: Execute command
- **Drag & Drop**: Works between all areas (tiers ↔ upload area)

#### Theme Customization
- **☕ Coffee Theme**: Warm, brown color scheme (default)
- **🌙 Dark Theme**: High contrast dark mode
- **☀️ Light Theme**: Clean, bright interface

### File Management

#### Supported Formats
- **Images**: PNG, JPG, JPEG, GIF (displays as thumbnails)
- **Audio**: MP3, WAV, OGG, M4A, AAC (shows with audio controls)

#### File Operations
- **Upload**: Drag files or click to browse
- **Delete**: Click the ✕ button on any item
- **Move**: Drag between tiers or back to upload area
- **Rename**: Files keep original names for easy recognition

### Import/Export System

#### Saving Tier Lists
1. Click **💾 Save Tier List**
2. Downloads a JSON file with:
   - All tier configurations and labels
   - File metadata and locations
   - Timestamp and version info

#### Loading Tier Lists
1. Click **📂 Import Tier List**
2. Select a previously saved JSON file
3. System will:
   - Restore tier structure and labels
   - Reload available media files
   - Show status of missing files (if any)

### Troubleshooting

#### Common Issues

**Files Won't Upload**
- Check file size (must be under 5MB)
- Verify file format is supported
- Try refreshing the page

**Drag & Drop Not Working**
- Ensure JavaScript is enabled
- Try clicking and holding longer before dragging
- Check if browser has conflicting extensions

**Voice Control Problems**
- **Chrome/Edge**: Check microphone permissions in browser settings
- **Firefox**: Enable speech recognition in `about:config` (see setup guide)
- **All Browsers**: Use text input as fallback option

**Saved Tier Lists Won't Load**
- Ensure JSON file isn't corrupted
- Check that referenced media files still exist
- Try importing in the same browser that created the list

#### Performance Tips
- **Large Files**: Compress images before upload for better performance
- **Many Items**: Consider breaking large tier lists into categories
- **Mobile**: Use landscape orientation for better drag & drop experience

## ❓ Frequently Asked Questions

### General Usage

**Q: What file types are supported?**
A: Images (PNG, JPG, GIF) and audio files (MP3, WAV, OGG, M4A, AAC) up to 5MB each.

**Q: Can I use this offline?**
A: Partially. The app works offline for basic functionality, but voice control requires internet for AI processing.

**Q: How many items can I add to a tier list?**
A: There's no hard limit, but performance is optimized for ~50-100 items per tier list.

**Q: Can I share my tier lists with others?**
A: Yes! Save your tier list as JSON and share the file. Recipients can import it if they have the same media files.

### Voice Control

**Q: Why isn't voice control working?**
A: Check these common issues:
- Microphone permissions granted
- Using HTTPS (required for Web Speech API)
- Browser compatibility (Chrome/Edge work best)
- Try the text input fallback

**Q: What browsers support voice control?**
A: Full support in Chrome/Edge, experimental in Firefox (requires manual setup), limited in Safari.

**Q: Can I use voice control on mobile?**
A: Yes on Chrome mobile, limited on Safari mobile. Text input works on all mobile browsers.

**Q: How accurate is voice recognition?**
A: Very accurate for clear speech in quiet environments. The AI system handles partial matches and synonyms well.

### AI Image Recognition

**Q: How does image recognition work?**
A: The app uses Hack Club's AI API to analyze uploaded images and provide single-word content descriptions like "shop", "street", or "person".

**Q: Can I turn off image recognition?**
A: Yes! Click the 🔍 AI Vision button to toggle image recognition on/off. When disabled, no images are analyzed.

**Q: What types of content can be recognized?**
A: Common categories include: shop, street, person, food, animal, building, nature, vehicle, document, art, and more.

**Q: Is image recognition accurate?**
A: Generally very accurate for common objects and scenes. Results may vary with unusual or abstract images.

**Q: Does image recognition cost extra?**
A: No, it uses the same free Hack Club AI API. However, it does require an internet connection.

### Technical Questions

**Q: How do I enable voice control in Firefox?**
A: Go to `about:config`, search for `media.webspeech.recognition.enable` and `media.webspeech.recognition.force_enable`, set both to `true`, then restart Firefox.

**Q: Can I host this on my own server?**
A: Yes! Follow the production deployment guide. Requires Python 3.11+, and HTTPS for voice features.

**Q: Is my data stored anywhere?**
A: Files are stored locally on the server. Voice commands are processed by Hack Club AI API but not stored permanently.

**Q: How do I backup my tier lists?**
A: Use the Save function to download JSON files. These contain all tier data and can be imported later.

### Development

**Q: Can I contribute to this project?**
A: Yes! This is open source. Check the repository for contribution guidelines.

**Q: How do I modify the themes?**
A: Edit the DaisyUI theme configuration in `tailwind.config.js` and rebuild the CSS.

**Q: Can I add new voice commands?**
A: Yes! Modify the AI prompt in `app.js` or add new patterns to the Annyang.js configuration.

**Q: How do I add support for new file types?**
A: Update `ALLOWED_EXTENSIONS` in `app.py` and add appropriate UI handling in `app.js`.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. Fork the repository
2. Follow the setup instructions above
3. Create a feature branch: `git checkout -b feature-name`
4. Make your changes and test thoroughly
5. Submit a pull request with a clear description

### Areas for Contribution
- **Browser Compatibility**: Improve voice control for more browsers
- **UI/UX Enhancements**: New themes, better mobile experience
- **Performance**: Optimize for larger tier lists
- **Features**: New voice commands, keyboard shortcuts, export formats
- **Documentation**: Improve guides, add translations

### Code Style
- Follow existing JavaScript and Python conventions
- Use meaningful variable names and comments
- Test voice control across different browsers
- Ensure responsive design works on mobile

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 Tier List Maker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Third-Party Acknowledgments

This project uses several open-source libraries:
- **Flask** - Web framework (BSD License)
- **Tailwind CSS** - Utility-first CSS framework (MIT License)
- **DaisyUI** - Tailwind CSS component library (MIT License)
- **Annyang.js** - Voice recognition library (MIT License)
- **Mozilla SpeakToMe** - Speech recognition polyfill (Mozilla Public License)
- **SpeechKITT** - Speech recognition UI library (MIT License)

Special thanks to **Hack Club** for providing the AI API used for voice command processing.

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

Built with ❤️ by the open source community.
