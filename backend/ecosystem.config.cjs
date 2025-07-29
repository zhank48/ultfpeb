module.exports = {
  "apps": [
    {
      "name": "ult-fpeb-backend",
      "script": "./backend/server.js",
      "cwd": "/var/www/ult-fpeb-visitor-management",
      "instances": 1,
      "autorestart": true,
      "watch": false,
      "max_memory_restart": "1G",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3000,
        "HOST": "0.0.0.0",
        "DB_HOST": "localhost",
        "DB_PORT": "3306",
        "DB_NAME": "ult_fpeb_db",
        "DB_USER": "ult_fpeb_user",
        "DB_PASSWORD": "UltFpeb2025!",
        "JWT_SECRET": "UB/SyC+XIsnfuPZOh3nDb5Dn02yODXCi7+XeiSmwRAONU3p71nh8ASNgFFB/Rrv5smgKdUV99LpAp+m9sJ1srQ==",
        "FRONTEND_URL": "http://10.15.0.120",
        "UPLOAD_PATH": "uploads/",
        "MAX_FILE_SIZE": "10mb"
      },
      "error_file": "./backend/logs/err.log",
      "out_file": "./backend/logs/out.log",
      "log_file": "./backend/logs/combined.log",
      "time": true,
      "log_date_format": "YYYY-MM-DD HH:mm Z"
    }
  ]
};