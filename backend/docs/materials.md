[← Back to Main API Docs](./README.md)

# Module: Materials

Base path: `/api/v1/materials` (Public), `/api/v1/admin/materials` (Admin)

All routes require authentication. Public routes are available to all authenticated users. Admin routes require the `admin` role.

---

## Overview

The materials module manages 3D printing materials and their properties. It provides material information for slicing operations, pricing calculations, and inventory management.

**Key Features:**
- Material catalog with pricing information
- Active/inactive material status management
- Material validation for slicing operations
- Admin CRUD operations for materials
- Color hex codes for UI display
- Price per gram tracking for cost calculations

**Workflow:**
```
Admin Creates Material (POST /admin/materials)
  ↓
Material Available for Slicing
  ↓
Users Query Available Materials (GET /materials)
  ↓
Users Select Material for Slicing Job
  ↓
System Validates Material and Calculates Price
```

**Material Types:**
- **PLA** - Polylactic Acid (most common, easy to print)
- **ABS** - Acrylonitrile Butadiene Styrene (strong, heat-resistant)
- **PETG** - Polyethylene Terephthalate Glycol (durable, flexible)
- **TPU** - Thermoplastic Polyurethane (flexible, rubber-like)
- **Resin** - Photopolymer resin (high detail, smooth finish)

---

## Public Endpoints

Base path: `/api/v1/materials`

All routes require authentication (`Bearer <accessToken>`).

---

### `GET /api/v1/materials`

- **Access:** Authenticated Users

Returns all active materials available for slicing operations. Only materials with `isActive: true` are returned.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Available materials retrieved successfully.",
  "data": {
    "materials": [
      {
        "type": "PLA",
        "name": "PLA Filament",
        "pricePerGram": 0.025,
        "color": "White"
      },
      {
        "type": "ABS",
        "name": "ABS Filament",
        "pricePerGram": 0.030,
        "color": "Black"
      },
      {
        "type": "PETG",
        "name": "PETG Filament",
        "pricePerGram": 0.028,
        "color": "Orange"
      },
      {
        "type": "TPU",
        "name": "TPU Flexible Filament",
        "pricePerGram": 0.035,
        "color": "Pink"
      },
      {
        "type": "Resin",
        "name": "Standard Resin",
        "pricePerGram": 0.050,
        "color": "Brown"
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

---

## Admin Endpoints

Base path: `/api/v1/admin/materials`

All routes in this section require authentication and the `admin` role.

---

### `GET /api/v1/admin/materials`

- **Access:** Admin only

Returns all materials including inactive ones. Useful for material management and inventory tracking.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "All materials retrieved successfully.",
  "data": {
    "results": 6,
    "materials": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "type": "PLA",
        "name": "PLA Filament",
        "pricePerGram": 0.025,
        "color": "White",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "type": "ABS",
        "name": "ABS Filament",
        "pricePerGram": 0.030,
        "color": "Black",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "type": "PETG",
        "name": "PETG Filament (Discontinued)",
        "pricePerGram": 0.028,
        "color": "Orange",
        "isActive": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-03-01T14:20:00.000Z"
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

### `POST /api/v1/admin/materials`

- **Access:** Admin only

Creates a new material in the system. The material type is automatically converted to uppercase for consistency.

**Request Body (JSON)**

- **`name`** (*string*, Required)
  - *Validation:* Non-empty string, trimmed
  - *Description:* Display name for the material (e.g., "PLA Filament", "Premium ABS")

- **`type`** (*string*, Required)
  - *Validation:* Must be one of: `"PLA"`, `"ABS"`, `"Resin"`, `"TPU"`, `"PETG"`
  - *Description:* Material type identifier (automatically converted to uppercase)

- **`currentPricePerGram`** (*number*, Required)
  - *Validation:* Must be >= 0
  - *Description:* Current price per gram in the system's currency

- **`color`** (*string*, Optional)
  - *Validation:* String, trimmed
  - *Description:* Color name for UI display (e.g., "White", "Black", "Red", "Blue")

- **`isActive`** (*boolean*, Optional)
  - *Validation:* Boolean
  - *Description:* Whether the material is available for use
  - *Default:* `true`

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Material created successfully.",
  "data": {
    "material": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "type": "TPU",
      "name": "TPU Flexible Filament",
      "pricePerGram": 0.035,
      "color": "Pink",
      "isActive": true
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
      { "field": "type", "message": "Material type must be one of: PLA, ABS, Resin, TPU, PETG" }
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

### `PATCH /api/v1/admin/materials/:id`

- **Access:** Admin only

Updates an existing material. All fields are optional; only provided fields are updated. The material type cannot be changed after creation.

**Path Parameters**

- **`:id`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Description:* The ID of the material to update

**Request Body (JSON)**

- **`name`** (*string*, Optional)
  - *Validation:* Non-empty string, trimmed
  - *Description:* Updated display name for the material

- **`currentPricePerGram`** (*number*, Optional)
  - *Validation:* Must be >= 0
  - *Description:* Updated price per gram

- **`color`** (*string*, Optional)
  - *Validation:* String, trimmed
  - *Description:* Updated color name

- **`isActive`** (*boolean*, Optional)
  - *Validation:* Boolean
  - *Description:* Updated active status

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Material updated successfully.",
  "data": {
    "material": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "type": "PLA",
      "name": "Premium PLA Filament",
      "pricePerGram": 0.030,
      "color": "White",
      "isActive": true
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
      { "field": "id", "message": "Invalid material ID" }
    ]
  }
}
```

**Response 404 — Not Found**
```json
{
  "success": false,
  "message": "Material not found"
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

### `DELETE /api/v1/admin/materials/:id`

- **Access:** Admin only

Permanently deletes a material from the system. Use with caution as this operation cannot be undone. Consider setting `isActive: false` instead for soft deletion.

**Path Parameters**

- **`:id`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Description:* The ID of the material to delete

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Material deleted successfully."
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "id", "message": "Invalid material ID" }
    ]
  }
}
```

**Response 404 — Not Found**
```json
{
  "success": false,
  "message": "Material not found"
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

## Data Model

### Material

Represents a 3D printing material with pricing and availability information.

**Fields:**

- **`_id`** — MongoDB ObjectId (used as `id` in all responses)
- **`name`** — String (display name, e.g., "PLA Filament")
- **`type`** — Enum: `"PLA"` | `"ABS"` | `"Resin"` | `"TPU"` | `"PETG"` (stored in uppercase)
- **`currentPricePerGram`** — Number (price per gram, must be >= 0)
- **`color`** — Optional string (color name for UI display, e.g., "White", "Black", "Red")
- **`isActive`** — Boolean (whether material is available for use, default: `true`)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

**Indexes:**
- Single index on `isActive` for efficient filtering of active materials
- Unique index on `name` to prevent duplicate material names

---

## Integration with Other Modules

### Slicing Module
The slicing module uses the materials module to:
- Validate material selection before creating slicing jobs
- Calculate pricing based on material cost per gram
- Display available materials to users

### Pricing Calculation
Material pricing is used in the slicing workflow:
```
Material Cost = weight (grams) × material.currentPricePerGram
Total Price = Material Cost + (printTime / 60 × PRINTING_HOURLY_RATE)
```

**Example:**
- Weight: 45.5g
- Material: PLA at $0.025/g
- Print time: 180 minutes
- Hourly rate: $10

Calculation:
- Material cost: 45.5 × 0.025 = $1.14
- Time cost: (180 / 60) × 10 = $30.00
- **Total: $31.14**

---

## Example Usage

```bash
# Get available materials (public endpoint)
GET /api/v1/materials
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "message": "Available materials retrieved successfully.",
  "data": {
    "materials": [
      { "type": "PLA", "name": "PLA Filament", "pricePerGram": 0.025, "color": "White" },
      { "type": "ABS", "name": "ABS Filament", "pricePerGram": 0.030, "color": "Black" }
    ]
  }
}

# Admin: Get all materials (including inactive)
GET /api/v1/admin/materials
Authorization: Bearer <admin-token>

# Admin: Create new material
POST /api/v1/admin/materials
Authorization: Bearer <admin-token>

{
  "name": "Premium TPU Flexible",
  "type": "TPU",
  "currentPricePerGram": 0.040,
  "color": "Pink",
  "isActive": true
}

# Admin: Update material price
PATCH /api/v1/admin/materials/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <admin-token>

{
  "currentPricePerGram": 0.028
}

# Admin: Deactivate material (soft delete)
PATCH /api/v1/admin/materials/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <admin-token>

{
  "isActive": false
}

# Admin: Permanently delete material
DELETE /api/v1/admin/materials/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <admin-token>
```

---

## Best Practices

1. **Soft Delete First**: Use `isActive: false` instead of deleting materials that are referenced in historical slicing jobs
2. **Price Updates**: Update `currentPricePerGram` carefully as it affects all new slicing job calculations
3. **Material Types**: Stick to the predefined material types (PLA, ABS, PETG, TPU, Resin) for consistency
4. **Color Names**: Use standard color names (e.g., "White", "Black", "Red", "Blue") for proper UI rendering
5. **Validation**: Always validate material availability before creating slicing jobs
