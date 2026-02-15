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
git clone <repository-url>
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

