# Etbaly REST API Documentation

## Table of Contents

1. [Standard API Response Format](#standard-api-response-format)
2. [Authentication API (`/api/v1/auth`)](#authentication-api)
3. [User API (`/api/v1/users`)](#user-api)
4. [Catalog API (`/api/v1/catalog`)](#catalog-api)
5. [Admin API (`/api/v1/admin`)](#admin-api)

---

## Standard API Response Format

All successful responses follow this envelope structure provided by `apiResponse`:

```json
{
  "success": true,
  "message": "Status or success message",
  "data": {
    /* Response payload object or array */
  } // or null
}
```

Error responses utilize the `sendError` wrapper and align with standard HTTP status codes (e.g., `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`):

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    /* Optional list of validation details */
  ]
}
```

---

## Authentication API

Base URL: `/api/v1/auth`

### 1. Register a New User

Creates a new unverified user account and dispatches a 6-digit OTP to their email.

- **URL:** `/register`
- **Method:** `POST`
- **Request Body:**
  - `firstName` (string, required): 2-50 chars
  - `lastName` (string, required): 2-50 chars
  - `email` (string, required): Valid email
  - `password` (string, required): 6-128 chars, 1 letter, 1 number
  - `phoneNumber` (string, optional): Valid Egyptian number
- **Success Response:** `201 Created` (Returns `{ user }`).

### 2. Verify Account via OTP

Verifies the newly registered account. Validates the user and returns tokens.

- **URL:** `/verify-otp`
- **Method:** `POST`
- **Request Body:**
  - `email` (string, required)
  - `otp` (string, required): 6 digits
- **Success Response:** `200 OK` (Returns `{ user, accessToken, refreshToken }`).

### 3. Login

Authenticates a verified user.

- **URL:** `/login`
- **Method:** `POST`
- **Request Body:**
  - `email` (string, required)
  - `password` (string, required)
- **Success Response:** `200 OK` (Returns `{ user, accessToken, refreshToken }`).

### 4. Forgot Password

Initiates password reset, sends OTP (protects against enumeration).

- **URL:** `/forgot-password`
- **Method:** `POST`
- **Request Body:**
  - `email` (string, required)
- **Success Response:** `200 OK` (Returns `null` data).

### 5. Reset Password

Completes reset flow, invalidates all existing refresh tokens globally.

- **URL:** `/reset-password`
- **Method:** `POST`
- **Request Body:**
  - `email` (string, required)
  - `otp` (string, required): 6 digits
  - `newPassword` (string, required): Secure password
- **Success Response:** `200 OK` (Returns `null` data).

### 6. Refresh Token

Issues new access token and aggressively rotates refresh token for theft-detection.

- **URL:** `/refresh-token`
- **Method:** `POST`
- **Request Body:**
  - `refreshToken` (string, required)
- **Success Response:** `200 OK` (Returns `{ accessToken, refreshToken }`).

### 7. Logout

Invalidates a specific refresh token session.

- **URL:** `/logout`
- **Method:** `POST`
- **Request Body:**
  - `refreshToken` (string, optional)
- **Success Response:** `200 OK`

### 8. Google OAuth

Authenticates user natively via Google Google ID Token.

- **URL:** `/google`
- **Method:** `POST`
- **Request Body:**
  - `idToken` (string, required)
- **Success Response:** `200 OK` (Returns `{ user, accessToken, refreshToken }`).

---

## User API

Base URL: `/api/v1/users`

**Authentication:** All endpoints protected by `authMiddleware`. Uses Bearer token (`Authorization: Bearer <accessToken>`).

### 1. Get Current User Profile

Retrieves the logged-in user's profile and data.

- **URL:** `/me`
- **Method:** `GET`
- **Success Response:** `200 OK` (Returns `{ user }`).

### 2. Update Profile

Updates user profile information.

- **URL:** `/me`
- **Method:** `PATCH`
- **Request Body:**
  - `firstName` (string, optional)
  - `lastName` (string, optional)
  - `phoneNumber` (string, optional)
  - `bio` (string, optional)
- **Success Response:** `200 OK` (Returns `{ user: updatedUser }`).

### 3. Change Password

Changes the user's current password using their existing password for validation.

- **URL:** `/change-password`
- **Method:** `PATCH`
- **Request Body:**
  - `currentPassword` (string, required)
  - `newPassword` (string, required)
- **Success Response:** `200 OK`

### 4. Upload Avatar

Uploads a profile picture to Cloudinary and updates the user profile.

- **URL:** `/avatar`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body Form-Data:**
  - `avatar` (file, required): Image file (jpeg, jpg, png). Max 2MB.
- **Success Response:** `200 OK` (Returns `{ avatarUrl }`).

---

## Catalog API

Base URL: `/api/v1/catalog`

**Authentication:** Publicly accessible endpoints.

### 1. Get All Active Products

Retrieves a paginated list of catalog products. Supports filtering, sorting, and searching via query parameters powered by `APIFeatures`.

- **URL:** `/products`
- **Method:** `GET`
- **Query Parameters:**
  - `page` (number, default: 1): Pagination page indexing.
  - `limit` (number, default: 10): Items per page.
  - `sort` (string, default: `-createdAt`): Sort field (e.g., `-currentBasePrice`, `name`).
  - `search` (string): Search query, matches against product `name` or `description`.
  - `fields` (string): Field limiting (e.g., `name,currentBasePrice`).
- **Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Active products fetched successfully",
  "data": {
    "total": 50,
    "results": 10,
    "products": [
      {
        "_id": "...",
        "name": "...",
        "description": "...",
        "currentBasePrice": 100
      }
    ]
  }
}
```

### 2. Get Single Active Product

Retrieves details of a single product based on ID.

- **URL:** `/products/:id`
- **Method:** `GET`
- **URL Params:** `id` (ObjectId, required)
- **Success Response:** `200 OK` (Returns `{ product }`).
- **Error Response:** `404 Not Found` if product is missing or inactive.

---

## Admin API

Base URL: `/api/v1/admin`

**Authentication:** Protected by `authMiddleware` AND `roleMiddleware`. User must have the `admin` role.

### 1. Users Management

#### Get All Users

Fetches all users in the system.

- **URL:** `/users`
- **Method:** `GET`
- **Success Response:** `200 OK` (Returns `{ results: count, users: [...] }`).

#### Update User Role

Modifies the role privilege of a given user.

- **URL:** `/users/:id/role`
- **Method:** `PATCH`
- **URL Params:** `id` (ObjectId, required)
- **Request Body:**
  - `role` (string, required): Enum `["client", "admin", "operator"]`
- **Success Response:** `200 OK` (Returns `{ user: updatedUser }`).

#### Delete User

Permanently deletes a user from the system.

- **URL:** `/users/:id`
- **Method:** `DELETE`
- **URL Params:** `id` (ObjectId, required)
- **Success Response:** `200 OK`

---

### 2. Products Management

#### Get All Products

Fetches all products, bypassing active/inactive filters.

- **URL:** `/products`
- **Method:** `GET`
- **Success Response:** `200 OK` (Returns `{ results: count, products: [...] }`).

#### Get Single Product

Fetches product details (bypasses active filters).

- **URL:** `/products/:id`
- **Method:** `GET`
- **URL Params:** `id` (ObjectId, required)
- **Success Response:** `200 OK` (Returns `{ product }`).

#### Create Product

Creates a new product tied to a specific Design.

- **URL:** `/products`
- **Method:** `POST`
- **Request Body:**
  - `name` (string, required): Product Name
  - `description` (string, optional): Product Description
  - `currentBasePrice` (number, required): Starting price, cannot be negative.
  - `isActive` (boolean, optional): Defaults to `true`
  - `stockLevel` (number, optional): Defaults to `0`
  - `linkedDesignId` (string, required): Valid ObjectId of the source Design.
- **Success Response:** `201 Created` (Returns `{ product: newProduct }`).

#### Update Product

Updates existing product details.

- **URL:** `/products/:id`
- **Method:** `PATCH`
- **URL Params:** `id` (ObjectId, required)
- **Request Body:** Optional properties subset of Create schema.
- **Success Response:** `200 OK` (Returns `{ product: updatedProduct }`).

#### Delete Product

Permanently deletes a product.

- **URL:** `/products/:id`
- **Method:** `DELETE`
- **URL Params:** `id` (ObjectId, required)
- **Success Response:** `200 OK`
