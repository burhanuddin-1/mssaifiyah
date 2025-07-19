#!/bin/bash

# Colors for output
cyan="\033[0;36m"
red="\033[0;31m"
green="\033[0;32m"
reset="\033[0m"

display_step() {
    echo -e "\n${cyan}===> $1${reset}"
}

# Step 1: Install dependencies
display_step "Installing dependencies"
npm install

# Step 2: Build the application
display_step "Building application"
npm run build

# Step 3: Create dist directory
display_step "Creating distribution directory"
mkdir -p dist

# Step 4: Copy static files
display_step "Copying static files"
cp -r index.html admin.html student.html dist/
cp -r css js images dist/

# Step 5: Copy database
display_step "Copying database"
mkdir -p dist/database
cp database/madrasa.db dist/database/

# Step 6: Create .htaccess for proper routing
display_step "Setting up routing"
cat > dist/.htaccess << EOL
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOL

# Step 7: Create robots.txt
display_step "Creating robots.txt"
cat > dist/robots.txt << EOL
User-agent: *
Allow: /
EOL

# Step 8: Create sitemap.xml
display_step "Creating sitemap"
cat > dist/sitemap.xml << EOL
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://your-domain.netlify.app/</loc>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://your-domain.netlify.app/admin.html</loc>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://your-domain.netlify.app/student.html</loc>
        <priority>0.8</priority>
    </url>
</urlset>
EOL

echo -e "\n${green}Build completed successfully!${reset}"
echo -e "${yellow}Build files are in the dist directory${reset}"
