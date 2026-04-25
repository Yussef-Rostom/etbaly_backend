[← Back to Main API Docs](./README.md)

# Module: Slicing

Base path: `/api/v1/slicing`

All routes require authentication. Available to all authenticated users.

---

## Overview

The slicing module manages automated conversion of 3D models (STL files) into machine instructions (G-code) via BullMQ queue workers. Slicing jobs are fully automated and require no manual intervention once dispatched.

**Key Features:**
- Automated processing via BullMQ workers
- Real-time status tracking through SlicingJob model
- Queue management with Redis-backed BullMQ
- Automatic retry logic and failure tracking
- Automatic fallback to mock simulation if worker server is unavailable

**Workflow:**
```
1. User calls POST /execute with designId
2. System creates SlicingJob (status: "Queued")
3. Job dispatched to SLICING queue
4. BullMQ worker picks up job
5. Worker updates status to "Processing"
6. Worker downloads STL from Google Drive and calls external slicing API
7. Worker updates status to "Completed" (with gcodeUrl, weight, dimensions, printTime, calculatedPrice) or "Failed"
```

---

## Endpoints

### `POST /api/v1/slicing/execute`

- **Access:** Authenticated Users

Creates a SlicingJob and dispatches it to the automated slicing queue for processing.

**Request Body (JSON)**

- **`designId`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Description:* The ID of the design to slice (must exist in the Design collection)

- **`material`** (*string*, Optional)
  - *Validation:* Non-empty string, trimmed
  - *Description:* Material type for slicing (e.g., "PLA", "ABS", "PETG", "PLA+")
  - *Default:* "PLA"

- **`preset`** (*string*, Optional)
  - *Validation:* One of: `"heavy"`, `"normal"`, `"draft"`
  - *Description:* Slicing quality preset
    - `heavy`: High quality/strength (0.1mm layer height, 40% infill, 4 perimeters)
    - `normal`: Balanced quality (0.2mm layer height, 20% infill, 3 perimeters)
    - `draft`: Fast/light (0.3mm layer height, 10% infill, 2 perimeters)

- **`scale`** (*number*, Optional)
  - *Validation:* Positive number
  - *Description:* Scale factor for the model (e.g., 100 = 100%, 50 = 50% size)

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Slicing job for design My Awesome Model dispatched successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Queued",
    "designId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "designName": "My Awesome Model"
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
      { "field": "designId", "message": "designId must be a valid MongoDB ObjectId" }
    ]
  }
}
```

**Response 404 — Design Not Found**
```json
{
  "success": false,
  "message": "Design not found"
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

### `GET /api/v1/slicing/status/:jobId`

- **Access:** Authenticated Users

Retrieves the current status and details of a slicing job.

**Path Parameters**

- **`:jobId`** (*string*, Required)
  - *Validation:* Valid MongoDB ObjectId (24-character hex string)
  - *Description:* The ID of the SlicingJob to retrieve

**Response 200 — OK**
```json
{
  "success": true,
  "message": "SlicingJob status retrieved successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "Completed",
    "stlFileUrl": "https://drive.google.com/uc?id=abc123",
    "gcodeUrl": "https://storage.example.com/gcode/model_123.gcode",
    "fileName": "model_123.stl",
    "weight": 45.5,
    "dimensions": {
      "width": 100,
      "height": 50,
      "depth": 75
    },
    "printTime": 180,
    "calculatedPrice": 31.14,
    "startedAt": "2024-01-15T10:30:00Z",
    "finishedAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:29:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Response 404 — Not Found**
```json
{
  "success": false,
  "message": "SlicingJob not found."
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

### SlicingJob

Represents an automated slicing operation that converts STL files to G-code.

**Fields:**

- **`_id`** — MongoDB ObjectId (used as `jobId` in all responses)
- **`designId`** — ObjectId ref → Design (required)
- **`targetOrderItemId`** — Optional ObjectId (ref to an order item)
- **`orderId`** — Optional ObjectId ref → Order
- **`operatorId`** — Optional ObjectId ref → User (user who initiated the job)
- **`status`** — `"Queued"` | `"Processing"` | `"Completed"` | `"Failed"` (default: `"Queued"`)
- **`stlFileUrl`** — Optional string (URL to input STL file from Google Drive)
- **`gcodeUrl`** — Optional string (URL to generated G-code file, set on completion)
- **`fileName`** — Optional string (original file name)
- **`weight`** — Optional number (weight in grams, set on completion)
- **`dimensions`** — Optional object (dimensions in mm, set on completion)
  - **`width`** — number
  - **`height`** — number
  - **`depth`** — number
- **`printTime`** — Optional number (estimated print time in minutes, set on completion)
- **`calculatedPrice`** — Optional number (calculated price, set on completion)
- **`startedAt`** — Optional Date (set by worker when processing begins)
- **`finishedAt`** — Optional Date (set by worker on completion or failure)
- **`createdAt`** / **`updatedAt`** — ISO 8601 timestamps

**Status Flow:**
```
Queued → Processing → Completed
                   → Failed
```

---

## Workflow Details

### Automated Slicing Workflow

**Step 1: Job Creation**
- User calls `POST /execute` with `designId` and optional `material`, `preset`, `scale`
- System validates the design exists
- System creates SlicingJob document with status `"Queued"`, copying `fileUrl` and `name` from the Design
- Job dispatched to SLICING queue with `jobId` = SlicingJob `_id`

**Step 2: Processing**
- BullMQ worker picks up job from queue
- Worker updates status to `"Processing"`, sets `startedAt`
- Worker extracts Google Drive file ID from `stlUrl` and downloads the STL file
- Worker calls external slicing API: `POST http://{WORKER_SERVER_HOST}:{WORKER_SERVER_PORT}/api/slice`
- If external API fails, worker automatically falls back to mock simulation

**Step 3: Completion**
- On success: status → `"Completed"`, sets `gcodeUrl`, `weight`, `dimensions`, `printTime`, `calculatedPrice`, `finishedAt`
- On failure: status → `"Failed"`, sets `finishedAt`

### Worker Server Integration

**Request to Worker Server:**
```json
{
  "filename": "model-{designId}-{timestamp}.stl",
  "output_filename": "gcode-{designId}-{timestamp}",
  "material": "pla",
  "preset": "normal",
  "scale": 100
}
```

**Response from Worker Server:**
```json
{
  "gcode_file": "output.gcode",
  "gcode_path": "/path/to/gcode/output.gcode",
  "weight": 45.5,
  "dimensions": { "width": 100, "height": 50, "depth": 75 },
  "print_time": 180
}
```

**Fallback Mock Behavior:**
- Triggered automatically if worker server is unavailable
- Generates a dummy G-code URL after a 5-second delay
- Random weight (20–70g), dimensions (50–150mm per axis), print time (60–240 min)
- Price is calculated using the same formula as real slicing
- All required fields are populated in both real and mock modes

### Price Calculation

```
Price = (weight × material.currentPricePerGram) + (printTime / 60 × PRINTING_HOURLY_RATE)
```

- Material prices stored in the Material model (`currentPricePerGram`)
- Hourly rate stored in Settings with key `PRINTING_HOURLY_RATE` (default: 10)

**Example:**
- Weight: 45.5g, PLA at $0.025/g, print time: 180 min, hourly rate: $10
- Material cost: 45.5 × 0.025 = $1.14
- Time cost: (180 / 60) × 10 = $30.00
- Total: $31.14

---

## Queue Configuration

- **Queue Name:** `SLICING`
- **Backend:** Redis via BullMQ
- **Concurrency:** 1 (CPU-intensive, one job at a time)
- **Retry Policy:** Up to 3 attempts with exponential backoff
- **DLQ:** Failed jobs after exhausting retries are routed to `DEAD_LETTER_QUEUE`

---

## Example Usage

```bash
# Dispatch a slicing job
POST /api/v1/slicing/execute
Authorization: Bearer <token>

{
  "designId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "material": "PETG",
  "preset": "heavy",
  "scale": 150
}

# Poll for status
GET /api/v1/slicing/status/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <token>
```
