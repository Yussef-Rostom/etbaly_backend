[← Back to Main API Docs](./README.md)

# Module: Users

---

## Client Endpoints

Base path: `/api/v1/users`

All routes in this section require authentication (`Bearer <accessToken>`).

---

### `GET /api/v1/users/me`

- **Access:** Authenticated (any role)

Returns the authenticated user's full profile.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "role": "client",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "01012345678",
        "bio": "3D printing enthusiast",
        "avatarUrl": "https://drive.google.com/uc?id=..."
      },
      "savedAddresses": [
        {
          "street": "123 Main St",
          "city": "Cairo",
          "country": "Egypt",
          "zip": "11511"
        }
      ],
      "isVerified": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
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

### `PATCH /api/v1/users/me`

- **Access:** Authenticated (any role)

Updates the authenticated user's profile fields. All fields are optional; only provided fields are updated.

**Request Body (JSON)**

- **`firstName`** (*string*, Optional)
  - *Validation:* Min 2 chars, max 50 chars, trimmed
  - *Description:* Updated first name

- **`lastName`** (*string*, Optional)
  - *Validation:* Min 2 chars, max 50 chars, trimmed
  - *Description:* Updated last name

- **`phoneNumber`** (*string*, Optional)
  - *Validation:* Must match `/^01[0125][0-9]{8}$/`
  - *Description:* Egyptian mobile number

- **`avatarUrl`** (*string*, Optional)
  - *Validation:* Must be a valid URL previously uploaded via `PATCH /api/v1/users/me/avatar`
  - *Description:* Direct URL to the user's avatar image

- **`bio`** (*string*, Optional)
  - *Validation:* Max 500 characters
  - *Description:* Short user biography

- **`savedAddresses`** (*array of objects*, Optional)
  - *Description:* Replaces the entire saved addresses list
  - Each address object:
    - **`street`** (*string*, Required within object) — trimmed, non-empty
    - **`city`** (*string*, Required within object) — trimmed, non-empty
    - **`country`** (*string*, Required within object) — trimmed, non-empty
    - **`zip`** (*string*, Required within object) — trimmed, non-empty

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "role": "client",
      "profile": {
        "firstName": "Jane",
        "lastName": "Doe",
        "phoneNumber": "01012345678",
        "bio": "3D printing enthusiast",
        "avatarUrl": "https://drive.google.com/uc?id=..."
      },
      "savedAddresses": [],
      "isVerified": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "phoneNumber", "message": "Must be a valid Egyptian phone number" }] }
}
```

**Response 400 — Untracked Avatar**
```json
{
  "success": false,
  "message": "avatarUrl was not uploaded to our storage. Please upload the avatar first."
}
```

---

### `PATCH /api/v1/users/me/password`

- **Access:** Authenticated (any role)

Changes the authenticated user's password. Invalidates all active refresh tokens, forcing re-login on all devices.

**Request Body (JSON)**

- **`currentPassword`** (*string*, Required)
  - *Validation:* Non-empty string
  - *Description:* The user's existing password

- **`newPassword`** (*string*, Required)
  - *Validation:* Min 6 chars, max 128 chars, must contain at least one letter, one number, and one special character
  - *Description:* The new password to set

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Password changed successfully. Please log in again if necessary."
}
```

**Response 401 — Wrong Current Password**
```json
{
  "success": false,
  "message": "Incorrect current password."
}
```

---

### `PATCH /api/v1/users/me/avatar`

- **Access:** Authenticated (any role)
- **Content-Type:** `multipart/form-data`

Uploads a new avatar image for the authenticated user. The image is stored on Google Drive and the URL is saved to the user's profile. The previous avatar is marked for garbage collection if one exists.

**Form Fields**

- **`avatar`** (*file*, Required)
  - *Description:* The image file to upload (JPEG, PNG, etc.)

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully.",
  "data": {
    "avatarUrl": "https://drive.google.com/uc?id=..."
  }
}
```

**Response 400 — No File Provided**
```json
{
  "success": false,
  "message": "Please upload an image file."
}
```

---

## Admin Endpoints

Base path: `/api/v1/admin/users`

All routes in this section require authentication and the `admin` role.

---

### `GET /api/v1/admin/users`

- **Access:** Admin only

Returns a list of all registered users. Supports query-based filtering, sorting, and pagination.

**Query Parameters**

- **`page`** (*number*, Optional) — Page number for pagination (default: 1)
- **`limit`** (*number*, Optional) — Number of results per page
- **`sort`** (*string*, Optional) — Sort field (e.g. `-createdAt`)
- **`fields`** (*string*, Optional) — Comma-separated field projection
- Any model field can be used as a filter (e.g. `role=client`, `isVerified=true`)

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": {
    "results": 2,
    "users": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "email": "user@example.com",
        "role": "client",
        "isVerified": true,
        "profile": { "firstName": "John", "lastName": "Doe" },
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
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

---

### `PATCH /api/v1/admin/users/:id/role`

- **Access:** Admin only

Updates the role of a specific user.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the target user

**Request Body (JSON)**

- **`role`** (*string*, Required)
  - *Validation:* Must be one of `"client"`, `"admin"`, `"operator"`
  - *Description:* The new role to assign to the user

**Response 200 — OK**
```json
{
  "success": true,
  "message": "User role updated successfully.",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "role": "operator"
    }
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "role", "message": "Role must be one of: client, admin, operator" }] }
}
```

**Response 403 — Self-Role Change**
```json
{ "success": false, "message": "You cannot change your own role." }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "User not found." }
```

---

### `DELETE /api/v1/admin/users/:id`

- **Access:** Admin only

Permanently deletes a user account.

**Path Parameters**

- **`:id`** (*string*, Required) — MongoDB ObjectId of the user to delete

**Response 200 — OK**
```json
{
  "success": true,
  "message": "User deleted successfully."
}
```

**Response 403 — Self-Delete**
```json
{ "success": false, "message": "You cannot delete your own account." }
```

**Response 404 — Not Found**
```json
{ "success": false, "message": "User not found." }
```
