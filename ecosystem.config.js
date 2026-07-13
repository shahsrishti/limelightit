module.exports = {
  apps: [
    {
      name: 'mfg-backend-api',
      script: './backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: '5000',
        MQTT_ENABLED: 'false' // Let the worker service handle MQTT subscriptions
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/pm2-api-error.log',
      out_file: './logs/pm2-api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'mfg-backend-worker',
      script: './backend/dist/worker.js',
      instances: 1, // Workers must run as a single instance to prevent duplicate cron pings and data processing loops
      env: {
        NODE_ENV: 'production',
        MQTT_ENABLED: 'true'
      },
      autorestart: true,
      watch: false,
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
};
