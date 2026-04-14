# AI Worker Implementation Guide

## Overview

This document describes the AI worker implementation that converts images to 3D printable STL files using the Lightning AI service.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                             │
│  POST /api/v1/ai/generate-design                            │
│  - image file (multipart/form-data)                         │
│  - designName (string)                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Controller & Service                         │
│  - Validates request                                         │
│  - Extracts user ID from auth token                         │
│  - Calls AI worker                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI Worker                                  │
│  1. Fetch Lightning URL from database                       │
│  2. Send image to Lightning AI service                      │
│  3. Receive STL file                                         │
│  4. Upload STL to Google Drive                              │
│  5. Create Design document                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Response                                  │
│  {                                                           │
│    "designId": "507f1f77bcf86cd799439011",                  │
│    "fileUrl": "https://drive.google.com/..."               │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. AI Worker (`src/jobs/workers/aiWorker.ts`)

The core worker that handles the AI generation pipeline.

**Key Functions:**
- `processAiGenerationJob(data: AiJobData)`: Main processing function
- `extractDriveFileId(fileUrl: string)`: Utility to extract Drive file ID from URL

**Dependencies:**
- `axios`: HTTP client for Lightning AI service
- `form-data`: Multipart form data for image upload
- `AiService`: Fetches Lightning URL from database
- `uploadImage`: Uploads STL to Google Drive
- `Design` model: Creates design documents
- `Upload` model: Tracks uploaded files

### 2. AI Generation Service (`src/modules/ai/services/aiGenerationService.ts`)

Service layer that wraps the worker for API use.

**Key Functions:**
- `generateDesignFromImage()`: Validates and delegates to worker

### 3. AI Controller (`src/modules/ai/controllers/aiController.ts`)

HTTP request handler for AI generation endpoints.

**Endpoints:**
- `POST /api/v1/ai/generate-design`: Generate design from image
- `POST /api/v1/ai/admin/set-lightning-url`: Configure Lightning URL (admin)
- `GET /api/v1/ai/admin/lightning-url`: Get Lightning URL (admin)

### 4. Settings Model (`src/models/Settings.ts`)

Database model for storing configuration values.

**Schema:**
```typescript
{
  key: string;           // Setting key (e.g., "LIGHTNING_URL")
  value: string;         // Setting value
  description?: string;  // Optional description
  createdAt: Date;
  updatedAt: Date;
}
```

## Data Flow

### 1. Configuration Phase (Admin)

```bash
POST /api/v1/ai/admin/set-lightning-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "url": "https://lightning-ai-service.example.com/generate"
}
```

This stores the Lightning AI service URL in the database.

### 2. Generation Phase (User)

```bash
POST /api/v1/ai/generate-design
Authorization: Bearer <user_token>
Content-Type: multipart/form-data

image: <binary file data>
designName: "My AI Generated Vase"
```

**Processing Steps:**

1. **Authentication & Validation**
   - Verify user is authenticated
   - Validate image file is present
   - Validate design name is provided

2. **Fetch Lightning URL**
   ```typescript
   const lightningUrl = await AiService.getLightningUrl();
   // Priority: Database → Environment variable → Empty string
   ```

3. **Send to Lightning AI**
   ```typescript
   const formData = new FormData();
   formData.append("image", imageBuffer, {
     filename: imageName,
     contentType: mimeType,
   });
   
   const response = await axios.post(lightningUrl, formData, {
     responseType: "arraybuffer",
     timeout: 120000, // 2 minutes
   });
   ```

4. **Upload STL to Drive**
   ```typescript
   const stlBuffer = Buffer.from(response.data);
   const fileUrl = await uploadImage(
     stlBuffer,
     `${designName}_${Date.now()}.stl`,
     "model/stl"
   );
   ```

5. **Create Design Document**
   ```typescript
   const design = await Design.create({
     name: designName,
     isPrintable: true,
     metadata: {
       supportedMaterials: ["PLA", "ABS", "PETG"],
     },
     ownerId: new mongoose.Types.ObjectId(ownerId),
     fileUrl,
   });
   ```

6. **Return Response**
   ```json
   {
     "success": true,
     "message": "Design generated successfully from image",
     "data": {
       "designId": "507f1f77bcf86cd799439011",
       "fileUrl": "https://drive.google.com/uc?export=view&id=..."
     }
   }
   ```

## Error Handling

### Lightning URL Not Configured

```json
{
  "success": false,
  "message": "Lightning AI service URL is not configured. Please set it via admin API."
}
```

**Solution**: Admin must configure the URL via `/api/v1/ai/admin/set-lightning-url`

### Connection Refused

```json
{
  "success": false,
  "message": "Cannot connect to Lightning AI service. Please check the URL."
}
```

**Causes:**
- Lightning AI service is down
- Incorrect URL configured
- Network connectivity issues

### Request Timeout

```json
{
  "success": false,
  "message": "Lightning AI service request timed out."
}
```

**Causes:**
- AI processing took longer than 2 minutes
- Lightning AI service is slow or overloaded

**Solution**: Increase timeout or optimize Lightning AI service

### Invalid Response

```json
{
  "success": false,
  "message": "Lightning AI service error: 400 - Bad Request"
}
```

**Causes:**
- Invalid image format
- Image too large
- Lightning AI service error

## Monitoring & Logging

The worker logs progress with emoji indicators:

```
🤖 [AI Worker] Starting AI generation for: My Design
🔍 [AI Worker] Fetching Lightning AI service URL...
✅ [AI Worker] Lightning URL: https://lightning-ai-service.example.com
📤 [AI Worker] Sending image to Lightning AI service...
✅ [AI Worker] Received STL file from Lightning AI service
☁️  [AI Worker] Uploading STL to Google Drive...
✅ [AI Worker] STL uploaded to Drive: https://drive.google.com/...
📝 [AI Worker] Creating design document...
✅ [AI Worker] Design created successfully! ID: 507f1f77bcf86cd799439011
🎉 [AI Worker] AI generation job completed!
```

Error logs:

```
❌ [AI Worker] Job failed for My Design: Error: Cannot connect to Lightning AI service
```

## Testing

### Manual Testing

1. **Configure Lightning URL (Admin)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/ai/admin/set-lightning-url \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-lightning-service.com/generate"}'
   ```

2. **Generate Design (User)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/ai/generate-design \
     -H "Authorization: Bearer <user_token>" \
     -F "image=@test-image.jpg" \
     -F "designName=Test Design"
   ```

### Unit Testing

```typescript
import { processAiGenerationJob } from "#src/jobs/workers";
import fs from "fs";

describe("AI Worker", () => {
  it("should generate STL from image", async () => {
    const imageBuffer = fs.readFileSync("test-image.jpg");
    
    const result = await processAiGenerationJob({
      imageBuffer,
      imageName: "test-image.jpg",
      designName: "Test Design",
      ownerId: "507f1f77bcf86cd799439011",
      mimeType: "image/jpeg",
    });
    
    expect(result.success).toBe(true);
    expect(result.designId).toBeDefined();
    expect(result.fileUrl).toContain("drive.google.com");
  });
});
```

## Performance Considerations

### Timeout Configuration

Default timeout is 2 minutes (120,000ms). Adjust based on Lightning AI service performance:

```typescript
const response = await axios.post(lightningUrl, formData, {
  timeout: 180000, // 3 minutes
});
```

### File Size Limits

- Image upload: 10MB (configured in multer)
- STL file: No limit (depends on Lightning AI service)

### Concurrent Requests

The worker can handle multiple concurrent requests. Each request:
- Has its own database connection (from pool)
- Has its own HTTP request to Lightning AI
- Has its own Google Drive upload

Consider rate limiting if Lightning AI service has limits.

## Security Considerations

### Authentication

- Admin routes require `admin` role
- User routes require authentication
- User can only create designs for themselves

### File Validation

- Only image files accepted (MIME type check)
- File size limited to 10MB
- STL files validated by Lightning AI service

### URL Validation

- Lightning URL must be valid URL format
- HTTPS recommended for production

### Data Privacy

- Images are sent to external Lightning AI service
- STL files stored in Google Drive
- Design ownership tracked by user ID

## Deployment

### Environment Variables

Required:
- `DRIVE_CLIENT_ID`: Google Drive OAuth client ID
- `DRIVE_CLIENT_SECRET`: Google Drive OAuth client secret
- `DRIVE_REFRESH_TOKEN`: Google Drive refresh token
- `DRIVE_FOLDER_ID`: Google Drive folder ID for uploads

Optional:
- `LIGHTNING_URL`: Default Lightning AI service URL (fallback)

### Database Setup

The Settings collection is created automatically. Initialize with:

```bash
POST /api/v1/ai/admin/set-lightning-url
{
  "url": "https://your-lightning-service.com/generate"
}
```

### Lightning AI Service Requirements

The Lightning AI service must:
- Accept POST requests with multipart/form-data
- Accept an `image` field with the image file
- Return STL file as binary data (arraybuffer)
- Return 200 status on success
- Complete processing within timeout period

## Troubleshooting

### Worker Not Processing

**Check:**
1. Lightning URL is configured in database
2. Lightning AI service is accessible
3. Google Drive credentials are valid
4. Database connection is active

### STL Not Uploading

**Check:**
1. Google Drive credentials are valid
2. Drive folder ID is correct
3. Drive folder has write permissions
4. Network connectivity to Google Drive

### Design Not Created

**Check:**
1. MongoDB connection is active
2. User ID is valid ObjectId
3. Design name is provided
4. File URL is valid

## Future Enhancements

- Queue system for background processing
- Progress tracking for long-running jobs
- Webhook notifications on completion
- Batch processing for multiple images
- STL file validation and metadata extraction
- Caching for frequently generated designs
- Rate limiting per user
- Cost tracking for Lightning AI usage
