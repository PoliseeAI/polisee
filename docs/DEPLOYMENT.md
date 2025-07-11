# Polisee Deployment Guide

This guide covers deploying Polisee to various environments including Vercel, self-hosted servers, and container platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Vercel Deployment](#vercel-deployment)
  - [Self-Hosted Deployment](#self-hosted-deployment)
  - [Docker Deployment](#docker-deployment)
  - [Kubernetes Deployment](#kubernetes-deployment)
- [Database Setup](#database-setup)
- [Storage Configuration](#storage-configuration)
- [Security Considerations](#security-considerations)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying Polisee, ensure you have:

- Node.js 18+ installed
- A Supabase project created
- API keys for:
  - OpenAI
  - Congress.gov
  - Resend (optional, for emails)
- Domain name (for production deployment)
- SSL certificate (for self-hosting)

## Environment Setup

### Required Environment Variables

Create a `.env.production` file with all required variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Keys
OPENAI_API_KEY=sk-...
CONGRESS_API_KEY=your-congress-api-key
RESEND_API_KEY=re_...

# Application Settings
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Optional Services
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
```

### Database Setup

1. **Create Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project
   - Note your project URL and keys

2. **Run Migrations**
   ```sql
   -- Run in Supabase SQL Editor
   -- Copy contents from:
   -- 1. supabase/migrations/*.sql (in order)
   -- 2. local_schema.sql
   ```

3. **Configure Storage**
   - Create bucket named `bills`
   - Set public access for PDF viewing

4. **Enable Row Level Security**
   ```sql
   -- Ensure RLS is enabled on all tables
   ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
   ALTER TABLE bill_analyses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
   ```

## Deployment Options

### Vercel Deployment

The easiest way to deploy Polisee:

1. **Fork Repository**
   ```bash
   git clone https://github.com/yourusername/polisee.git
   cd polisee
   ```

2. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Add all environment variables
   - Redeploy

5. **Configure Domain**
   - Add custom domain in Vercel settings
   - Update `NEXT_PUBLIC_APP_URL`

### Self-Hosted Deployment

For full control over your deployment:

1. **Prepare Server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Clone and Build**
   ```bash
   git clone https://github.com/yourusername/polisee.git
   cd polisee
   npm install
   npm run build
   ```

3. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Start with PM2**
   ```bash
   pm2 start npm --name "polisee" -- start
   pm2 save
   pm2 startup
   ```

5. **Configure SSL**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs
   EXPOSE 3000
   ENV PORT 3000

   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t polisee .
   docker run -p 3000:3000 --env-file .env.production polisee
   ```

3. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     web:
       build: .
       ports:
         - "3000:3000"
       env_file:
         - .env.production
       restart: unless-stopped
   ```

### Kubernetes Deployment

1. **Create Deployment**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: polisee
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: polisee
     template:
       metadata:
         labels:
           app: polisee
       spec:
         containers:
         - name: polisee
           image: your-registry/polisee:latest
           ports:
           - containerPort: 3000
           envFrom:
           - secretRef:
               name: polisee-secrets
   ```

2. **Create Service**
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: polisee-service
   spec:
     selector:
       app: polisee
     ports:
       - protocol: TCP
         port: 80
         targetPort: 3000
     type: LoadBalancer
   ```

3. **Create Secrets**
   ```bash
   kubectl create secret generic polisee-secrets \
     --from-env-file=.env.production
   ```

## Storage Configuration

### Supabase Storage

1. **Create Buckets**
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('bills', 'bills', true);
   ```

2. **Configure Policies**
   ```sql
   CREATE POLICY "Public read access" ON storage.objects
   FOR SELECT USING (bucket_id = 'bills');
   
   CREATE POLICY "Admin write access" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'bills' AND 
     auth.jwt() ->> 'role' = 'admin'
   );
   ```

### Alternative: S3 Storage

For S3-compatible storage:

```env
# Add to environment variables
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=polisee-bills
```

## Security Considerations

### Environment Variables

- Never commit `.env` files
- Use secret management services
- Rotate API keys regularly
- Use different keys for dev/staging/production

### Database Security

1. **Enable RLS on all tables**
2. **Use service role key only on server**
3. **Implement proper policies**
4. **Regular backups**

### Application Security

1. **Enable CORS**
   ```typescript
   // next.config.ts
   module.exports = {
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL },
           ],
         },
       ];
     },
   };
   ```

2. **Rate Limiting**
   ```typescript
   // Implement rate limiting middleware
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

3. **Input Validation**
   - Validate all API inputs
   - Sanitize user content
   - Use parameterized queries

## Monitoring & Logging

### Application Monitoring

1. **Vercel Analytics** (for Vercel deployments)
2. **Custom Monitoring**
   ```typescript
   // lib/monitoring.ts
   export async function logEvent(event: string, data: any) {
     // Send to your monitoring service
     await fetch('/api/monitoring', {
       method: 'POST',
       body: JSON.stringify({ event, data, timestamp: new Date() })
     });
   }
   ```

### Error Tracking

1. **Sentry Integration**
   ```bash
   npm install @sentry/nextjs
   ```

   ```typescript
   // sentry.client.config.ts
   import * as Sentry from "@sentry/nextjs";
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
   });
   ```

### Logging

1. **Structured Logging**
   ```typescript
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' }),
     ],
   });
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check Supabase URL and keys
   - Verify network connectivity
   - Check RLS policies

2. **Build Failures**
   - Clear `.next` directory
   - Check Node.js version
   - Verify all dependencies

3. **API Rate Limits**
   - Implement caching
   - Use batch operations
   - Consider upgrading API plans

### Debug Mode

Enable debug logging:

```env
# Add to environment
DEBUG=polisee:*
NEXT_PUBLIC_DEBUG=true
```

### Health Checks

Implement health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database
    await supabase.from('bills').select('id').limit(1);
    
    // Check external APIs
    const apis = await Promise.all([
      checkOpenAI(),
      checkCongress(),
    ]);
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date(),
      services: apis
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

## Performance Optimization

1. **Enable ISR**
   ```typescript
   export const revalidate = 3600; // Revalidate every hour
   ```

2. **Implement Caching**
   - Use Redis for session storage
   - Cache API responses
   - Implement CDN

3. **Database Optimization**
   - Add proper indexes
   - Use connection pooling
   - Optimize queries

## Backup & Recovery

1. **Database Backups**
   - Enable Supabase automatic backups
   - Schedule custom backups
   - Test recovery procedures

2. **Application Backups**
   - Version control all code
   - Backup environment configs
   - Document deployment process

## Support

For deployment help:
- GitHub Issues: [github.com/yourusername/polisee/issues](https://github.com/yourusername/polisee/issues)
- Discord: [discord.gg/polisee](https://discord.gg/polisee)
- Email: deploy@polisee.com 