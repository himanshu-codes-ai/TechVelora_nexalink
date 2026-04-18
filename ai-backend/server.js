import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

// ── Load env ────────────────────────────────────────────────
dotenv.config();

const PORT = process.env.PORT || 3001;
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!GROQ_KEY) {
  console.error("❌  GROQ_API_KEY is missing in .env");
  console.error("   Get your free key at: https://console.groq.com/keys");
  process.exit(1);
}

// ── Groq client ─────────────────────────────────────────────
const groq = new Groq({ apiKey: GROQ_KEY });

// ── Express app ─────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── Health-check ────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Nexalink AI Backend (Groq)" });
});

// ── POST /chat ──────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are the Nexalink AI Assistant — a professional networking copilot.
Give concise, actionable advice about careers, networking, profiles, and job searching.
Keep answers under 200 words. Be friendly but professional.`,
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = chatCompletion.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: "AI returned an empty response" });
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Groq error:", err.message);

    if (err.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Wait a moment and try again." });
    }
    if (err.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Check your .env file." });
    }

    return res.status(500).json({ error: "Failed to generate response. Please try again." });
  }
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Nexalink AI Backend running → http://localhost:${PORT}`);
  console.log(`📡  POST /chat ready (Groq + Llama 3.3 70B)\n`);
});
