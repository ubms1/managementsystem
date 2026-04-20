// PM2 Ecosystem Config — UBMS Production
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//   pm2 startup   (to auto-start on server reboot)

module.exports = {
    apps: [
        {
            name: 'ubms-backend',
            script: './ubms-backend/app.js',
            cwd: '/var/www/ubms',        // absolute path on the VPS
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            error_file: '/var/log/ubms/error.log',
            out_file:   '/var/log/ubms/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
