[← Back to Main API Docs](./README.md)

# Module: Products

Base path: `/api/v1/products` (Public) and `/api/v1/admin/products` (Admin)

Public routes are accessible without authentication. Admin routes require admin role.

---

## Overview

The products module manages the product catalog including pre-designed 3D printable items. Products can be browsed publicly and managed by admins.

**Key Features:**
- Public product catalog with pagination and filtering
- Product search by name and price range
- Product customization options (material, color, scale)
- Admin product management (CRUD operations)
- Image upload and management
- Active/inactive product status

**Workflow:**
```
1. Admin creates product with details and images
2. Product appears in public catalog
3. Users browse and filter products
4. Users add products to cart with customizations
5. Admin can update or deactivate products
```

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
        "name": "Custom Keychain",
        "description": "Personalized keychain with your name",
        "images": ["https://drive.google.com/uc?id=..."],
        "currentBasePrice": 29.99,
        "isCustomizable": true,
        "customFields": [
          {
            "fieldName": "customerName",
            "fieldType": "text",
            "isRequired": true,
            "label": "Your Name",
            "placeholder": "Enter your name"
          },
          {
            "fieldName": "message",
            "fieldType": "text",
            "isRequired": false,
            "label": "Custom Message",
            "placeholder": "Optional message"
          }
        ],
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
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
      "name": "Custom Keychain",
      "description": "Personalized keychain with your name",
      "images": ["https://drive.google.com/uc?id=..."],
      "currentBasePrice": 29.99,
      "isCustomizable": true,
      "customFields": [
        {
          "fieldName": "customerName",
          "fieldType": "text",
          "isRequired": true,
          "label": "Your Name",
          "placeholder": "Enter your name"
        },
        {
          "fieldName": "message",
          "fieldType": "text",
          "isRequired": false,
          "label": "Custom Message",
          "placeholder": "Optional message"
        }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
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
  - *Validation:* Each element must be a valid URL previously uploaded via `POST /api/v1/admin/products/upload-image`
  - *Description:* Array of image URLs for the product

- **`isActive`** (*boolean*, Optional)
  - *Description:* Whether the product is publicly visible (default: `true`)

- **`stockLevel`** (*number*, Optional)
  - *Validation:* Min 0
  - *Description:* Current stock quantity (default: `0`)

- **`isCustomizable`** (*boolean*, Optional)
  - *Description:* Whether the product allows customization (default: `false`)

- **`customFields`** (*array*, Optional)
  - *Description:* Array of custom field definitions that users must fill when adding to cart. **Required when `isCustomizable` is `true`**
  - Each field object contains:
    - **`fieldName`** (*string*, Required) — Unique identifier for the field (e.g., "customerName")
    - **`fieldType`** (*string*, Required) — Field type: `"text"`, `"number"`, or `"date"`
    - **`isRequired`** (*boolean*, Required) — Whether this field must be filled by the user
    - **`label`** (*string*, Required) — Display label shown to the user (e.g., "Your Name")
    - **`placeholder`** (*string*, Optional) — Placeholder text for the input field

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "product": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Custom Keychain",
      "currentBasePrice": 29.99,
      "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "isActive": true,
      "stockLevel": 0,
      "isCustomizable": true,
      "customFields": [
        {
          "fieldName": "customerName",
          "fieldType": "text",
          "isRequired": true,
          "label": "Your Name",
          "placeholder": "Enter your name"
        }
      ]
    }
  }
}
```

**Example Request Body for Customizable Product:**
```json
{
  "name": "Custom Keychain",
  "description": "Personalized keychain with your name engraved",
  "currentBasePrice": 29.99,
  "linkedDesignId": "64f1a2b3c4d5e6f7a8b9c0d3",
  "isCustomizable": true,
  "customFields": [
    {
      "fieldName": "customerName",
      "fieldType": "text",
      "isRequired": true,
      "label": "Your Name",
      "placeholder": "Enter your name (max 20 characters)"
    },
    {
      "fieldName": "birthDate",
      "fieldType": "date",
      "isRequired": false,
      "label": "Birth Date",
      "placeholder": "Optional birth date"
    }
  ]
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

**Response 400 — Untracked Image**
```json
{
  "success": false,
  "message": "Image URL was not uploaded to our storage: <url>"
}
```

**Response 400 — Customization Validation Error**
```json
{
  "success": false,
  "message": "Products marked as customizable must have at least one custom field defined"
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
    "fileId": "1a2b3c4d5e6f7g8h9i0j",
    "fileUrl": "https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j"
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
  - *Validation:* Each must be a valid URL previously uploaded via `POST /api/v1/admin/products/upload-image`

- **`isActive`** (*boolean*, Optional)

- **`stockLevel`** (*number*, Optional)
  - *Validation:* Min 0

- **`isCustomizable`** (*boolean*, Optional)
  - *Description:* Whether the product allows customization

- **`customFields`** (*array*, Optional)
  - *Description:* Array of custom field definitions. **Required when `isCustomizable` is `true`**
  - Each field object contains:
    - **`fieldName`** (*string*, Required) — Unique identifier for the field
    - **`fieldType`** (*string*, Required) — Field type: `"text"`, `"number"`, or `"date"`
    - **`isRequired`** (*boolean*, Required) — Whether this field must be filled
    - **`label`** (*string*, Required) — Display label for the user
    - **`placeholder`** (*string*, Optional) — Placeholder text

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
