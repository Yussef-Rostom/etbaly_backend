# REST API Documentation

## Base URL

```
/api/v1
```

---

## Table of Contents

- [Auth](./auth.md) — Registration, login, OTP, Google OAuth, password reset, token refresh
- [Users](./users.md) — Profile management (client) and user administration (admin)
- [Products](./products.md) — Public product browsing and admin product CRUD
- [Designs](./designs.md) — Authenticated design access and admin design CRUD
- [Cart](./cart.md) — Cart management and checkout
- [Manufacturing](./manufacturing.md) — Job dispatch for slicing and printing

---

## Standard Response Format

All responses follow a unified envelope structure.

### Success Response

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

> The `data` field is included as `null` when the server explicitly passes null (e.g. logout, forgot-password). It is completely omitted from the response when no data is provided.

### Error Response

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

### Validation Error Response (400)

When a request body fails Zod validation:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ]
  }
}
```

---

## Authentication

Protected routes require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Role levels (lowest to highest privilege):

- `client` — default role for registered users
- `operator` — manufacturing staff
- `admin` — full access

---

## Health Check

### `GET /api/v1/health`

- **Access:** Public

**Response 200**
```json
{
  "success": true,
  "message": "Server is running 🚀",
  "environment": "production",
  "timestamp": "2026-03-24T10:00:00.000Z"
}
```

---

## Global Pagination & Query Parameters

All list endpoints that support filtering accept the following standard query parameters:

- **`page`** (*number*, Optional)
  - *Description:* Page number for pagination
  - *Default:* `1`

- **`limit`** (*number*, Optional)
  - *Description:* Number of results to return per page

- **`sort`** (*string*, Optional)
  - *Description:* Field to sort by. Prefix with `-` for descending order
  - *Example:* `sort=-createdAt` or `sort=currentBasePrice`

- **`fields`** (*string*, Optional)
  - *Description:* Comma-separated list of fields to include in the response (field projection)
  - *Example:* `fields=name,currentBasePrice`

- **Filter by any field** (*any*, Optional)
  - *Description:* Any model field can be used directly as a query parameter
  - *Example:* `role=client`, `isVerified=true`, `isActive=false`

- **Range filters** (*number*, Optional)
  - *Description:* Use bracket notation for numeric range queries
  - *Example:* `currentBasePrice[gte]=10&currentBasePrice[lte]=100`

---

## Global Error Responses

These responses can be returned by any endpoint regardless of module.

### 401 — Unauthenticated

Returned when no token is provided or the token is missing from the request.

```json
{
  "success": false,
  "message": "You are not logged in. Please log in to get access."
}
```

Returned when the token signature is invalid (`JsonWebTokenError`):

```json
{
  "success": false,
  "message": "Invalid token. Please log in again."
}
```

Returned when the token has expired (`TokenExpiredError`):

```json
{
  "success": false,
  "message": "Your token has expired. Please log in again."
}
```

Returned when the token's user no longer exists in the database:

```json
{
  "success": false,
  "message": "The user belonging to this token no longer exists."
}
```

### 403 — Forbidden

Returned when the authenticated user lacks the required role.

```json
{
  "success": false,
  "message": "You do not have permission to perform this action."
}
```

### 404 — Route Not Found

Returned when a request is made to an undefined route.

```json
{
  "success": false,
  "message": "Cannot find GET /api/v1/unknown on this server."
}
```

### 500 — Internal Server Error

Returned for unexpected server-side errors.

```json
{
  "success": false,
  "message": "Something went wrong. Please try again later."
}
```

---

## Data Models Reference

Complete shapes of all MongoDB documents returned by the API.

### User

- **`_id`** — MongoDB ObjectId
- **`email`** — Unique, lowercase string
- **`role`** — `"client"` | `"admin"` | `"operator"` (default: `"client"`)
- **`isVerified`** — Boolean (default: `false`)
- **`profile`** — Embedded Profile object
  - **`firstName`** — String (2–50 chars)
  - **`lastName`** — String (2–50 chars)
  - **`phoneNumber`** — Optional string
  - **`bio`** — Optional string (max 500 chars)
  - **`avatarUrl`** — Optional string (URL)
  - **`avatarDriveFileId`** — Optional string (internal Drive file ID)
- **`savedAddresses`** — Array of Address objects
  - **`street`** — String
  - **`city`** — String
  - **`country`** — String
  - **`zip`** — String
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### Product

- **`_id`** — MongoDB ObjectId
- **`name`** — String
- **`description`** — Optional string
- **`images`** — Array of URL strings
- **`currentBasePrice`** — Number (≥ 0)
- **`isActive`** — Boolean (default: `true`)
- **`stockLevel`** — Number (≥ 0, default: `0`)
- **`linkedDesignId`** — ObjectId ref → Design
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### Design

- **`_id`** — MongoDB ObjectId
- **`name`** — String
- **`isPrintable`** — Boolean (default: `false`)
- **`fileUrl`** — String (URL to 3D model file)
- **`ownerId`** — ObjectId ref → User
- **`metadata`** — Embedded DesignMetadata object
  - **`volumeCm3`** — Number (positive)
  - **`dimensions`** — Object with `x`, `y`, `z` (all positive numbers, in mm)
  - **`estimatedPrintTime`** — Number (positive, in minutes)
  - **`supportedMaterials`** — Array of `"PLA"` | `"ABS"` | `"Resin"` | `"TPU"` | `"PETG"`
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### Cart

- **`_id`** — MongoDB ObjectId
- **`userId`** — ObjectId ref → User (unique per user)
- **`items`** — Array of CartItem objects
  - **`_id`** — ObjectId (use this as `:id` in cart item routes)
  - **`itemType`** — `"Product"` | `"Design"`
  - **`itemRefId`** — ObjectId (dynamic ref based on `itemType`)
  - **`quantity`** — Integer (≥ 1)
  - **`unitPrice`** — Number (≥ 0)
  - **`customization`** — Optional CustomizationParams object
    - **`color`** — Optional string
    - **`infillPercentage`** — Optional number (0–100)
    - **`layerHeight`** — Optional number (0.05–1.0)
    - **`scale`** — Optional number (0.1–10, default: 1)
    - **`customFields`** — Optional free-form key-value object
  - **`materialId`** — Optional ObjectId ref → Material
- **`pricingSummary`** — Embedded PricingSummary object
  - **`subtotal`** — Number
  - **`taxAmount`** — Number
  - **`shippingCost`** — Number
  - **`discountAmount`** — Number
  - **`total`** — Number
- **`expiresAt`** — Date (TTL: 30 days from creation)

### Order

- **`_id`** — MongoDB ObjectId
- **`orderNumber`** — Unique string
- **`status`** — `"Pending"` | `"Processing"` | `"Shipped"` | `"Delivered"` | `"Cancelled"` (default: `"Pending"`)
- **`items`** — Array of OrderItem objects
  - **`_id`** — ObjectId
  - **`itemType`** — `"Product"` | `"Design"`
  - **`itemRefId`** — ObjectId (dynamic ref)
  - **`quantity`** — Integer (≥ 1)
  - **`price`** — Number (≥ 0)
  - **`status`** — `"Queued"` | `"Printing"` | `"Ready"` (default: `"Queued"`)
  - **`customization`** — Optional CustomizationParams
  - **`materialId`** — Optional ObjectId ref → Material
- **`shippingAddressSnapshot`** — Embedded Address (snapshot at time of order)
- **`paymentInfo`** — Embedded Payment object
  - **`method`** — `"Card"` | `"Wallet"` | `"COD"`
  - **`status`** — `"Pending"` | `"Paid"` | `"Failed"` (default: `"Pending"`)
  - **`amountPaid`** — Number (≥ 0)
  - **`transactionId`** — Optional string
  - **`paidAt`** — Optional Date
- **`pricingSummary`** — Embedded PricingSummary
- **`userId`** — ObjectId ref → User
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### ManufacturingJob

- **`_id`** — MongoDB ObjectId
- **`jobNumber`** — Unique string
- **`targetOrderItemId`** — ObjectId (ref to an order item)
- **`orderId`** — ObjectId ref → Order
- **`operatorId`** — Optional ObjectId ref → User
- **`status`** — `"Queued"` | `"Slicing"` | `"Printing"` | `"Done"` | `"Failed"` (default: `"Queued"`)
- **`machineId`** — Optional string
- **`gcodeUrl`** — Optional string (URL to generated G-code file)
- **`startedAt`** / **`finishedAt`** — Optional Dates
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### Material

- **`_id`** — MongoDB ObjectId
- **`name`** — Unique string
- **`type`** — `"PLA"` | `"ABS"` | `"Resin"` | `"TPU"` | `"PETG"`
- **`currentPricePerGram`** — Number (≥ 0)
- **`colorHex`** — Optional string (hex color code)
- **`isActive`** — Boolean (default: `true`)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps
