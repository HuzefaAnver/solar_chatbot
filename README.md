# 🌞 SolarEdge Chatbot Demo

A full-stack demo website for solar companies with an integrated chatbot widget.  
Built with **Node.js + Express** backend and vanilla HTML/CSS/JS frontend, with **Supabase** for persistent storage.

---

## 📁 Project Structure

```
solar-chatbot-demo/
├── server.js               # Express backend + API routes
├── package.json
├── .env.example            # Copy to .env and fill in values
├── supabase_schema.sql     # Run this in Supabase SQL Editor
└── public/
    ├── index.html          # Landing page + chatbot widget
    ├── style.css           # All styles
    └── chatbot.js          # Chatbot widget logic
```

---

## 🚀 Deploying on Replit

### Step 1 — Import Project
1. Go to [replit.com](https://replit.com) → **Create Repl**
2. Choose **Import from GitHub** or **Upload ZIP**
3. Select **Node.js** as the language

### Step 2 — Set Environment Variables
In Replit, go to **Secrets** (🔒 icon in sidebar) and add:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | `your-anon-key` |
| `PORT` | `3000` |

> If you skip Supabase, the app runs in **in-memory mode** (data resets on restart)

### Step 3 — Install & Run
Replit auto-detects `package.json`. Just click **Run** ▶️

Or manually in the Shell:
```bash
npm install
npm start
```

---

## 🗄️ Supabase Setup

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Navigate to **SQL Editor**
3. Paste and run the contents of `supabase_schema.sql`
4. Go to **Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`

---

## 🤖 Chatbot Features

The chatbot handles these flows:

| Option | What Happens |
|--------|-------------|
| Locate Our Dealers | Shows city list + contact number |
| Locate Service Center | Service center info + hours |
| Product Query | Product catalog overview |
| Product Verification | Serial number verification steps |
| Get A Quote | Lead capture + callback promise |
| Launch Complaint | Complaint submission flow |
| Complaint Status | Status check instructions |
| Connect To Customer Services | Live agent connection info |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + DB status |
| `POST` | `/api/chat/start` | Start session (save lead) |
| `POST` | `/api/chat/message` | Send message, get bot reply |
| `GET` | `/api/chat/history/:sessionId` | Get chat history |
| `GET` | `/api/admin/leads` | View all captured leads |
| `GET` | `/api/admin/sessions` | View all sessions |

### Example: Start a chat
```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"name": "Ahmed", "email": "ahmed@example.com"}'
```

### Example: Send a message
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"session_id": "your-session-id", "message": "Get A Quote"}'
```

---

## 🎨 Customization

### Change company name/branding
- Edit the logo and company name in `public/index.html`
- Update color variables in `public/style.css` (`:root` block)
- Update chatbot responses in `server.js` (`BOT_FLOWS` object)

### Add new chatbot flows
In `server.js`, add to the `BOT_FLOWS` object:
```javascript
"your option name": {
  message: "Your bot response here",
  quickReplies: ["Option 1", "Option 2", "🏠 Main Menu"],
},
```

### Disable auto-open
In `public/chatbot.js`, comment out or remove:
```javascript
setTimeout(() => { if (!isOpen) openChat(); }, 3000);
```

---

## 📊 View Captured Leads

Visit these URLs on your deployed app:
- `https://your-app.replit.app/api/admin/leads` — All leads
- `https://your-app.replit.app/api/admin/sessions` — All sessions

---

## 🛠️ Local Development

```bash
cp .env.example .env
# Fill in your Supabase credentials (or leave blank for memory mode)
npm install
npm run dev    # Uses nodemon for hot reload
```

Open http://localhost:3000

---

Built as a **sales demo** to showcase chatbot integration for solar companies.
