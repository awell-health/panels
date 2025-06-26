# Production Setup Guide

This guide walks you through deploying the Panels Management System to production. The system consists of:

- **Frontend**: Next.js 15 app with React 19 and Tailwind CSS
- **Backend**: Fastify 5.3.2 API with TypeScript
- **Database**: PostgreSQL 16 with MikroORM
- **Cache**: Redis 7
- **FHIR Server**: Medplum for healthcare data management

## System Requirements

### Minimum Production Requirements

- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps connection
- **OS**: Ubuntu 22.04 LTS or Amazon Linux 2023

### Recommended Production Requirements

- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 500GB SSD (with automated backups)
- **Network**: 10Gbps connection
- **Load Balancer**: nginx or AWS ALB
- **CDN**: CloudFront or CloudFlare

## Docker Production Setup

### 1. Create Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  panels-db:
    image: postgres:16
    container_name: panels-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: panels_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - panels-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  panels-redis:
    image: redis:7-alpine
    container_name: panels-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - panels-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  medplum-server:
    image: medplum/medplum-server:latest
    container_name: medplum-server
    restart: unless-stopped
    depends_on:
      panels-db:
        condition: service_healthy
      panels-redis:
        condition: service_healthy
    environment:
      MEDPLUM_PORT: 8103
      MEDPLUM_BASE_URL: ${MEDPLUM_BASE_URL}
      MEDPLUM_DATABASE_HOST: panels-db
      MEDPLUM_DATABASE_PORT: 5432
      MEDPLUM_DATABASE_DBNAME: panels_prod
      MEDPLUM_DATABASE_USERNAME: ${DB_USER}
      MEDPLUM_DATABASE_PASSWORD: ${DB_PASSWORD}
      MEDPLUM_REDIS_HOST: panels-redis
      MEDPLUM_REDIS_PORT: 6379
      MEDPLUM_REDIS_PASSWORD: ${REDIS_PASSWORD}
      MEDPLUM_BINARY_STORAGE: file:./binary/
      MEDPLUM_MAX_JSON_SIZE: 10mb
      MEDPLUM_MAX_BATCH_SIZE: 100mb
    volumes:
      - medplum_data:/usr/src/medplum/packages/server/binary
    networks:
      - panels-network
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:8103/healthcheck').then(r => r.json()).then(console.log).catch(() => { process.exit(1); })"]
      interval: 30s
      timeout: 10s
      retries: 3

  panels-api:
    build:
      context: .
      dockerfile: apps/services/Dockerfile.prod
    container_name: panels-api
    restart: unless-stopped
    depends_on:
      panels-db:
        condition: service_healthy
      panels-redis:
        condition: service_healthy
      medplum-server:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DB_HOST: panels-db
      DB_PORT: 5432
      DB_NAME: panels_prod
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: panels-redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      MEDPLUM_BASE_URL: http://medplum-server:8103
      API_PORT: 3001
    networks:
      - panels-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  panels-app:
    build:
      context: .
      dockerfile: apps/app/Dockerfile.prod
    container_name: panels-app
    restart: unless-stopped
    depends_on:
      panels-api:
        condition: service_healthy
    environment:
      NODE_ENV: production
      API_URL: ${API_BASE_URL}
      NEXTAUTH_URL: ${APP_BASE_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    networks:
      - panels-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: panels-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - panels-app
      - panels-api
    networks:
      - panels-network

volumes:
  postgres_data:
  redis_data:
  medplum_data:

networks:
  panels-network:
    driver: bridge
```

### 2. Create Production Dockerfiles

**Backend Dockerfile** (`apps/services/Dockerfile.prod`):

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/services/package.json ./apps/services/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS build
COPY apps/services/ ./apps/services/
COPY packages/ ./packages/
RUN pnpm run build --filter=@panels/services

# Production stage
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl

# Copy built application
COPY --from=build /app/apps/services/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/services/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S panels -u 1001
USER panels

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "--enable-source-maps", "dist/server.js"]
```

**Frontend Dockerfile** (`apps/app/Dockerfile.prod`):

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Install pnpm
RUN npm install -g pnpm@10.11.0

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/app/package.json ./apps/app/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=@panels/app

FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/apps/app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

## nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=app:10m rate=5r/s;

    # Upstream servers
    upstream panels_api {
        server panels-api:3001 max_fails=3 fail_timeout=30s;
    }

    upstream panels_app {
        server panels-app:3000 max_fails=3 fail_timeout=30s;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://panels_api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Frontend application
        location / {
            limit_req zone=app burst=10 nodelay;
            proxy_pass http://panels_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Static assets with caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://panels_app;
        }
    }
}
```

## Environment Configuration

Create `.env.prod`:

```bash
# Database
DB_HOST=panels-db
DB_PORT=5432
DB_NAME=panels_prod
DB_USER=panels_admin
DB_PASSWORD=your_secure_db_password

# Redis
REDIS_HOST=panels-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# API
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long
API_PORT=3001
API_BASE_URL=https://your-domain.com/api

# App
APP_BASE_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_key

# Medplum
MEDPLUM_BASE_URL=http://medplum-server:8103
```

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Using Custom Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp your-domain.com.crt nginx/ssl/fullchain.pem
cp your-domain.com.key nginx/ssl/privkey.pem

# Set proper permissions
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem
```

## Deployment Process

### 1. Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply group changes
sudo reboot
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/panels.git
cd panels

# Copy production environment
cp .env.prod .env

# Edit environment variables
nano .env

# Deploy application
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec panels-api npm run migration:apply
```

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl -f https://your-domain.com/api/health
curl -f https://your-domain.com
```

## Monitoring and Maintenance

### Health Checks

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

# Check all services
services=("panels-db" "panels-redis" "medplum-server" "panels-api" "panels-app" "panels-nginx")

for service in "${services[@]}"; do
    if ! docker ps | grep -q $service; then
        echo "ERROR: $service is not running"
        exit 1
    fi
done

# Check HTTP endpoints
if ! curl -f -s https://your-domain.com/api/health > /dev/null; then
    echo "ERROR: API health check failed"
    exit 1
fi

if ! curl -f -s https://your-domain.com > /dev/null; then
    echo "ERROR: App health check failed"
    exit 1
fi

echo "All health checks passed"
```

### Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose -f docker-compose.prod.yml exec -T panels-db pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Redis backup
docker-compose -f docker-compose.prod.yml exec -T panels-redis redis-cli -a $REDIS_PASSWORD --rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Medplum data backup
docker cp medplum-server:/usr/src/medplum/packages/server/binary $BACKUP_DIR/medplum_backup_$DATE

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
find $BACKUP_DIR -name "medplum_backup_*" -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

### Monitoring with Prometheus (Optional)

Add to `docker-compose.prod.yml`:

```yaml
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - panels-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    networks:
      - panels-network
```

## Performance Optimization

### Database Tuning

PostgreSQL configuration in `postgresql.conf`:

```ini
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Connection settings
max_connections = 200
```

### Redis Optimization

```bash
# Add to redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Next.js Optimization

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/**/*'],
    },
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
```

## Security Checklist

- [ ] SSL/TLS certificates properly configured
- [ ] Database credentials rotated and secured
- [ ] JWT secrets are cryptographically secure
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Firewall rules configured
- [ ] Regular security updates scheduled
- [ ] Backup encryption enabled
- [ ] Log monitoring configured
- [ ] Intrusion detection enabled

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check resource usage
docker stats

# Check disk space
df -h
```

**Database connection issues:**
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec panels-db psql -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Check database logs
docker-compose -f docker-compose.prod.yml logs panels-db
```

**High memory usage:**
```bash
# Check memory usage
free -h
docker stats --no-stream

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart
```

**SSL certificate issues:**
```bash
# Check certificate expiry
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
```

## Scaling Considerations

### Horizontal Scaling

- Use a load balancer (AWS ALB, nginx upstream)
- Deploy multiple API instances
- Use Redis for session storage
- Implement database read replicas
- Use CDN for static assets

### Vertical Scaling

- Monitor CPU and memory usage
- Optimize database queries
- Implement caching strategies
- Use connection pooling
- Configure proper indexes

This production setup provides a robust, secure, and scalable deployment for the Panels Management System. Always test thoroughly in a staging environment before deploying to production. 