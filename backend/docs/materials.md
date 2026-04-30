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
- Material validation for slicing operations (type + color combination)
- Admin CRUD operations for materials
- Color names for material identification
- Price per gram tracking for cost calculations
- Unique constraint on material type + color combination

**Workflow:**
```
Admin Creates Material (POST /admin/materials)
  ↓
Material Available for Slicing (unique type + color)
  ↓
Users Query Available Materials (GET /materials)
  ↓
Users Select Material Type AND Color for Slicing Job
  ↓
System Validates Material (type + color) and Calculates Price
```

**Material Types:**
- **PLA** - Polylactic Acid (most common, easy to print)
- **ABS** - Acrylonitrile Butadiene Styrene (strong, heat-resistant)
- **PETG** - Polyethylene Terephthalate Glycol (durable, flexible)
- **TPU** - Thermoplastic Polyurethane (flexible, rubber-like)
- **Resin** - Photopolymer resin (high detail, smooth finish)

**Important:** Each material is uniquely identified by its **type + color** combination. You cannot have two materials with the same type and color (e.g., two "PLA White" materials).

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
  - *Description:* Descriptive display name for the material (e.g., "PLA White Filament", "Premium ABS Black")

- **`type`** (*string*, Required)
  - *Validation:* Must be one of: `"PLA"`, `"ABS"`, `"Resin"`, `"TPU"`, `"PETG"`
  - *Description:* Material type identifier (automatically converted to uppercase)

- **`color`** (*string*, Required)
  - *Validation:* Non-empty string, trimmed
  - *Description:* Color name (e.g., "White", "Black", "Red", "Blue", "Gold", "Transparent")
  - *Note:* The combination of `type` + `color` must be unique

- **`currentPricePerGram`** (*number*, Required)
  - *Validation:* Must be >= 0
  - *Description:* Current price per gram in the system's currency

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
      "name": "TPU Pink Flexible",
      "color": "Pink",
      "pricePerGram": 0.035,
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
      { "field": "type", "message": "Material type must be one of: PLA, ABS, Resin, TPU, PETG" },
      { "field": "color", "message": "color is required" }
    ]
  }
}
```

**Response 400 — Duplicate Material**
```json
{
  "success": false,
  "message": "Material with type 'PLA' and color 'White' already exists"
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
- **`name`** — String (descriptive display name, e.g., "PLA White Filament", "Premium ABS Black")
- **`type`** — Enum: `"PLA"` | `"ABS"` | `"Resin"` | `"TPU"` | `"PETG"` (stored in uppercase)
- **`color`** — String (required, color name e.g., "White", "Black", "Red", "Gold", "Transparent")
- **`currentPricePerGram`** — Number (price per gram, must be >= 0)
- **`isActive`** — Boolean (whether material is available for use, default: `true`)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

**Indexes:**
- Single index on `isActive` for efficient filtering of active materials
- Single index on `type` for efficient material type queries
- Single index on `color` for efficient color queries
- **Compound unique index on `type + color`** to prevent duplicate material combinations

**Unique Constraint:**
The combination of `type` and `color` must be unique. You cannot create two materials with the same type and color (e.g., two "PLA White" materials).

---

## Integration with Other Modules

### Slicing Module
The slicing module uses the materials module to:
- Validate material type AND color selection before creating slicing jobs
- Calculate pricing based on material cost per gram
- Display available materials to users
- Match slicing jobs by material type and color combination

**Required Parameters for Slicing:**
- `material`: Material type (e.g., "PLA", "ABS")
- `color`: Color name (e.g., "White", "Black", "Gold")

Both parameters are required and must match an active material in the database.

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
  "name": "TPU Pink Flexible",
  "type": "TPU",
  "color": "Pink",
  "currentPricePerGram": 0.040,
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

1. **Unique Type + Color**: Each material must have a unique combination of type and color. You cannot create duplicate combinations.
2. **Color Names**: Use standard color names (e.g., "White", "Black", "Red", "Blue", "Gold", "Silver", "Transparent") for consistency
3. **Soft Delete First**: Use `isActive: false` instead of deleting materials that are referenced in historical slicing jobs
4. **Price Updates**: Update `currentPricePerGram` carefully as it affects all new slicing job calculations
5. **Material Types**: Stick to the predefined material types (PLA, ABS, PETG, TPU, Resin) for consistency
6. **Descriptive Names**: Use descriptive names that include both type and color (e.g., "PLA White Filament", "ABS Black Premium")
7. **Validation**: Always validate material type AND color availability before creating slicing jobs
8. **Seeding**: Use the seed script (`npm run seed:materials`) to populate the database with standard materials
