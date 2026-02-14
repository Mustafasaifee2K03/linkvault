# 🔐 LinkVault

LinkVault is a full-stack web application that allows users to upload either plain text or files and generate secure, temporary shareable links. The uploaded content is accessible only through a unique link and automatically expires after a specified duration.

This project was developed as a take-home assignment to demonstrate secure link-based access control, backend API design, and full-stack integration.

---

## 🚀 Tech Stack

### 🖥 Frontend
- **React (Vite)** – Single-page application framework
- **Tailwind CSS** – Utility-first CSS framework
- **React Router** – Client-side routing

### 🛠 Backend
- **Node.js** – JavaScript runtime
- **Express** – REST API framework
- **SQLite** – Lightweight file-based database
- **Multer** – File upload handling middleware
- **UUID** – Secure unique link generation
- **bcryptjs** – Password hashing for user accounts
- **node-cron** – Background cleanup scheduler

---

## 📂 Project Structure

```
linkvault/
├── linkvault-backend/      # Express server & database logic
├── linkvault-frontend/     # React frontend application
└── README.md
```

The backend and frontend are separated to maintain clear separation of concerns.

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone <your-repository-url>
cd linkvault
```

---

### 2️⃣ Start Backend

```bash
cd linkvault-backend
npm install
node index.js
```

Backend runs at:

```
http://localhost:4000
```

The SQLite database file is automatically created on first run.

---

### 3️⃣ Start Frontend

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

## ✨ Features

- Upload plain text or file (one per share)
- Secure UUID-based link generation
- Default 10-minute expiry (customizable)
- Password-protected links
- One-time access links
- Maximum view limit support
- Manual delete option using delete token
- User registration and login
- Owner dashboard to manage uploads
- Automatic background cleanup of expired content

---

## 🔌 API Overview

The backend exposes RESTful endpoints to manage authentication, uploads, access control, and content lifecycle.

### 🔐 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/register` | Creates a new user account and hashes the password |
| POST | `/api/login` | Authenticates user and returns session token |
| GET | `/api/me` | Returns currently authenticated user details |
| POST | `/api/logout` | Invalidates active session |

---

### 📦 Content Management Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/upload` | Uploads text or file and generates secure share link |
| GET | `/api/content/:id` | Retrieves content metadata and validates expiry |
| POST | `/api/access/:id` | Verifies password and increments view count |
| GET | `/api/download/:id` | Downloads file if access conditions are satisfied |
| POST | `/api/delete/:id` | Deletes content using owner auth or delete token |
| POST | `/api/stats/:id` | Returns content view statistics |

---

## 🧠 System Design Overview

### 🔹 Upload Flow

1. User submits text or file from frontend.
2. Backend validates input and file type.
3. A UUID is generated for secure link creation.
4. File (if any) is stored locally in the uploads folder.
5. Metadata is stored in SQLite database.
6. Unique share link is returned to the frontend.

---

### 🔹 Access Flow

1. User visits the shared link.
2. Backend validates:
   - Content exists
   - Content not expired
   - View limit not exceeded
   - Password (if required)
3. View count is incremented.
4. If marked as one-time, content is deleted after access.

---

### 🔹 Cleanup Flow

A background cron job runs periodically to:
- Remove expired content
- Delete associated files
- Clear expired sessions

---

## 🧩 Design Decisions

- **UUID v4 for Link Security**  
  Random 128-bit identifiers prevent brute-force guessing of links.

- **Expiry Validation at Runtime**  
  Expiry is checked during every request to ensure no expired content is accessible.

- **Background Cleanup Using Cron**  
  Ensures database and filesystem remain clean.

- **Separation of Metadata and Files**  
  Files stored locally, metadata stored in SQLite for simplicity.

- **Token-Based Authentication**  
  Session tokens stored with expiration for user authentication.

---

## ⚠️ Assumptions & Limitations

- Designed for single-server deployment.
- File storage is local (not cloud-based).
- No rate limiting implemented.
- Content passwords stored in plain text (can be improved with hashing).
- SQLite may not scale for high-traffic production systems.
- Intended for demonstration and academic purposes.

---

## ✅ Submission Notes

- Backend and frontend are separated.
- No `node_modules` folder included.
- Database file is excluded from version control.
- Application runs locally after cloning and installing dependencies.

---
