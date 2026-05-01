[← Back to Main API Docs](./README.md)

# Module: Products

Base path: `/api/v1/products` (Public) and `/api/v1/admin/products` (Admin)

Public routes are accessible without authentication. Admin routes require the `admin` role.

---

## Overview

The products module manages the catalog of pre-designed 3D printable items. Each product is linked to a Design and carries optional printing preferences. Pricing is derived entirely from slicing jobs — there is no static base price on the product itself.

**Key Features:**
- Public product catalog with pagination, filtering, and text search
- Admin product management (CRUD + image upload)
- Printing properties embedded on the product (material, color, scale, preset)
- Slicing result stored on the product after the worker completes (`slicingResult`)
- Customizable products with user-defined fields

**Product Schema highlights:**
```
name               — display name (required, text-indexed)
description        — optional description
images             — array of Drive image URLs
isActive           — visibility flag (default: true)
linkedDesignId     — ref → Design (required)
slicingJobId       — ref → SlicingJob (required) — the job that produced the default result
printingProperties — { material, color, scale, preset }
                     auto-derived from slicingJob on creation
slicingResult      — { gcodeUrl, dimensions, weight, printTime, calculatedPrice, slicedAt }
                     auto-derived from slicingJob on creation
isCustomizable     — whether users can fill custom fields
customFields       — array of field definitions (required when isCustomizable: true)
```

**Workflow:**
```
1. Admin uploads design file  →  POST /api/v1/designs/upload
2. Admin creates design record →  POST /api/v1/designs
3. Admin uploads product images → POST /api/v1/admin/products/upload-image (repeat as needed)
4. Admin executes slicing job  →  POST /api/v1/slicing/execute
   (with desired material, color, preset, scale — these become the product defaults)
5. Admin polls until Completed →  GET /api/v1/slicing/status/:jobId
6. Admin creates product       →  POST /api/v1/admin/products
   (passes slicingJobId — printingProperties and slicingResult are auto-derived)
7. Product is live in catalog with pricing and G-code ready
```

---

## Public Endpoints

Base path: `/api/v1/products`

No authentication required.

---

### `GET /api/v1/products`

- **Access:** Public

Returns a paginated list of all active products.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page |
| `sort` | string | Sort field (e.g. `-createdAt`) |
| `fields` | string | Comma-separated field projection |
| `name` | string | Text search on product name |

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "total": 50,
    "results": 10,
    "products": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Decorative Vase",
        "description": "A beautiful 3D-printed vase.",
        "images": ["https://drive.google.com/uc?id=..."],
        "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
        "printingProperties": {
          "material": "PLA",
          "color": "White",
          "scale": 100,
          "preset": "normal"
        },
        "slicingResult": {
          "gcodeUrl": "https://storage.example.com/gcode/vase.gcode",
          "dimensions": { "width": 80, "height": 120, "depth": 80 },
          "weight": 45,
          "printTime": 180,
          "calculatedPrice": 31.14,
          "slicedAt": "2026-01-10T08:00:00.000Z"
        },
        "isCustomizable": false,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-10T08:00:00.000Z"
      }
    ]
  }
}
```

---

### `GET /api/v1/products/:id`

- **Access:** Public

Returns a single active product by ID.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": {
    "product": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Decorative Vase",
      "images": ["https://drive.google.com/uc?id=..."],
      "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "printingProperties": {
        "material": "PLA",
        "color": "White",
        "scale": 100,
        "preset": "normal"
      },
      "slicingResult": {
        "gcodeUrl": "https://storage.example.com/gcode/vase.gcode",
        "dimensions": { "width": 80, "height": 120, "depth": 80 },
        "weight": 45,
        "printTime": 180,
        "calculatedPrice": 31.14,
        "slicedAt": "2026-01-10T08:00:00.000Z"
      },
      "isCustomizable": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-10T08:00:00.000Z"
    }
  }
}
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Product not found or not currently active." }
```

---

## Admin Endpoints

Base path: `/api/v1/admin/products`

All routes require authentication and the `admin` role.

---

### `GET /api/v1/admin/products`

- **Access:** Admin only

Returns all products including inactive ones.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page |
| `sort` | string | Sort field |
| `fields` | string | Field projection |
| `isActive` | boolean | Filter by active status |

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "results": 3,
    "products": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Vase Model",
        "isActive": true,
        "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
        "printingProperties": { "material": "PLA", "preset": "normal", "scale": 100 },
        "slicingResult": null
      }
    ]
  }
}
```

---

### `POST /api/v1/admin/products`

- **Access:** Admin only

Creates a new product and automatically dispatches a slicing job for the linked design.

**Request Body (JSON)**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Product display name |
| `linkedDesignId` | ObjectId | ✅ | Must reference a printable Design |
| `slicingJobId` | ObjectId | ✅ | A **Completed** SlicingJob for this design. `printingProperties` and `slicingResult` are auto-derived from it |
| `description` | string | — | Optional description |
| `images` | string[] | — | URLs previously uploaded via `POST /upload-image` |
| `isActive` | boolean | — | Visibility flag (default: `true`) |
| `isCustomizable` | boolean | — | Whether users fill custom fields (default: `false`) |
| `customFields` | array | — | Required when `isCustomizable: true` |

**`customFields` array item:**

| Field | Type | Required | Description |
|---|---|---|---|
| `fieldName` | string | ✅ | Unique identifier (e.g. `"customerName"`) |
| `fieldType` | string | ✅ | `"text"` \| `"number"` \| `"date"` |
| `isRequired` | boolean | ✅ | Whether the user must fill this field |
| `label` | string | ✅ | Display label |
| `placeholder` | string | — | Input placeholder |

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "product": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Decorative Vase",
      "isActive": true,
      "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d9",
      "printingProperties": { "material": "PLA", "color": "White", "preset": "normal", "scale": 100 },
      "slicingResult": {
        "gcodeUrl": "https://storage.example.com/gcode/vase.gcode",
        "dimensions": { "width": 80, "height": 120, "depth": 80 },
        "weight": 45,
        "printTime": 180,
        "calculatedPrice": 31.14,
        "slicedAt": "2026-01-10T08:00:00.000Z"
      },
      "isCustomizable": false
    }
  }
}
```

**Error Responses**

| Status | Message |
|---|---|
| 400 | `"Slicing job must be Completed before creating a product. Current status: <status>"` |
| 400 | `"Slicing job does not belong to the specified design."` |
| 400 | `"Linked Design is not printable."` |
| 400 | `"Image URL was not uploaded to our storage: <url>"` |
| 400 | `"Products marked as customizable must have at least one custom field defined"` |
| 404 | `"Slicing job not found."` |
| 404 | `"Linked Design not found."` |

---

### `POST /api/v1/admin/products/upload-image`

- **Access:** Admin only
- **Content-Type:** `multipart/form-data`

Uploads a product image to Google Drive. Use the returned URL in the `images` array.

**Form Fields**

- **`image`** (*file*, Required) — Max 10 MB

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product image uploaded successfully.",
  "data": {
    "fileId": "1a2b3c4d5e6f7g8h9i0j",
    "fileUrl": "https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j"
  }
}
```

---

### `GET /api/v1/admin/products/:id`

- **Access:** Admin only

Returns a single product by ID regardless of `isActive` status.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": { "product": { "...": "full product object" } }
}
```

**Response 404**
```json
{ "success": false, "message": "Product not found." }
```

---

### `PATCH /api/v1/admin/products/:id`

- **Access:** Admin only

Partially updates a product. All fields are optional.

**Request Body** — same fields as `POST`, all optional.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product updated successfully.",
  "data": { "product": { "...": "updated product object" } }
}
```

---

### `DELETE /api/v1/admin/products/:id`

- **Access:** Admin only

Permanently deletes a product and marks its images as unused for garbage collection.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product deleted successfully."
}
```

---

## Data Model

### Product

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | MongoDB document ID |
| `name` | string | Product name (text-indexed) |
| `description` | string | Optional description |
| `images` | string[] | Array of Drive image URLs |
| `isActive` | boolean | Visibility flag (default: `true`) |
| `linkedDesignId` | ObjectId → Design | The source design for this product |
| `slicingJobId` | ObjectId → SlicingJob | The slicing job that produced the default printing config |
| `printingProperties` | object | Auto-derived from slicingJob: `{ material, color, scale, preset }` |
| `slicingResult` | object | Auto-derived from slicingJob on creation |
| `slicingResult.gcodeUrl` | string | URL to the generated G-code file |
| `slicingResult.dimensions` | object | `{ width, height, depth }` in mm |
| `slicingResult.weight` | number | Weight in grams |
| `slicingResult.printTime` | number | Estimated print time in minutes |
| `slicingResult.calculatedPrice` | number | Calculated price |
| `slicingResult.slicedAt` | Date | When the slicing completed |
| `isCustomizable` | boolean | Whether users fill custom fields |
| `customFields` | array | Field definitions (required when `isCustomizable: true`) |
| `createdAt` / `updatedAt` | Date | ISO 8601 timestamps |

**Indexes:** `name` (text), `isActive`, `slicingJobId`

**Printing-ready check:** A product is always printing-ready — `slicingResult` is populated at creation time from the provided `slicingJobId`.
