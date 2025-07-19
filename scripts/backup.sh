#!/bin/bash

# Configuration
BACKUP_DIR="backups"
DB_FILE="database/madrasa.db"
MAX_BACKUPS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get current timestamp
datestamp=$(date +%Y%m%d_%H%M%S)

# Create backup
backup_file="$BACKUP_DIR/madrasa_backup_$datestamp.db"
cp "$DB_FILE" "$backup_file"

# Compress backup
gzip "$backup_file"

# Remove old backups
backup_files=($BACKUP_DIR/*.gz)
if [ ${#backup_files[@]} -gt $MAX_BACKUPS ]; then
    oldest_backup=$(ls -t "$BACKUP_DIR"/*.gz | tail -n 1)
    rm "$oldest_backup"
fi

# Log backup
log_file="$BACKUP_DIR/backup.log"
echo "[$(date)] Backup created: $backup_file.gz" >> "$log_file"

exit 0
