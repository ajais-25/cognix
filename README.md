<div align="center">

# 🧠 Cognix

**AI-Powered Chat & Document Intelligence Platform**

Ask anything with real-time web search, or upload a PDF and chat with it using RAG-powered document intelligence — all in one beautiful interface.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://mongoosejs.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC2626?logo=qdrant)](https://qdrant.tech/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis)](https://redis.io/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## ✨ Features

### 💬 AI Chat with Web Search

- Real-time conversations powered by **Google Gemini**
- Intelligent web search integration via **Tavily** - the AI decides when a web search is needed
- Streaming responses with markdown rendering and syntax highlighting
- Smart follow-up question suggestions after every answer
- Full conversation history with sidebar navigation

### 📄 Document Intelligence (RAG)

- Upload PDFs and **chat with your documents**
- Cloud object storage for uploaded files powered by **Backblaze B2**
- Asynchronous PDF processing queue powered by **Redis** and **BullMQ**
- RAG pipeline: split → embed → retrieve → answer
- Powered by **LangChain**, **Google Gemini Embeddings**, and **Qdrant** vector database
- Answers grounded in document context with source attribution

### 💳 Credits & Payments

- Token-based credit system with transparent usage tracking
- Credit top-ups via **Razorpay** payment gateway
- Detailed transaction history (queries, uploads, top-ups, refunds)
- Low-balance warnings and pre-flight cost estimation

### 🔐 Authentication & Security

- Full auth flow: sign up → email verification → sign in
- Password reset via email (forgot password → OTP → reset)
- JWT-based sessions with HTTP-only cookies
- Middleware-level route protection

### 🎨 UI/UX

- Light & dark theme with system preference detection
- Responsive layout with collapsible sidebar
- Skeleton loading states throughout
- Toast notifications for real-time feedback

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                       │
│  ChatPage · Sidebar · Navbar · Documents · Credits          │
├─────────────────────────────────────────────────────────────┤
│                   Next.js App Router (API)                  │
│  /api/ask · /api/conversations · /api/documents             │
│  /api/credits · /api/users · /api/webhook                   │
├───────────────┬──────────────┬──────────────┬───────────────┤
│   Redis &     │   Qdrant     │  Backblaze   │   MongoDB     │
│   BullMQ      │ (Vector DB)  │ (PDF Storage)│    (Data)     │
├───────────────┼──────────────┴──────────────┴───────────────┤
│   Gemini      │   Tavily (Web Search)                       │
│   (LLM)       │   Razorpay · Resend · Jose (JWT)            │
└───────────────┴─────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **MongoDB** instance (local or Atlas)
- **Qdrant** vector database instance
- **Redis** instance (local or cloud like Upstash / Redis Cloud)
- **Backblaze B2** bucket (S3-compatible object storage)
- API keys for: Gemini, Tavily, Resend, Razorpay, Backblaze B2

### 1. Clone the repository

```bash
git clone https://github.com/ajais-25/cognix
cd cognix
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
DB_NAME=cognix

REDIS_URL=your_redis_connection_url

# Backblaze
BACKBLAZE_ACCESS_KEY_ID=your_backblaze_access_key_id
BACKBLAZE_SECRET_ACCESS_KEY=your_backblaze_secret_access_key
BACKBLAZE_BUCKET_NAME=your_backblaze_bucket_name

JWT_SECRET=your_jwt_secret

RESEND_API_KEY=your_resend_api_key

GEMINI_API_KEY=your_gemini_api_key
GEMINI_RAG_API_KEY=your_gemini_rag_api_key
TAVILY_API_KEY=your_tavily_api_key

DOMAIN_URL=http://localhost:3000
SUPPORT_EMAIL=support@yourdomain.com

# Qdrant configuration
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_URL=your_qdrant_url

# Credits
PROFIT_MARGIN_PERCENT=your_profit_margin_percentage
MINIMUM_REQUIRED_BALANCE=0.01
LOW_BALANCE_THRESHOLD=0.05

# Razorpay configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### 4. Setup Qdrant Collection & Indexes (One-Time Setup)

Before starting the app for the first time, run the setup script to create the Qdrant collection and required payload indexes (`userId`, `documentId`). **This step only needs to be executed once initially.**

```bash
npm run setup:qdrant
```

### 5. Start the BullMQ Background Worker

Cognix offloads PDF ingestion, chunking, and embedding generation to an asynchronous background worker powered by BullMQ and Redis. Start the worker in a separate terminal:

```bash
npm run worker
```

### 6. Run the Next.js Development Server

In another terminal window, start the Next.js server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using Cognix.

### 7. Build for production

```bash
npm run build
npm start
```

