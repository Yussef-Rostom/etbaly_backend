[← Back to Main API Docs](./README.md)

# Module: Files

---

## Public Endpoints

Base path: `/api/v1/files`

Minimal authentication/access constraints apply depending on the target file.

---

### `GET /api/v1/files/proxy`

- **Access:** Public (requires valid Google Drive URL)

Proxies a Google Drive file to bypass CORS and authentication issues on the frontend. This is useful for displaying private images or serving 3D models directly to the browser.

**Query Parameters**

- **`url`** (*string*, Required) — The full Google Drive URL (view or download link) of the file to proxy.

**Response 200 — OK**
Returns the raw binary content of the file with appropriate `Content-Type` headers (e.g., `image/jpeg`, `application/octet-stream`).

**Response 400 — Invalid URL**
```json
{
  "success": false,
  "message": "Invalid Google Drive URL."
}
```

**Response 404 — Not Found**
```json
{
  "success": false,
  "message": "File not found or unreachable on Google Drive."
}
```

---
