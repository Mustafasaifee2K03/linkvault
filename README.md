```markdown
# LinkVault

LinkVault is a full-stack web application that allows users to upload either plain text or files and generate secure, temporary shareable links. The uploaded content is accessible only through a unique link and automatically expires after a specified duration.

This project was developed as a take-home assignment to demonstrate secure link-based access control, backend API design, and full-stack integration.

---

## Tech Stack

### Frontend

- React (Vite) – Single-page application  
- Tailwind CSS – Utility-based styling  
- React Router – Client-side routing  

### Backend

- Node.js  
- Express  
- SQLite  
- Multer  
- UUID  
- bcryptjs  
- node-cron  

---

## Project Structure

```

linkvault/

├── linkvault-backend/

├── linkvault-frontend/

└── README.md

````

---

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/Mustafasaifee2K03/linkvault.git
cd linkvault
````

### 2. Start Backend

```bash
cd linkvault-backend
npm install
node index.js
```

Backend runs at:

```
http://localhost:4000
```

### 3. Start Frontend

Open a new terminal:

```bash
cd linkvault-frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## Features

* Upload plain text or file
* Secure UUID-based link generation
* Default 10-minute expiry
* Password-protected links
* One-time access
* Maximum view limit
* Manual delete token
* User authentication
* Owner dashboard
* Automatic cleanup of expired content

---

## API Overview

### Authentication

**POST /api/register**
Creates a new user account and hashes the password.

**POST /api/login**
Authenticates user and returns a session token.

**GET /api/me**
Returns currently authenticated user.

**POST /api/logout**
Invalidates the session token.

---

### Content Management

**POST /api/upload**
Uploads text or file and generates a unique shareable link.

**GET /api/content/:id**
Retrieves content metadata and validates access rules.

**POST /api/access/:id**
Verifies password (if required) and increments view count.

**GET /api/download/:id**
Downloads the associated file if access conditions are satisfied.

**POST /api/delete/:id**
Deletes content using owner authentication or delete token.

**POST /api/stats/:id**
Returns view statistics.


## Design Decisions

### 1. Use of UUID for Link Generation

Instead of using incremental IDs (1, 2, 3, …), we are doing it such that each uploaded content entry is assigned a UUID v4 value. The main reason for this decision was security. Sequential IDs can be guessed easily, which would allow users to brute force and access content that was not meant for them. A UUID provides a very large address space (128-bit randomness), making brute-force guessing practically impossible.

This approach ensures that access to content is strictly link-based, as required in the assignment.

---

### 2. Expiry Enforcement at Request Time

Although a background cleanup job removes expired records periodically, content expiration is also checked during every access request. This was done intentionally to prevent edge cases where:

- The cron job responsible for cleanup purpose has not yet executed.
- The server restarts before cleanup runs.

By validating expiry during each API call, the system guarantees that expired content is never accessible, even if background cleanup is delayed.

---

### 3. Background Cleanup Using node-cron

A scheduled job runs every few minutes to:

- Delete expired content from the database.
- also remove uploaded files associated from disk.
- Clear expired user sessions.

This prevents accumulation of useless records and unused files. And expiry enforcement at request tiem(as we discussed ewrlier) validation blocks access to expired content, the cron job ensures long-term consistency and deal with storage issues.

---

### 4. Separation of Metadata and File Storage

Uploaded files are stored in a local directory (`/uploads`), while metadata such as expiry time, view count, password protection, and owner information is stored in SQLite database.

This separation keeps the system easier to manage. The database handles structured data and logic constraints, while the filesystem handles binary file storage. Removing content requires deleting both the database row and the corresponding file, which keeps the system consistent.

---

### 5. SQLite as the Database

SQLite was chosen because:

- It is lightweight and file-based.
- It does not require separate server configuration.
- It is sufficient for a single-node academic project(not for production where multiple nodes may be required).

Since this project is intended for demonstration and local execution, SQLite provides simplicity without introducing additional infrastructure complexity. For large-scale deployment, a production database such as PostgreSQL would be more appropriate.

---

### 6. Token-Based Session Authentication

User authentication is implemented using session tokens stored in a dedicated `sessions` table. When a user logs in:

- A UUID token is generated.
- The token is stored with an expiration time.
- The frontend includes the token in subsequent requests.

This avoids maintaining in-memory sessions and keeps authentication persistent across server restarts.

---

### 7. Input Validation on Both Frontend and Backend

Validation is implemented at two levels.

Frontend validation includes:

- File size limits.
- Allowed MIME type checks.
- Required input checks.

Backend validation includes:

- File size enforcement through Multer.
- MIME type whitelist validation.
- Expiry validation.
- View count enforcement.
- Password validation.

This layered validation ensures thta if user bypasses frontend checks still the system integrity doesnt compromise.

---

### 8. View Count and One-Time Access Handling

The view count is incremented only after successful validation of expiry, password (if required), and maximum view constraints.

For one-time links, the content is deleted immediately after successful access. This guarantees that the link cannot be reused.

The update query ensures that view limits are respected and prevents exceeding the maximum view count.

---

### 9. Delete Token Mechanism

Each content entry is assigned a delete token in addition to optional owner authentication. This allows manual deletion even if the uploader is not logged in.

This design choice improves usability while maintaining controlled access.

---

### 10. RESTful API Structure

The backend routes are structured using resource-based endpoints such as:

- `/api/upload`
- `/api/content/:id`
- `/api/download/:id`

HTTP methods (GET, POST) are used consistently based on action type. This keeps the API predictable and logically organized.



## Assumptions & Limitations

### Assumptions

1. The application is intended to run on a single server instance.  
   It assumes that both the backend and the SQLite database file are hosted on the same machine.

2. The system is designed primarily for local execution and demonstration purposes.  
   It assumes a development environment where the frontend and backend run on `localhost`.

3. It is assumed that users will securely store their generated share link and delete token if they wish to access or delete the content later.

4. The system assumes moderate usage. SQLite and local file storage are sufficient for small-scale applications but not designed for high-concurrency production environments.

5. It is assumed that file uploads will not exceed the configured size limit (10MB), and only allowed MIME types are accepted.

---

### Limitations

1. **Local File Storage**  
   Uploaded files are stored in a local directory (`uploads/`).  
   This means:
   - Files are not distributed across servers.
   - If the server is restarted or storage is cleared, files may be lost.
   - The system is not optimized for horizontal scaling.

2. **SQLite Database**  
   SQLite is used for simplicity. While it works well for single-node systems, it may not handle high traffic or concurrent writes efficiently in large-scale deployments.

3. **No Rate Limiting**  
   The application does not implement rate limiting. In a production environment, rate limiting would be necessary to prevent abuse or brute-force attempts.

4. **Content Password Storage**  
   Content-level passwords are stored in plain text.  
   Although user account passwords are hashed using bcrypt, content passwords could be improved by hashing and using constant-time comparison.

5. **No Distributed Deployment Support**  
   The current architecture does not support multi-server deployment. Shared file storage or cloud object storage would be required for scaling.

6. **No HTTPS Enforcement in Development**  
   The application is designed for local development and does not enforce HTTPS. Secure deployment would require HTTPS configuration.

7. **Manual Delete Token Responsibility**  
   If a user uploads content without logging in and loses the delete token, there is no way to recover or manually delete the content before expiration.

8. **No Advanced Logging or Monitoring**  
   The application does not include structured logging, monitoring, or analytics features that would typically be required in production systems.

---


