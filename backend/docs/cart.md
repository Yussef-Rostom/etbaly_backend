[← Back to Main API Docs](./README.md)

# Module: Cart

Base path: `/api/v1/cart`

All routes require authentication (`Bearer <accessToken>`).

---

## Overview

The cart module manages shopping cart functionality for authenticated users. Each user has a single cart that can contain products and custom designs with customization options.

**Key Features:**
- Add products or custom designs to cart
- Update item quantities and customizations
- Remove items from cart
- Automatic pricing calculation
- Clear entire cart
- Persistent cart storage per user

**Workflow:**
```
1. User adds items to cart (products or designs)
2. System calculates pricing based on customizations
3. User can update quantities or remove items
4. User proceeds to checkout (creates order)
5. Cart is cleared after successful order
```

---

## Endpoints

### `GET /api/v1/cart`

- **Access:** Authenticated (any role)

Returns the authenticated user's current cart, including all items and the computed pricing summary.

**Response 200 — OK**

```json
{
  "success": true,
  "message": "Cart fetched successfully",
  "data": {
    "cart": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "items": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "itemType": "Product",
          "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d2",
          "quantity": 2,
          "unitPrice": 29.99,
          "thumbnailUrl": "https://drive.google.com/uc?export=view&id=...",
          "printingProperties": {
            "material": "PLA",
            "color": "#FF5733",
            "scale": 100,
            "preset": "normal"
          }
        }
      ],
      "pricingSummary": {
        "subtotal": 59.98,
        "taxAmount": 8.99,
        "shippingCost": 5.00,
        "discountAmount": 0,
        "total": 73.97
      },
      "expiresAt": "2026-04-23T10:00:00.000Z"
    }
  }
}
```

**Response 401 — Unauthenticated**

```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

---

### `POST /api/v1/cart/items`

- **Access:** Authenticated (any role)

Adds an item to the cart. If the item already exists with the same configuration, the quantity is incremented.

**Request Body (JSON)**

- **`itemType`** (*string*, Required)
  - *Validation:* Must be `"Product"` or `"Design"`
  - *Description:* The type of item being added
- **`itemRefId`** (*string*, Required)
  - *Validation:* Must be a strict 24-character hex MongoDB ObjectId (Regex validated: `/^[0-9a-fA-F]{24}$/`)
  - *Description:* The ID of the Product or Design document
- **`quantity`** (*integer*, Required)
  - *Validation:* Integer, min 1
  - *Description:* Number of units to add
- **`printingProperties`** (*object*, Required)
  - *Description:* 3D printing configuration for this item
  - **`material`** (*string*, Required) — Material type: `"PLA"` | `"ABS"` | `"PETG"` | `"TPU"` | `"Resin"`
  - **`color`** (*string*, Optional) — Color value (e.g. hex code `"#FF5733"`)
  - **`scale`** (*number*, Optional) — Scale percentage (1–1000, default: 100 = original size)
  - **`preset`** (*string*, Optional) — Slicing quality preset: `"heavy"` | `"normal"` | `"draft"`
  - **`customFields`** (*array*, Optional) — List of custom key-value pairs
    - **`key`** (*string*, Required) — Field name
    - **`value`** (*string*, Required) — Field value

**Response 200 — OK**

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": { "cart": { "...": "updated cart object" } }
}
```

**Response 400 — Validation Error**

```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "quantity", "message": "Quantity must be at least 1" }] }
}
```

**Response 400 — Design Not Sliced**

```json
{ "success": false, "message": "Design has not been sliced yet. Please wait for slicing to complete before adding to cart." }
```

**Response 404 — Material Not Found**

```json
{ "success": false, "message": "Material type \"PLA\" not found or not currently active." }
```

**Response 404 — Item Not Found**

```json
{ "success": false, "message": "Product not found or not currently active." }
```

> Also applies to Design items: `"Design not found."`

---

### `PATCH /api/v1/cart/items/:id`

- **Access:** Authenticated (any role)

Updates the quantity of a specific cart item.

**Path Parameters**

- **`:id`** (*string*, Required) — The `_id` of the cart item (not the product/design ID)

**Request Body (JSON)**

- **`quantity`** (*integer*, Required)
  - *Validation:* Integer, min 1
  - *Description:* The new quantity for the cart item

**Response 200 — OK**

```json
{
  "success": true,
  "message": "Cart item updated",
  "data": { "cart": { "...": "updated cart object" } }
}
```

**Response 404 — Item Not Found**

```json
{ "success": false, "message": "Cart item not found." }
```

---

### `DELETE /api/v1/cart/items/:id`

- **Access:** Authenticated (any role)

Removes a specific item from the cart.

**Path Parameters**

- **`:id`** (*string*, Required) — The `_id` of the cart item to remove

**Response 200 — OK**

```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": { "cart": { "...": "updated cart object" } }
}
```

**Response 404 — Item Not Found**

```json
{ "success": false, "message": "Cart item not found." }
```

---

### `DELETE /api/v1/cart`

- **Access:** Authenticated (any role)

Removes all items from the cart and resets the pricing summary.

**Response 200 — OK**

```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

### `POST /api/v1/cart/checkout`

- **Access:** Authenticated (any role)

Converts the current cart into an order. The cart must be non-empty. Creates an Order document and deletes the cart.

**Request Body (JSON)**

- **`shippingAddress`** (*object*, Required)
  - *Description:* The shipping address for this order
  - **`street`** (*string*, Required) — Street address
  - **`city`** (*string*, Required) — City
  - **`country`** (*string*, Required) — Country
  - **`zip`** (*string*, Required) — ZIP / postal code
- **`paymentMethod`** (*string*, Required)
  - *Validation:* Must be one of `"Card"`, `"Wallet"`, `"COD"`
  - *Description:* The payment method for this order

**Response 201 — Created**

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
      "status": "Pending",
      "items": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d8",
          "itemType": "Product",
          "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d2",
          "quantity": 2,
          "price": 59.98,
          "status": "Queued"
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
        "taxAmount": 8.99,
        "shippingCost": 5.00,
        "discountAmount": 0,
        "total": 73.97
      },
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "createdAt": "2026-03-24T10:00:00.000Z"
    }
  }
}
```

**Response 400 — Empty Cart**

```json
{ "success": false, "message": "Cannot checkout with an empty cart." }
```

**Response 400 — Validation Error**

```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "paymentMethod", "message": "Invalid enum value. Expected 'Card' | 'Wallet' | 'COD'" }] }
}
```
