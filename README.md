# SlideSketch — Presentation Viewer & Annotation Canvas

<div align="center">

![SlideSketch Banner](https://img.shields.io/badge/SlideSketch-Presentation%20Canvas-6366f1?style=for-the-badge&logo=slides&logoColor=white)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-black?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A high-performance presentation viewer, slide annotator, and whiteboard web application built for educators, presenters, and engineers.**

Developed with ❤️ by **Saurabh**

</div>

---

## 🌟 Overview

**SlideSketch** combines a high-fidelity PDF presentation viewer with an Excalidraw-like vector drawing and annotation canvas inside a responsive **16:9 presentation viewport**.

Presenters and educators can view PDF slide decks page-by-page or create standalone multi-slide whiteboards, sketching vector drawings directly over each slide. Annotations are maintained on a per-slide basis without altering the original PDF files. Drawings are mapped to an unvarying logical coordinate system (`1920x1080` base resolution) so vector annotations never drift or distort on screens of any size or aspect ratio.

---

## ✨ Key Features

### 1. 🎯 16:9 Responsive Presentation Viewport
- **Crisp HiDPI PDF Rendering**: Uses `pdfjs-dist` to render PDF slides with crisp resolution on Retina and standard displays.
- **Aspect Ratio Preservation**: Automatically fits widescreen (16:9), classic (4:3), or portrait slides inside a cinematic 16:9 frame using intelligent letterboxing and pillarboxing.
- **Distortion-Free Scaling**: Logical base width of `1920` logical pixels ensures annotation vectors scale linearly with the viewport.

### 2. ✏️ Interactive Annotation & Drawing Tools
- **Pencil / Freehand** (<kbd>P</kbd> / <kbd>7</kbd>): Smooth spline freehand ink with round joins and caps.
- **Straight Line** (<kbd>L</kbd>): Clean geometric lines.
- **Directional Arrow** (<kbd>A</kbd>): Vectors with proportioned arrowheads.
- **Rectangle** (<kbd>R</kbd>): Geometric boxes with subtle corner radii.
- **Circle / Ellipse** (<kbd>C</kbd>): Circular and elliptical bounds.
- **Triangle Tool** (<kbd>T</kbd>):
  - **Right-Angle Triangle (Default / First Preference)**: 90° right-angle triangle corner.
  - **Regular / Isosceles Triangle**: Apex centered at the top (<kbd>Shift</kbd> key toggle).
- **Graph & Coordinate Plane Tool** (<kbd>G</kbd>):
  - **Cartesian 4-Quadrant (Default / First Preference)**: Center-origin coordinate cross with dual-direction arrowheads and symmetric tick marks.
  - **Coordinate Grid**: 2D coordinate axes with subtle dashed grid mesh spanning the bounding box.
  - **Quadrant I**: L-shaped positive X-Y axes with arrowheads and calibrated tick marks.
- **Proximity & Drag Eraser** (<kbd>E</kbd> / <kbd>0</kbd>): Erase entire shapes on click or by dragging across elements.
- **Color & Stroke Controls**: Curated palette (Charcoal, White, Red, Blue, Green, Orange, Purple) and thickness options (`2px`, `4px`, `8px`).

### 3. 🔐 30-Day Persistent Authentication & Route Protection
- **Strict Login Gating**: Unauthenticated visitors are always redirected to the Login page; none of the workspace pages or direct URLs (`#doc=...`) are accessible without valid credentials.
- **30-Day Session Duration**: Secure JSON Web Tokens (JWT) signed with a 30-day expiration (`30d`) and cached in local storage.
- **Backend Guard**: All REST API endpoints (`/api/documents/*`) and PDF streams validate JWT tokens via `authMiddleware` and return `401 Unauthorized` if invalid or missing.
- **User Indicator & Sign Out**: Dedicated user badge and one-click Sign Out option in the dashboard navbar.

### 4. 📄 Multi-Slide Management & PDF Export
- **Add New Slides**: Create new blank white slides dynamically with the `+ Add Page` button.
- **Thumbnail Sidebar**: Collapsible slide preview drawer with active indicator and slide-specific annotation counters.
- **Multi-Level Undo/Redo**: Full history stack per slide (<kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Shift+Z</kbd> / <kbd>Ctrl+Y</kbd>).
- **Auto-Save & Manual Save**: Debounced auto-save with visual status indicators (<kbd>Ctrl+S</kbd>).
- **Export to PDF**: Convert annotated slide decks into multi-page downloadable PDF files using client-side `jsPDF` canvas rendering.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Browser Client (React)                          │
│                                                                          │
│  ┌──────────────┐      ┌─────────────────┐      ┌─────────────────────┐  │
│  │  LoginPage   │ ───> │    Dashboard    │ ───> │     EditorPage      │  │
│  │ (30d Auth)   │      │ (Deck Manager)  │      │ (Slide Annotator)   │  │
│  └──────────────┘      └─────────────────┘      └─────────────────────┘  │
│                                                            │             │
│                                            ┌───────────────┴──────────┐  │
│                                            ▼                          ▼  │
│                                    ┌──────────────┐           ┌───────┴┐ │
│                                    │  PDF Canvas  │           │ Konva  │ │
│                                    │ (pdfjs-dist) │           │ Layer  │ │
│                                    └──────────────┘           └────────┘ │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ HTTP REST (JWT Bearer Header)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Express Backend (Node.js & TS)                      │
│                                                                          │
│  POST /api/auth/login          (Verify credentials & issue 30-day JWT)   │
│  GET  /api/auth/verify         (Validate active JWT session)             │
│  GET  /api/documents           (List document summaries - Protected)     │
│  POST /api/documents           (Upload 16:9 PDF document - Protected)    │
│  POST /api/documents/blank     (Create blank slide deck - Protected)     │
│  GET  /api/documents/:id       (Retrieve slide deck data - Protected)    │
│  GET  /api/documents/:id/file  (Stream PDF file with token - Protected)  │
│  PUT  /api/documents/:id       (Save slide annotations - Protected)      │
│  DELETE /api/documents/:id     (Delete deck & file - Protected)          │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      ▼                             ▼
             ┌─────────────────┐           ┌─────────────────┐
             │ MongoDB Atlas   │           │ Local Storage   │
             │ (Mongoose Docs) │           │ (server/uploads)│
             └─────────────────┘           └─────────────────┘
```

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Modern component-driven UI and ultra-fast HMR bundler |
| **Styling** | Tailwind CSS v4 | Strict light mode presentation aesthetic |
| **Canvas** | `react-konva`, `konva` | Declarative 2D vector canvas engine with stage/layer architecture |
| **PDF Engine** | `pdfjs-dist` | High-resolution client-side PDF document rendering |
| **PDF Export** | `jspdf` | Client-side export of slide decks to downloadable PDFs |
| **Icons** | `lucide-react` | Clean and accessible vector icons |
| **Backend** | Node.js, Express, TypeScript | RESTful API server with type safety |
| **Database** | MongoDB & Mongoose | Document metadata, slide order, and annotation persistence |
| **Auth** | JSON Web Tokens (`jsonwebtoken`) | 30-day persistent session authentication |
| **Uploads** | Multer & `uuid` | Secure server-side PDF storage and validation |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Active MongoDB Atlas cluster or local MongoDB instance

---

### 1. Clone the Repository
```bash
git clone https://github.com/saurabh0772/Slide-Sketch---Whiteboard-Presentation-Web-App.git
cd "Slide-Sketch---Whiteboard-Presentation-Web-App"
```

---

### 2. Install Dependencies
Install all root, server, and client dependencies with a single command:
```bash
npm install
```

---

### 3. Configure Environment Variables

#### Server Configuration (`server/.env`)
Create a `.env` file inside the `server/` directory (you can copy `server/.env.example`):
```bash
cp server/.env.example server/.env
```

Fill in your configuration:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/slidesketch?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
AUTH_USERNAME=your_admin_username
AUTH_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key_here
```

> [!NOTE]
> All sensitive `.env` files are ignored by git to protect credentials and database connection strings.

#### Client Configuration (`client/.env`)
Create a `.env` file inside the `client/` directory:
```bash
cp client/.env.example client/.env
```

```env
VITE_API_URL=http://localhost:5000/api
```

---

### 4. Run the Development Server
Start both the Express backend and Vite frontend concurrently:
```bash
npm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`

Or start them individually:
```bash
# Terminal 1 (Backend API)
npm run server

# Terminal 2 (Frontend Client)
npm run client
```

---

### 5. Build for Production
To test the production build:
```bash
# Build client bundle
npm run build --workspace=client

# Build server bundle
npm run build --workspace=server
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>→</kbd> / <kbd>Space</kbd> | Next slide |
| <kbd>←</kbd> | Previous slide |
| <kbd>Home</kbd> | First slide |
| <kbd>End</kbd> | Last slide |
| <kbd>P</kbd> / <kbd>7</kbd> | Freehand Pencil tool |
| <kbd>L</kbd> | Straight Line tool |
| <kbd>A</kbd> | Arrow tool |
| <kbd>R</kbd> | Rectangle tool |
| <kbd>C</kbd> | Circle / Ellipse tool |
| <kbd>T</kbd> | Triangle tool (Right-angle default) |
| <kbd>G</kbd> | Graph tool (Cartesian 4Q default) |
| <kbd>E</kbd> / <kbd>0</kbd> | Eraser tool |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo last action |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo action |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save annotations to server |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected element |

---

## 📁 Repository Structure

```
Slide-Sketch---Whiteboard-Presentation-Web-App/
├── package.json               # Root scripts (concurrent dev)
├── .gitignore                 # Strict environment & build ignore rules
├── README.md                  # Detailed documentation
│
├── server/                    # Node.js + Express Backend
│   ├── src/
│   │   ├── config/            # db.ts (MongoDB Atlas connection)
│   │   ├── controllers/       # authController.ts, documentController.ts
│   │   ├── middleware/        # authMiddleware.ts, upload.ts, errorHandler.ts
│   │   ├── models/            # Document.ts (Mongoose schemas with 'graph' & 'triangle')
│   │   ├── routes/            # authRoutes.ts, documentRoutes.ts
│   │   ├── services/          # pdfService.ts
│   │   ├── app.ts             # Express app definition & route protection
│   │   └── server.ts          # Server listener entry point
│   ├── .env.example           # Safe environment variable template
│   ├── tsconfig.json          # Server TypeScript configuration
│   └── package.json           # Server dependencies
│
└── client/                    # React 19 + Vite Frontend
    ├── src/
    │   ├── components/
    │   │   └── Editor/        # AnnotationCanvas, EditorToolbar, SlideViewport, etc.
    │   ├── pages/             # LoginPage.tsx, Dashboard.tsx, EditorPage.tsx
    │   ├── services/          # api.ts (30-day token persistence & REST client)
    │   ├── types/             # canvas.ts, document.ts
    │   ├── utils/             # coordinates.ts (Graph & Triangle math), pdfExport.ts
    │   ├── App.tsx            # Protected routing & authentication gate
    │   ├── main.tsx           # React DOM root entry
    │   └── index.css          # Tailwind CSS tokens & light mode rules
    ├── public/                # pdf.worker.min.mjs
    ├── .env.example           # Safe client API URL template
    ├── tsconfig.json          # Client TypeScript configuration
    └── vite.config.ts         # Vite configuration
```

---

## 🔒 Security Best Practices

- **Zero Credentials in Git**: All sensitive MongoDB connection URIs, production passwords, and JWT secret keys are strictly kept in local `.env` files and omitted from version control.
- **Protected PDF Streaming**: PDF binary endpoints require active JWT validation.
- **Sanitized Uploads**: Files uploaded via Multer are assigned cryptographically unique UUIDs and verified for valid MIME types before processing.

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

**SlideSketch** — Developed with ❤️ by **Saurabh**

</div>
