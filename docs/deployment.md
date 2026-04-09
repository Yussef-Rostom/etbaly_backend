# Deployment Guide

This application supports multiple deployment modes through a hybrid deployment strategy. The same codebase can run as a traditional long-running server (for local development and Docker) or as a serverless function (for Vercel).

## Deployment Modes

The application automatically detects its deployment mode using the `RUNNING_METHOD` environment variable:

- **Local Mode** (default): Traditional server with background jobs and persistent connections
- **Serverless Mode**: Optimized for serverless platforms with connection reuse and no background jobs

### Mode Detection

```typescript
// Deployment mode is determined by RUNNING_METHOD environment variable
RUNNING_METHOD === "vercel" → Serverless Mode
RUNNING_METHOD !== "vercel" or undefined → Local Mode (default)
```

## Environment Variables

### Required Variables (All Modes)

```bash
# Database
MONGODB_URI=mongodb://user:password@host:port/database

# JWT Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Firebase (for Google OAuth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Drive (for file storage)
DRIVE_CLIENT_ID=your-drive-client-id
DRIVE_CLIENT_SECRET=your-drive-client-secret
DRIVE_REFRESH_TOKEN=your-drive-refresh-token
DRIVE_FOLDER_ID=your-drive-folder-id

# Email (optional)
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
```

### Mode-Specific Variables

#### Local Mode

```bash
PORT=3000
NODE_ENV=development  # or production
RUNNING_METHOD=local  # or omit entirely (defaults to local)
```

#### Serverless Mode

```bash
NODE_ENV=production
RUNNING_METHOD=vercel
```

## Local Development

### Prerequisites

- Node.js 20.x or higher
- MongoDB instance (local or remote)
- npm or yarn package manager

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```bash
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/etbaly_db
# ... add other required variables
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` with:
- Database connection established
- Background cron jobs running
- Graceful shutdown handlers configured

### Local Mode Behavior

When running in local mode, the application:
- ✅ Connects to MongoDB on startup
- ✅ Starts background cron jobs (user cleanup, garbage collection)
- ✅ Listens on the configured PORT
- ✅ Sets up graceful shutdown handlers for SIGTERM/SIGINT
- ✅ Logs startup messages with server URL and health check endpoint

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- `.env` file configured

### Setup

1. Ensure your `.env` file is configured for Docker:

```bash
PORT=3000
NODE_ENV=production
RUNNING_METHOD=local  # Docker uses local mode
MONGODB_URI=mongodb://admin:password@mongo:27017/etbaly_db?authSource=admin
# ... add other required variables
```

2. Build and start the containers:

```bash
docker-compose up -d
```

3. View logs:

```bash
docker-compose logs -f api
```

### Docker Configuration

The `docker-compose.yml` file defines:
- API service running on port 3000
- MongoDB service (if included)
- Volume mounts for code and node_modules
- Environment variable injection from `.env`

### Docker Mode Behavior

Docker deployments run in **local mode** with the same behavior as local development:
- Long-running server process
- Background cron jobs enabled
- Persistent database connections
- Graceful shutdown on container stop

## Vercel Deployment

### Prerequisites

- Vercel account
- Vercel CLI installed (`npm i -g vercel`)
- MongoDB Atlas or remote MongoDB instance

### Setup

1. Configure environment variables in Vercel dashboard or CLI:

```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add REFRESH_TOKEN_SECRET
# ... add all other required variables
```

2. The `vercel.json` configuration is already set up:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".",
  "functions": {
    "api/index.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ],
  "env": {
    "RUNNING_METHOD": "vercel",
    "NODE_ENV": "production"
  }
}
```

3. Deploy to Vercel:

```bash
vercel --prod
```

### Vercel Mode Behavior

When deployed to Vercel, the application runs in **serverless mode**:
- ❌ No `app.listen()` call (handled by Vercel)
- ❌ No background cron jobs (use Vercel Cron instead)
- ❌ No graceful shutdown handlers (managed by platform)
- ✅ Database connection reuse across invocations (warm starts)
- ✅ Automatic cold start handling
- ✅ Request forwarding to Express app

### Serverless Handler Flow

```
1. Request arrives at Vercel
2. Handler checks database connection state
3. If not connected (cold start), establish connection
4. If already connected (warm start), reuse existing connection
5. Forward request to Express app
6. Return response to Vercel
```

### Vercel Configuration Options

#### Function Settings

- `maxDuration`: Maximum execution time (30s for Pro plan, 10s for Hobby)
- `memory`: Memory allocation in MB (1024 recommended for database operations)

#### Cron Jobs (Optional)

To replace background cron jobs, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-unverified-users",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/upload-garbage-collection",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Note: You'll need to create authenticated cron endpoints in your Express app.

## Architecture Comparison

### Local Mode (Docker, Local Dev)

```
┌─────────────────────────────────────┐
│         Application Start           │
├─────────────────────────────────────┤
│ 1. Connect to MongoDB               │
│ 2. Start background cron jobs       │
│ 3. Start HTTP server (app.listen)  │
│ 4. Setup graceful shutdown          │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│    Long-Running Server Process      │
│  - Persistent connections           │
│  - Background jobs running          │
│  - Handles all incoming requests    │
└─────────────────────────────────────┘
```

### Serverless Mode (Vercel)

```
┌─────────────────────────────────────┐
│      Request Arrives (Cold Start)   │
├─────────────────────────────────────┤
│ 1. Handler function invoked         │
│ 2. Check database connection        │
│ 3. Connect if needed                │
│ 4. Process request via Express      │
│ 5. Return response                  │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│     Request Arrives (Warm Start)    │
├─────────────────────────────────────┤
│ 1. Handler function invoked         │
│ 2. Reuse existing DB connection     │
│ 3. Process request via Express      │
│ 4. Return response                  │
└─────────────────────────────────────┘
```

## Database Connection Management

### Local Mode

- Single persistent connection established on startup
- Connection maintained throughout application lifetime
- Graceful disconnection on shutdown

### Serverless Mode

- Connection established on first request (cold start)
- Connection reused across subsequent requests (warm starts)
- Mongoose connection state check prevents duplicate connections:

```typescript
if (mongoose.connection.readyState < 1) {
  await connectDB(); // Only connect if not already connected
}
```

Connection states:
- `0` = disconnected
- `1` = connected
- `2` = connecting
- `3` = disconnecting

## Error Handling

### Local Mode Errors

**Database Connection Failure:**
- Error logged to console
- Process exits with code 1
- Requires manual restart or container restart

**Server Startup Failure:**
- Uncaught exception handler catches error
- Error details logged
- Process exits with code 1

### Serverless Mode Errors

**Database Connection Failure:**
- Error logged with ❌ emoji indicator
- 500 status response returned to client
- Serverless platform may retry the request

**Request Processing Failure:**
- Express error handler catches error
- Appropriate status code and message returned
- Error logged for debugging

## Health Check

All deployment modes support the health check endpoint:

```bash
GET /api/v1/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running 🚀",
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Use this endpoint for:
- Docker health checks
- Load balancer health probes
- Vercel deployment verification
- Monitoring and alerting

## Troubleshooting

### Local/Docker Issues

**Server won't start:**
- Check MongoDB connection string in `.env`
- Verify MongoDB is running and accessible
- Check port 3000 is not already in use
- Review logs for specific error messages

**Cron jobs not running:**
- Verify `RUNNING_METHOD` is not set to "vercel"
- Check logs for cron job initialization messages
- Ensure cron schedule expressions are valid

### Vercel Issues

**Cold start timeouts:**
- Increase `maxDuration` in `vercel.json` (requires Pro plan for >10s)
- Optimize database connection logic
- Consider using connection pooling

**Database connection errors:**
- Verify MongoDB Atlas allows connections from Vercel IPs (0.0.0.0/0)
- Check `MONGODB_URI` environment variable in Vercel dashboard
- Ensure MongoDB connection string includes `retryWrites=true&w=majority`

**Function size limits:**
- Vercel has a 50MB limit for serverless functions
- Minimize dependencies in `package.json`
- Use `.vercelignore` to exclude unnecessary files

## Best Practices

### Environment Variables

- Never commit `.env` files to version control
- Use different MongoDB databases for dev/staging/production
- Rotate JWT secrets regularly
- Use strong, unique secrets for each environment

### Database Connections

- Use MongoDB Atlas for production (managed, scalable)
- Enable connection pooling in MongoDB URI
- Set appropriate connection timeouts
- Monitor connection pool usage

### Serverless Optimization

- Keep function code minimal (faster cold starts)
- Reuse connections across invocations
- Avoid heavy computations in request handlers
- Use Vercel Edge Functions for static content

### Monitoring

- Set up logging aggregation (Datadog, LogRocket, etc.)
- Monitor cold start frequency and duration
- Track database connection pool metrics
- Set up alerts for error rates and response times

## Migration Guide

### From Local-Only to Hybrid

If you're migrating from a local-only setup:

1. Update `src/server.ts` with mode detection logic (already done)
2. Add `RUNNING_METHOD` to your environment variables
3. Test locally with `RUNNING_METHOD=local`
4. Test serverless mode with `RUNNING_METHOD=vercel`
5. Deploy to Vercel with proper environment variables

### From Serverless-Only to Hybrid

If you're migrating from a serverless-only setup:

1. Ensure cron jobs are disabled in serverless mode
2. Add graceful shutdown handlers for local mode
3. Test Docker deployment with `RUNNING_METHOD=local`
4. Verify background jobs work in local mode
5. Maintain serverless deployment with `RUNNING_METHOD=vercel`

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Docker Documentation](https://docs.docker.com/)
- [Mongoose Connection Management](https://mongoosejs.com/docs/connections.html)
