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
1. User calls POST /execute with slicingJobId
   → PrintingJob created (status: "Pending Review"), dispatched to PRINTING queue
2. Admin calls POST /review → Approve (→ "Queued") or Reject (→ "Rejected")
3. Admin calls POST /start → "Processing" (sets startedAt)
   → Admin downloads G-code from gcodeUrl and manually sends to printer
4. Admin calls POST /complete or POST /fail → "Completed" / "Failed" (sets finishedAt)
```

---

## Endpoints

### `POST /api/v1/printing/execute`

- **Access:** Authenticated Users

Creates a PrintingJob from a completed slicing job and dispatches it to the PRINTING queue.

**Request Body (JSON)**

- **`slicingJobId`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Constraints:* The referenced SlicingJob must have status `"Completed"` and a valid `gcodeUrl`

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob created and dispatched to queue successfully. Awaiting review.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "PRINT-1705320000000-xyz789",
    "status": "Pending Review",
    "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "fileName": "model.stl",
    "gcodeUrl": "https://storage.example.com/gcode/model.gcode"
  }
}
```

**Response 400 — SlicingJob Not Completed**
```json
{
  "success": false,
  "message": "SlicingJob must be completed before creating a printing job."
}
```

**Response 400 — Missing G-code URL**
```json
{
  "success": false,
  "message": "SlicingJob must have a valid G-code URL."
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "slicingJobId", "message": "slicingJobId must be a valid MongoDB ObjectId" }
    ]
  }
}
```

**Response 404 — SlicingJob Not Found**
```json
{
  "success": false,
  "message": "SlicingJob not found."
}
```

**Response 401 — Unauthenticated**
```json
{ "success": false, "message": "You are not logged in. Please log in to get access." }
```

---

### `GET /api/v1/printing/status/:jobId`

- **Access:** Authenticated Users

Retrieves the current status and details of a printing job.

**Path Parameters**

- **`:jobId`** (*string*, Required) — MongoDB ObjectId of the PrintingJob

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob status retrieved successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "PRINT-1705320000000-xyz789",
    "status": "Processing",
    "gcodeUrl": "https://storage.example.com/gcode/model.gcode",
    "machineId": "PRINTER-01",
    "fileName": "model.stl",
    "startedAt": "2024-01-15T11:00:00Z",
    "finishedAt": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

**Response 404 — Not Found**
```json
{
  "success": false,
  "message": "PrintingJob not found."
}
```

---

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
    "jobNumber": "PRINT-1705320000000-xyz789",
    "status": "Queued"
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
    "jobNumber": "PRINT-1705320000000-xyz789",
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

### `GET /api/v1/printing/queued`

- **Access:** Admin or Operator

Returns all PrintingJobs with status `"Queued"`.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Queued printing jobs retrieved successfully.",
  "data": {
    "jobs": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "jobNumber": "PRINT-1705320000000-xyz789",
        "status": "Queued",
        "gcodeUrl": "https://storage.example.com/gcode/model.gcode",
        "fileName": "model.stl",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:35:00Z"
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
    "jobNumber": "PRINT-1705320000000-xyz789",
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
    "jobNumber": "PRINT-1705320000000-xyz789",
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
- **`reason`** (*string*, Optional) — Reason for failure

**Response 200 — OK**
```json
{
  "success": true,
  "message": "PrintingJob marked as failed.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "PRINT-1705320000000-xyz789",
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

## Data Model

### PrintingJob

- **`_id`** — MongoDB ObjectId (used as `jobId` in all responses)
- **`jobNumber`** — Unique string (format: `PRINT-{timestamp}-{random}`)
- **`slicingJobId`** — ObjectId ref → SlicingJob (required)
- **`status`** — `"Pending Review"` | `"Approved"` | `"Rejected"` | `"Queued"` | `"Processing"` | `"Completed"` | `"Failed"` (default: `"Pending Review"`)
- **`gcodeUrl`** — String (required, copied from the SlicingJob)
- **`machineId`** — Optional string (3D printer identifier, set on start)
- **`fileName`** — String (required, copied from the SlicingJob)
- **`operatorId`** — Optional ObjectId ref → User (user who created the job)
- **`startedAt`** — Optional Date (set when admin calls `/start`)
- **`finishedAt`** — Optional Date (set when admin calls `/complete` or `/fail`)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

**Indexed fields:** `jobNumber`, `slicingJobId`, `status`

**Status Flow:**
```
Pending Review → Queued (approve) → Processing → Completed
              → Rejected (reject)             → Failed
```

**Terminal states:** `Rejected`, `Completed`, `Failed`

---

## Queue Integration

When a PrintingJob is created, it is dispatched to the `PRINTING` BullMQ queue with the following payload:

```json
{
  "jobId": "<printingJob._id>",
  "ownerId": "<user._id>",
  "gcodeUrl": "<slicingJob.gcodeUrl>",
  "designId": "<slicingJob.designId>"
}
```

> There is currently no automated printing worker. The queue is in place for future automation. All state transitions are manual via the admin endpoints.

---

## Example Usage

```bash
# Step 1: Create printing job from a completed slicing job
POST /api/v1/printing/execute
Authorization: Bearer <token>
{ "slicingJobId": "64f1a2b3c4d5e6f7a8b9c0d2" }

# Step 2: Check status
GET /api/v1/printing/status/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <token>

# Step 3: Admin approves
POST /api/v1/printing/review
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1", "action": "approve" }

# Step 4: Admin gets queued jobs
GET /api/v1/printing/queued
Authorization: Bearer <admin-token>

# Step 5: Admin starts printing
POST /api/v1/printing/start
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1", "machineId": "PRINTER-01" }
# → Download gcodeUrl and send to printer manually

# Step 6: Admin marks complete
POST /api/v1/printing/complete
Authorization: Bearer <admin-token>
{ "jobId": "64f1a2b3c4d5e6f7a8b9c0d1" }
```
