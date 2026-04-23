# Deployment Guide

This application runs as a traditional long-running server suitable for local development and Docker deployments.

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

### Additional Variables

```bash
PORT=3000
NODE_ENV=development  # or production
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

### Application Behavior

The application:
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

### Docker Behavior

Docker deployments provide:
- Long-running server process
- Background cron jobs enabled
- Persistent database connections
- Graceful shutdown on container stop

## Architecture

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

## Database Connection Management

- Single persistent connection established on startup
- Connection maintained throughout application lifetime
- Graceful disconnection on shutdown

## Error Handling

**Database Connection Failure:**
- Error logged to console
- Process exits with code 1
- Requires manual restart or container restart

**Server Startup Failure:**
- Uncaught exception handler catches error
- Error details logged
- Process exits with code 1

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
- Monitoring and alerting

## Troubleshooting

**Server won't start:**
- Check MongoDB connection string in `.env`
- Verify MongoDB is running and accessible
- Check port 3000 is not already in use
- Review logs for specific error messages

**Cron jobs not running:**
- Check logs for cron job initialization messages
- Ensure cron schedule expressions are valid
- Verify background jobs are properly initialized

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

### Monitoring

- Set up logging aggregation (Datadog, LogRocket, etc.)
- Track database connection pool metrics
- Set up alerts for error rates and response times

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Docker Documentation](https://docs.docker.com/)
- [Mongoose Connection Management](https://mongoosejs.com/docs/connections.html)
