require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ─── Groq Client (AI) ───────────────────────────────────────────────────────
const groqApiKey = process.env.GROQ_API_KEY;
let groq = null;

if (groqApiKey && groqApiKey !== "gsk_your_key_here") {
  groq = new Groq({ apiKey: groqApiKey });
  console.log("✅ Groq AI connected");
} else {
  console.log("⚠️  Groq API Key not found — AI features disabled");
}

// ─── Supabase Client ────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl !== "https://your-project-id.supabase.co") {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase connected");
} else {
  console.log("⚠️  Supabase not configured — running in memory mode");
}

// ─── In-memory fallback (used when Supabase is not configured) ───────────────
const memoryStore = {
  chat_leads: [],
  chat_sessions: [],
  chat_messages: [],
};

// ─── Bot Response Engine ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Lumina Solar's Expert Virtual Assistant. 
You are professional, helpful, and highly knowledgeable about solar energy in Pakistan.
Key facts about Lumina Solar:
- We provide high-efficiency Mono PERC solar panels.
- We offer smart hybrid inverters (3kW to 100kW).
- We provide LFP Lithium batteries for storage.
- We have 500+ authorized dealers in Pakistan.
- Our hotline is 0800-LUMINA.
- We offer free site surveys and custom energy roadmaps.

Always encourage the user to provide their contact details for a custom quote if they haven't already. 
If they ask about technical specs, be precise. If they ask about pricing, explain it depends on their monthly units and suggest a free site survey.
Keep responses concise and easy to read. Use bullet points where appropriate.`;

async function getAIResponse(userMessage, history = []) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return null;
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    return {
      message: completion.choices[0].message.content,
      quickReplies: ["Get A Quote", "Connect To Customer Services", "🏠 Main Menu"]
    };
  } catch (err) {
    console.error("Groq API Error:", err);
    return null;
  }
}

const BOT_FLOWS = {
  welcome: {
    message: "👋 Welcome to Lumina Solar! I'm your virtual assistant. How can I help you today?",
    quickReplies: [
      "🚀 Sales & Savings Tools",
      "🔧 Customer Support & Guides",
      "⚡ Energy usage Analyzer",
      "🏠 Main Menu"
    ],
  },
  "🚀 sales & savings tools": {
    message: "Explore our smart energy tools specifically designed to help you transition to solar:",
    quickReplies: [
      "Calculate My Savings 📈",
      "AI Roof Analysis 🏠",
      "Product Recommendation 🔋",
      "Get A Quote 💰",
      "🏠 Main Menu"
    ]
  },
  "🔧 customer support & guides": {
    message: "How can we assist you with your existing system or installation?",
    quickReplies: [
      "Installation Guide 🛠️",
      "Locate Our Dealers 📍",
      "Locate Service Center 🔧",
      "Launch Complaint 📝",
      "🏠 Main Menu"
    ]
  },
  "🏠 main menu": {
    message: "Back to the main menu. What would you like to explore?",
    quickReplies: [
      "🚀 Sales & Savings Tools",
      "🔧 Customer Support & Guides",
      "⚡ Energy usage Analyzer"
    ],
  },
  "get a quote 💰": {
    message: "I'll help you book a site survey. Are you looking for solar for your **home** or **business**?",
    quickReplies: ["Residential", "Commercial", "🏠 Main Menu"]
  },
  "get a quote": {
    message: "I'll help you book a site survey. Are you looking for solar for your **home** or **business**?",
    quickReplies: ["Residential", "Commercial", "🏠 Main Menu"]
  },
  "ai roof analysis 🏠": {
    message: "Lumina AI can analyze your roof suitability via satellite simulation.\n\nPlease enter your **Project Site Address** or City/Area (e.g., DHA Phase 6, Lahore).",
    quickReplies: ["🏠 Main Menu"]
  },
  "product recommendation 🔋": {
    message: "I'll help you find the perfect solar hardware. What is your **primary goal**?",
    quickReplies: ["Reduce Bills", "24/7 Backup", "Zero Outages", "🏠 Main Menu"]
  },
  "installation guide 🛠️": {
    message: "Going solar with Lumina is a seamless 5-step process. Which stage would you like to learn about?",
    quickReplies: ["1. Site Survey", "2. System Design", "3. Approvals", "4. Installation", "5. Net Metering", "🏠 Main Menu"]
  },
  "energy usage analyzer": {
    message: "Let's breakdown your consumption. How many **Air Conditioners (ACs)** do you run in peak summer?",
    quickReplies: ["None", "1-2 ACs", "3-5 ACs", "5+ ACs", "🏠 Main Menu"]
  }
};

// ─── Multi-Agent State Engine ────────────────────────────────────────────────
const BOT_STATES = {
  CALC: 'CALC_FLOW',
  ROOF: 'ROOF_FLOW',
  RECOM: 'RECOM_FLOW',
  INSTALL: 'INSTALL_FLOW',
  USAGE: 'USAGE_FLOW'
};

// ─── Calculator Logic ────────────────────────────────────────────────────────
const CALC_STEPS = {
  BILL: 'AWAITING_BILL',
  CITY: 'AWAITING_CITY',
  ROOF: 'AWAITING_ROOF'
};

function performCalculation(bill, city, roof) {
  const unitPrice = 60; // PKR per unit
  const unitsNeeded = bill / unitPrice;
  const generationPerKW = 125; // units per kW per month
  const systemSize = Math.ceil(unitsNeeded / generationPerKW);
  
  const monthlySavings = unitsNeeded * unitPrice;
  const yearlySavings = monthlySavings * 12;
  const systemCost = systemSize * 220000; // 2.2 Lakh per kW installed
  const paybackYears = (systemCost / yearlySavings).toFixed(1);

  return {
    size: systemSize,
    savings: Math.round(monthlySavings).toLocaleString(),
    payback: paybackYears,
    cost: systemCost.toLocaleString()
  };
}

async function handleMultiAgentFlow(session, message) {
  const data = session.calc_data || {};
  const step = session.calc_step;

  // Global Step-out
  if (message.toLowerCase() === "🏠 main menu") {
    await dbUpdate("chat_sessions", session.id, { calc_step: null, calc_data: {} });
    return null; 
  }

  // 1. ROI CALC FLOW
  if (step.startsWith('CALC_')) {
    if (step === 'CALC_BILL') {
        const bill = parseFloat(message.replace(/[^0-9]/g, ''));
        if (isNaN(bill)) return { message: "Please enter a valid number for your bill.", quickReplies: ["🏠 Main Menu"] };
        await dbUpdate("chat_sessions", session.id, { calc_step: 'CALC_CITY', calc_data: { bill } });
        return { message: "Got it. Which city are you located in?", quickReplies: ["🏠 Main Menu"] };
    }
    if (step === 'CALC_CITY') {
        await dbUpdate("chat_sessions", session.id, { calc_step: 'CALC_ROOF', calc_data: { ...data, city: message } });
        return { message: "Do you have a concrete roof or metal shed?", quickReplies: ["Concrete", "Metal", "🏠 Main Menu"] };
    }
    if (step === 'CALC_ROOF') {
        const result = performCalculation(data.bill, data.city, message);
        await dbUpdate("chat_sessions", session.id, { calc_step: null, calc_data: {} });
        
        const cardHtml = `
<div class="calc-result-card">
  <h3>📊 Solar ROI Estimate</h3>
  <div class="calc-stat"><span>System Size:</span> <span class="calc-val">${result.size} kW</span></div>
  <div class="calc-stat"><span>Monthly Savings:</span> <span class="calc-val">PKR ${result.savings}</span></div>
  <div class="calc-stat"><span>Est. System Cost:</span> <span class="calc-val">PKR ${result.cost}</span></div>
  <div class="calc-stat"><span>Payback Period:</span> <span class="calc-val">${result.payback} Years</span></div>
</div>
<br/>
Would you like to get a formal quote or site survey based on this estimate?`;

        return {
            message: cardHtml,
            quickReplies: ["Get A Quote", "🏠 Main Menu"]
        };
    }
  }

  // 2. ROOF ANALYSIS FLOW (Simulated)
  if (step.startsWith('ROOF_')) {
    if (step === 'ROOF_ADDR') {
        await dbUpdate("chat_sessions", session.id, { calc_step: 'ROOF_ANALYZING', calc_data: { address: message } });
        return { 
            message: "📍 *Address Received: " + message + "*\n\nInitializing satellite analysis... 🛰️\nChecking terrain and shade patterns...\n\nClick below to see the results.", 
            quickReplies: ["See Analysis Results", "🏠 Main Menu"] 
        };
    }
    if (step === 'ROOF_ANALYZING') {
        await dbUpdate("chat_sessions", session.id, { calc_step: null, calc_data: {} });
        return {
            message: "✅ **Analysis Complete for " + data.address + "**\n\nYour roof is **Highly Suitable** for solar!\n- Est. Available Area: 850 sq ft\n- Est. Sunlight: 5.4 peak hours/day\n- Recommended: **10kW Alpha System**",
            quickReplies: ["Calculate My Savings 📈", "🏠 Main Menu"]
        };
    }
  }

  // 3. PRODUCT RECOMMENDATION FLOW
  if (step.startsWith('RECOM_')) {
    if (step === 'RECOM_GOAL') {
        await dbUpdate("chat_sessions", session.id, { calc_step: 'RECOM_BUDGET', calc_data: { goal: message } });
        return { message: "Great! What is your estimated **budget range** for this project?", quickReplies: ["Under 5 Lakhs", "5-10 Lakhs", "10 Lakhs+", "🏠 Main Menu"] };
    }
    if (step === 'RECOM_BUDGET') {
        await dbUpdate("chat_sessions", session.id, { calc_step: null, calc_data: {} });
        let rec = "Our Apollo 550W Panels with a 5kW Smart Inverter.";
        if (message.includes("10 Lakhs")) rec = "The Lumina Elite 15kW System with LFP Battery Backup.";
        return { message: "🛠️ **Recommendation:** Based on your goal of " + data.goal + ", we suggest:\n\n" + rec + "\n\nWould you like the technical specs?", quickReplies: ["Get A Quote", "🏠 Main Menu"] };
    }
  }

  // 4. USAGE ANALYZER FLOW
  if (step.startsWith('USAGE_')) {
    if (step === 'USAGE_AC') {
        await dbUpdate("chat_sessions", session.id, { calc_step: null, calc_data: {} });
        return { message: "⚡ **Usage Analysis:**\n\nRunning " + message + " indicates a significant summer load. You likely consume ~800-1200 units/mo.\n\nSuggested: **10kW Hybrid System** to cover 100% of your bill.", quickReplies: ["Calculate My Savings 📈", "🏠 Main Menu"] };
    }
  }

  // 5. LEAD QUALIFICATION & BOOKING FLOW
  if (step.startsWith('QUAL_')) {
    if (step === 'QUAL_TYPE') {
        await dbUpdate("chat_sessions", session.id, { calc_step: 'QUAL_OWNER', calc_data: { type: message } });
        return { message: "Understood. Do you own the property?", quickReplies: ["Yes, I own it", "No, I am a tenant", "🏠 Main Menu"] };
    }
    if (step === 'QUAL_OWNER') {
        await dbUpdate("chat_sessions", session.id, { calc_step: 'QUAL_BOOK', calc_data: { ...data, owner: message } });
        return { message: "Perfect. When would be the best time for our expert to call you for a free site visit?", quickReplies: ["Tomorrow Morning", "Tomorrow Evening", "Next Week", "🏠 Main Menu"] };
    }
    if (step === 'QUAL_BOOK') {
        await dbUpdate("chat_sessions", session.id, { calc_step: null, calc_data: {} });
        return { 
            message: "🎉 **Booking Confirmed!**\n\nOur expert will contact you at your preferred time. We have all your details and will bring a demo kit for your " + data.type + " project.\n\nAnything else you'd like to know?", 
            quickReplies: ["Installation Guide", "🏠 Main Menu"] 
        };
    }
  }

  return null;
}

function getBotResponse(userMessage) {
  const key = userMessage.toLowerCase().trim();
  const flow = BOT_FLOWS[key];
  if (flow) return flow;
  
  // Fuzzy match
  for (const [flowKey, flowData] of Object.entries(BOT_FLOWS)) {
    if (flowKey !== "welcome" && flowKey !== "🏠 main menu" && (key.includes(flowKey) || flowKey.includes(key.split(" ")[0]))) {
      return flowData;
    }
  }
  return null; // Signals to use AI
}

async function dbInsert(table, data) {
  if (supabase) {
    const { data: result, error } = await supabase.from(table).insert(data).select().single();
    if (error) throw error;
    return result;
  } else {
    const record = { id: uuidv4(), ...data, created_at: new Date().toISOString() };
    memoryStore[table].push(record);
    return record;
  }
}

async function dbUpdate(table, id, data) {
  if (supabase) {
    const { data: result, error } = await supabase.from(table).update(data).eq("id", id).select().single();
    if (error) throw error;
    return result;
  } else {
    const index = memoryStore[table].findIndex(r => r.id === id);
    if (index !== -1) {
      memoryStore[table][index] = { ...memoryStore[table][index], ...data };
      return memoryStore[table][index];
    }
    return null;
  }
}

async function dbQuery(table, filters = {}) {
  if (supabase) {
    let query = supabase.from(table).select("*");
    for (const [col, val] of Object.entries(filters)) {
      query = query.eq(col, val);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } else {
    return memoryStore[table]
      .filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v))
      .reverse();
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: supabase ? "supabase" : "memory",
    timestamp: new Date().toISOString(),
  });
});

// Start a chat session (save lead)
app.post("/api/chat/start", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Save lead
    const lead = await dbInsert("chat_leads", { name, email });

    // Create session
    const session = await dbInsert("chat_sessions", { 
      lead_id: lead.id,
      calc_step: null,
      calc_data: {}
    });

    // Save welcome bot message
    const botResponse = BOT_FLOWS["welcome"];
    await dbInsert("chat_messages", {
      session_id: session.id,
      role: "bot",
      content: botResponse.message,
    });

    res.json({
      success: true,
      session_id: session.id,
      lead_id: lead.id,
      bot: botResponse,
    });
  } catch (err) {
    console.error("Error starting chat:", err);
    res.status(500).json({ error: "Failed to start chat session" });
  }
});

// Send a message
app.post("/api/chat/message", async (req, res) => {
  try {
    const { session_id, message } = req.body;
    if (!session_id || !message) {
      return res.status(400).json({ error: "session_id and message are required" });
    }

    // Save user message
    await dbInsert("chat_messages", {
      session_id,
      role: "user",
      content: message,
    });

    // 0. CHECK CONTEXT (Stateful Bots)
    const sessions = await dbQuery("chat_sessions", { id: session_id });
    const session = sessions[0];
    let botResponse = null;

    if (session && session.calc_step) {
      botResponse = await handleMultiAgentFlow(session, message);
    } else {
      // 1. Try template match
      botResponse = getBotResponse(message);

      // --- Trigger specialized flows ---
      const msg = message.toLowerCase();
      if (msg.includes("calculate my savings")) {
        await dbUpdate("chat_sessions", session_id, { calc_step: 'CALC_BILL', calc_data: {} });
      } else if (msg.includes("roof analysis")) {
        await dbUpdate("chat_sessions", session_id, { calc_step: 'ROOF_ADDR', calc_data: {} });
      } else if (msg.includes("product recommendation")) {
        await dbUpdate("chat_sessions", session_id, { calc_step: 'RECOM_GOAL', calc_data: {} });
      } else if (msg.includes("usage analyzer")) {
        await dbUpdate("chat_sessions", session_id, { calc_step: 'USAGE_AC', calc_data: {} });
      } else if (msg.includes("get a quote")) {
        await dbUpdate("chat_sessions", session_id, { calc_step: 'QUAL_TYPE', calc_data: {} });
      }
      
      // Handle "🏠 Main Menu" reset
      if (msg === "🏠 main menu") {
        await dbUpdate("chat_sessions", session_id, { calc_step: null, calc_data: {} });
      }
    }

    // Double-check Main Menu reset for stateful flows
    if (message.toLowerCase() === "🏠 main menu" && !botResponse) {
      await dbUpdate("chat_sessions", session_id, { calc_step: null, calc_data: {} });
      botResponse = getBotResponse(message);
    }

    // 2. Fallback to AI if no template or calc match
    if (!botResponse) {
      // Get brief history for context (last 4 messages)
      const historyRaw = await dbQuery("chat_messages", { session_id });
      const history = historyRaw.reverse().slice(-4).map(m => ({
        role: m.role === "bot" ? "assistant" : m.role,
        content: m.content
      }));
      
      botResponse = await getAIResponse(message, history);
    }

    // 3. Final default fallback
    if (!botResponse) {
      botResponse = {
        message: "I'm having trouble connecting right now, but a human expert will get back to you soon!",
        quickReplies: ["🏠 Main Menu"]
      };
    }

    // Save bot response
    await dbInsert("chat_messages", {
      session_id,
      role: "bot",
      content: botResponse.message,
    });

    res.json({ success: true, bot: botResponse });
  } catch (err) {
    console.error("Error processing message:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Get chat history for a session
app.get("/api/chat/history/:sessionId", async (req, res) => {
  try {
    const messages = await dbQuery("chat_messages", { session_id: req.params.sessionId });
    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Admin: Get all leads
app.get("/api/admin/leads", async (req, res) => {
  try {
    const leads = await dbQuery("chat_leads");
    res.json({ success: true, leads, count: leads.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Admin: Get all sessions
app.get("/api/admin/sessions", async (req, res) => {
  try {
    const sessions = await dbQuery("chat_sessions");
    res.json({ success: true, sessions, count: sessions.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌞 Lumina Solar Platform running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}\n`);
});
