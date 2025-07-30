module.exports = {
  apps: [{
    name: 'ult-fpeb-backend',
    cwd: './backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    restart_delay: 1000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};