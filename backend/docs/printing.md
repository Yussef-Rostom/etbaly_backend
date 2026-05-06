[← Back to Main API Docs](./README.md)

# Module: Printing

Base path: `/api/v1/printing`

All routes require authentication. Management routes (review, start, complete, fail, queued) require `admin` or `operator` role.

---

## Overview

The printing module manages manual physical 3D printing workflows with admin approval and execution steps. Jobs originate from completed slicing jobs and follow a strict state machine requiring explicit admin action at each stage.

**Key Features:**
- Manual workflow with admin approval gate
- Strict state machine with validated transitions
- Queue integration — jobs are dispatched to the PRINTING queue using the PrintingJob `_id` as `jobId`
- Full status tracking through PrintingJob model

**Workflow:**
```
1. User completes cart checkout
   → PrintingJobs created automatically (status: "Pending Review"), one per cart item quantity
   → Each PrintingJob stores orderId + orderItemId for status sync
2. Admin calls POST /review → Approve (→ "Approved") or Reject (→ "Rejected")
3. Admin calls POST /queue → "Queued" (ready for printing)
4. Admin calls POST /start → "Processing" (sets startedAt)
   → Order item status updated to "Printing"
   → Admin downloads G-code from gcodeUrl and manually sends to printer
5. Admin calls POST /complete → "Completed" (sets finishedAt)
   → Order item status updated to "Ready"
   OR POST /fail → "Failed"
```

---

## Endpoints

### `POST /api/v1/printing/review`

- **Access:** Admin only

Approves or rejects a PrintingJob in `"Pending Review"` status.

**Request Body (JSON)**

- **`jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob
- **`action`** (*string*, Required) — `"approve"` | `"reject"`

**Response 200 — Approved**
```json
{
  "success": true,
  "message": "PrintingJob approved successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Approved"
  }
}
```

**Response 200 — Rejected**
```json
{
  "success": true,
  "message": "PrintingJob rejected successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Rejected"
  }
}
```

**Response 400 — Invalid Transition**
```json
{
  "success": false,
  "message": "Invalid status transition. Job must be in 'Pending Review' status."
}
```

---

### `POST /api/v1/printing/queue`

- **Access:** Admin only

Queues an approved PrintingJob, transitioning from `"Approved"` to `"Queued"`.

**Request Body (JSON)**

- **`jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob queued successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Queued"
  }
}
```

**Response 400 — Invalid Transition**
```json
{
  "success": false,
  "message": "Invalid status transition. Job must be in 'Approved' status."
}
```

---

### `GET /api/v1/printing/jobs`

- **Access:** Admin or Operator

Returns PrintingJobs with optional status filtering. Supports pagination, sorting, and filtering.

**Query Parameters**

- **`status`** (*string*, Optional) — Filter by job status
  - *Options:* `"Pending Review"`, `"Approved"`, `"Rejected"`, `"Queued"`, `"Processing"`, `"Completed"`, `"Failed"`
  - *Default:* `"Queued"` (if not specified)
  - *Example:* `status=Processing` returns only jobs currently being printed
  - *Example:* `status=Pending Review` returns jobs awaiting admin review

- **`page`** (*number*, Optional) — Page number (only applies if limit is provided)
- **`limit`** (*number*, Optional) — Results per page (if not provided, returns all results)
- **`sort`** (*string*, Optional) — Sort field (e.g. `createdAt`, `-createdAt`, default: `-createdAt`)

**Response 200 — OK (Queued Jobs - Default)**
```json
{
  "success": true,
  "message": "Printing jobs retrieved successfully.",
  "data": {
    "total": 25,
    "results": 25,
    "jobs": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "status": "Queued",
        "gcodeUrl": "https://storage.example.com/gcode/model.gcode",
        "fileName": "model.stl",
        "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d2",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:35:00Z"
      }
    ]
  }
}
```

**Response 200 — OK (Filtered by Status)**
```json
{
  "success": true,
  "message": "Printing jobs retrieved successfully.",
  "data": {
    "total": 5,
    "results": 5,
    "jobs": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "status": "Processing",
        "gcodeUrl": "https://storage.example.com/gcode/model2.gcode",
        "fileName": "model2.stl",
        "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d4",
        "machineId": "PRINTER-01",
        "startedAt": "2024-01-15T11:00:00Z",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

---

### `POST /api/v1/printing/start`

- **Access:** Admin or Operator

Starts a PrintingJob, transitioning from `"Queued"` to `"Processing"`.

**Request Body (JSON)**

- **`jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob
- **`machineId`** (*string*, Optional) — 3D printer identifier

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob started successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Processing",
    "machineId": "PRINTER-01",
    "startedAt": "2024-01-15T11:00:00Z",
    "gcodeUrl": "https://storage.example.com/gcode/model.gcode"
  }
}
```

> After starting, admin downloads the G-code from `gcodeUrl` and manually sends it to the physical printer.

**Response 400 — Invalid Transition**
```json
{
  "success": false,
  "message": "Invalid status transition. Job must be in 'Queued' status."
}
```

---

### `POST /api/v1/printing/complete`

- **Access:** Admin or Operator

Completes a PrintingJob, transitioning from `"Processing"` to `"Completed"`.

**Request Body (JSON)**

- **`jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob completed successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Completed",
    "finishedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Response 400 — Invalid Transition**
```json
{
  "success": false,
  "message": "Invalid status transition. Job must be in 'Processing' status."
}
```

---

### `POST /api/v1/printing/fail`

- **Access:** Admin or Operator

Fails a PrintingJob, transitioning from `"Processing"` to `"Failed"`.

**Request Body (JSON)**

- **`jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob marked as failed.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Failed",
    "finishedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Response 400 — Invalid Transition**
```json
{
  "success": false,
  "message": "Invalid status transition. Job must be in 'Processing' status."
}
```

---

### `GET /api/v1/printing/status/:jobId`

- **Access:** Admin or Operator

Returns a single PrintingJob with full population — slicing job details (STL URL, G-code URL, material, dimensions, weight, price), order info, and operator info.

**Path Parameters**

- **`:jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob retrieved successfully.",
  "data": {
    "job": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "status": "Queued",
      "gcodeUrl": "https://storage.example.com/gcode/model.gcode",
      "fileName": "model.stl",
      "machineId": null,
      "orderId": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
        "status": "Pending",
        "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "shippingAddressSnapshot": {
          "street": "123 Main St",
          "city": "Cairo",
          "country": "Egypt",
          "zip": "11511"
        },
        "pricingSummary": { "subtotal": 31.14, "total": 31.14 }
      },
      "orderItemId": "64f1a2b3c4d5e6f7a8b9c0d8",
      "slicingJobId": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d9",
        "stlFileUrl": "https://drive.google.com/uc?id=abc123",
        "gcodeUrl": "https://storage.example.com/gcode/model.gcode",
        "fileName": "model.stl",
        "material": "PLA",
        "color": "White",
        "preset": "normal",
        "scale": 100,
        "weight": 45.5,
        "dimensions": { "width": 100, "height": 50, "depth": 75 },
        "printTime": 180,
        "calculatedPrice": 31.14,
        "status": "Completed"
      },
      "operatorId": null,
      "startedAt": null,
      "finishedAt": null,
      "createdAt": "2026-04-30T10:00:00.000Z",
      "updatedAt": "2026-04-30T10:00:00.000Z"
    }
  }
}
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "PrintingJob not found." }
```

---

## Data Model

### PrintingJob

- **`_id`** — MongoDB ObjectId (used as `jobId` in all responses)
- **`slicingJobId`** — ObjectId ref → SlicingJob (required)
- **`orderId`** — ObjectId ref → Order (required) — used to update order item status
- **`orderItemId`** — ObjectId (required) — the specific order item this job prints
- **`status`** — `"Pending Review"` | `"Approved"` | `"Rejected"` | `"Queued"` | `"Processing"` | `"Completed"` | `"Failed"` (default: `"Pending Review"`)
- **`gcodeUrl`** — String (required, copied from the SlicingJob)
- **`machineId`** — Optional string (3D printer identifier, set on start)
- **`fileName`** — String (required, copied from the SlicingJob)
- **`operatorId`** — Optional ObjectId ref → User (operator who created the job via checkout)
- **`startedAt`** — Optional Date (set when admin calls `/start`)
- **`finishedAt`** — Optional Date (set when admin calls `/complete` or `/fail`)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

**Indexed fields:** `slicingJobId`, `orderId`, `orderItemId`, `status`

**Order item status sync:**
- `POST /start` → sets order item `status: "Printing"`
- `POST /complete` → sets order item `status: "Ready"`

**Status Flow:**
```
Pending Review → Approved (approve) → Queued (queue) → Processing → Completed
              → Rejected (reject)                                 → Failed
```

**Terminal states:** `Rejected`, `Completed`, `Failed`

## Example Usage

```bash
# Step 1: User completes checkout (printing jobs created automatically)
POST /api/v1/cart/checkout
Authorization: Bearer <token>
{
  "shippingAddress": { "street": "123 Main St", "city": "Cairo", "country": "Egypt", "zip": "12345" },
  "paymentMethod": "Card"
}
# → PrintingJobs created for each cart item unit (status: "Pending Review")
# → Each job stores orderId + orderItemId

# Step 2: Admin reviews
POST /api/v1/printing/review
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1", "action": "approve" }
# → status: "Approved"

# Step 3: Admin queues the approved job
POST /api/v1/printing/queue
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1" }
# → status: "Queued"

# Step 4: Admin gets queued jobs (default behavior)
GET /api/v1/printing/jobs
Authorization: Bearer <admin-token>

# Get jobs pending review
GET /api/v1/printing/jobs?status=Pending Review
Authorization: Bearer <admin-token>

# Get jobs currently processing
GET /api/v1/printing/jobs?status=Processing
Authorization: Bearer <admin-token>

# Get completed jobs with pagination
GET /api/v1/printing/jobs?status=Completed&page=1&limit=20
Authorization: Bearer <admin-token>

# Get approved jobs (ready to be queued)
GET /api/v1/printing/jobs?status=Approved
Authorization: Bearer <admin-token>

# Step 5: Admin starts printing
POST /api/v1/printing/start
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1", "machineId": "PRINTER-01" }
# → PrintingJob status: "Processing"
# → Order item status: "Printing"

# Step 6: Check job details (fully populated)
GET /api/v1/printing/status/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <admin-token>

# Step 7: Admin marks complete
POST /api/v1/printing/complete
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1" }
# → PrintingJob status: "Completed"
# → Order item status: "Ready"
```
