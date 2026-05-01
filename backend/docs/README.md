# REST API Documentation

## Base URL

```
/api/v1
```

---

## Table of Contents

- [Deployment](./deployment.md) — Deployment guide for local and Docker environments
- [Auth](./auth.md) — Registration, login, OTP, Google OAuth, password reset, token refresh
- [Users](./users.md) — Profile management (client) and user administration (admin)
- [Products](./products.md) — Public product browsing and admin product CRUD
- [Designs](./designs.md) — Authenticated design access and admin design CRUD
- [Cart](./cart.md) — Cart management and checkout
- [Orders](./orders.md) — Order history, order tracking, and admin order management
- [Materials](./materials.md) — Material catalog and pricing management for 3D printing
- [Slicing](./slicing.md) — Automated slicing job management (STL to G-code conversion) with weight, dimensions, print time, and price calculation
- [Printing](./printing.md) — Manual printing job workflow with approval and execution
- [AI Generation](./ai.md) — Lightning AI service URL management for AI-powered content generation
- [Files](./files.md) — Google Drive file proxy for CORS/Auth bypass

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
  - *Example:* `sort=-createdAt` or `sort=name`

- **`fields`** (*string*, Optional)
  - *Description:* Comma-separated list of fields to include in the response (field projection)
  - *Example:* `fields=name,isActive`

- **Filter by any field** (*any*, Optional)
  - *Description:* Any model field can be used directly as a query parameter
  - *Example:* `role=client`, `isVerified=true`, `isActive=false`

- **Range filters** (*number*, Optional)
  - *Description:* Use bracket notation for numeric range queries
  - *Example:* `weight[gte]=10&weight[lte]=100`

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

---

## File Storage & Google Drive

The system uses Google Drive for persistent file storage. Files are organized into specific subfolders under a master root folder (defined via `DRIVE_FOLDER_ID`).

### Folder Hierarchy

- **`avatars/`** — User profile pictures
- **`designs/`** — 3D model files (STL, OBJ, etc.) submitted by users or generated by AI
- **`images/`** — Product images and other general-purpose images
- **`models/`** — Low-resolution versions or derived models used for internal processing

### File Drive Reference ID (FDRI)

Most upload endpoints return both a `fileUrl` and a `fileId`. The `fileId` (also referred to as `fdri` in some contexts) represents the unique identifier of the file within Google Drive. This ID should be used when referencing files in subsequent API calls (e.g., when creating a design from an uploaded file).

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
- **`isActive`** — Boolean (default: `true`)
- **`linkedDesignId`** — ObjectId ref → Design
- **`printingProperties`** — Object `{ material, color, scale, preset }` (optional)
- **`slicingResult`** — Object populated by slicing worker: `{ gcodeUrl, dimensions, weight, printTime, calculatedPrice, slicedAt }` (null until sliced)
- **`isCustomizable`** — Boolean (default: `false`)
- **`customFields`** — Array of field definitions (required when `isCustomizable: true`)
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
  - **`supportedMaterials`** — Array of `"PLA"` | `"ABS"` | `"RESIN"` | `"TPU"` | `"PETG"`
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### Cart

- **`_id`** — MongoDB ObjectId
- **`userId`** — ObjectId ref → User (unique per user)
- **`items`** — Array of CartItem objects
  - **`_id`** — ObjectId (use this as `:id` in cart item routes)
  - **`itemType`** — `"Product"` | `"Design"`
  - **`itemRefId`** — ObjectId (dynamic ref based on `itemType`)
  - **`itemName`** — String (name of the product or design)
  - **`quantity`** — Integer (≥ 1)
  - **`unitPrice`** — Number (≥ 0, locked at time of adding to cart)
  - **`thumbnailUrl`** — Optional string (URL to item thumbnail)
  - **`slicingJobId`** — Optional ObjectId ref → SlicingJob (reference to slicing job used for pricing)
  - **`printingProperties`** — Optional PrintingProperties object
    - **`material`** — Optional string (e.g. `"PLA"`, `"ABS"`, `"PETG"`, `"TPU"`)
    - **`color`** — Optional string (color name like "White", "Black", "Red")
    - **`scale`** — Optional number (1–1000, default: 100 = original size)
    - **`preset`** — Optional `"heavy"` | `"normal"` | `"draft"`
    - **`customFields`** — Optional array of `{ key: string, value: string }` objects
- **`pricingSummary`** — Embedded PricingSummary object
  - **`subtotal`** — Number
  - **`taxAmount`** — Number
  - **`shippingCost`** — Number
  - **`discountAmount`** — Number
  - **`total`** — Number
- **`expiresAt`** — Date (TTL: 30 days from creation)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### Order

- **`_id`** — MongoDB ObjectId
- **`status`** — `"Pending"` | `"Processing"` | `"Shipped"` | `"Delivered"` | `"Cancelled"` (default: `"Pending"`)
- **`items`** — Array of OrderItem objects
  - **`_id`** — ObjectId
  - **`itemType`** — `"Product"` | `"Design"`
  - **`itemRefId`** — ObjectId (dynamic ref)
  - **`quantity`** — Integer (≥ 1)
  - **`price`** — Number (≥ 0)
  - **`status`** — `"Queued"` | `"Printing"` | `"Ready"` (default: `"Queued"`)
  - **`printingProperties`** — Optional PrintingProperties object
    - **`material`** — Optional string
    - **`color`** — Optional string
    - **`scale`** — Optional number (1–1000)
    - **`preset`** — Optional `"heavy"` | `"normal"` | `"draft"`
    - **`customFields`** — Optional array of `{ key: string, value: string }` objects
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

### SlicingJob

- **`_id`** — MongoDB ObjectId (used as `jobId` in all responses)
- **`designId`** — ObjectId ref → Design (required)
- **`userId`** — ObjectId ref → User (required, user who requested this job)
- **`targetOrderItemId`** — Optional ObjectId (ref to an order item)
- **`orderId`** — Optional ObjectId ref → Order
- **`operatorId`** — Optional ObjectId ref → User
- **`status`** — `"Queued"` | `"Processing"` | `"Completed"` | `"Failed"` (default: `"Queued"`)
- **`stlFileUrl`** — Optional string (URL to input STL file)
- **`gcodeUrl`** — Optional string (URL to generated G-code file)
- **`fileName`** — Optional string
- **`material`** — Optional string (material type, stored in uppercase)
- **`color`** — Optional string (filament color)
- **`preset`** — Optional string (slicing preset: heavy, normal, draft)
- **`scale`** — Optional number (scale percentage: 1-1000, default 100)
- **`weight`** — Optional number (weight in grams, set on completion)
- **`dimensions`** — Optional object (dimensions in mm, set on completion)
  - **`width`** — number
  - **`height`** — number
  - **`depth`** — number
- **`printTime`** — Optional number (estimated print time in minutes, set on completion)
- **`calculatedPrice`** — Optional number (calculated price, set on completion)
- **`copiedFromJobId`** — Optional ObjectId ref → SlicingJob (reference to original job if results were copied)
- **`startedAt`** / **`finishedAt`** — Optional Dates
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### PrintingJob

- **`_id`** — MongoDB ObjectId (used as jobId in all responses)
- **`slicingJobId`** — ObjectId ref → SlicingJob (required)
- **`orderId`** — ObjectId ref → Order (required) — used to sync order item status
- **`orderItemId`** — ObjectId (required) — the specific order item this job prints
- **`operatorId`** — Optional ObjectId ref → User
- **`status`** — `"Pending Review"` | `"Approved"` | `"Rejected"` | `"Queued"` | `"Processing"` | `"Completed"` | `"Failed"` (default: `"Pending Review"`)
- **`gcodeUrl`** — String (required, URL to G-code file copied from SlicingJob)
- **`machineId`** — Optional string (3D printer identifier)
- **`fileName`** — String (required, copied from SlicingJob)
- **`startedAt`** / **`finishedAt`** — Optional Dates
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

### ManufacturingJob (Legacy)

> **Note:** This model is deprecated. Use SlicingJob and PrintingJob instead.

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
- **`name`** — String (descriptive name, e.g., "PLA White Filament")
- **`type`** — `"PLA"` | `"ABS"` | `"RESIN"` | `"TPU"` | `"PETG"` (stored in uppercase)
- **`color`** — String (required, color name like "White", "Black", "Red")
- **`currentPricePerGram`** — Number (≥ 0)
- **`isActive`** — Boolean (default: `true`)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps
- **Note:** Unique constraint on `type + color` combination
