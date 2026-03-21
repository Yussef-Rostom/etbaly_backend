# Etbaly REST API Documentation

> Base URL: `https://etbaly-backend.vercel.app/api/v1`
> All protected routes require `Authorization: Bearer <token>` header.
> All responses follow a standard JSON format (see [Standard Response Format](#standard-response-format)).

## Table of Contents

1. [Standard Response Format](#standard-response-format)
2. [Query Parameters & Filtering](#query-parameters--filtering)
3. [Auth Module](#auth-module)
4. [User Module](#user-module)
5. [Product Module](#product-module)
6. [Cart Module](#cart-module)
7. [Manufacturing Module](#manufacturing-module)
8. [Design Module](#design-module)

---

## Standard Response Format

Success:
```json
{ "success": true, "message": "...", "data": {} }
```
`data` is omitted when there is no payload (e.g. delete operations).

Validation error (`400`):
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [{ "field": "email", "message": "Invalid email" }]
  }
}
```

Other errors:
```json
{ "success": false, "message": "Human-readable error description" }
```

Authorization error (`403`):
```json
{ "success": false, "message": "Forbidden: You do not own this resource." }
```

---

## Query Parameters & Filtering

Most GET endpoints support the following query parameters:

### Pagination
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10): Items per page

### Sorting
- `sort` (string): Comma-separated fields. Prefix with `-` for descending order.
  - Example: `sort=name` (ascending), `sort=-createdAt` (descending), `sort=price,-createdAt`

### Field Selection
- `fields` (string): Comma-separated fields to include in response.
  - Example: `fields=name,price,description`

### Search
- `search` (string): Full-text search across specified fields (case-insensitive).
  - Example: `search=laptop`

### Range Filtering
Use MongoDB comparison operators for numeric/date fields:
- `[gte]` — Greater than or equal (≥)
- `[gt]` — Greater than (>)
- `[lte]` — Less than or equal (≤)
- `[lt]` — Less than (<)

**Examples:**
```
GET /api/v1/products?currentBasePrice[gte]=50&currentBasePrice[lte]=200
GET /api/v1/products?stockLevel[gt]=0
GET /api/v1/users/admin?createdAt[gte]=2024-01-01
```

### Field Filtering
Filter by exact field values:
```
GET /api/v1/products?isActive=true
GET /api/v1/users/admin?role=client
```

---

## Auth Module

Base URL: `/api/v1/auth` — Public.

### POST `/register`
- **Body:** `firstName`, `lastName`, `email`, `password`, `phoneNumber?`
- **Response:** `201` — sends OTP to email.
```json
{ "user": { "_id", "email", "role", "profile": { "firstName", "lastName" } } }
```

### POST `/verify-otp`
- **Body:** `email`, `otp` (6 digits)
- **Response:** `200`
```json
{ "user": { "_id", "email", "role", "profile" }, "accessToken", "refreshToken" }
```

### POST `/login`
- **Body:** `email`, `password`
- **Response:** `200`
```json
{ "user": { "_id", "email", "role", "profile" }, "accessToken", "refreshToken" }
```

### POST `/google`
- **Body:** `idToken`
- **Response:** `200`
```json
{ "user": { "_id", "email", "role", "profile" }, "accessToken", "refreshToken" }
```

### POST `/forgot-password`
- **Body:** `email`
- **Response:** `200` — always returns success to prevent email enumeration.

### POST `/reset-password`
- **Body:** `email`, `otp`, `newPassword`
- **Response:** `200`

### POST `/refresh-token`
- **Body:** `refreshToken`
- **Response:** `200`
```json
{ "accessToken", "refreshToken" }
```
- **Notes:** Implements rotation. Old token is invalidated. Reuse detected → all sessions revoked.

### POST `/logout`
- **Body:** `refreshToken?`
- **Response:** `200`

---

## User Module

Base URL: `/api/v1/users` — Auth required.

### GET `/me`
- **Response:** `200`
```json
{
  "user": {
    "_id", "email", "role", "isVerified",
    "profile": { "firstName", "lastName", "phoneNumber", "bio", "avatarUrl" },
    "savedAddresses": [{ "street", "city", "country", "zip" }],
    "createdAt", "updatedAt"
  }
}
```

### PATCH `/me`
- **Body (all optional):** `firstName`, `lastName`, `phoneNumber`, `avatarUrl`, `savedAddresses[]`
- **Response:** `200` — same shape as GET `/me`

### PATCH `/me/password`
- **Body:** `currentPassword`, `newPassword`
- **Response:** `200`

### PATCH `/me/avatar`
- **Content-Type:** `multipart/form-data` — field: `avatar` (max 2MB)
- **Response:** `200`
```json
{ "avatarUrl": "https://drive.google.com/uc?export=view&id=..." }
```
- **Notes:** Old avatar deleted from Drive automatically.

---

### Admin — User Management

Base URL: `/api/v1/admin/users` — Role: `admin`.

### GET `/`
- **Query Params:** `page`, `limit`, `sort`, `search` (searches `email`, `profile.firstName`, `profile.lastName`), field filters
- **Response:** `200`
```json
{ "results": 2, "users": [{ "_id", "email", "role", "profile", "savedAddresses", "isVerified", "createdAt" }] }
```

### PATCH `/:id/role`
- **Body:** `role` — `"client" | "admin" | "operator"`
- **Response:** `200`
```json
{ "user": { "_id", "email", "role", "profile", "isVerified" } }
```
- **Notes:** Invalidates all refresh tokens for the user.

### DELETE `/:id`
- **Response:** `200`

---

## Product Module

Base URL: `/api/v1/products`

### GET `/` — Public
- **Query Params:** `page`, `limit`, `sort`, `search`, `fields`
- **Response:** `200`
```json
{ "total": 50, "results": 10, "products": [{ "_id", "name", "description", "images", "currentBasePrice", "isActive", "stockLevel", "linkedDesignId", "createdAt" }] }
```

### GET `/:id` — Public
- **Response:** `200` — single product object.
- **Errors:** `404` if not found or inactive.

---

### Admin — Product Management

Base URL: `/api/v1/admin/products` — Role: `admin`.

### GET `/`
- **Query Params:** `page`, `limit`, `sort`, `search` (searches `name`, `description`), field filters
- **Response:** `200` — all products including inactive. `linkedDesignId` populated with `{ _id, name, isPrintable, fileUrl }`.

### GET `/:id`
- **Response:** `200` — single product, `linkedDesignId` populated.

### POST `/upload-image`
- **Content-Type:** `multipart/form-data` — field: `image` (max 10MB)
- **Response:** `200`
```json
{ "imageUrl": "https://drive.google.com/uc?export=view&id=..." }
```
- **Notes:** Use the URL in the `images` array when creating/updating. Orphaned images auto-cleaned after 24h.

### POST `/`
- **Body:**
  - `name` (string, required)
  - `description` (string, optional)
  - `images` (string[], optional): URLs from the upload endpoint
  - `currentBasePrice` (number, required): >= 0
  - `isActive` (boolean, optional, default: `true`)
  - `stockLevel` (number, optional, default: `0`)
  - `linkedDesignId` (ObjectId, required)
- **Response:** `201` — created product object.
- **Notes:** Linked design must have `isPrintable: true`. Provided image URLs marked `isUsed: true`.

### PATCH `/:id`
- **Body:** Any subset of create fields.
- **Response:** `200` — updated product, `linkedDesignId` populated.

### DELETE `/:id`
- **Response:** `200`

---

## Cart Module

Base URL: `/api/v1/cart` — Auth required.

**Security:** All cart operations verify ownership. Users can only access and modify their own carts.

Cart shape:
```json
{
  "_id", "userId",
  "items": [{ "_id", "itemType", "itemRefId", "quantity", "unitPrice", "customization", "materialId" }],
  "pricingSummary": { "subtotal", "taxAmount", "shippingCost", "discountAmount", "total" },
  "expiresAt", "createdAt", "updatedAt"
}
```

### GET `/`
- **Response:** `200` — cart object. Returns empty cart if none exists.
- **Errors:** `403` if attempting to access another user's cart.

### POST `/items`
- **Body:**
  - `itemType` (required): `"Product" | "Design"`
  - `itemRefId` (ObjectId, required)
  - `quantity` (integer, required, min 1)
  - `materialId` (ObjectId, required if `itemType === "Design"`)
  - `customization?`: `{ color, infillPercentage, layerHeight, scale, customFields }`
- **Response:** `200` — updated cart.
- **Notes:** Same item+material+customization → quantity incremented. `unitPrice` resolved automatically.
- **Errors:** 
  - `400` missing materialId for Design
  - `403` attempting to modify another user's cart
  - `404` item/material not found or inactive

### PATCH `/items/:id`
- **Body:** `quantity` (integer, min 1)
- **Response:** `200` — updated cart.
- **Errors:** `403` if cart doesn't belong to user, `404` if cart or item not found.

### DELETE `/items/:id`
- **Response:** `200` — updated cart.
- **Errors:** `403` if cart doesn't belong to user, `404` if cart or item not found.

### DELETE `/`
- **Response:** `200`
- **Errors:** `403` if cart doesn't belong to user.

### POST `/checkout`
- **Body:**
  - `shippingAddressId` (ObjectId, required): must exist in `user.savedAddresses`
  - `paymentMethod` (required): `"Card" | "Wallet" | "COD"`
- **Response:** `201`
```json
{
  "order": {
    "_id", "orderNumber", "status": "Pending", "userId",
    "items": [{ "_id", "itemType", "itemRefId", "quantity", "price", "status": "Queued", "customization", "materialId" }],
    "shippingAddressSnapshot": { "street", "city", "country", "zip" },
    "paymentInfo": { "method", "status": "Pending", "amountPaid": 0 },
    "pricingSummary": { "subtotal", "taxAmount", "shippingCost", "discountAmount", "total" },
    "createdAt", "updatedAt"
  }
}
```
- **Notes:** 
  - Cart deleted after successful checkout
  - Prices are **validated and recalculated** at checkout time using current product/material prices
  - This prevents price manipulation attacks
  - Address is snapshotted to preserve shipping details
  - Batch queries optimize performance for carts with multiple items
- **Errors:** 
  - `400` empty cart
  - `403` cart doesn't belong to user
  - `404` address not found or items no longer available

---

## Manufacturing Module

Base URL: `/api/v1/admin/manufacturing` — Role: `admin` or `operator`.

### POST `/execute`
- **Body:**
  - `jobId` (string, required)
  - `action` (required): `"start_slicing" | "start_printing"`
- **Response:** `200`
- **Notes:** `start_slicing` → `slicing-tasks` queue. `start_printing` → `3d-printing-tasks` queue.

---

## Design Module

Base URL: `/api/v1/designs` — Auth required on all endpoints.

**Access Control:**
- Clients see only their own designs
- Admins see all designs
- Ownership is verified at the service layer for all operations

Flow: **upload file** → get `fileUrl` → use in create/update. Orphaned uploads cleaned after 24h.

Design shape:
```json
{
  "_id", "name", "isPrintable", "ownerId", "fileUrl",
  "metadata": { "volumeCm3", "dimensions": { "x", "y", "z" }, "estimatedPrintTime", "supportedMaterials" },
  "createdAt", "updatedAt"
}
```

### GET `/`
- **Response:** `200` — `{ designs: [...] }`
- **Notes:** Returns only designs owned by the authenticated user (unless admin).

### GET `/:id`
- **Response:** `200` — `{ design }`
- **Errors:** 
  - `400` invalid id
  - `403` not owner (unless admin)
  - `404` not found

---

### Admin — Design Management

Base URL: `/api/v1/admin/designs` — Role: `admin`.

**Security:** Admin operations verify role at both middleware and service layers.

### POST `/upload`
- **Content-Type:** `multipart/form-data` — field: `file` (max 50MB)
- **Response:** `200` — `{ fileUrl }`
- **Errors:** `400` no file, `500` Drive failure.

### POST `/`
- **Body:**
  - `name` (string, required)
  - `fileUrl` (string, required): URL from the upload endpoint
  - `metadata.volumeCm3` (number, required)
  - `metadata.dimensions` `{ x, y, z }` (numbers, required)
  - `metadata.estimatedPrintTime` (number, required)
  - `metadata.supportedMaterials` (array, required): `"PLA" | "ABS" | "Resin" | "TPU" | "PETG"`
  - `isPrintable` (boolean, optional, default: `false`)
- **Response:** `201` — `{ design }`
- **Notes:** Design is created with the authenticated admin as the owner.

### PATCH `/:id`
- **Body (all optional):** `name`, `fileUrl`, `isPrintable`, `metadata.*`
- **Response:** `200` — `{ design }`
- **Notes:** 
  - Admins can update any design
  - Non-admin users can only update designs they own
  - New `fileUrl` → old Drive file deleted automatically
- **Errors:** 
  - `400` invalid id
  - `403` not owner (unless admin)
  - `404` not found

### DELETE `/:id`
- **Response:** `200`
- **Notes:**
  - Admins can delete any design
  - Non-admin users can only delete designs they own
  - Associated Drive file is automatically deleted
- **Errors:** 
  - `400` invalid id
  - `403` not owner (unless admin)
  - `404` not found
