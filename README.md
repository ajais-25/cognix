<div align="center">

# 🧠 Cognix

**AI-Powered Chat & Document Intelligence Platform**

Ask anything with real-time web search, or upload a PDF and chat with it using RAG-powered document intelligence — all in one beautiful interface.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://mongoosejs.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## ✨ Features

### 💬 AI Chat with Web Search
- Real-time conversations powered by **Google Gemini**
- Intelligent web search integration via **Tavily** — the AI decides when a web search is needed
- Streaming responses with markdown rendering and syntax highlighting
- Smart follow-up question suggestions after every answer
- Full conversation history with sidebar navigation

### 📄 Document Intelligence (RAG)
- Upload PDFs and **chat with your documents**
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
├────────────┬──────────────┬──────────────┬──────────────────┤
│  Gemini    │   Tavily     │   Qdrant     │   MongoDB        │
│  (LLM)     │ (Web Search) │ (Vectors)    │   (Data)         │
├────────────┴──────────────┴──────────────┴──────────────────┤
│   Razorpay (Payments)  ·  Resend (Emails)  ·  Jose (JWT)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **MongoDB** instance (local or Atlas)
- **Qdrant** vector database instance
- API keys for: Gemini, Tavily, Resend, Razorpay

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
# ── Database ──
MONGODB_URI=your_mongodb_connection_string
DB_NAME=cognix

# ── Authentication ──
JWT_SECRET=your_jwt_secret

# ── AI & Search ──
GEMINI_API_KEY=your_gemini_api_key
GEMINI_RAG_API_KEY=your_gemini_rag_api_key
TAVILY_API_KEY=your_tavily_api_key

# ── Vector Store (Qdrant) ──
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key

# ── Email (Resend) ──
RESEND_API_KEY=your_resend_api_key
SUPPORT_EMAIL=support@yourdomain.com
DOMAIN_URL=http://localhost:3000

# ── Payments (Razorpay) ──
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# ── Credits Configuration ──
CREDITS_PER_1K_TOKENS=1
CREDITS_PER_CHUNK=0.5
LOW_BALANCE_THRESHOLD=10
OUTPUT_BUFFER_TOKENS=500
CREDITS_PER_RUPEE=10
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using Cognix.

### 5. Build for production

```bash
npm run build
npm start
```