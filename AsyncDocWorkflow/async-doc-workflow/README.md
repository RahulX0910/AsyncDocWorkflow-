# 📄 Async Doc Workflow

A full-stack document processing platform built with **FastAPI**, **React**, **Celery**, **Redis**, and **Neon (PostgreSQL)**. Upload documents, track background processing in real time via WebSockets, review extracted data, edit results, and export as CSV or JSON.

---

## ✨ Features

- 📁 **Multi-file upload** with live progress tracking
- ⚙️ **Background processing** via Celery — never blocks the request cycle
- 🔥 **Live updates** via WebSocket + Redis Pub/Sub
- 🔍 **Data extraction** from PDF, DOCX, TXT, PNG, JPEG
- ✏️ **Edit & finalize** extracted results
- 📤 **Export** processed data as CSV or JSON
- 🗂️ **Document cart** with status filtering
- 🐘 **Neon PostgreSQL** — serverless cloud database
- 🐳 **Fully Dockerized** backend

---

## 🏗️ Architecture

```
Browser (React + Vite)
    │
    ├── POST   /documents/upload       → Upload file, enqueue task
    ├── GET    /documents/             → List all documents
    ├── GET    /documents/{id}         → Get single document
    ├── PATCH  /documents/{id}         → Edit finalized data
    ├── DELETE /documents/{id}         → Delete document
    ├── GET    /documents/{id}/export/csv   → Export as CSV
    ├── GET    /documents/{id}/export/json  → Export as JSON
    └── WS     /ws                     → Live progress updates

FastAPI (API Server)
    └── Enqueues → Celery Task (separate worker process)
                        │
                        ├── 10% Validating file
                        ├── 30% Extracting content
                        ├── 70% Post-processing
                        ├── 90% Saving results
                        └── 100% Completed
                                │
                                └── Redis Pub/Sub → WebSocket → Browser
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| HTTP Client | ky |
| Backend | FastAPI, Uvicorn |
| Database | PostgreSQL (Neon serverless) |
| ORM | SQLAlchemy (async) |
| Migrations | Alembic |
| Task Queue | Celery |
| Broker / Cache | Redis |
| Live Updates | Redis Pub/Sub + WebSocket |
| File Storage | Local disk (`uploads/`) |
| Containerization | Docker + Docker Compose |

---

## 📁 Project Structure

```
async-doc-workflow/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # Async SQLAlchemy engine
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── deps.py              # Shared dependencies
│   │   ├── routers/
│   │   │   ├── documents.py     # Document CRUD + export
│   │   │   └── ws.py            # WebSocket endpoints
│   │   ├── services/
│   │   │   ├── storage.py       # File save/read
│   │   │   └── export.py        # CSV/JSON export
│   │   ├── worker/
│   │   │   ├── celery_app.py    # Celery configuration
│   │   │   └── tasks.py         # Background tasks
│   │   └── pubsub/
│   │       └── redis_pubsub.py  # Redis Pub/Sub helpers
│   ├── migrations/              # Alembic migrations
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── UploadForm.tsx   # Upload + Extract + Edit tabs
    │   │   ├── DocumentCart.tsx # Document list with filters
    │   │   ├── DocumentCard.tsx # Single document card
    │   │   └── DocumentDetail.tsx # Detail view + export
    │   ├── hooks/
    │   │   └── useDocumentSocket.ts # WebSocket hook
    │   ├── types/
    │   │   └── documents.ts     # TypeScript types
    │   └── utils/
    │       └── events.ts        # Custom events
    ├── package.json
    └── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Purpose | Download |
|---|---|---|
| Docker Desktop | Runs Redis + API + Worker | [docker.com](https://www.docker.com/products/docker-desktop) |
| Node.js 18+ | Frontend | [nodejs.org](https://nodejs.org) |
| Git | Version control | [git-scm.com](https://git-scm.com) |

---

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/async-doc-workflow.git
cd async-doc-workflow
```

---

### 2. Set up Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project named `async-doc-workflow`
3. Copy the connection string (select **asyncpg** driver)

---

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.neon.tech/neondb?sslmode=require
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=20
```

> **Note:** Inside Docker, Redis is accessed via service name `redis`, not `localhost`.

---

### 4. Start the backend

```bash
cd backend
docker-compose up --build -d
```

This starts:
- 🟥 **Redis** on port `6379`
- 🟦 **FastAPI** on port `8000`
- 🟩 **Celery Worker** (background processing)

---

### 5. Run database migrations

```bash
docker-compose exec api alembic -x sqlalchemy.url="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require" upgrade head
```

> Use `postgresql://` (not `postgresql+asyncpg://`) for Alembic specifically.

---

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** 🎉

---

## 📖 API Reference

### Documents

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/upload` | Upload a file |
| `GET` | `/documents/` | List all documents |
| `GET` | `/documents/{id}` | Get one document |
| `PATCH` | `/documents/{id}` | Edit finalized data |
| `DELETE` | `/documents/{id}` | Delete a document |
| `GET` | `/documents/{id}/export/csv` | Export as CSV |
| `GET` | `/documents/{id}/export/json` | Export as JSON |

### WebSocket

| Endpoint | Description |
|---|---|
| `WS /ws` | Global broadcast — all document events |
| `WS /ws/{doc_id}` | Single document progress |

### Progress Event Shape

```json
{
  "doc_id": "uuid",
  "status": "processing",
  "progress": 70,
  "message": "Post-processing...",
  "extracted_data": null
}
```

### Document Status Flow

```
uploaded → processing → completed
                      → failed
```

---

## 🧪 Testing the API

Visit **http://localhost:8000/docs** for the interactive Swagger UI.

Quick health check:
```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose up --build -d

# View API logs
docker-compose logs api --tail=50

# View worker logs
docker-compose logs worker --tail=50

# Stop everything
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## 📤 Supported File Types

| Format | Extracted Data |
|---|---|
| `.pdf` | Page count, word count, raw text |
| `.docx` | Paragraph count, word count, raw text |
| `.txt` | Line count, word count, raw text |
| `.png` / `.jpeg` | Width, height, format, mode |
| Other | Raw text fallback |

---

## 🔐 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection for Pub/Sub | `redis://redis:6379/0` |
| `CELERY_BROKER_URL` | Redis broker for Celery tasks | `redis://redis:6379/1` |
| `CELERY_RESULT_BACKEND` | Redis backend for task results | `redis://redis:6379/2` |
| `UPLOAD_DIR` | Directory to store uploaded files | `uploads` |
| `MAX_FILE_SIZE_MB` | Maximum upload size in MB | `20` |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📝 License

MIT License — feel free to use this project for personal or commercial purposes.