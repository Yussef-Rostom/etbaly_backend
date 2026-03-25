[← Back to Main API Docs](./README.md)

# Module: Manufacturing

Base path: `/api/v1/admin/manufacturing`

All routes require authentication and either the `admin` or `operator` role.

---

### `POST /api/v1/admin/manufacturing/execute`

- **Access:** Admin or Operator

Dispatches a manufacturing job to the appropriate processing queue (slicing or printing).

**Request Body (JSON)**

- **`jobId`** (*string*, Required)
  - *Validation:* Non-empty string, trimmed
  - *Description:* The ID of the ManufacturingJob document to process

- **`action`** (*string*, Required)
  - *Validation:* Must be one of `"start_slicing"` or `"start_printing"`
  - *Description:* The manufacturing action to dispatch
    - `"start_slicing"` — Sends the job to the slicing queue to generate G-code from the 3D model
    - `"start_printing"` — Sends the job to the 3D printing queue to begin physical printing

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Job job_123 dispatched to start_slicing queue successfully."
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "action", "message": "Invalid enum value. Expected 'start_slicing' | 'start_printing'" }
    ]
  }
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
