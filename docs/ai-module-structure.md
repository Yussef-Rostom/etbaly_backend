# AI Module Structure

## Overview

The AI module has been split into two separate sections following the same architectural pattern as other modules (e.g., user/userAdmin, product/productAdmin):

1. **AI Generation** - User-facing functionality
2. **AI Admin** - Administrative functionality

This separation provides better organization, clearer responsibilities, and follows the established codebase patterns.

## Directory Structure

```
src/modules/ai/
├── controllers/
│   ├── aiAdminController.ts       # Admin: Lightning URL management
│   └── aiGenerationController.ts  # User: Design generation from images
│
├── services/
│   ├── aiAdminService.ts          # Admin: Database operations for settings
│   └── aiGenerationService.ts     # User: AI generation pipeline
│
├── routes/
│   ├── aiAdminRoutes.ts           # Admin: /api/v1/admin/ai/*
│   └── aiGenerationRoutes.ts      # User: /api/v1/ai/*
│
└── validators/
    ├── aiAdminValidators.ts       # Admin: Lightning URL validation
    └── aiGenerationValidators.ts  # User: Design generation validation
```

## Layer Responsibilities

### Controllers Layer

**aiAdminController.ts**
- `setLightningUrl()` - Update Lightning AI service URL
- `getLightningUrl()` - Retrieve current Lightning AI service URL

**aiGenerationController.ts**
- `generateDesignFromImage()` - Generate 3D design from uploaded image

### Services Layer

**aiAdminService.ts**
- `setLightningUrl(url)` - Store Lightning URL in database
- `getLightningUrl()` - Fetch Lightning URL from database with env fallback

**aiGenerationService.ts**
- `generateDesignFromImage(...)` - Orchestrate AI generation pipeline
  - Verify Lightning URL is configured
  - Delegate to AI worker
  - Return design ID and file URL

### Routes Layer

**aiAdminRoutes.ts**
```typescript
POST   /api/v1/admin/ai/set-lightning-url  # Set Lightning URL
GET    /api/v1/admin/ai/lightning-url      # Get Lightning URL
```
- All routes require `authMiddleware` and `restrictTo("admin")`

**aiGenerationRoutes.ts**
```typescript
POST   /api/v1/ai/generate-design          # Generate design from image
```
- All routes require `authMiddleware`
- Includes multer middleware for image upload

### Validators Layer

**aiAdminValidators.ts**
```typescript
setLightningUrlSchema: {
  url: string (valid URL)
}
```

**aiGenerationValidators.ts**
```typescript
generateDesignSchema: {
  designName: string (2-100 chars)
}
```

## Data Flow

### Admin: Set Lightning URL

```
Client Request
    ↓
POST /api/v1/admin/ai/set-lightning-url
    ↓
authMiddleware → restrictTo("admin")
    ↓
validate(setLightningUrlSchema)
    ↓
AiAdminController.setLightningUrl()
    ↓
AiAdminService.setLightningUrl(url)
    ↓
Settings.findOneAndUpdate() → Database
    ↓
Response: { url: "..." }
```

### User: Generate Design

```
Client Request (multipart/form-data)
    ↓
POST /api/v1/ai/generate-design
    ↓
authMiddleware
    ↓
uploadImage.single("image") → multer
    ↓
validate(generateDesignSchema)
    ↓
AiGenerationController.generateDesignFromImage()
    ↓
AiGenerationService.generateDesignFromImage()
    ↓
AiAdminService.getLightningUrl() → Get URL
    ↓
processAiGenerationJob() → AI Worker
    ↓
Lightning AI Service → STL file
    ↓
Google Drive Upload
    ↓
Design.create() → Database
    ↓
Response: { designId: "...", fileUrl: "..." }
```

## Authentication & Authorization

### Admin Routes (`/api/v1/admin/ai/*`)
- **Authentication**: Required (JWT token)
- **Authorization**: Admin role only
- **Middleware Chain**: `authMiddleware` → `restrictTo("admin")`

### User Routes (`/api/v1/ai/*`)
- **Authentication**: Required (JWT token)
- **Authorization**: All authenticated users (client, operator, admin)
- **Middleware Chain**: `authMiddleware`

## Validation

### Admin Validation
- **setLightningUrlSchema**: Validates URL format using Zod
- Ensures URL is valid and properly formatted

### User Validation
- **generateDesignSchema**: Validates design name
  - Minimum 2 characters
  - Maximum 100 characters
  - Trimmed whitespace
- **File validation**: Handled by multer
  - Only image MIME types accepted
  - Maximum 10MB file size

## Error Handling

### Admin Errors
- **400**: Invalid URL format
- **401**: Not authenticated
- **403**: Not authorized (not admin)
- **500**: Database error

### User Errors
- **400**: Missing image file or design name
- **401**: Not authenticated
- **500**: Lightning URL not configured
- **500**: Lightning AI service connection error
- **500**: Request timeout
- **500**: Google Drive upload error
- **500**: Database error

## Integration Points

### Database
- **Settings Collection**: Stores Lightning URL
  - Key: "LIGHTNING_URL"
  - Value: URL string
  - Description: Auto-generated

- **Design Collection**: Stores generated designs
  - Created by AI worker after successful generation

- **Upload Collection**: Tracks uploaded files
  - Tracks STL files uploaded to Google Drive

### External Services
- **Lightning AI Service**: Converts images to STL files
  - URL configured via admin API
  - Timeout: 2 minutes
  - Request format: multipart/form-data

- **Google Drive**: Stores STL files
  - Uploads via Drive API
  - Public read permissions
  - Tracked in Upload collection

### Workers
- **AI Worker** (`src/jobs/workers/aiWorker.ts`)
  - Orchestrates the entire generation pipeline
  - Uses `AiAdminService.getLightningUrl()` to fetch URL
  - Handles all external service communication

## Testing

### Unit Tests
- Test each service method independently
- Mock database calls
- Mock external services
- Verify error handling

### Integration Tests
- Test complete request/response cycle
- Test authentication/authorization
- Test file upload handling
- Test validation errors

### Example Test Structure
```typescript
describe("AI Admin Service", () => {
  it("should set Lightning URL in database", async () => {
    const url = "https://example.com";
    const result = await AiAdminService.setLightningUrl(url);
    expect(result).toBe(url);
  });
});

describe("AI Generation Service", () => {
  it("should generate design from image", async () => {
    const result = await AiGenerationService.generateDesignFromImage(
      imageBuffer,
      "test.jpg",
      "Test Design",
      userId,
      "image/jpeg"
    );
    expect(result.designId).toBeDefined();
    expect(result.fileUrl).toContain("drive.google.com");
  });
});
```

## Migration from Old Structure

### Old Structure (Single Module)
```
src/modules/ai/
├── controllers/
│   └── aiController.ts           # Combined admin + user
├── services/
│   ├── aiService.ts              # Combined admin + user
│   └── aiGenerationService.ts
├── routes/
│   └── aiRoutes.ts               # Combined admin + user
└── validators/
    └── aiValidators.ts           # Combined admin + user
```

### New Structure (Split Modules)
```
src/modules/ai/
├── controllers/
│   ├── aiAdminController.ts      # Admin only
│   └── aiGenerationController.ts # User only
├── services/
│   ├── aiAdminService.ts         # Admin only
│   └── aiGenerationService.ts    # User only
├── routes/
│   ├── aiAdminRoutes.ts          # Admin only
│   └── aiGenerationRoutes.ts     # User only
└── validators/
    ├── aiAdminValidators.ts      # Admin only
    └── aiGenerationValidators.ts # User only
```

### Changes Made
1. Split `aiController.ts` into `aiAdminController.ts` and `aiGenerationController.ts`
2. Split `aiService.ts` into `aiAdminService.ts` (extracted from old service)
3. Split `aiRoutes.ts` into `aiAdminRoutes.ts` and `aiGenerationRoutes.ts`
4. Split `aiValidators.ts` into `aiAdminValidators.ts` and `aiGenerationValidators.ts`
5. Updated `src/app.ts` to register both route sets
6. Updated AI worker to use `AiAdminService` instead of `AiService`
7. Updated `AiGenerationService` to use `AiAdminService` for URL fetching

### Benefits of New Structure
✅ Clear separation of concerns
✅ Follows established codebase patterns
✅ Easier to maintain and test
✅ Better code organization
✅ Clearer responsibilities
✅ Consistent with other modules (user/userAdmin, product/productAdmin)

## API Endpoints Summary

### Admin Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/admin/ai/set-lightning-url` | Admin | Set Lightning AI URL |
| GET | `/api/v1/admin/ai/lightning-url` | Admin | Get Lightning AI URL |

### User Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/ai/generate-design` | User | Generate design from image |

## Environment Variables

- `LIGHTNING_URL` (optional): Default Lightning AI service URL
  - Used as fallback if not set in database
  - Priority: Database → Environment → Empty string

## Database Collections

### Settings
```json
{
  "_id": "ObjectId",
  "key": "LIGHTNING_URL",
  "value": "https://lightning-ai-service.example.com",
  "description": "Lightning AI service endpoint URL",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### Design
```json
{
  "_id": "ObjectId",
  "name": "AI Generated Vase",
  "isPrintable": true,
  "metadata": {
    "supportedMaterials": ["PLA", "ABS", "PETG"]
  },
  "ownerId": "ObjectId",
  "fileUrl": "https://drive.google.com/...",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### Upload
```json
{
  "_id": "ObjectId",
  "driveFileId": "1a2b3c4d5e6f",
  "fileUrl": "https://drive.google.com/...",
  "isUsed": true,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
