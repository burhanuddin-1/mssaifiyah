#!/bin/bash

# Colors for output
cyan="\033[0;36m"
red="\033[0;31m"
green="\033[0;32m"
yellow="\033[0;33m"
reset="\033[0m"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${red}Please run as root${reset}"
    exit 1
fi

# Function to display steps
display_step() {
    echo -e "\n${cyan}===> $1${reset}"
}

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${red}Error: $1 could not be found. Please install it first.${reset}"
        exit 1
    fi
}

# Step 1: Check prerequisites
display_step "Checking prerequisites"
check_command node
check_command npm
check_command pm2
check_command systemctl

# Step 2: Create directories
display_step "Creating necessary directories"
mkdir -p /opt/madrasa-attendance
mkdir -p /opt/madrasa-attendance/logs
mkdir -p /opt/madrasa-attendance/backups

# Step 3: Install system dependencies
display_step "Installing system dependencies"
apt-get update && apt-get install -y \
    sqlite3 \
    prometheus-node-exporter \
    nginx

# Step 4: Copy application
display_step "Copying application files"
cp -r * /opt/madrasa-attendance/

# Step 5: Set permissions
display_step "Setting permissions"
chown -R node:node /opt/madrasa-attendance
chmod +x /opt/madrasa-attendance/scripts/*.sh

# Step 6: Install Node dependencies
display_step "Installing Node.js dependencies"
su - node -c "cd /opt/madrasa-attendance && npm install --production"

# Step 7: Configure PM2
display_step "Configuring PM2"
pm2 startup
pm2 start ecosystem.config.js
pm2 save

# Step 8: Configure Systemd
display_step "Configuring Systemd"
cp /opt/madrasa-attendance/madrasa-attendance.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable madrasa-attendance
systemctl start madrasa-attendance

# Step 9: Configure Nginx
display_step "Configuring Nginx"
NGINX_CONF="/etc/nginx/sites-available/madrasa-attendance"
cat > "$NGINX_CONF" << 'EOL'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

ln -sf /etc/nginx/sites-available/madrasa-attendance /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Step 10: Configure Monitoring
display_step "Configuring Monitoring"
cp /opt/madrasa-attendance/monitoring/monitoring.conf /etc/prometheus/prometheus.yml
systemctl restart prometheus

# Step 11: Set up backup cron job
display_step "Setting up backup cron job"
crontab -l | { cat; echo "0 0 * * * /opt/madrasa-attendance/scripts/backup.sh"; } | crontab -

# Step 12: Configure SSL (Let's Encrypt)
display_step "Configuring SSL"
certbot --nginx -d your-domain.com

# Done
echo -e "\n${green}Deployment completed successfully!${reset}"
echo -e "${yellow}Application is available at: http://your-domain.com${reset}"
echo -e "${yellow}Logs can be found in: /opt/madrasa-attendance/logs/${reset}"
echo -e "${yellow}Backups are stored in: /opt/madrasa-attendance/backups/${reset}"
