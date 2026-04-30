[← Back to Main API Docs](./README.md)

# Module: AI Generation

Base path: `/api/v1/ai` (Public), `/api/v1/admin/ai` (Admin)

All routes require authentication. Public routes are available to all authenticated users. Admin routes require the `admin` role.

---

## Overview

The AI generation module provides AI-powered content creation capabilities through integration with Lightning AI services. It supports both image-to-3D model conversion and text-to-image generation via asynchronous job processing.

**Key Features:**
- Image-to-3D model conversion using Lightning AI
- Text-to-image generation from prompts
- Asynchronous job processing with BullMQ
- Real-time job status tracking
- Automatic Google Drive storage integration
- Design ownership and access control
- Admin configuration of Lightning AI service endpoints
- Redis caching for service URLs (1-hour TTL)

**Workflow (Image-to-3D):**
```
1. User uploads image via POST /image-to-3d
2. System creates job in AI_GENERATION queue
3. Returns jobId immediately
4. BullMQ worker processes job asynchronously
5. Worker calls Lightning AI service
6. Worker creates Design document with generated 3D model
7. User polls GET /job/:queueName/:jobId for status
8. On completion, user receives designId and file URLs
```

**Workflow (Text-to-Image):**
```
1. User submits prompt via POST /text-to-image
2. System creates job in TEXT_TO_IMAGE queue
3. Returns jobId immediately
4. BullMQ worker processes job asynchronously
5. Worker calls Lightning AI service
6. Worker uploads generated image to Google Drive
7. User polls GET /job/:queueName/:jobId for status
8. On completion, user receives image file ID and URL
```

---

## Public Endpoints

Base path: `/api/v1/ai`

All routes require authentication (`Bearer <accessToken>`).

---

### `POST /api/v1/ai/image-to-3d`

- **Access:** Authenticated (any role)
- **Content-Type:** `multipart/form-data`

Submits an image for AI-powered 3D model generation. Returns immediately with a job ID for tracking. Processing happens asynchronously in the background.

**Form Fields**

- **`image`** (*file*, Required)
  - *Validation:* Must be an image file (JPEG, PNG, GIF, WebP, BMP), max 10MB
  - *Description:* The image to convert to a 3D model

- **`designName`** (*string*, Required)
  - *Validation:* Min 2 chars, max 100 chars, trimmed
  - *Description:* Name for the generated 3D design

**Response 201 — Created**
```json
{
  "success": true,
  "message": "3D design generation job queued",
  "data": {
    "success": true,
    "message": "Job added to queue",
    "jobId": "1234567890"
  }
}
```

**Response 400 — Validation Error**
```json
{ "success": false, "message": "Image file is required" }
```

```json
{ "success": false, "message": "Design name is required" }
```

```json
{ "success": false, "message": "Only image files are allowed (JPEG, PNG, GIF, WebP, BMP)" }
```

```json
{ "success": false, "message": "File too large. Maximum size is 10MB" }
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 500 — Internal Server Error**
```json
{ "success": false, "message": "Image-to-3D Lightning AI URL is not configured. Please set it via the admin API endpoint: POST /api/v1/admin/ai/set-image-to-3d-url" }
```

```json
{ "success": false, "message": "Failed to queue design generation" }
```

---

### `POST /api/v1/ai/text-to-image`

- **Access:** Authenticated (any role)
- **Content-Type:** `application/json`

Submits a text prompt for AI-powered image generation. Returns immediately with a job ID for tracking. Processing happens asynchronously in the background.

**Request Body (JSON)**

- **`prompt`** (*string*, Required)
  - *Validation:* Min 1 char, max 500 chars, trimmed
  - *Description:* Text description to generate an image

- **`designName`** (*string*, Required)
  - *Validation:* Min 2 chars, max 100 chars, trimmed
  - *Description:* Name for the generated image

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Image generation job queued",
  "data": {
    "success": true,
    "message": "Job added to queue",
    "jobId": "0987654321"
  }
}
```

**Response 400 — Validation Error**
```json
{ "success": false, "message": "Text prompt is required" }
```

```json
{ "success": false, "message": "Design name is required" }
```

```json
{ "success": false, "message": "Prompt cannot be empty" }
```

```json
{ "success": false, "message": "Prompt must be 500 characters or less" }
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 500 — Internal Server Error**
```json
{ "success": false, "message": "Text-to-image Lightning AI URL is not configured. Please set it via the admin API endpoint: POST /api/v1/admin/ai/set-text-to-image-url" }
```

```json
{ "success": false, "message": "Failed to queue image generation" }
```

---

### `GET /api/v1/ai/job/:queueName/:jobId`

- **Access:** Authenticated (any role)

Retrieves the current status of an AI generation job from a specific queue. Returns job state, progress, and result when completed.

Users may only retrieve their own jobs. Requesting another user's job returns 403.

**Path Parameters**

- **`:queueName`** (*string*, Required) — The queue name where the job is running
  - *Valid values:* `AI_GENERATION` (for image-to-3D jobs) or `TEXT_TO_IMAGE` (for text-to-image jobs)
  - *Description:* Specifies which queue to check for the job

- **`:jobId`** (*string*, Required) — The job ID returned from the image-to-3d or text-to-image endpoint

**Response 200 — OK (Waiting)**
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "jobId": "1234567890",
    "queueName": "AI_GENERATION",
    "state": "waiting",
    "progress": 0,
    "designName": "My Custom Vase",
    "createdAt": 1704067200000,
    "completed": false,
    "waiting": true
  }
}
```

**Response 200 — OK (Processing)**
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "jobId": "1234567890",
    "queueName": "AI_GENERATION",
    "state": "active",
    "progress": 50,
    "designName": "My Custom Vase",
    "createdAt": 1704067200000,
    "completed": false,
    "processing": true
  }
}
```

**Response 200 — OK (Completed - Image-to-3D)**
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "jobId": "1234567890",
    "queueName": "AI_GENERATION",
    "state": "completed",
    "progress": 100,
    "designName": "My Custom Vase",
    "createdAt": 1704067200000,
    "completed": true,
    "result": {
      "success": true,
      "designId": "507f1f77bcf86cd799439011",
      "fileId": "1a2b3c4d5e6f7g8h9i0j",
      "publicUrl": "https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j",
      "isMock": false
    }
  }
}
```

**Note:** For image-to-3D jobs, the `designId` is a real MongoDB ObjectId of the created Design document. The design is created using the public Design service and is owned by the user who submitted the job. The resulting 3D model is saved to the `designs/` folder in Google Drive. By default, generated designs have `isPrintable: false` and `supportedMaterials: ["PLA"]`. The source image is automatically saved as the design's `thumbnailUrl`. Users can access this design via the Designs API endpoints.

**Response 200 — OK (Completed - Text-to-Image)**
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "jobId": "0987654321",
    "queueName": "TEXT_TO_IMAGE",
    "state": "completed",
    "progress": 100,
    "designName": "Futuristic Vase Image",
    "createdAt": 1704067200000,
    "completed": true,
    "result": {
      "success": true,
      "imageFileId": "9z8y7x6w5v4u3t2s1r0q",
      "imagePublicUrl": "https://drive.google.com/uc?export=view&id=9z8y7x6w5v4u3t2s1r0q"
    }
  }
}
```

**Note:** For text-to-image jobs, the result contains the generated image file ID and public URL. The image is saved to Google Drive and can be viewed directly using the `imagePublicUrl`.

**Response 200 — OK (Failed)**
```json
{
  "success": true,
  "message": "Job status retrieved successfully",
  "data": {
    "jobId": "1234567890",
    "queueName": "AI_GENERATION",
    "state": "failed",
    "progress": 0,
    "designName": "My Custom Vase",
    "createdAt": 1704067200000,
    "completed": false,
    "failed": true,
    "error": "Lightning AI service connection failed"
  }
}
```

**Response 400 — Invalid Queue Name**
```json
{ "success": false, "message": "Invalid queue name. Must be one of: AI_GENERATION, TEXT_TO_IMAGE" }
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to view this job" }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Job not found. The job may have expired (completed jobs are kept for 1 hour) or the job ID is invalid." }
```

**Response 500 — Internal Server Error**
```json
{ "success": false, "message": "Failed to fetch job status" }
```

---

## Admin Endpoints

Base path: `/api/v1/admin/ai`

All routes in this section require authentication and the `admin` role.

---

### `POST /api/v1/admin/ai/set-text-to-image-url`

- **Access:** Admin only

Updates the Lightning AI text-to-image service endpoint URL. Changes take effect immediately and are cached in Redis with a 1-hour TTL.

**Request Body (JSON)**

- **`url`** (*string*, Required)
  - *Validation:* Must be a valid URL
  - *Description:* The Lightning AI text-to-image service endpoint URL

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Text-to-image URL updated successfully",
  "data": {
    "url": "https://lightning-text-to-image.example.com/api/v1/generate"
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
      { "field": "url", "message": "Must be a valid URL" }
    ]
  }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

---

### `GET /api/v1/admin/ai/text-to-image-url`

- **Access:** Admin only

Retrieves the currently configured Lightning AI text-to-image service URL from Redis cache or database.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Text-to-image URL fetched successfully",
  "data": {
    "url": "https://lightning-text-to-image.example.com/api/v1/generate"
  }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 500 — Internal Server Error**
```json
{ "success": false, "message": "Text-to-image Lightning AI URL is not configured. Please set it via the admin API endpoint: POST /api/v1/admin/ai/set-text-to-image-url" }
```

---

### `DELETE /api/v1/admin/ai/text-to-image-url/cache`

- **Access:** Admin only

Manually clears the Redis cache for the text-to-image Lightning AI URL. The next request will fetch from the database and repopulate the cache.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Text-to-image URL cache cleared successfully"
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

---

### `POST /api/v1/admin/ai/set-image-to-3d-url`

- **Access:** Admin only

Updates the Lightning AI image-to-3D service endpoint URL. Changes take effect immediately and are cached in Redis with a 1-hour TTL.

**Request Body (JSON)**

- **`url`** (*string*, Required)
  - *Validation:* Must be a valid URL
  - *Description:* The Lightning AI image-to-3D service endpoint URL

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Image-to-3D URL updated successfully",
  "data": {
    "url": "https://lightning-image-to-3d.example.com/api/v1/convert"
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
      { "field": "url", "message": "Must be a valid URL" }
    ]
  }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

---

### `GET /api/v1/admin/ai/image-to-3d-url`

- **Access:** Admin only

Retrieves the currently configured Lightning AI image-to-3D service URL from Redis cache or database. Falls back to the legacy `lightningAiUrl` setting if `lightningAiImageTo3dUrl` is not configured.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Image-to-3D URL fetched successfully",
  "data": {
    "url": "https://lightning-image-to-3d.example.com/api/v1/convert"
  }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 500 — Internal Server Error**
```json
{ "success": false, "message": "Image-to-3D Lightning AI URL is not configured. Please set it via the admin API endpoint: POST /api/v1/admin/ai/set-image-to-3d-url" }
```

---

### `DELETE /api/v1/admin/ai/image-to-3d-url/cache`

- **Access:** Admin only

Manually clears the Redis cache for the image-to-3D Lightning AI URL. The next request will fetch from the database and repopulate the cache.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Image-to-3D URL cache cleared successfully"
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

