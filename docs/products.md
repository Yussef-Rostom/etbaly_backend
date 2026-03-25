[← Back to Main API Docs](./README.md)

# Module: Products

---

## Public Endpoints

Base path: `/api/v1/products`

No authentication required.

---

### `GET /api/v1/products`

- **Access:** Public

Returns a paginated list of all active products. Supports filtering, sorting, and field selection.

**Query Parameters**

- **`page`** (*number*, Optional) — Page number (default: 1)
- **`limit`** (*number*, Optional) — Results per page
- **`sort`** (*string*, Optional) — Sort field (e.g. `currentBasePrice`, `-createdAt`)
- **`fields`** (*string*, Optional) — Comma-separated field projection
- **`name`** (*string*, Optional) — Filter by product name (supports text search)
- **`currentBasePrice[gte]`** (*number*, Optional) — Minimum price filter
- **`currentBasePrice[lte]`** (*number*, Optional) — Maximum price filter

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
        "name": "Vase Model",
        "description": "A decorative vase",
        "images": ["https://drive.google.com/uc?id=..."],
        "currentBasePrice": 29.99,
        "isActive": true,
        "stockLevel": 100,
        "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### `GET /api/v1/products/:id`

- **Access:** Public

Returns a single active product by its ID.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the product

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": {
    "product": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Vase Model",
      "description": "A decorative vase",
      "images": ["https://drive.google.com/uc?id=..."],
      "currentBasePrice": 29.99,
      "isActive": true,
      "stockLevel": 100,
      "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Product not found or not currently active." }
```

Base path: `/api/v1/admin/products`

All routes in this section require authentication and the `admin` role.

---

### `GET /api/v1/admin/products`

- **Access:** Admin only

Returns all products including inactive ones. Supports filtering, sorting, and pagination.

**Query Parameters**

- **`page`** (*number*, Optional) — Page number (default: 1)
- **`limit`** (*number*, Optional) — Results per page
- **`sort`** (*string*, Optional) — Sort field (e.g. `currentBasePrice`, `-createdAt`)
- **`fields`** (*string*, Optional) — Comma-separated field projection
- Any model field can be used as a filter (e.g. `isActive=false`)

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
        "currentBasePrice": 29.99,
        "isActive": false,
        "stockLevel": 0,
        "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3"
      }
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

### `POST /api/v1/admin/products`

- **Access:** Admin only

Creates a new product.

**Request Body (JSON)**

- **`name`** (*string*, Required)
  - *Validation:* Min 1 char, trimmed
  - *Description:* Product display name

- **`currentBasePrice`** (*number*, Required)
  - *Validation:* Min 0
  - *Description:* Base price in the system currency

- **`linkedDesignId`** (*string*, Required)
  - *Validation:* Must be a valid MongoDB ObjectId
  - *Description:* The ID of the Design document this product is based on

- **`description`** (*string*, Optional)
  - *Validation:* Trimmed
  - *Description:* Product description text

- **`images`** (*array of strings*, Optional)
  - *Validation:* Each element must be a valid URL
  - *Description:* Array of image URLs for the product

- **`isActive`** (*boolean*, Optional)
  - *Description:* Whether the product is publicly visible (default: `true`)

- **`stockLevel`** (*number*, Optional)
  - *Validation:* Min 0
  - *Description:* Current stock quantity (default: `0`)

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "product": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Vase Model",
      "currentBasePrice": 29.99,
      "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "isActive": true,
      "stockLevel": 0
    }
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "linkedDesignId", "message": "Invalid ObjectId format" }] }
}
```

**Response 400 — Design Not Printable**
```json
{
  "success": false,
  "message": "Linked Design is not printable."
}
```

**Response 404 — Linked Design Not Found**
```json
{ "success": false, "message": "Linked Design not found." }
```

---

### `POST /api/v1/admin/products/upload-image`

- **Access:** Admin only
- **Content-Type:** `multipart/form-data`

Uploads a product image to Google Drive and returns the public URL. Use the returned URL in the `images` array when creating or updating a product.

**Form Fields**

- **`image`** (*file*, Required)
  - *Validation:* Max file size 10 MB
  - *Description:* The image file to upload

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product image uploaded successfully.",
  "data": {
    "imageUrl": "https://drive.google.com/uc?id=..."
  }
}
```

**Response 400 — No File**
```json
{ "success": false, "message": "Image file is required." }
```

---

### `GET /api/v1/admin/products/:id`

- **Access:** Admin only

Returns a single product by ID regardless of its `isActive` status.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the product

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": { "product": { "...": "full product object" } }
}
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Product not found." }
```

---

### `PATCH /api/v1/admin/products/:id`

- **Access:** Admin only

Partially updates a product. All fields are optional.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the product

**Request Body (JSON)** — All fields optional

- **`name`** (*string*, Optional)
  - *Validation:* Min 1 char, trimmed

- **`currentBasePrice`** (*number*, Optional)
  - *Validation:* Min 0

- **`linkedDesignId`** (*string*, Optional)
  - *Validation:* Valid MongoDB ObjectId

- **`description`** (*string*, Optional)
  - *Validation:* Trimmed

- **`images`** (*array of strings*, Optional)
  - *Validation:* Each must be a valid URL

- **`isActive`** (*boolean*, Optional)

- **`stockLevel`** (*number*, Optional)
  - *Validation:* Min 0

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product updated successfully.",
  "data": { "product": { "...": "updated product object" } }
}
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Product not found." }
```

---

### `DELETE /api/v1/admin/products/:id`

- **Access:** Admin only

Permanently deletes a product.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the product

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Product deleted successfully."
}
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Product not found." }
```
