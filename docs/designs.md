[← Back to Main API Docs](./README.md)

# Module: Designs

---

## Client Endpoints

Base path: `/api/v1/designs`

All routes in this section require authentication (`Bearer <accessToken>`). Visibility is role-scoped — admins see all designs, clients see only their own.

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

## Admin Endpoints

Base path: `/api/v1/admin/designs`

All routes in this section require authentication and the `admin` role.

---

### `POST /api/v1/admin/designs/upload`

- **Access:** Admin only
- **Content-Type:** `multipart/form-data`

Uploads a 3D design file (e.g. `.stl`, `.obj`) to Google Drive and returns the public URL. Use the returned URL as `fileUrl` when creating a design record.

**Form Fields**

- **`file`** (*file*, Required)
  - *Validation:* Max file size 50 MB
  - *Description:* The 3D model file to upload

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Design file uploaded successfully",
  "data": {
    "fileUrl": "https://drive.google.com/uc?id=..."
  }
}
```

**Response 400 — No File**
```json
{ "success": false, "message": "Design file is required." }
```

---

### `POST /api/v1/admin/designs`

- **Access:** Admin only

Creates a new design record. Obtain the `fileUrl` from the upload endpoint first.

**Request Body (JSON)**

- **`name`** (*string*, Required)
  - *Validation:* Min 1 char, trimmed
  - *Description:* Display name for the design

- **`fileUrl`** (*string*, Required)
  - *Validation:* Must be a valid URL previously uploaded via `POST /api/v1/admin/designs/upload-file`
  - *Description:* URL of the uploaded 3D model file

- **`metadata`** (*object*, Required)
  - *Description:* Technical metadata about the 3D model
  - **`volumeCm3`** (*number*, Optional)
    - *Validation:* Must be positive
    - *Description:* Volume of the model in cm³
  - **`dimensions`** (*object*, Optional)
    - **`x`** (*number*, Optional) — Must be positive; width in mm
    - **`y`** (*number*, Optional) — Must be positive; depth in mm
    - **`z`** (*number*, Optional) — Must be positive; height in mm
  - **`estimatedPrintTime`** (*number*, Optional)
    - *Validation:* Must be positive
    - *Description:* Estimated print time in minutes
  - **`supportedMaterials`** (*array of strings*, Required)
    - *Validation:* Min 1 item; each must be one of `"PLA"`, `"ABS"`, `"Resin"`, `"TPU"`, `"PETG"`
    - *Description:* Materials compatible with this design

- **`isPrintable`** (*boolean*, Optional)
  - *Description:* Whether the design is ready for printing (default: `false`)

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

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "metadata.supportedMaterials", "message": "supportedMaterials must contain at least one material" }
    ]
  }
}
```

**Response 400 — Untracked File**
```json
{ "success": false, "message": "fileUrl was not uploaded to our storage. Please upload the file first." }
```

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
