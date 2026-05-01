[← Back to Main API Docs](./README.md)

# Module: Orders

Base path: `/api/v1/orders` (User) and `/api/v1/admin/orders` (Admin)

All routes require authentication. Users see their own orders, admins see all orders.

---

## Overview

The orders module manages the complete order lifecycle from creation to fulfillment. Orders are created from cart contents and progress through multiple status stages.

**Key Features:**
- Create orders from cart contents
- Track order status (Pending → Processing → Shipped → Delivered)
- Payment integration
- Shipping address management
- Order history and details
- Admin order management

**Order Status Flow:**
```
Pending → Processing → Shipped → Delivered
       → Cancelled (at any stage before Shipped)
```

**Workflow:**
```
1. User creates order from cart
2. System calculates total with shipping
3. Payment processed
4. Order status: Pending
5. Admin processes order → Processing
6. Admin ships order → Shipped
7. Order delivered → Delivered
```

---

## User Endpoints

Base path: `/api/v1/orders`

All routes require authentication (`Bearer <accessToken>`).

---

### `GET /api/v1/orders`

- **Access:** Authenticated (any role)

Returns all orders placed by the authenticated user, sorted newest first.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": {
    "orders": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
        "status": "Pending",
        "items": [
          {
            "_id": "64f1a2b3c4d5e6f7a8b9c0d8",
            "itemType": "Product",
            "itemRefId": {
              "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
              "name": "Decorative Vase",
              "images": ["https://drive.google.com/uc?id=..."],
              "description": "A beautiful 3D-printed vase."
            },
            "quantity": 2,
            "price": 59.98,
            "status": "Queued",
            "printingProperties": {
              "material": "PLA",
              "color": "Red",
              "scale": 100,
              "preset": "normal"
            }
          }
        ],
        "shippingAddressSnapshot": {
          "street": "123 Main St",
          "city": "Cairo",
          "country": "Egypt",
          "zip": "11511"
        },
        "paymentInfo": {
          "method": "COD",
          "status": "Pending",
          "amountPaid": 0
        },
        "pricingSummary": {
          "subtotal": 59.98,
          "taxAmount": 0,
          "shippingCost": 0,
          "discountAmount": 0,
          "total": 59.98
        },
        "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "createdAt": "2026-03-24T10:00:00.000Z",
        "updatedAt": "2026-03-24T10:00:00.000Z"
      }
    ]
  }
}
```

**Response 200 — No Orders**
```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": { "orders": [] }
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

---

### `GET /api/v1/orders/:id`

- **Access:** Authenticated (any role)

Returns a single order by its ID.

- Clients may only retrieve their own orders. Requesting another user's order returns 403.
- Operators and admins may retrieve any order.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the order

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Order fetched successfully",
  "data": {
    "order": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
      "status": "Processing",
      "items": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d8",
          "itemType": "Product",
          "itemRefId": {
            "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
            "name": "Decorative Vase",
            "images": ["https://drive.google.com/uc?id=..."],
            "description": "A beautiful 3D-printed vase."
          },
          "quantity": 2,
          "price": 59.98,
          "status": "Printing",
          "printingProperties": {
            "material": "PLA",
            "color": "Red",
            "scale": 100,
            "preset": "normal"
          }
        }
      ],
      "shippingAddressSnapshot": {
        "street": "123 Main St",
        "city": "Cairo",
        "country": "Egypt",
        "zip": "11511"
      },
      "paymentInfo": {
        "method": "COD",
        "status": "Pending",
        "amountPaid": 0
      },
      "pricingSummary": {
        "subtotal": 59.98,
        "taxAmount": 0,
        "shippingCost": 0,
        "discountAmount": 0,
        "total": 59.98
      },
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "createdAt": "2026-03-24T10:00:00.000Z",
      "updatedAt": "2026-03-24T10:30:00.000Z"
    }
  }
}
```

> `items.itemRefId` is populated with the product or design document (`name`, `images`, `thumbnailUrl`, `description`).

**Item status values:**
- `"Queued"` — printing job created, awaiting admin review
- `"Printing"` — admin started the printing job
- `"Ready"` — printing completed, item ready for shipment

**Response 400 — Invalid ID**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "id", "message": "Invalid ObjectId" }] }
}
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "Order not found." }
```

---

## Admin Endpoints

Base path: `/api/v1/admin/orders`

All routes in this section require authentication and the `operator` or `admin` role.

---

### `GET /api/v1/admin/orders`

- **Access:** Operator, Admin

Returns a paginated list of all orders in the system, sorted newest first. Supports optional status filtering.

**Query Parameters**

- **`status`** (*string*, Optional)
  - *Validation:* Must be one of `"Pending"`, `"Processing"`, `"Shipped"`, `"Delivered"`, `"Cancelled"`
  - *Description:* Filter orders by their current status

- **`page`** (*integer*, Optional)
  - *Validation:* Min 1, coerced from string
  - *Default:* `1`
  - *Description:* Page number for pagination

- **`limit`** (*integer*, Optional)
  - *Validation:* Min 1, max 100, coerced from string
  - *Default:* `20`
  - *Description:* Number of results per page

**Response 200 — OK**
```json
{router
  .route("/:jobId")
  .get(PrintingController.getJobById);

  "success": true,
  "message": "All orders fetched successfully",
  "data": {
    "orders": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
        "status": "Pending",
        "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "pricingSummary": {
          "subtotal": 59.98,
          "taxAmount": 0,
          "shippingCost": 0,
          "discountAmount": 0,
          "total": 59.98
        },
        "createdAt": "2026-03-24T10:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "status", "message": "Invalid enum value. Expected 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'" }] }
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

### `POST /api/v1/admin/orders/:id/assign`

- **Access:** Operator, Admin

Assigns a specific order item to a 3D printer. Creates a `PrintingJob` document and updates the order item's status to `"Printing"`.

> **Note:** This endpoint uses the legacy workflow. For new implementations, use the [Slicing](./slicing.md) and [Printing](./printing.md) modules directly.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the order

**Request Body (JSON)**

- **`orderItemId`** (*string*, Required)
  - *Validation:* Must be a strict 24-character hex MongoDB ObjectId (Regex validated: `/^[0-9a-fA-F]{24}$/`)
  - *Description:* The `_id` of the order item to assign

- **`machineId`** (*string*, Required)
  - *Validation:* Non-empty string (trimmed)
  - *Description:* The identifier of the 3D printer to assign the job to

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Job assigned successfully",
  "data": {
    "job": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "orderId": "64f1a2b3c4d5e6f7a8b9c0d7",
      "targetOrderItemId": "64f1a2b3c4d5e6f7a8b9c0d8",
      "machineId": "PRINTER-01",
      "operatorId": "64f1a2b3c4d5e6f7a8b9c0d9",
      "status": "Queued",
      "createdAt": "2026-03-24T11:00:00.000Z"
    }
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "machineId", "message": "machineId must not be empty" }] }
}
```

**Response 403 — Forbidden**
```json
{ "success": false, "message": "You do not have permission to perform this action." }
```

**Response 404 — Order Not Found**
```json
{ "success": false, "message": "Order not found." }
```

**Response 404 — Order Item Not Found**
```json
{ "success": false, "message": "Order item not found." }
```
