module.exports = {
  apps: [{
    name: 'madrasa-attendance',
    script: 'server.js',
    watch: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      JWT_SECRET: process.env.JWT_SECRET || 'your-production-secret-key'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    log_max_size: '10M',
    log_max_files: 30,
    time: true
  }]
}
