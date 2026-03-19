# Etbaly REST API Documentation

## Table of Contents

1. [Standard API Response Format](#standard-api-response-format)
2. [Authentication API (`/api/v1/auth`)](#authentication-api)
3. [User API (`/api/v1/users`)](#user-api)
4. [Catalog API (`/api/v1/catalog`)](#catalog-api)
5. [Admin API (`/api/v1/admin`)](#admin-api)
6. [Cart API (`/api/v1/cart`)](#cart-api)
7. [Manufacturing API (`/api/v1/manufacturing`)](#manufacturing-api)
8. [Designs API (`/api/v1/designs`)](#designs-api)

---

## Standard API Response Format

All successful responses follow this envelope structure:

```json
{
  "success": true,
  "message": "Status or success message",
  "data": { /* Response payload */ }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [ /* Optional validation details */ ]
}
```

---

## Authentication API

Base URL: `/api/v1/auth`

### 1. Register

- **POST** `/register`
- **Body:** `firstName`, `lastName`, `email`, `password`, `phoneNumber` (optional)
- **Response:** `201` — Sends OTP to email.

### 2. Verify OTP

- **POST** `/verify-otp`
- **Body:** `email`, `otp` (6 digits)
- **Response:** `200` — `{ user, accessToken, refreshToken }`

### 3. Login

- **POST** `/login`
- **Body:** `email`, `password`
- **Response:** `200` — `{ user, accessToken, refreshToken }`

### 4. Forgot Password

- **POST** `/forgot-password`
- **Body:** `email`
- **Response:** `200`

### 5. Reset Password

- **POST** `/reset-password`
- **Body:** `email`, `otp`, `newPassword`
- **Response:** `200`

### 6. Refresh Token

- **POST** `/refresh-token`
- **Body:** `refreshToken`
- **Response:** `200` — `{ accessToken, refreshToken }`

### 7. Logout

- **POST** `/logout`
- **Body:** `refreshToken` (optional)
- **Response:** `200`

### 8. Google OAuth

- **POST** `/google`
- **Body:** `idToken`
- **Response:** `200` — `{ user, accessToken, refreshToken }`

---

## User API

Base URL: `/api/v1/users`

**Auth:** Bearer token required on all endpoints.

### 1. Get Profile

- **GET** `/me`
- **Response:** `200` — `{ user }`

### 2. Update Profile

- **PATCH** `/me`
- **Body (all optional):** `firstName`, `lastName`, `phoneNumber`, `bio`
- **Response:** `200` — `{ user }`

### 3. Change Password

- **PATCH** `/me/password`
- **Body:** `currentPassword`, `newPassword`
- **Response:** `200`

### 4. Upload Avatar

- **PATCH** `/me/avatar`
- **Content-Type:** `multipart/form-data`
- **Body:** `avatar` (file, image, max 2MB)
- **Response:** `200` — `{ avatarUrl }`
- **Notes:** File is tracked in the Upload collection. Marked as used once saved to the user profile. Old avatar is deleted from Drive automatically.

---

## Catalog API

Base URL: `/api/v1/catalog`

**Auth:** Public.

### 1. Get All Active Products

- **GET** `/products`
- **Query Params:** `page`, `limit`, `sort`, `search`, `fields`
- **Response:** `200` — `{ total, results, products }`

### 2. Get Single Product

- **GET** `/products/:id`
- **Response:** `200` — `{ product }` | `404` if not found or inactive

---

## Admin API

Base URL: `/api/v1/admin`

**Auth:** Bearer token required. User must have `admin` role.

### Users Management

#### Get All Users
- **GET** `/users`
- **Response:** `200` — `{ results, users }`

#### Update User Role
- **PATCH** `/users/:id/role`
- **Body:** `role` — `"client" | "admin" | "operator"`
- **Response:** `200` — `{ user }`

#### Delete User
- **DELETE** `/users/:id`
- **Response:** `200`

---

### Products Management

#### Get All Products
- **GET** `/products`
- **Response:** `200` — `{ results, products }`

#### Get Single Product
- **GET** `/products/:id`
- **Response:** `200` — `{ product }`

#### Upload Product Image

Uploads an image to Google Drive and returns the URL. Use this URL in the `images` array when creating or updating a product. Unattached images are automatically cleaned up after 24h by the GC cron job.

- **POST** `/products/upload-image`
- **Content-Type:** `multipart/form-data`
- **Body:** `image` (file, max 10MB)
- **Response:** `200` — `{ imageUrl }`

```json
{
  "success": true,
  "message": "Product image uploaded successfully.",
  "data": { "imageUrl": "https://drive.google.com/uc?export=view&id=..." }
}
```

#### Create Product
- **POST** `/products`
- **Body:**
  - `name` (string, required)
  - `description` (string, optional)
  - `images` (string[], optional): Array of URLs from the upload endpoint
  - `currentBasePrice` (number, required): >= 0
  - `isActive` (boolean, optional, default: `true`)
  - `stockLevel` (number, optional, default: `0`)
  - `linkedDesignId` (ObjectId, required)
- **Response:** `201` — `{ product }`
- **Notes:** Provided `images` URLs are marked as `is_used: true` in the Upload collection.

#### Update Product
- **PATCH** `/products/:id`
- **Body:** Any subset of Create fields
- **Response:** `200` — `{ product }`
- **Notes:** Newly provided `images` URLs are marked as `is_used: true`.

#### Delete Product
- **DELETE** `/products/:id`
- **Response:** `200`

---

## Cart API

Base URL: `/api/v1/cart`

**Auth:** Bearer token required on all endpoints.

The cart is a persistent staging area. Each user has at most one cart. Abandoned carts are purged after 30 days via a MongoDB TTL index.

### 1. Get Cart
- **GET** `/`
- **Response:** `200` — `{ cart }`

### 2. Add Item
- **POST** `/items`
- **Body:**
  - `itemType` (string, required): `"Product"` or `"Design"`
  - `itemRefId` (ObjectId, required)
  - `quantity` (integer, required, min 1)
  - `materialId` (ObjectId, required if `itemType === "Design"`)
  - `customization` (object, optional): `color`, `infillPercentage`, `layerHeight`, `scale`, `customFields`
- **Response:** `200` — `{ cart }`
- **Errors:** `400` missing materialId for Design, `404` item/material not found

### 3. Update Item Quantity
- **PATCH** `/items/:id`
- **Body:** `quantity` (integer, min 1)
- **Response:** `200` — `{ cart }`

### 4. Remove Item
- **DELETE** `/items/:id`
- **Response:** `200` — `{ cart }`

### 5. Clear Cart
- **DELETE** `/`
- **Response:** `200`

### 6. Checkout

Converts cart into an Order and deletes the cart. Unit prices are locked at checkout time.

- **POST** `/checkout`
- **Body:**
  - `shippingAddressId` (ObjectId, required): Must exist in `user.savedAddresses`
  - `paymentMethod` (string, required): `"Card" | "Wallet" | "COD"`
- **Response:** `201` — `{ order }`
- **Errors:** `400` empty cart, `404` address not found

---

## Manufacturing API

Base URL: `/api/v1/manufacturing`

**Auth:** Bearer token required.

### Execute Job
- **POST** `/execute`
- **Body:**
  - `jobId` (string, required)
  - `action` (string, required): `"start_slicing" | "start_printing"`
- **Response:** `200`
- **Notes:** `start_slicing` → `slicing-tasks` queue; `start_printing` → `3d-printing-tasks` queue.

---

## Designs API

Base URL: `/api/v1/designs`

**Auth:** Bearer token required on all endpoints.

Write operations (upload, create, update, delete) are restricted to `admin` role. GET endpoints are accessible to all authenticated users — clients see only their own designs, admins see all.

The intended flow: **upload file first** → get `fileUrl` → use it in create/update. Uploaded files are tracked in the Upload collection and marked as used once attached to a design. Orphaned uploads are cleaned up after 24h.

### 1. Upload Design File *(admin only)*
- **POST** `/upload`
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (3D model, max 50MB)
- **Response:** `200` — `{ fileUrl }`
- **Errors:** `400` no file, `500` Drive failure

### 2. Create Design *(admin only)*
- **POST** `/`
- **Body:**
  - `name` (string, required)
  - `fileUrl` (string, required): URL from upload endpoint
  - `metadata.volumeCm3` (number, required)
  - `metadata.dimensions.x/y/z` (number, required)
  - `metadata.estimatedPrintTime` (number, required)
  - `metadata.supportedMaterials` (array, required): `["PLA","ABS","Resin","TPU","PETG"]`
  - `isPrintable` (boolean, optional, default: `false`)
- **Response:** `201` — `{ design }`

### 3. Get All Designs
- **GET** `/`
- **Response:** `200` — `{ designs }` (clients see own; admins see all)

### 4. Get Design by ID
- **GET** `/:id`
- **Response:** `200` — `{ design }`
- **Errors:** `400` invalid id, `403` not owner, `404` not found

### 5. Update Design *(admin only)*
- **PATCH** `/:id`
- **Body (all optional):** `name`, `fileUrl`, `metadata.*`, `isPrintable`
- **Notes:** Providing a new `fileUrl` deletes the old Drive file automatically.
- **Response:** `200` — `{ design }`
- **Errors:** `400`, `403`, `404`

### 6. Delete Design *(admin only)*
- **DELETE** `/:id`
- **Response:** `200`
- **Errors:** `400`, `403`, `404`
