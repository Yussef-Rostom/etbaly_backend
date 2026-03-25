[← Back to Main API Docs](./README.md)

# Module: Auth

Base path: `/api/v1/auth`

All routes in this module are **Public** — no authentication required.

---

### `POST /api/v1/auth/register`

- **Access:** Public

Registers a new user account. Sends an OTP to the provided email for verification. The account is inactive until OTP is verified.

**Request Body (JSON)**

- **`firstName`** (*string*, Required)
  - *Validation:* Min 2 chars, max 50 chars, trimmed
  - *Description:* User's first name

- **`lastName`** (*string*, Required)
  - *Validation:* Min 2 chars, max 50 chars, trimmed
  - *Description:* User's last name

- **`email`** (*string*, Required)
  - *Validation:* Must be a valid email address, lowercased, trimmed
  - *Description:* User's email address — must be unique

- **`password`** (*string*, Required)
  - *Validation:* Min 6 chars, max 128 chars, must contain at least one letter, one number, and one special character (`/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/`)
  - *Description:* Account password

- **`phoneNumber`** (*string*, Optional)
  - *Validation:* Must match Egyptian phone number format `/^01[0125][0-9]{8}$/`
  - *Description:* Egyptian mobile number (e.g. `01012345678`)

**Response 201 — Created**
```json
{
  "success": true,
  "message": "Registration successful. An OTP has been sent to your email.",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "role": "client",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "01012345678"
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
      { "field": "password", "message": "Password must contain at least one letter, one number, and one special character" }
    ]
  }
}
```

**Response 409 — Conflict**
```json
{
  "success": false,
  "message": "A user with this email already exists."
}
```

---

### `POST /api/v1/auth/verify-otp`

- **Access:** Public

Verifies the OTP sent to the user's email after registration. On success, activates the account and returns tokens.

**Request Body (JSON)**

- **`email`** (*string*, Required)
  - *Validation:* Valid email, lowercased, trimmed
  - *Description:* The email address the OTP was sent to

- **`otp`** (*string*, Required)
  - *Validation:* Exactly 6 characters, digits only (`/^\d+$/`)
  - *Description:* The one-time password received via email

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Account verified successfully.",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "role": "client",
      "profile": { "firstName": "John", "lastName": "Doe" }
    },
    "accessToken": "<jwt_access_token>",
    "refreshToken": "<jwt_refresh_token>"
  }
}
```

**Response 400 — Invalid OTP**
```json
{
  "success": false,
  "message": "Invalid or expired OTP."
}
```

**Response 400 — Expired OTP**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}
```

---

### `POST /api/v1/auth/resend-otp`

- **Access:** Public

Resends a verification OTP to an unverified account's email. Always returns 200 OK regardless of whether the email exists or is already verified — prevents email enumeration.

**Request Body (JSON)**

- **`email`** (*string*, Required)
  - *Validation:* Valid email, lowercased, trimmed
  - *Description:* The email address of the unverified account

**Response 200 — OK**
```json
{
  "success": true,
  "message": "If an unverified account with that email exists, a new OTP has been sent.",
  "data": null
}
```

---

### `POST /api/v1/auth/login`

- **Access:** Public

Authenticates a verified user and returns access and refresh tokens.

**Request Body (JSON)**

- **`email`** (*string*, Required)
  - *Validation:* Valid email, lowercased, trimmed
  - *Description:* Registered email address

- **`password`** (*string*, Required)
  - *Validation:* Min 1 character (non-empty)
  - *Description:* Account password

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "role": "client",
      "profile": { "firstName": "John", "lastName": "Doe" }
    },
    "accessToken": "<jwt_access_token>",
    "refreshToken": "<jwt_refresh_token>"
  }
}
```

**Response 400 — Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "errors": [{ "field": "email", "message": "Please provide a valid email address" }] }
}
```

**Response 401 — Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

**Response 403 — Unverified Account**
```json
{
  "success": false,
  "message": "Please verify your account first."
}
```

---

### `POST /api/v1/auth/google`

- **Access:** Public

Authenticates or registers a user via Google OAuth. Accepts a Google ID token obtained from the client-side Google Sign-In flow.

**Request Body (JSON)**

- **`idToken`** (*string*, Required)
  - *Validation:* Non-empty string
  - *Description:* The Google ID token from the client-side Google Sign-In SDK

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Google authentication successful.",
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@gmail.com",
      "role": "client",
      "profile": { "firstName": "John", "lastName": "Doe" }
    },
    "accessToken": "<jwt_access_token>",
    "refreshToken": "<jwt_refresh_token>"
  }
}
```

**Response 401 — Invalid Token**
```json
{
  "success": false,
  "message": "Invalid Google ID Token"
}
```

---

### `POST /api/v1/auth/forgot-password`

- **Access:** Public

Sends a password-reset OTP to the provided email address. Always returns 200 OK regardless of whether the email exists — this is intentional to prevent email enumeration attacks.

**Request Body (JSON)**

- **`email`** (*string*, Required)
  - *Validation:* Valid email, lowercased, trimmed
  - *Description:* The email address associated with the account

**Response 200 — OK**
```json
{
  "success": true,
  "message": "If an account with that email exists, an OTP has been sent.",
  "data": null
}
```

---

### `POST /api/v1/auth/reset-password`

- **Access:** Public

Resets the user's password using the OTP received via email.

**Request Body (JSON)**

- **`email`** (*string*, Required)
  - *Validation:* Valid email, lowercased, trimmed
  - *Description:* The email address associated with the account

- **`otp`** (*string*, Required)
  - *Validation:* Exactly 6 digits (`/^\d+$/`)
  - *Description:* The OTP received via email

- **`newPassword`** (*string*, Required)
  - *Validation:* Min 6 chars, max 128 chars, must contain at least one letter, one number, and one special character
  - *Description:* The new password to set

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Password has been successfully reset. Please log in with your new password.",
  "data": null
}
```

**Response 400 — Invalid or Expired OTP**
```json
{
  "success": false,
  "message": "Invalid or expired OTP."
}
```

---

### `POST /api/v1/auth/refresh-token`

- **Access:** Public

Issues a new access token and rotates the refresh token.

**Request Body (JSON)**

- **`refreshToken`** (*string*, Required)
  - *Validation:* Non-empty string
  - *Description:* A valid refresh token previously issued by the server

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "<new_jwt_access_token>",
    "refreshToken": "<new_jwt_refresh_token>"
  }
}
```

**Response 403 — Invalid or Expired Refresh Token**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

---

### `POST /api/v1/auth/logout`

- **Access:** Public (token not required, but refresh token must be provided in body)

Invalidates the provided refresh token server-side.

**Request Body (JSON)**

- **`refreshToken`** (*string*, Optional)
  - *Description:* The refresh token to invalidate. If omitted, the request still succeeds silently.

**Response 200 — OK**
```json
{
  "success": true,
  "message": "Logged out successfully.",
  "data": null
}
```
