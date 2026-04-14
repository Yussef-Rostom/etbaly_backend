[← Back to Main API Docs](./README.md)

# Module: AI Generation

Base path: `/api/v1/ai` (User routes) and `/api/v1/admin/ai` (Admin routes)

---

## Overview

The AI Generation module is split into two sections following the same pattern as other modules:

- **AI Generation** (`/api/v1/ai`): User-facing routes for generating 3D designs from images
- **AI Admin** (`/api/v1/admin/ai`): Admin-only routes for configuring the Lightning AI service

The Lightning AI service URL is stored in the database and can be updated at runtime without requiring server restart.

**Key Features:**
- Database-backed storage for persistence across server restarts
- Fallback to `LIGHTNING_URL` environment variable if not set in database
- Admin-only access for Lightning URL configuration
- Authenticated user access for AI design generation
- Image-to-STL conversion using Lightning AI service
- Automatic upload to Google Drive and design creation
- Proper separation of concerns with layered architecture

---

## Module Structure

```
src/modules/ai/
├── controllers/
│   ├── aiAdminController.ts       # Admin endpoints
│   └── aiGenerationController.ts  # User endpoints
├── services/
│   ├── aiAdminService.ts          # Admin business logic
│   └── aiGenerationService.ts     # User business logic
├── routes/
│   ├── aiAdminRoutes.ts           # Admin route definitions
│   └── aiGenerationRoutes.ts      # User route definitions
└── validators/
    ├── aiAdminValidators.ts       # Admin input validation
    └── aiGenerationValidators.ts  # User input validation
```

---

## Admin Routes

All admin routes require authentication and the `admin` role.

### `POST /api/v1/ai/admin/set-lightning-url`

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

### `GET /api/v1/ai/admin/lightning-url`

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

## User Routes

All user routes require authentication.

### `POST /api/v1/ai/generate-design`

- **Access:** Authenticated users (client, operator, admin)

Generates a 3D printable design (STL file) from an uploaded image using the Lightning AI service.

**Request (multipart/form-data)**

- **`image`** (*file*, Required)
  - *Validation:* Must be an image file (JPEG, PNG, etc.)
  - *Max Size:* 10MB
  - *Description:* The image to convert to a 3D model

- **`designName`** (*string*, Required)
  - *Description:* Name for the generated design

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Design generated successfully from image",
  "data": {
    "designId": "507f1f77bcf86cd799439011",
    "fileUrl": "https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j"
  }
}
```

**Response 400 — Bad Request**
```json
{
  "success": false,
  "message": "Image file is required"
}
```

```json
{
  "success": false,
  "message": "Design name is required"
}
```

**Response 401 — Unauthenticated**
```json
{
  "success": false,
  "message": "You are not logged in. Please log in to get access."
}
```

**Response 500 — Internal Server Error**
```json
{
  "success": false,
  "message": "Lightning AI service URL is not configured. Please set it via admin API."
}
```

```json
{
  "success": false,
  "message": "Cannot connect to Lightning AI service. Please check the URL."
}
```

```json
{
  "success": false,
  "message": "Lightning AI service request timed out."
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

### Admin: Configure Lightning URL

```bash
# Set Lightning URL
curl -X POST https://api.example.com/api/v1/ai/admin/set-lightning-url \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://lightning-ai-service.example.com"}'

# Get current Lightning URL
curl -X GET https://api.example.com/api/v1/ai/admin/lightning-url \
  -H "Authorization: Bearer <admin_token>"
```

### User: Generate Design from Image

```bash
# Generate 3D design from image
curl -X POST https://api.example.com/api/v1/ai/generate-design \
  -H "Authorization: Bearer <user_token>" \
  -F "image=@/path/to/image.jpg" \
  -F "designName=My AI Generated Vase"
```

---

## How It Works

1. **Admin configures Lightning AI service URL** via `/api/v1/ai/admin/set-lightning-url`
2. **User uploads an image** via `/api/v1/ai/generate-design`
3. **System fetches Lightning URL** from database (with env fallback)
4. **Image is sent to Lightning AI service** as multipart form data
5. **Lightning AI service returns STL file** (binary data)
6. **STL file is uploaded to Google Drive** and made publicly accessible
7. **Design document is created** in MongoDB with:
   - Name provided by user
   - File URL from Google Drive
   - Owner ID from authenticated user
   - Default metadata (isPrintable: true, supportedMaterials: ["PLA", "ABS", "PETG"])
8. **Response returned to user** with design ID and file URL

---

## Worker Implementation

The AI generation is handled by a background worker (`src/jobs/workers/aiWorker.ts`) that:
- Manages the entire conversion pipeline
- Handles errors gracefully with detailed logging
- Supports 2-minute timeout for AI processing
- Tracks uploads in the database
- Creates design documents automatically

For more details, see `src/jobs/workers/README.md`.

---

## Error Handling

The system handles various error scenarios:

- **Lightning URL not configured**: Returns 500 with message to configure via admin API
- **Connection refused**: Cannot connect to Lightning AI service
- **Request timeout**: AI processing took longer than 2 minutes
- **Invalid response**: Lightning AI service returned non-200 status
- **Upload failure**: Google Drive upload failed
- **Database error**: Failed to create design document

All errors are logged with emoji indicators for easy monitoring.
