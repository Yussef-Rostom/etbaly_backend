[← Back to Main API Docs](./README.md)

# Module: AI Generation

Base path: `/api/v1/admin/ai`

All routes require authentication and the `admin` role.

---

## Overview

The AI Generation module manages the Lightning AI service URL used for generating AI-powered content for 3D models and designs. The URL is stored in the database and can be updated at runtime without requiring server restart.

**Key Features:**
- Database-backed storage for persistence across server restarts
- Fallback to `LIGHTNING_URL` environment variable if not set in database
- Admin-only access for security

---

### `POST /api/v1/admin/ai/set-lightning-url`

- **Access:** Admin only

Updates the Lightning AI service URL used for AI generation.

**Request Body (JSON)**

- **`url`** (*string*, Required)
  - *Validation:* Must be a valid URL
  - *Description:* The Lightning AI service endpoint URL

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Lightning URL updated successfully",
  "data": {
    "url": "https://lightning-ai-service.example.com"
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "url",
        "message": "Must be a valid URL"
      }
    ]
  }
}
```

**Response 401 — Unauthenticated**
```json
{
  "success": false,
  "message": "You are not logged in. Please log in to get access."
}
```

**Response 403 — Forbidden**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action."
}
```

---

### `GET /api/v1/admin/ai/lightning-url`

- **Access:** Admin only

Retrieves the current Lightning AI service URL.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Lightning URL fetched successfully",
  "data": {
    "url": "https://lightning-ai-service.example.com"
  }
}
```

**Response 401 — Unauthenticated**
```json
{
  "success": false,
  "message": "You are not logged in. Please log in to get access."
}
```

**Response 403 — Forbidden**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action."
}
```

---

## Environment Variables

- **`LIGHTNING_URL`** (*string*, Optional)
  - *Description:* Default Lightning AI service URL (used as fallback if not set in database)
  - *Default:* Empty string
  - *Example:* `LIGHTNING_URL=https://lightning-ai-service.example.com`
  - *Note:* This value is only used if the URL hasn't been set in the database via the admin API

## Database Storage

The Lightning URL is stored in the `settings` collection with the following structure:

```json
{
  "_id": "ObjectId",
  "key": "LIGHTNING_URL",
  "value": "https://lightning-ai-service.example.com",
  "description": "Lightning AI service endpoint URL for AI-powered content generation",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Priority Order:**
1. Database value (if exists)
2. Environment variable `LIGHTNING_URL` (fallback)
3. Empty string (if neither is set)

---

## Usage Example

```bash
# Set Lightning URL
curl -X POST https://api.example.com/api/v1/admin/ai/set-lightning-url \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://lightning-ai-service.example.com"}'

# Get current Lightning URL
curl -X GET https://api.example.com/api/v1/admin/ai/lightning-url \
  -H "Authorization: Bearer <admin_token>"
```
