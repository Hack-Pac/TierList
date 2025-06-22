#!/bin/bash

# Tier List Application Deployment Script
# Based on DigitalOcean Flask optimization guide

echo "🚀 Starting Tier List Application Deployment..."

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y python3-pip python3-venv nginx redis-server

# Create application directory
APP_DIR="/var/www/tierlist"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
echo "📁 Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Create virtual environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Set up environment variables
echo "⚙️ Setting up environment variables..."
cat > .env << EOF
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
CACHE_TYPE=redis
CACHE_REDIS_URL=redis://localhost:6379/0
PORT=8000
GUNICORN_WORKERS=4
EOF

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Start Redis
echo "🔴 Starting Redis server..."
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/tierlist.service > /dev/null << EOF
[Unit]
Description=Tier List Flask Application
After=network.target

[Service]
User=$USER
Group=www-data
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/gunicorn --config gunicorn.conf.py wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/tierlist > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com;  # Change this to your domain
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    
    # Static files
    location /static {
        alias $APP_DIR/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Uploaded files
    location /uploads {
        alias $APP_DIR/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # Application
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # File upload size
        client_max_body_size 10M;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/tierlist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl start tierlist
sudo systemctl enable tierlist
sudo systemctl restart nginx

echo "✅ Deployment complete!"
echo "🌐 Your application should be available at http://your-server-ip"
echo "📊 Check status with: sudo systemctl status tierlist"
echo "📝 View logs with: sudo journalctl -u tierlist -f" 