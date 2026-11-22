# Ethiopian Tourist Destination Assistant – AI-Powered RAG Chatbot

An enterprise-grade, responsive AI chatbot and dynamic knowledge base system designed to assist tourists, travelers, and researchers exploring Ethiopia. Powered by a custom **Retrieval-Augmented Generation (RAG)** architecture using a **Laravel RESTful API backend**, a **Next.js 16 (React 19 + TypeScript + Tailwind CSS) frontend**, and **MySQL with Google Gemini AI**.

---

## 🇪🇹 Project Overview

The **Ethiopian Tourist Destination Assistant** provides grounded, highly accurate answers regarding Ethiopian tourist attractions, UNESCO World Heritage sites, national parks, lakes, cultural festivals, hotels, resorts, and travel agencies. 

### Core Concept & Grounded RAG
* **Clean Initial Knowledge Base**: Upon installation, the knowledge base begins completely empty. No artificial or hardcoded records are pre-loaded.
* **Administrator-Driven Dynamic Knowledge**: Administrators upload tourism documents (**PDF**, **Excel .xlsx / .xls**, and **CSV**).
* **Automatic Multi-Format Extraction**:
  - **PDF Extraction**: Multi-page text extraction with scanned PDF detection via `smalot/pdfparser`.
  - **Excel & CSV Extraction**: Structured conversion preserving entity fields (Hotel Name, Location, Contact, Pricing, Attractions) via `phpoffice/phpspreadsheet`.
* **Semantic Chunking & Gemini Vector Embeddings**: Document text is divided into 500–800 token chunks with overlapping context, embedded via Google Gemini (`text-embedding-004`), and stored in MySQL.
* **Grounded AI Answers & Source Attribution**: User questions trigger cosine similarity retrieval across stored chunk embeddings. Grounded context is supplied to Google Gemini (`gemini-2.5-flash`), providing sourced answers. If information is not in the knowledge base, the chatbot states that honestly rather than inventing facts.

---

## 🏛️ System Architecture

```text
ethiopia-travel-assistant/
│
├── backend/                              # Laravel 12 REST API Backend
│   ├── app/
│   │   ├── Http/Controllers/Api/         # REST API Controllers (Chat, Documents, Auth, KnowledgeBase)
│   │   ├── Models/                       # Eloquent Models (Document, DocumentChunk, Embedding, User...)
│   │   └── Services/                     # Core Business Logic & AI Services
│   │       ├── PdfExtractionService.php      # PDF parsing & scanned detection
│   │       ├── ExcelExtractionService.php    # Excel & CSV tabular structuring
│   │       ├── ChunkingService.php           # Semantic chunking with overlap
│   │       ├── EmbeddingService.php          # Gemini vector generation & Cosine similarity
│   │       ├── DocumentProcessingService.php # Upload orchestrator & pipeline
│   │       └── RAGService.php                # Vector retrieval & Gemini grounded synthesis
│   ├── database/
│   │   ├── migrations/                   # Migration files for documents, chunks, embeddings, chat
│   │   └── seeders/                      # AdminUserSeeder (admin credentials only)
│   ├── routes/api.php                    # Public & Sanctum-authenticated endpoints
│   ├── storage/app/documents/            # Secure local storage for original documents
│   └── tests/                            # Unit & Feature automated test suite
│
├── frontend/                             # Next.js 16 Frontend
│   ├── app/
│   │   ├── globals.css                   # Ethiopian-inspired cultural palette & Tailwind
│   │   ├── layout.tsx                    # Root layout & metadata
│   │   └── page.tsx                      # Main single-page application orchestrator
│   ├── components/
│   │   ├── Navbar.tsx                    # Navigation & responsive mobile header
│   │   ├── ChatInterface.tsx             # Interactive RAG chat, suggestions & source pills
│   │   ├── DashboardView.tsx             # Real-time metrics, charts & category distributions
│   │   ├── DocumentManager.tsx           # Search, filters, document table & management
│   │   ├── UploadModal.tsx               # Drag & drop upload with live processing status
│   │   ├── DocumentDetailModal.tsx       # Metadata viewer & chunk explorer
│   │   ├── EditDocumentModal.tsx         # Document metadata & replacement modal
│   │   └── LoginModal.tsx                # Administrator authentication modal
│   ├── services/api.ts                   # Centralized API service & token manager
│   └── types/index.ts                    # TypeScript interfaces & types
│
├── README.md
└── .gitignore
```

---

## 🛠️ Technology Stack

- **Backend**: Laravel 12, PHP 8.2+, Laravel Sanctum (Token Auth), Eloquent ORM
- **Document Processing**: `smalot/pdfparser` (PDF), `phpoffice/phpspreadsheet` (Excel & CSV)
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React Icons
- **Database**: MySQL / MariaDB (XAMPP Control Panel MySQL)
- **AI Integration**: Google Gemini API (`gemini-2.5-flash` generation, `text-embedding-004` embeddings)

---

## ⚙️ Prerequisites

1. **Windows 10/11** with **XAMPP** (Apache & MySQL running)
2. **PHP 8.2+** with extensions enabled: `pdo_mysql`, `curl`, `fileinfo`, `mbstring`, `openssl`, `zip`, `gd`
3. **Composer 2+**
4. **Node.js 20+** and **npm**
5. **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

---

## 🚀 Installation & Local Setup

### 1. Database Configuration (XAMPP MySQL)
1. Open **XAMPP Control Panel** and ensure **MySQL** is started on port `3306`.
2. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) and verify the database `ethiopia_tourism` exists.
   *(If not already created, run `CREATE DATABASE ethiopia_tourism;`).*

### 2. Backend Setup (Laravel)
Open a terminal in the project directory:

```bash
cd backend

# 1. Install dependencies
composer install

# 2. Configure environment file
copy .env.example .env

# 3. Generate application encryption key
php artisan key:generate

# 4. Configure Google Gemini in .env
# Edit backend/.env and insert your API key:
# GEMINI_API_KEY=your_actual_gemini_api_key_here
# GEMINI_MODEL=gemini-2.5-flash
# GEMINI_EMBEDDING_MODEL=text-embedding-004

# 5. Run migrations & seed administrator
php artisan migrate --force
php artisan db:seed --force

# 6. Start the Laravel development server
php artisan serve
```
The backend API is now running at `http://localhost:8000`.

### 3. Frontend Setup (Next.js)
Open a second terminal window:

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Next.js development server
npm run dev
```
The frontend application is now running at `http://localhost:3000`.

---

## 🔐 Administrator Credentials

To manage documents, upload new files, or trigger reprocessing, log in as administrator using the default credentials:

- **Email**: `admin@ethiopiatravel.com`
- **Password**: `admin123456`

*(Public visitors can freely chat with the assistant without logging in).*

---

## 📂 Tourism Categories Supported

Documents uploaded into the system are organized into 5 major categories plus an "Other" option:
1. **UNESCO World Heritage & Historic Sites** (e.g., Lalibela, Axum, Gondar Fasil Ghebbi, Harar Jugol, Tiya, Konso)
2. **National Parks, Wildlife & Nature Reserves** (e.g., Simien Mountains, Bale Mountains, Awash, Nech Sar, Omo Valley)
3. **Lakes, Waterfalls, Mountains & Scenery** (e.g., Lake Tana, Blue Nile Falls, Ras Dashen, Danakil Depression)
4. **Cities, Museums, Parks & Cultural Experiences** (e.g., Addis Ababa National Museum, Timkat, Meskel, Cultural Villages)
5. **Hotels, Resorts & Travel Agencies in Ethiopia** (Structured directories of accommodations, tour operators, and services)
6. **Other**

---

## 📡 RESTful API Documentation

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/chat` | Submit question to RAG chatbot & receive answer with sources | Public |
| `GET` | `/api/chat/suggestions` | Suggested prompt queries for tourists | Public |
| `GET` | `/api/chat/history/{sessionId}` | Conversation history for active session | Public |
| `GET` | `/api/knowledge-base/statistics` | Real-time database metrics (documents, chunks, embeddings) | Public |
| `GET` | `/api/knowledge-base/categories` | Predefined tourism categories list | Public |
| `POST` | `/api/auth/login` | Administrator login (returns Bearer token) | Public |
| `POST` | `/api/auth/logout` | Revoke current admin token | Admin |
| `GET` | `/api/auth/user` | Current authenticated admin profile | Admin |
| `GET` | `/api/documents` | List documents with search, category & format filters | Admin |
| `POST` | `/api/documents` | Upload and process PDF, Excel, or CSV document | Admin |
| `GET` | `/api/documents/{id}` | View document details and chunk previews | Admin |
| `POST` / `PUT` | `/api/documents/{id}` | Update metadata or replace document file | Admin |
| `DELETE` | `/api/documents/{id}` | Cascade delete document, chunks, and embeddings | Admin |
| `POST` | `/api/documents/{id}/reprocess` | Re-extract text, rebuild chunks, and refresh embeddings | Admin |

### Example Chat Request
```json
POST /api/chat
Content-Type: application/json

{
  "question": "What attractions can tourists see in Lalibela?",
  "session_id": "sess_traveler_101"
}
```

### Example Chat Response
```json
{
  "success": true,
  "answer": "Lalibela is globally famous for its 11 monolithic medieval rock-hewn churches, carved out of red volcanic tuff during the reign of King Gebre Mesqel Lalibela...",
  "sources": [
    {
      "document_id": 1,
      "title": "The Rock-hewn Churches of Lalibela",
      "category": "UNESCO World Heritage & Historic Sites",
      "source_name": "UNESCO World Heritage Centre",
      "similarity": 0.82
    }
  ],
  "session_id": "sess_traveler_101"
}
```

---

## 🧪 Automated Testing

Automated tests cover document parsing, semantic chunking, cosine vector similarity, admin authentication, and RAG retrieval:

```bash
cd backend
php artisan test
```

Test Results:
- `Tests\Unit\RAGUnitTest`:
  - `✓ chunking service creates valid chunks with metadata and overlap`
  - `✓ cosine similarity identifies identical and orthogonal vectors`
- `Tests\Feature\KnowledgeBaseTest`:
  - `✓ statistics endpoint returns correct empty state (0 records)`
  - `✓ categories endpoint returns valid tourism categories`
  - `✓ chat returns honest empty knowledge base notification`
  - `✓ admin can login with valid credentials`
  - `✓ unauthenticated user cannot access documents list`
- `Tests\Feature\DocumentProcessingTest`:
  - `✓ can upload and process csv spreadsheet`
  - `✓ document deletion cascades and removes embeddings`

---

## 🎨 Cultural Design & User Experience

The frontend is styled with an authentic Ethiopian-inspired visual theme:
- **Ivory & Warm Cream Backgrounds**: `#faf7f2` and `#f4efe6`
- **Deep Highland Forest Green**: `#0d3d24` (Primary)
- **Rich Ethiopian Gold & Amber**: `#d48b14` and `#f3a628` (Accent)
- **Warm Earth Red**: `#a8332a`
- Fully responsive across desktop, tablet, and mobile devices.

---

## 📄 License & Attribution

Developed for the Ethiopian Tourist Destination Assistant project. All rights reserved.
