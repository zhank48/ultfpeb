#!/bin/bash

# =============================================================================
# ULT FPEB Visitor Management System - Docker Deployment Script
# =============================================================================
# Alternative deployment using Docker containers
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}=============================================================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}=============================================================================${NC}\n"
}

print_step() {
    echo -e "${YELLOW}🔹 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

install_docker() {
    print_header "INSTALLING DOCKER"
    
    print_step "Updating system packages..."
    apt update
    
    print_step "Installing Docker dependencies..."
    apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    print_step "Adding Docker GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    print_step "Adding Docker repository..."
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    print_step "Installing Docker..."
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io
    
    print_step "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    print_step "Starting Docker service..."
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker installation completed"
}

create_docker_files() {
    print_header "CREATING DOCKER CONFIGURATION"
    
    print_step "Creating Dockerfile for backend..."
    cat > Dockerfile.backend << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "server.js"]
EOF

    print_step "Creating Dockerfile for frontend..."
    cat > Dockerfile.frontend << 'EOF'
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

    print_step "Creating docker-compose.yml..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    depends_on:
      - mysql
    networks:
      - app-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./frontend/dist:/usr/share/nginx/html
    depends_on:
      - backend
      - frontend
    networks:
      - app-network

volumes:
  mysql_data:

networks:
  app-network:
    driver: bridge
EOF

    print_step "Creating environment file..."
    cat > .env << 'EOF'
# Database Configuration
MYSQL_ROOT_PASSWORD=your_secure_root_password
DB_NAME=ult_fpeb_prod
DB_USER=ultfpeb_user
DB_PASSWORD=your_secure_db_password

# Application Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Domain Configuration
DOMAIN=your-domain.com
EOF

    print_success "Docker configuration files created"
}

deploy_with_docker() {
    print_header "DEPLOYING WITH DOCKER"
    
    print_step "Building Docker images..."
    docker-compose build
    
    print_step "Starting services..."
    docker-compose up -d
    
    print_step "Waiting for services to start..."
    sleep 30
    
    print_step "Running database migration..."
    docker-compose exec backend npm run migrate
    
    print_step "Seeding admin users..."
    docker-compose exec backend npm run seed:admin
    
    print_success "Docker deployment completed"
}

main() {
    print_header "DOCKER DEPLOYMENT FOR ULT FPEB"
    
    if [[ $EUID -ne 0 ]]; then
        echo "This script must be run as root"
        exit 1
    fi
    
    install_docker
    create_docker_files
    deploy_with_docker
    
    print_success "Docker deployment completed successfully!"
    echo "Access your application at http://localhost"
}

main "$@"