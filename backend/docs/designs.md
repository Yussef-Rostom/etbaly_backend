[← Back to Main API Docs](./README.md)

# Module: Designs

Base path: `/api/v1/designs` (Client) and `/api/v1/admin/designs` (Admin)

All routes require authentication. Visibility is role-scoped — admins see all designs, clients see only their own.

---

## Overview

The designs module manages 3D design files and their metadata. Designs can be uploaded, listed, retrieved, and deleted. Files are stored in Google Drive and referenced in the database.

**Key Features:**
- Upload 3D design files (STL, OBJ, 3MF) to Google Drive
- Automatic file validation and size limits (200MB)
- Role-based visibility (users see their own, admins see all)
- Integration with slicing workflow
- Metadata tracking (name, fileUrl, owner, timestamps)

**Workflow:**
```
1. User uploads design file → Stored in Google Drive
2. Design record created in database with fileUrl
3. Design can be used for slicing operations
4. Design can be listed, retrieved, or deleted
```

---

## Client Endpoints

Base path: `/api/v1/designs`

All routes in this section require authentication (`Bearer <accessToken>`).

---

### `POST /api/v1/designs/upload`

- **Access:** Authenticated (any role)
- **Content-Type:** `multipart/form-data`

Uploads a 3D design file (e.g. `.stl`, `.obj`, `.3mf`) to Google Drive and returns the public URL and file ID. The file is stored in the `designs/` folder on Drive.

**Form Fields**

- **`file`** (*file*, Required) — Max 200 MB
- **`name`** (*string*, Required) — Display name for the file (used in validation)

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Design file uploaded successfully.",
  "data": {
    "fileId": "1a2b3c4d5e6f7g8h9i0j",
    "fileUrl": "https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j"
  }
}
```

---

### `POST /api/v1/designs`

- **Access:** Authenticated (any role)

Creates a new design record. Obtain the `fileUrl` from the upload endpoint first.

**Request Body (JSON)**

- **`name`** (*string*, Required)
  - *Validation:* Min 1 char, trimmed
  - *Description:* Display name for the design

- **`fileUrl`** (*string*, Required)
  - *Validation:* Must be a valid URL previously uploaded via `POST /api/v1/designs/upload`
  - *Description:* URL of the uploaded 3D model file

- **`metadata`** (*object*, Required)
  - *Description:* Technical metadata about the 3D model
  - **`volumeCm3`** (*number*, Optional) — Must be positive; volume in cm³
  - **`dimensions`** (*object*, Optional)
    - **`x`** (*number*, Optional) — Must be positive; width in mm
    - **`y`** (*number*, Optional) — Must be positive; depth in mm
    - **`z`** (*number*, Optional) — Must be positive; height in mm
  - **`estimatedPrintTime`** (*number*, Optional) — Must be positive; minutes
  - **`supportedMaterials`** (*array of strings*, Required) — Min 1 item; `"PLA"` | `"ABS"` | `"RESIN"` | `"TPU"` | `"PETG"`

- **`isPrintable`** (*boolean*, Optional) — Default: `false`

- **`thumbnailUrl`** (*string*, Optional) — Preview image URL

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Design created successfully",
  "data": {
    "design": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "name": "Custom Bracket",
      "isPrintable": false,
      "fileUrl": "https://drive.google.com/uc?id=...",
      "thumbnailUrl": null,
      "ownerId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "metadata": {
        "volumeCm3": 12.5,
        "dimensions": { "x": 50, "y": 30, "z": 20 },
        "estimatedPrintTime": 90,
        "supportedMaterials": ["PLA"]
      }
    }
  }
}
```

**Response 400 — Untracked File**
```json
{ "success": false, "message": "fileUrl was not uploaded to our storage. Please upload the file first." }
```

---

### `GET /api/v1/designs`

- **Access:** Authenticated (any role)

Returns designs visible to the authenticated user. Admins receive all designs; clients receive only their own.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Designs fetched successfully",
  "data": {
    "designs": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "name": "Custom Bracket",
        "isPrintable": true,
        "fileUrl": "https://drive.google.com/uc?id=...",
        "thumbnailUrl": "https://drive.google.com/uc?id=...",
        "ownerId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "metadata": {
          "volumeCm3": 12.5,
          "dimensions": { "x": 50, "y": 30, "z": 20 },
          "estimatedPrintTime": 90,
          "supportedMaterials": ["PLA", "ABS"]
        },
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

---

### `GET /api/v1/designs/:id`

- **Access:** Authenticated (any role)

Returns a single design by ID. Clients can only access their own designs; admins can access any.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the design

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Design fetched successfully",
  "data": {
    "design": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "name": "Custom Bracket",
      "isPrintable": true,
      "fileUrl": "https://drive.google.com/uc?id=...",
      "thumbnailUrl": "https://drive.google.com/uc?id=...",
      "ownerId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "metadata": {
        "volumeCm3": 12.5,
        "dimensions": { "x": 50, "y": 30, "z": 20 },
        "estimatedPrintTime": 90,
        "supportedMaterials": ["PLA", "ABS"]
      }
    }
  }
}
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Design not found." }
```

---

### `GET /api/v1/designs/slicing-history`

- **Access:** Authenticated (any role)

Returns the authenticated user's completed slicing jobs with populated design data. This allows users to reorder previous slicing configurations.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Slicing history fetched successfully",
  "data": {
    "results": 2,
    "history": [
      {
        "jobId": "64f1a2b3c4d5e6f7a8b9c0d5",
        "design": {
          "id": "64f1a2b3c4d5e6f7a8b9c0d3",
          "name": "Custom Bracket",
          "fileUrl": "https://drive.google.com/uc?id=...",
          "thumbnailUrl": "https://drive.google.com/uc?id=...",
          "isPrintable": true,
          "supportedMaterials": ["PLA", "ABS"],
          "createdAt": "2026-01-01T00:00:00.000Z"
        },
        "material": "PLA",
        "color": "Red",
        "preset": "normal",
        "scale": 100,
        "gcodeUrl": "https://storage.example.com/gcode/model.gcode",
        "weight": 45.5,
        "dimensions": {
          "width": 100,
          "height": 50,
          "depth": 75
        },
        "printTime": 180,
        "calculatedPrice": 31.14,
        "copiedFromJobId": null,
        "createdAt": "2026-04-20T10:30:00.000Z",
        "finishedAt": "2026-04-20T10:35:00.000Z"
      },
      {
        "jobId": "64f1a2b3c4d5e6f7a8b9c0d6",
        "design": {
          "id": "64f1a2b3c4d5e6f7a8b9c0d4",
          "name": "Phone Stand",
          "fileUrl": "https://drive.google.com/uc?id=...",
          "thumbnailUrl": null,
          "isPrintable": true,
          "supportedMaterials": ["PLA"],
          "createdAt": "2026-01-15T00:00:00.000Z"
        },
        "material": "PLA",
        "color": "Blue",
        "preset": "heavy",
        "scale": 150,
        "gcodeUrl": "https://storage.example.com/gcode/phone-stand.gcode",
        "weight": 68.2,
        "dimensions": {
          "width": 150,
          "height": 75,
          "depth": 112
        },
        "printTime": 270,
        "calculatedPrice": 46.71,
        "copiedFromJobId": "64f1a2b3c4d5e6f7a8b9c0d5",
        "createdAt": "2026-04-25T14:20:00.000Z",
        "finishedAt": "2026-04-25T14:20:00.000Z"
      }
    ]
  }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

**Notes:**
- Only returns completed slicing jobs (status: "Completed")
- Results are sorted by creation date (most recent first)
- Design data is populated for easy reordering
- `copiedFromJobId` indicates if results were copied from another job
- Users can use this data to quickly reorder with the same parameters

---

### `DELETE /api/v1/designs/slicing-history/:jobId`

- **Access:** Authenticated (any role)

Deletes a slicing job from the authenticated user's history. Users can only delete their own slicing jobs.

**Path Parameters**

- **`:jobId`** (*string*, Required) — MongoDB ObjectId of the slicing job to delete

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Slicing history item deleted successfully"
}
```

**Response 400 — Invalid Job ID**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "jobId", "message": "Invalid job ID" }
    ]
  }
}
```

**Response 404 — Not Found**
```json
{ 
  "success": false, 
  "message": "Slicing job not found or you do not have permission to delete it." 
}
```

**Response 401 — Unauthenticated**
```json
{ 
  "success": false, 
  "message": "You are not logged in. Please log in to get access." 
}
```

---

## Admin Endpoints

Base path: `/api/v1/admin/designs`

All routes in this section require authentication and the `admin` role.

---

### `PATCH /api/v1/admin/designs/:id`

- **Access:** Admin only

Partially updates a design. All fields are optional.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the design

**Request Body (JSON)** — All fields optional

- **`name`** (*string*, Optional)
  - *Validation:* Min 1 char, trimmed

- **`fileUrl`** (*string*, Optional)
  - *Validation:* Must be a valid URL

- **`isPrintable`** (*boolean*, Optional)

- **`thumbnailUrl`** (*string*, Optional)
  - *Validation:* Must be a valid URL
  - *Description:* Preview image URL. Automatically set by AI workers. Can be set manually to override.

- **`metadata`** (*object*, Optional) — Partial update; all sub-fields optional
  - **`volumeCm3`** (*number*, Optional) — Must be positive
  - **`dimensions`** (*object*, Optional)
    - **`x`** (*number*, Optional) — Must be positive
    - **`y`** (*number*, Optional) — Must be positive
    - **`z`** (*number*, Optional) — Must be positive
  - **`estimatedPrintTime`** (*number*, Optional) — Must be positive
  - **`supportedMaterials`** (*array of strings*, Optional) — Min 1 item; valid material enum values

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Design updated successfully",
  "data": { "design": { "...": "updated design object" } }
}
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Design not found." }
```

---

### `DELETE /api/v1/admin/designs/:id`

- **Access:** Admin only

Permanently deletes a design and its associated file from storage.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the design

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Design deleted successfully"
}
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Design not found." }
```

---

## Example Usage

```bash
# Upload a design file
POST /api/v1/designs/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Create design record
POST /api/v1/designs
Authorization: Bearer <token>
{
  "name": "Custom Bracket",
  "fileUrl": "https://drive.google.com/uc?id=...",
  "isPrintable": true,
  "metadata": {
    "supportedMaterials": ["PLA", "ABS"]
  }
}

# Get all designs
GET /api/v1/designs
Authorization: Bearer <token>

# Get single design
GET /api/v1/designs/64f1a2b3c4d5e6f7a8b9c0d3
Authorization: Bearer <token>

# Get slicing history
GET /api/v1/designs/slicing-history
Authorization: Bearer <token>

# Delete slicing history item
DELETE /api/v1/designs/slicing-history/64f1a2b3c4d5e6f7a8b9c0d5
Authorization: Bearer <token>

# Admin: Update design
PATCH /api/v1/admin/designs/64f1a2b3c4d5e6f7a8b9c0d3
Authorization: Bearer <admin-token>
{
  "isPrintable": true,
  "thumbnailUrl": "https://drive.google.com/uc?id=..."
}

# Admin: Delete design
DELETE /api/v1/admin/designs/64f1a2b3c4d5e6f7a8b9c0d3
Authorization: Bearer <admin-token>
```
