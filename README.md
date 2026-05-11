# 🏥 ClaimsAI — Automated Insurance Claims Processing System

> Upload a PDF or image of a claim document. AI extracts, validates, and structures it in seconds.

---

## 📁 Project Structure

```
claims-processor/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── server.js           # Entry point
│   │   ├── app.js              # Express configuration
│   │   ├── config/
│   │   │   └── database.js     # MongoDB connection
│   │   ├── models/
│   │   │   └── Claim.js        # Mongoose schema
│   │   ├── services/
│   │   │   ├── ocrService.js           # Google Vision OCR
│   │   │   ├── aiExtractionService.js  # Gemini + Regex extraction
│   │   │   ├── validationService.js    # Validation + normalization
│   │   │   └── claimProcessingService.js # Orchestration pipeline
│   │   ├── controllers/
│   │   │   ├── claimController.js
│   │   │   └── documentController.js
│   │   ├── routes/
│   │   │   ├── claimRoutes.js
│   │   │   ├── documentRoutes.js
│   │   │   └── statsRoutes.js
│   │   ├── middleware/
│   │   │   ├── upload.js       # Multer configuration
│   │   │   └── errorHandler.js
│   │   └── utils/
│   │       └── logger.js       # Winston logger
│   ├── uploads/                # Document storage
│   ├── logs/                   # Application logs
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React + MUI
│   ├── src/
│   │   ├── App.js
│   │   ├── theme/index.js      # MUI dark theme
│   │   ├── services/api.js     # Axios API client
│   │   ├── pages/
│   │   │   ├── DashboardPage.js
│   │   │   ├── UploadPage.js
│   │   │   ├── ClaimsPage.js
│   │   │   └── ClaimDetailPage.js
│   │   └── components/
│   │       └── Common/
│   │           ├── Layout.js
│   │           ├── StatusChip.js
│   │           ├── ConfidenceBar.js
│   │           └── PageHeader.js
│   ├── public/index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
├── setup.sh
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud Vision API key OR service account JSON
- Google Gemini API key

### 1. Clone & Install

```bash
# Run setup script (installs dependencies, creates .env files)
bash setup.sh

# OR manually:
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Configure Environment

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/claims_processor

# Google Vision — use ONE of:
GOOGLE_VISION_API_KEY=AIza...          # Simple API key
# OR
GOOGLE_CLOUD_KEY_FILE=./config/google-credentials.json  # Service account

# Gemini AI
GEMINI_API_KEY=AIza...

CONFIDENCE_THRESHOLD=0.75
FRONTEND_URL=http://localhost:3000
```

> **No API keys?** The system runs in **mock mode** — it returns realistic sample data so you can test the UI without credentials.

### 3. Start Services

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → API running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# → UI running on http://localhost:3000
```

### 4. Or use Docker

```bash
# Copy and fill in backend/.env first, then:
docker-compose up --build
# → Frontend: http://localhost:3000
# → API:      http://localhost:5000
```

---

## 🔑 Getting API Keys

### Google Cloud Vision
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create/select a project
3. Enable the **Cloud Vision API**
4. Go to **APIs & Services → Credentials → Create API Key**
5. Paste into `GOOGLE_VISION_API_KEY`

### Google Gemini
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Paste into `GEMINI_API_KEY`

---

## 🧠 How It Works

```
Document Upload (PDF/Image)
        ↓
  Image Preprocessing
  (auto-rotate, sharpen)
        ↓
  Google Vision OCR
  → Raw text extraction
        ↓
  Regex Extraction
  (fast, deterministic patterns)
        ↓
  Gemini LLM Extraction
  (fills gaps, handles variations)
        ↓
  Merge + Confidence Scoring
  (per-field 0–1 scores)
        ↓
  Validation Layer
  (formats, dates, duplicates)
        ↓
  MongoDB Storage
  (status: approved | pending_review)
        ↓
  Human Review UI
  (edit, correct, approve/reject)
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload & process single document |
| POST | `/api/documents/upload-multiple` | Upload up to 5 documents |
| GET | `/api/claims` | List claims (pagination + filters) |
| GET | `/api/claims/:id` | Get single claim |
| PATCH | `/api/claims/:id` | Update/review a claim |
| DELETE | `/api/claims/:id` | Delete claim |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/health` | Health check |

### Upload Example
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "document=@./claim.pdf"
```

### Filter Claims
```
GET /api/claims?status=pending_review&search=john&page=1&limit=20
```

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIDENCE_THRESHOLD` | `0.75` | Below this → flagged for human review |
| `MAX_FILE_SIZE` | `10485760` | 10MB per file |
| `MONGODB_URI` | `localhost:27017` | MongoDB connection string |

---

## 🏗 Extending the System

### Add a new extracted field
1. Add regex pattern in `aiExtractionService.js` → `_regexExtraction()`
2. Add field to LLM prompt in `_llmExtraction()`
3. Add to `CLAIM_FIELDS` in `ClaimDetailPage.js`
4. Add to Mongoose schema in `Claim.js`

### Add a new document type
Add keyword arrays in `aiExtractionService.js` → `_detectDocumentType()`

### Add email notifications
Install `nodemailer` and hook into `claimProcessingService.js` after `claim.save()`
