[← Back to Main API Docs](./README.md)

# Module: Cart

Base path: `/api/v1/cart`

All routes require authentication (`Bearer <accessToken>`).

---

## Overview

The cart module manages shopping cart functionality for authenticated users. Each user has a single persistent cart that can contain products and custom designs with printing customizations.

**Key Features:**
- Single cart per user with automatic persistence
- Support for both products and custom designs
- Two modes for adding items: direct slicingJobId or manual parameters
- Automatic slicing job lookup and price calculation
- Price locking at time of adding to cart
- Material and color validation
- Printing customization options (material, color, scale, preset)
- Thumbnail snapshots for cart items
- 30-day cart expiration with TTL index

**Important:** Both products and designs require completed slicing jobs with calculated prices before they can be added to cart.

**Workflow:**
```
1. User adds items to cart (products or designs)
   ↓
2. System validates slicing job exists and is completed
   ↓
3. System locks price from slicing job
   ↓
4. User can update quantities or remove items
   ↓
5. User proceeds to checkout
   ↓
6. System validates all items and creates order
   ↓
7. Cart is cleared after successful order
```

---

## Endpoints

### `GET /api/v1/cart`

- **Access:** Authenticated (any role)

Returns the authenticated user's current cart, including all items and the computed pricing summary. If no cart exists, returns an empty cart structure.

**Response 200 — OK (With Items)**
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
          "itemName": "3D Printed Vase",
          "quantity": 2,
          "unitPrice": 29.99,
          "thumbnailUrl": "https://drive.google.com/uc?export=view&id=...",
          "printingProperties": {
            "material": "PLA",
            "color": "Red",
            "scale": 100,
            "preset": "normal"
          }
        },
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
          "itemType": "Design",
          "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d3",
          "itemName": "Custom Phone Stand",
          "quantity": 1,
          "unitPrice": 45.50,
          "thumbnailUrl": "https://drive.google.com/uc?export=view&id=...",
          "printingProperties": {
            "material": "ABS",
            "color": "Blue",
            "scale": 150,
            "preset": "heavy"
          }
        }
      ],
      "pricingSummary": {
        "subtotal": 105.48,
        "taxAmount": 0,
        "shippingCost": 0,
        "discountAmount": 0,
        "total": 105.48
      },
      "expiresAt": "2026-05-23T10:00:00.000Z",
      "createdAt": "2026-04-23T10:00:00.000Z",
      "updatedAt": "2026-04-23T10:30:00.000Z"
    }
  }
}
```

**Response 200 — OK (Empty Cart)**
```json
{
  "success": true,
  "message": "Cart fetched successfully",
  "data": {
    "cart": {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "items": [],
      "pricingSummary": {
        "subtotal": 0,
        "taxAmount": 0,
        "shippingCost": 0,
        "discountAmount": 0,
        "total": 0
      }
    }
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

### `POST /api/v1/cart/items`

- **Access:** Authenticated (any role)

Adds an item to the cart. If an item with the same configuration already exists, the quantity is incremented. Otherwise, a new cart item is created.

**Two modes are supported:**
1. **Direct SlicingJobId** (Recommended) - Provide only `slicingJobId` and `quantity`. All other information (itemType, itemRefId, printingProperties, price) is automatically retrieved from the slicing job.
2. **Manual Parameters** - Provide `itemType`, `itemRefId`, `quantity`, and `printingProperties` with material and color. The system will automatically search for a matching completed slicing job.

**Important Notes:**
- When using `slicingJobId`, you **cannot** provide `itemType`, `itemRefId`, or `printingProperties`. The slicing job contains all necessary information.
- **Both Products and Designs require slicing jobs**: 
  - For Designs: The system searches for a slicing job matching the design and printing parameters
  - For Products: The system searches for a slicing job matching the product's linked design and printing parameters
- Prices are locked when items are added to cart (no recalculation at checkout)

**Request Body (JSON)**

**Mode 1: Using SlicingJobId (Recommended)**

- **`slicingJobId`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Description:* The ID of a completed SlicingJob. All item information is retrieved from this job.
  - *Note:* The slicing job must be completed and have a calculated price.

- **`quantity`** (*integer*, Required)
  - *Validation:* Integer, minimum 1
  - *Description:* Number of units to add

**Mode 2: Using Manual Parameters**

- **`itemType`** (*string*, Required)
  - *Validation:* Must be `"Product"` or `"Design"`
  - *Description:* The type of item being added

- **`itemRefId`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Description:* The ID of the Product or Design document

- **`quantity`** (*integer*, Required)
  - *Validation:* Integer, minimum 1
  - *Description:* Number of units to add

- **`printingProperties`** (*object*, Required)
  - *Description:* 3D printing configuration for this item
  - **`material`** (*string*, Required)
    - *Validation:* Must be an active material type in the system
    - *Description:* Material type (e.g., "PLA", "ABS", "PETG", "TPU", "RESIN")
  - **`color`** (*string*, Required)
    - *Validation:* Non-empty string, trimmed
    - *Description:* Color name (e.g., "White", "Black", "Red", "Blue", "Gold")
    - *Note:* Must match an available color for the selected material type
  - **`scale`** (*number*, Optional)
    - *Validation:* Number between 1 and 1000
    - *Description:* Scale percentage (100 = original size, 50 = half size, 200 = double size)
  - **`preset`** (*string*, Optional)
    - *Validation:* One of: `"heavy"`, `"normal"`, `"draft"`
    - *Description:* Slicing quality preset
  - **`customFields`** (*array*, Optional)
    - *Description:* List of custom key-value pairs for additional specifications
    - Each object contains:
      - **`key`** (*string*, Required) — Field name
      - **`value`** (*string*, Required) — Field value

**Example Request (Mode 1: Using SlicingJobId)**
```json
{
  "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d6",
  "quantity": 2
}
```

**Example Request (Mode 2: Using Manual Parameters)**
```json
{
  "itemType": "Design",
  "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "quantity": 2,
  "printingProperties": {
    "material": "PLA",
    "color": "Red",
    "scale": 100,
    "preset": "normal"
  }
}
```

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "items": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "itemType": "Design",
          "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d2",
          "itemName": "Custom Phone Stand",
          "quantity": 2,
          "unitPrice": 31.14,
          "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d6",
          "thumbnailUrl": "https://drive.google.com/uc?export=view&id=...",
          "printingProperties": {
            "material": "PLA",
            "color": "Red",
            "scale": 100,
            "preset": "normal"
          }
        }
      ],
      "pricingSummary": {
        "subtotal": 59.98,
        "taxAmount": 0,
        "shippingCost": 0,
        "discountAmount": 0,
        "total": 59.98
      },
      "expiresAt": "2026-05-23T10:00:00.000Z"
    }
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Either provide slicingJobId only (with quantity), or provide itemType, itemRefId, and printingProperties (with material and color)"
}
```

**Response 404 — Slicing Job Not Found**
```json
{ 
  "success": false, 
  "message": "Slicing job not found." 
}
```

**Response 400 — Slicing Job Not Completed**
```json
{ 
  "success": false, 
  "message": "Slicing job is not completed yet." 
}
```

**Response 400 — Slicing Job Has No Price**
```json
{ 
  "success": false, 
  "message": "Slicing job does not have a calculated price." 
}
```

**Response 400 — Slicing Job Mismatch**
```json
{ 
  "success": false, 
  "message": "itemType and itemRefId are required when slicingJobId is not provided." 
}
```

**Response 400 — Design/Product Not Sliced (Manual Mode)**
```json
{ 
  "success": false, 
  "message": "This design must be sliced with these parameters (material: PLA, color: Gold, scale: 150%) before adding to cart. Please complete slicing first." 
}
```

**Response 404 — Material Not Found**
```json
{ 
  "success": false, 
  "message": "Color \"Gold\" is not available for material \"PLA\". Available colors: White, Black, Red, Blue, Green, Yellow, Orange, Purple, Pink, Gray, Silver, Transparent, Brown, Cyan" 
}
```

**Response 404 — Item Not Found**
```json
{ 
  "success": false, 
  "message": "Product not found or is no longer available." 
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

### `PATCH /api/v1/cart/items/:id`

- **Access:** Authenticated (any role)

Updates the quantity of a specific cart item. The item must belong to the authenticated user's cart.

**Path Parameters**

- **`:id`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId
  - *Description:* The `_id` of the cart item (not the product/design ID)

**Request Body (JSON)**

- **`quantity`** (*integer*, Required)
  - *Validation:* Integer, minimum 1
  - *Description:* The new quantity for the cart item

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Cart item updated",
  "data": {
    "cart": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "items": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
          "quantity": 5,
          "unitPrice": 29.99
        }
      ],
      "pricingSummary": {
        "subtotal": 149.95,
        "total": 149.95
      }
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
      { "field": "quantity", "message": "Quantity must be at least 1" }
    ]
  }
}
```

**Response 404 — Cart Not Found**
```json
{ 
  "success": false, 
  "message": "Cart not found." 
}
```

**Response 404 — Item Not Found**
```json
{ 
  "success": false, 
  "message": "Cart item not found." 
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

### `DELETE /api/v1/cart/items/:id`

- **Access:** Authenticated (any role)

Removes a specific item from the cart. The pricing summary is automatically recalculated.

**Path Parameters**

- **`:id`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId
  - *Description:* The `_id` of the cart item to remove

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "cart": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "items": [],
      "pricingSummary": {
        "subtotal": 0,
        "taxAmount": 0,
        "shippingCost": 0,
        "discountAmount": 0,
        "total": 0
      }
    }
  }
}
```

**Response 404 — Cart Not Found**
```json
{ 
  "success": false, 
  "message": "Cart not found." 
}
```

**Response 404 — Item Not Found**
```json
{ 
  "success": false, 
  "message": "Cart item not found." 
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

### `DELETE /api/v1/cart`

- **Access:** Authenticated (any role)

Removes all items from the cart and resets the pricing summary. The cart document remains in the database but is empty.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Cart cleared"
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

### `POST /api/v1/cart/checkout`

- **Access:** Authenticated (any role)

Converts the current cart into an order and creates printing jobs for each cart item. The cart must contain at least one item with a valid slicing job reference. Prices are locked from the cart (no recalculation). The cart is deleted after successful checkout.

**Important:** This endpoint automatically creates PrintingJobs (status: "Pending Review") for each cart item quantity. For example, if a cart item has quantity 3, three separate printing jobs will be created.

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
      "createdAt": "2026-04-30T10:00:00.000Z",
      "updatedAt": "2026-04-30T10:00:00.000Z"
    }
  }
}
```

**Response 400 — Empty Cart**
```json
{ 
  "success": false, 
  "message": "Cannot checkout with an empty cart." 
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { 
        "field": "paymentMethod", 
        "message": "Invalid enum value. Expected 'Card' | 'Wallet' | 'COD'" 
      }
    ]
  }
}
```

**Response 400 — Missing Material**
```json
{ 
  "success": false, 
  "message": "Cart item is missing required material specification." 
}
```

**Response 400 — Missing Slicing Job**
```json
{ 
  "success": false, 
  "message": "Cart item is missing slicing job reference. Please re-add the item to cart." 
}
```

**Response 400 — Slicing Job Missing G-code**
```json
{ 
  "success": false, 
  "message": "Slicing job 64f1a2b3c4d5e6f7a8b9c0d6 not found or missing G-code URL." 
}
```

**Response 404 — User Not Found**
```json
{ 
  "success": false, 
  "message": "User not found." 
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

## Data Model

### Cart

Represents a user's shopping cart with items and pricing information.

**Fields:**

- **`_id`** — MongoDB ObjectId
- **`userId`** — ObjectId ref → User (unique per user, indexed)
- **`items`** — Array of CartItem objects
  - **`_id`** — ObjectId (cart item ID, used for updates/deletes)
  - **`itemType`** — `"Product"` | `"Design"`
  - **`itemRefId`** — ObjectId (dynamic ref based on itemType)
  - **`itemName`** — String (name of the product or design)
  - **`quantity`** — Integer (≥ 1)
  - **`unitPrice`** — Number (≥ 0, price per unit locked when item is added)
  - **`slicingJobId`** — Optional ObjectId ref → SlicingJob (for Design items, tracks which slicing job was used for pricing)
  - **`thumbnailUrl`** — Optional string (snapshot of item image)
  - **`printingProperties`** — PrintingProperties object
    - **`material`** — String (required, material type)
    - **`color`** — String (required, color name)
    - **`scale`** — Optional number (1-1000, default 100)
    - **`preset`** — Optional `"heavy"` | `"normal"` | `"draft"`
    - **`customFields`** — Optional array of `{ key: string, value: string }`
- **`pricingSummary`** — PricingSummary object
  - **`subtotal`** — Number (sum of all items)
  - **`taxAmount`** — Number (currently 0)
  - **`shippingCost`** — Number (currently 0)
  - **`discountAmount`** — Number (currently 0)
  - **`total`** — Number (final total)
- **`expiresAt`** — Date (30 days from last update, TTL indexed)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

**Indexes:**
- Unique index on `userId`
- TTL index on `expiresAt` (auto-deletes expired carts)

---

## Business Logic

### Price Resolution

**Both Products and Designs require completed slicing jobs for pricing.**

**Two Modes for Adding Items:**

**Mode 1: Using SlicingJobId (Recommended)**
- Directly uses the specified completed SlicingJob
- Gets price from `calculatedPrice` field
- Gets all printing properties from the job
- Validates job is completed and has a price
- Stores `slicingJobId` reference for tracking
- For Products: itemType is always "Design" when using slicingJobId

**Mode 2: Using Manual Parameters**

For **Designs**:
- Searches for matching completed SlicingJob based on:
  - Design ID
  - Material type
  - Color
  - Scale (default: 100)
  - Preset (default: "normal")
- Uses `calculatedPrice` from the most recent matching job
- Stores `slicingJobId` reference for tracking
- Throws error if no matching completed job exists

For **Products**:
- Gets `linkedDesignId` from the Product model
- Searches for matching completed SlicingJob for that design based on:
  - Linked Design ID
  - Material type
  - Color
  - Scale (default: 100)
  - Preset (default: "normal")
- Uses `calculatedPrice` from the most recent matching job
- Stores `slicingJobId` reference for tracking
- Throws error if no matching completed job exists

**Price Locking:**
- Prices are locked when items are added to cart
- No recalculation at checkout
- If same item is added again, uses latest price from slicing job

### Cart Expiration

- Carts expire 30 days after last update
- TTL index automatically removes expired carts
- `expiresAt` is updated on every cart modification

### Checkout Validation

1. Validates cart is not empty
2. Validates user exists
3. Validates all items have required material and color specifications
4. Uses locked prices from cart (prices are locked when items are added)
5. Creates order with cart items and pricing
6. Clears cart after successful order creation
6. Recalculates pricing summary
7. Creates order with validated data
8. Deletes cart after successful order creation

---

## Example Usage

```bash
# Get current cart
GET /api/v1/cart
Authorization: Bearer <token>

# Add product to cart
POST /api/v1/cart/items
Authorization: Bearer <token>

{
  "itemType": "Product",
  "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "quantity": 2,
  "printingProperties": {
    "material": "PLA",
    "color": "Red",
    "scale": 100,
    "preset": "normal"
  }
}

# Add design to cart (Mode 1: Using SlicingJobId - Recommended)
# Only slicingJobId and quantity are needed
POST /api/v1/cart/items
Authorization: Bearer <token>

{
  "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d6",
  "quantity": 1
}

# Add design to cart (Mode 2: Using Manual Parameters)
POST /api/v1/cart/items
Authorization: Bearer <token>

{
  "itemType": "Design",
  "itemRefId": "64f1a2b3c4d5e6f7a8b9c0d3",
  "quantity": 1,
  "printingProperties": {
    "material": "ABS",
    "color": "Blue",
    "scale": 150,
    "preset": "heavy"
  }
}

# Update item quantity
PATCH /api/v1/cart/items/64f1a2b3c4d5e6f7a8b9c0d5
Authorization: Bearer <token>

{
  "quantity": 5
}

# Remove item from cart
DELETE /api/v1/cart/items/64f1a2b3c4d5e6f7a8b9c0d5
Authorization: Bearer <token>

# Clear entire cart
DELETE /api/v1/cart
Authorization: Bearer <token>

# Checkout
POST /api/v1/cart/checkout
Authorization: Bearer <token>

{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Cairo",
    "country": "Egypt",
    "zip": "11511"
  },
  "paymentMethod": "COD"
}
```
