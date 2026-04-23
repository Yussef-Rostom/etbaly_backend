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

**Workflow:**
```
1. User calls POST /execute
2. System creates SlicingJob (status: "Queued")
3. Job dispatched to SLICING queue
4. BullMQ worker picks up job
5. Worker updates status to "Processing"
6. Worker performs slicing operation
7. Worker updates status to "Completed" (with gcodeUrl) or "Failed"
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
  - *Validation:* One of: "heavy", "normal", "draft"
  - *Description:* Slicing quality preset
    - `heavy`: High quality/strength (0.1mm layer height, 40% infill, 4 perimeters)
    - `normal`: Balanced quality (0.2mm layer height, 20% infill, 3 perimeters)
    - `draft`: Fast/light (0.3mm layer height, 10% infill, 2 perimeters)
  - *Default:* "normal"

- **`scale`** (*number*, Optional)
  - *Validation:* Positive number
  - *Description:* Scale factor for the model (e.g., 100 = 100%, 50 = 50% size)
  - *Default:* 100

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Slicing job for design My Awesome Model dispatched successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "SLICE-1705320000000-abc123",
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

**Response 403 — Forbidden**
```json
{ 
  "success": false, 
  "message": "You do not have permission to perform this action." 
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
    "jobNumber": "SLICE-1705320000000-abc123",
    "status": "Completed",
    "stlFileUrl": "https://storage.example.com/models/model_123.stl",
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

**Response 400 — Invalid ID**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "jobId", "message": "jobId must be a valid MongoDB ObjectId" }
    ]
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

**Response 403 — Forbidden**
```json
{ 
  "success": false, 
  "message": "You do not have permission to perform this action." 
}
```

---

## Data Model

### SlicingJob

Represents an automated slicing operation that converts STL files to G-code.

**Fields:**

- **`_id`** — MongoDB ObjectId
- **`jobNumber`** — Unique string within SlicingJob collection (e.g., "SLICE-2024-001")
- **`designId`** — ObjectId ref → Design (required)
- **`targetOrderItemId`** — Optional ObjectId (ref to an order item)
- **`status`** — `"Queued"` | `"Processing"` | `"Completed"` | `"Failed"` (default: `"Queued"`)
- **`stlFileUrl`** — Optional string (URL to input STL file)
- **`gcodeUrl`** — Optional string (URL to generated G-code file, set on completion)
- **`fileName`** — Optional string (original file name)
- **`weight`** — Optional number (weight in grams, required when status is "Completed")
- **`dimensions`** — Optional object (dimensions in mm, required when status is "Completed")
  - **`width`** — number (width in mm)
  - **`height`** — number (height in mm)
  - **`depth`** — number (depth in mm)
- **`printTime`** — Optional number (estimated print time in minutes, required when status is "Completed")
- **`calculatedPrice`** — Optional number (calculated price based on weight and time, required when status is "Completed")
- **`startedAt`** — Optional Date (timestamp when processing started, set by worker)
- **`finishedAt`** — Optional Date (timestamp when processing completed or failed, set by worker)
- **`orderId`** — Optional ObjectId ref → Order
- **`operatorId`** — Optional ObjectId ref → User (user who initiated the job)
- **`createdAt`** — Date (auto-managed by timestamps)
- **`updatedAt`** — Date (auto-managed by timestamps)

**Status Flow:**
```
Queued → Processing → Completed
                   → Failed
```

**Constraints:**
- `jobNumber` is unique within the SlicingJob collection
- `designId` is required and must reference a valid Design document
- Indexed fields: `jobNumber`, `designId`, `orderId`, `status`

---

## Workflow Details

### Automated Slicing Workflow

The slicing workflow is fully automated via BullMQ queue workers:

**Step 1: Job Creation**
- User calls `POST /execute` with designId and optional material
- System validates the design exists
- System generates unique jobNumber (format: `SLICE-{timestamp}-{random}`)
- System creates SlicingJob document with status `"Queued"` and references the design
- Job is dispatched to SLICING queue

**Step 2: Processing**
- BullMQ worker picks up job from queue
- Worker updates SlicingJob status to `"Processing"`
- Worker sets `startedAt` timestamp
- Worker calls external slicing API at `http://${WORKER_SERVER_HOST}:${WORKER_SERVER_PORT}/api/slice`
- External API performs actual slicing operation (STL to G-code conversion)
- If external API fails, worker falls back to mock simulation

**Step 3: Completion**
- On success:
  - Worker updates status to `"Completed"`
  - Worker sets `gcodeUrl` with generated G-code file URL
  - Worker sets `weight`, `dimensions`, and `printTime` from worker server response
  - Worker calculates price based on:
    - Material cost: `weight × material.currentPricePerGram`
    - Time cost: `(printTime / 60) × PRINTING_HOURLY_RATE`
    - Total: `materialCost + timeCost`
  - Worker sets `calculatedPrice` with the computed price
  - Worker sets `finishedAt` timestamp
- On failure:
  - Worker updates status to `"Failed"`
  - Worker sets `finishedAt` timestamp
  - Error logged with correlationId for traceability

**No manual intervention required** - the entire workflow is automated.

### Worker Server Integration

The slicing worker integrates with an external Python-based worker server for actual slicing operations:

**Worker Server Configuration:**
- Host: `WORKER_SERVER_HOST` (default: `localhost`)
- Port: `WORKER_SERVER_PORT` (default: `8080`)
- API Endpoint: `POST /api/slice`

**Request to Worker Server:**
```json
{
  "filename": "model.stl",
  "output_filename": "gcode-{jobId}-{timestamp}",
  "material": "pla",
  "preset": "normal",
  "scale": 100
}
```

**Note:** The `preset` and `scale` fields are optional. If not provided in the job data, they will be omitted from the request, and the worker server will use its default values (preset: "normal", scale: 100).

**Response from Worker Server:**
```json
{
  "status": "success",
  "original_file": "model.stl",
  "gcode_file": "output.gcode",
  "gcode_path": "/path/to/gcode/output.gcode",
  "preset": "normal",
  "material": "pla",
  "scale": 100,
  "weight": 45.5,
  "dimensions": {
    "width": 100,
    "height": 50,
    "depth": 75
  },
  "print_time": 180
}
```

**Required Fields in Worker Server Response:**
- `weight` (number): Weight of the model in grams
- `dimensions` (object): Dimensions of the model in millimeters
  - `width` (number): Width in mm
  - `height` (number): Height in mm
  - `depth` (number): Depth in mm
- `print_time` (number): Estimated print time in minutes

**Fallback Behavior:**
- If worker server is unavailable or returns an error, the system automatically falls back to mock simulation
- Mock simulation generates:
  - Dummy G-code URL after a 5-second delay
  - Random weight between 20-70 grams
  - Random dimensions between 50-150 mm for each axis (width, height, depth)
  - Random print time between 60-240 minutes
  - Calculated price using the same pricing formula as real slicing
- Mock data is marked with `isMock: true` in the worker response
- This ensures the system remains operational even if the worker server is down
- All required fields (weight, dimensions, printTime, calculatedPrice) are populated in both real and mock modes

### Price Calculation

The slicing worker automatically calculates the price for each completed job based on:

**Formula:**
```
Price = (weight × material_price_per_gram) + (print_time_minutes / 60 × hourly_rate)
```

**Components:**
1. **Material Cost**: Weight in grams multiplied by the material's `currentPricePerGram` from the Material model
2. **Time Cost**: Print time in minutes converted to hours, multiplied by the `PRINTING_HOURLY_RATE` setting

**Configuration:**
- Material prices are stored in the Material model (`currentPricePerGram` field)
- Hourly rate is stored in Settings with key `PRINTING_HOURLY_RATE` (default: 10)

**Example Calculation:**
- Weight: 45.5 grams
- Material: PLA at $0.025/gram
- Print time: 180 minutes (3 hours)
- Hourly rate: $10/hour

```
Material cost = 45.5 × 0.025 = $1.14
Time cost = (180 / 60) × 10 = $30.00
Total price = $1.14 + $30.00 = $31.14
```

---

## Error Handling

### Common Errors

**Validation Errors (400)**
- Missing required fields
- Invalid field formats
- Mutual exclusivity violations (productId vs targetOrderItemId)

**Authentication Errors (401)**
- Missing or invalid authentication token
- Expired session

**Authorization Errors (403)**
- User lacks required role (admin or operator)

**Processing Errors**
- Handled automatically by worker
- Job status updated to "Failed"
- Retry logic applied (up to 3 attempts)
- Failed jobs moved to Dead Letter Queue (DLQ)

---

## Queue Configuration

**Queue Name:** `SLICING`
**Backend:** Redis via BullMQ
**Worker:** `SlicingWorkerService`
**Retry Policy:** Up to 3 attempts with exponential backoff
**DLQ:** Failed jobs after exhausting retries

### Worker Behavior

The SlicingWorkerService:
- Picks up jobs from the SLICING queue
- Updates job status to "Processing"
- Performs slicing operation (or mock simulation)
- Updates job status to "Completed" with gcodeUrl on success
- Updates job status to "Failed" on error
- Logs all operations with correlationId for traceability

---

## Job Number Uniqueness

- Job numbers are unique **within** the SlicingJob collection
- The same job number can exist in both SlicingJob and PrintingJob collections
- Example: `"JOB-001"` can exist as both a SlicingJob and a PrintingJob

---

## Monitoring

Monitor slicing jobs through:
- Job status in SlicingJob collection
- BullMQ dashboard (if configured)
- Application logs with correlationId
- Queue metrics (waiting, active, completed, failed counts)

---

## Example Usage

### Create and Dispatch Slicing Job

**Basic Example (with defaults):**
```bash
POST /api/v1/slicing/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "designId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "material": "PLA"
}
```

**Advanced Example (with custom preset and scale):**
```bash
POST /api/v1/slicing/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "designId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "material": "PETG",
  "preset": "heavy",
  "scale": 150
}
```

**Response:**
```json
{
  "success": true,
  "message": "Slicing job for design My Awesome Model dispatched successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "SLICE-1705320000000-abc123",
    "status": "Queued",
    "designId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "designName": "My Awesome Model"
  }
}
```

**Job progresses automatically:**
```
Queued → Processing → Completed (with gcodeUrl)
```

No further API calls needed - fully automated!

### Check Slicing Job Status

```bash
GET /api/v1/slicing/status/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <token>
```

**Response (Job in Progress):**
```json
{
  "success": true,
  "message": "SlicingJob status retrieved successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "SLICE-1705320000000-abc123",
    "status": "Processing",
    "stlFileUrl": "https://storage.example.com/models/model_123.stl",
    "gcodeUrl": null,
    "fileName": "model_123.stl",
    "startedAt": "2024-01-15T10:30:00Z",
    "finishedAt": null,
    "createdAt": "2024-01-15T10:29:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (Job Completed):**
```json
{
  "success": true,
  "message": "SlicingJob status retrieved successfully.",
  "data": {
    "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "jobNumber": "SLICE-1705320000000-abc123",
    "status": "Completed",
    "stlFileUrl": "https://storage.example.com/models/model_123.stl",
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

