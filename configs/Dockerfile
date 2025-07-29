# Multi-stage build for frontend
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Install Node.js for preview server (alternative to nginx)
RUN apk add --no-cache nodejs npm

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app /app

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'if [ "$USE_NGINX" = "true" ]; then' >> /start.sh && \
    echo '  echo "Starting with Nginx..."' >> /start.sh && \
    echo '  nginx -g "daemon off;"' >> /start.sh && \
    echo 'else' >> /start.sh && \
    echo '  echo "Starting with Vite preview..."' >> /start.sh && \
    echo '  cd /app && npm run preview -- --host 0.0.0.0 --port 4173' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80 4173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4173/ || exit 1

# Start application
CMD ["/start.sh"]
