# Interactive Configuration Generator

This guide walks you through creating custom configurations for your Panels deployment using our interactive tools.

## 🎛️ Environment Configuration Generator

### Quick Configuration

Choose your deployment scenario:

<div class="config-generator">

#### 1. Deployment Type
- [ ] **Development** - Local development environment
- [ ] **Staging** - Pre-production environment  
- [ ] **Production** - Production deployment
- [ ] **Testing** - Automated testing environment

#### 2. Database Configuration
- **Database Type:**
  - [ ] PostgreSQL (Recommended)
  - [ ] MySQL/MariaDB
  - [ ] SQLite (Development only)
  
- **Database Location:**
  - [ ] Local (Docker Compose)
  - [ ] Cloud Managed (AWS RDS, Google Cloud SQL, etc.)
  - [ ] Self-hosted server

#### 3. Cache Configuration
- **Cache Type:**
  - [ ] Redis (Recommended)
  - [ ] In-memory (Development only)
  - [ ] Memcached
  
- **Cache Location:**
  - [ ] Local (Docker Compose)
  - [ ] Cloud Managed (AWS ElastiCache, etc.)
  - [ ] Self-hosted server

#### 4. Authentication
- [ ] **JWT with local secrets**
- [ ] **OAuth 2.0 (Google, Microsoft, etc.)**
- [ ] **SAML (Enterprise SSO)**
- [ ] **LDAP/Active Directory**

#### 5. Healthcare Integration
- [ ] **Medplum FHIR Server**
- [ ] **Epic MyChart**
- [ ] **Cerner**
- [ ] **Custom FHIR endpoint**
- [ ] **No healthcare integration**

#### 6. Monitoring & Logging
- [ ] **Basic logging (Console)**
- [ ] **Structured logging (JSON)**
- [ ] **External logging (DataDog, New Relic)**
- [ ] **Prometheus metrics**

</div>

### Generated Configuration

Based on your selections above, here's your custom configuration:

#### Environment Variables (`.env`)
```bash
# Generated configuration based on your selections
# Environment: [Selected Type]
NODE_ENV=development

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=medplum
DATABASE_USER=medplum
DATABASE_PASSWORD=medplum
DATABASE_URL=postgresql://medplum:medplum@localhost:5432/medplum

# Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=medplum
REDIS_URL=redis://:medplum@localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret-here
AUTH_PROVIDER=jwt

# Healthcare Integration
MEDPLUM_BASE_URL=http://localhost:8103
MEDPLUM_CLIENT_ID=your-client-id

# Monitoring
LOG_LEVEL=debug
METRICS_ENABLED=false
```

#### Docker Compose Override
```yaml
# docker-compose.override.yml
# Generated based on your selections
version: '3.8'

services:
  panels-api:
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    
  panels-app:
    environment:
      - API_URL=http://localhost:3001
```

#### Kubernetes Configuration
```yaml
# k8s/configmap.yaml
# Generated for Kubernetes deployment
apiVersion: v1
kind: ConfigMap
metadata:
  name: panels-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_HOST: "postgres-service"
  REDIS_HOST: "redis-service"
```

## 🏥 Healthcare-Specific Configuration

### FHIR Integration Setup

#### 1. FHIR Server Configuration
```typescript
// FHIR server configuration
export const fhirConfig = {
  baseUrl: 'https://your-fhir-server.com/fhir',
  version: 'R4',
  authentication: {
    type: 'oauth2',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    tokenEndpoint: 'https://your-fhir-server.com/oauth/token'
  },
  resources: {
    patient: true,
    observation: true,
    condition: true,
    medicationRequest: true,
    encounter: true
  }
}
```

#### 2. Clinical Terminologies
```json
{
  "terminologies": {
    "icd10": {
      "url": "http://hl7.org/fhir/sid/icd-10",
      "enabled": true
    },
    "snomed": {
      "url": "http://snomed.info/sct",
      "enabled": true
    },
    "loinc": {
      "url": "http://loinc.org",
      "enabled": true
    },
    "rxnorm": {
      "url": "http://www.nlm.nih.gov/research/umls/rxnorm",
      "enabled": true
    }
  }
}
```

### Clinical Decision Support Rules
```typescript
// Clinical decision support configuration
export const cdsConfig = {
  rules: {
    diabetesManagement: {
      enabled: true,
      triggerConditions: ['E11.9', 'E10.9'], // ICD-10 diabetes codes
      recommendations: [
        'A1C every 3-6 months',
        'Annual eye exam',
        'Foot exam every visit'
      ]
    },
    hypertensionManagement: {
      enabled: true,
      triggerConditions: ['I10'], // ICD-10 hypertension
      bpTarget: {
        systolic: 130,
        diastolic: 80
      }
    }
  }
}
```

## 🔧 Advanced Configuration Templates

### Multi-Tenant Setup
```typescript
// Multi-tenant configuration
export const tenantConfig = {
  strategy: 'database-per-tenant', // or 'shared-database'
  tenants: {
    'hospital-a': {
      database: 'panels_hospital_a',
      features: ['fhir', 'cds', 'analytics'],
      branding: {
        logo: '/logos/hospital-a.png',
        primaryColor: '#1f4e79'
      }
    },
    'clinic-b': {
      database: 'panels_clinic_b', 
      features: ['fhir', 'basic-analytics'],
      branding: {
        logo: '/logos/clinic-b.png',
        primaryColor: '#2d5a87'
      }
    }
  }
}
```

### Performance Configuration
```typescript
// Performance optimization configuration
export const performanceConfig = {
  database: {
    connectionPool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 600000
    },
    queryTimeout: 30000
  },
  redis: {
    connectionPool: {
      min: 5,
      max: 10
    },
    keyPrefix: 'panels:',
    defaultTTL: 3600 // 1 hour
  },
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // limit each IP to 1000 requests per windowMs
    },
    timeout: 30000,
    compression: true
  }
}
```

## 📊 Monitoring Configuration Generator

### Application Monitoring
```yaml
# Prometheus configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'panels-api'
    static_configs:
      - targets: ['panels-api:3001']
    metrics_path: '/metrics'
    
  - job_name: 'panels-postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'panels-redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Logging Configuration
```json
{
  "logging": {
    "level": "info",
    "format": "json",
    "outputs": [
      {
        "type": "console",
        "level": "debug"
      },
      {
        "type": "file",
        "level": "info",
        "filename": "/var/log/panels/app.log",
        "maxsize": "100MB",
        "maxFiles": 5
      },
      {
        "type": "elasticsearch",
        "level": "warn",
        "host": "elasticsearch:9200",
        "index": "panels-logs"
      }
    ]
  }
}
```

## 🚀 Deployment Configuration

### AWS Configuration
```terraform
# Generated Terraform for AWS
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

resource "aws_ecs_cluster" "panels" {
  name = "panels-${var.environment}"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_rds_instance" "postgres" {
  allocated_storage    = 20
  storage_type         = "gp2"
  engine              = "postgres"
  engine_version      = "16"
  instance_class      = "db.t3.micro"
  identifier          = "panels-${var.environment}"
  username            = var.db_username
  password            = var.db_password
  parameter_group_name = "default.postgres16"
  skip_final_snapshot = true
}
```

### Kubernetes Configuration
```yaml
# Generated Kubernetes manifests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: panels-api
  labels:
    app: panels-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: panels-api
  template:
    metadata:
      labels:
        app: panels-api
    spec:
      containers:
      - name: panels-api
        image: panels/api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: panels-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 🎯 Configuration Validation

### Environment Validation Script
```bash
#!/bin/bash
# validate-config.sh
# Generated configuration validator

echo "🔍 Validating Panels configuration..."

# Check environment variables
required_vars=(
  "NODE_ENV"
  "DATABASE_URL" 
  "REDIS_URL"
  "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  else
    echo "✅ $var is set"
  fi
done

# Test database connection
echo "🗄️ Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  exit 1
fi

# Test Redis connection
echo "📦 Testing Redis connection..."
if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
  echo "✅ Redis connection successful"
else
  echo "❌ Redis connection failed"
  exit 1
fi

echo "🎉 All configuration checks passed!"
```

## 🔄 Interactive Configuration Updates

### Configuration Management Dashboard

The Panels system includes a web-based configuration dashboard for runtime configuration updates:

#### Features:
- **Live Configuration Editing** - Update settings without restarts
- **Configuration History** - Track all configuration changes
- **Validation** - Real-time validation of configuration changes
- **Rollback** - Quick rollback to previous configurations
- **Environment Sync** - Sync configurations across environments

#### Access:
```bash
# Start configuration dashboard
pnpm --filter @panels/app config:dashboard

# Access at http://localhost:3000/admin/config
```

## 📚 Next Steps

1. **[Apply Configuration](../getting-started/environment-setup.md)** - Apply your generated configuration
2. **[Test Configuration](../guides/testing/configuration-testing.md)** - Validate your setup
3. **[Deploy to Staging](../guides/devops/deployment/)** - Deploy with your configuration
4. **[Monitor & Optimize](../guides/devops/monitoring/)** - Monitor your deployment

---

**💡 Tip**: Save your configuration selections and generated files for future reference. You can always regenerate configurations as your requirements change. 