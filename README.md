# LinkVault

LinkVault is a full-stack web application that allows users to upload either plain text or files and generate secure, temporary shareable links. The uploaded content is accessible only through a unique link and automatically expires after a specified duration.

This project was developed as a take-home assignment to demonstrate secure link-based access control, backend API design, and full-stack integration.

---

## 🚀 Tech Stack

### Frontend
- **React (Vite)** – Single-page application
- **Tailwind CSS** – Utility-based styling
- **React Router** – Client-side routing

### Backend
- **Node.js**
- **Express**
- **SQLite**
- **Multer**
- **UUID**
- **bcryptjs**
- **node-cron**

---

## 📂 Project Structure

linkvault/
├── linkvault-backend/
├── linkvault-frontend/
└── README.md


---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone <repository-url>
cd linkvault
2️⃣ Start Backend
cd linkvault-backend
npm install
node index.js
Backend runs at:

http://localhost:4000
3️⃣ Start Frontend
Open a new terminal:

cd linkvault-frontend
npm install
npm run dev
Frontend runs at:

http://localhost:5173
✨ Features
Upload plain text or file

Secure UUID-based link generation

Default 10-minute expiry

Password-protected links

One-time access

Maximum view limit

Manual delete token

User authentication

Owner dashboard

Automatic cleanup of expired content

🔌 API Overview
Authentication
POST /api/register – Create a new user account

POST /api/login – Authenticate user and return session token

GET /api/me – Get current authenticated user

POST /api/logout – Invalidate session

Content Management
POST /api/upload – Upload text or file and generate share link

GET /api/content/:id – Retrieve content metadata

POST /api/access/:id – Verify password and increment view count

GET /api/download/:id – Download file content

POST /api/delete/:id – Delete content using token or owner auth

POST /api/stats/:id – Retrieve view statistics
