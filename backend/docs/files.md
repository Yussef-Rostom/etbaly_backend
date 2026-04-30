[← Back to Main API Docs](./README.md)

# Module: Files

Base path: `/api/v1/files`

Routes have minimal authentication constraints and are primarily used for proxying Google Drive content.

---

## Overview

The files module provides a proxy service for Google Drive files to bypass CORS restrictions and authentication issues on the frontend. This enables seamless display of private images, 3D models, and other file types stored in Google Drive.

**Key Features:**
- CORS-free access to Google Drive files
- Automatic content-type detection and forwarding
- Support for all file types (images, 3D models, documents)
- No authentication required (relies on Google Drive URL validity)
- Direct binary streaming for optimal performance

**Workflow:**
```
1. Frontend needs to display a Google Drive file
2. Frontend calls GET /proxy?url=<drive-url>
3. Backend fetches file from Google Drive
4. Backend streams file to frontend with proper headers
5. Frontend displays/uses the file without CORS issues
```

**Use Cases:**
- Displaying user avatars stored in Google Drive
- Rendering 3D model previews in the browser
- Showing design thumbnails
- Accessing G-code files for printing
- Viewing uploaded STL files

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
