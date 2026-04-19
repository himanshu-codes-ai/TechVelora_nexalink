# Walkthrough — Experienced Professionals Job Platform

## Summary
Upgraded Nexalink from a general professional network into a **strict, experienced-professionals-only job ecosystem** with AI-powered matching, deterministic gating, professional credibility proofs, and a company Kanban pipeline.

## Changes Made

### 1. AI Backend — Job Matching Engine
**File:** [server.js](file:///c:/TechVelora_nexalink/ai-backend/server.js)

Added `POST /api/jobs/match` with a two-phase architecture:
- **Phase 1 (Deterministic):** Compares experience years and skill overlap — rejects immediately if below threshold. Zero API cost.
- **Phase 2 (Semantic):** Sends profile vs JD to Groq Llama 3.3 70B with a recruiter prompt. Returns matchScore, alignmentPoints, skillGaps, and an editable pitch.
- **Fallback:** If AI returns bad JSON, falls back to deterministic scoring.

```diff:server.js
===
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

// ── Build context-aware system prompt ───────────────────────
function buildSystemPrompt(profile) {
  let systemPrompt = `You are the Nexalink AI Assistant — a professional networking copilot.
You give personalized, actionable advice about careers, networking, profiles, and job searching.
Keep answers under 200 words. Be friendly but professional.
When suggesting improvements, be specific — reference the user's actual data.\n\n`;

  if (!profile) {
    systemPrompt += `The user has not shared their profile. Give general professional advice.`;
    return systemPrompt;
  }

  // Build a rich context block from the user's real profile
  systemPrompt += `### USER PROFILE (use this to personalize your advice):\n`;

  if (profile.name) systemPrompt += `- **Name:** ${profile.name}\n`;
  if (profile.role) systemPrompt += `- **Account Type:** ${profile.role === 'company' ? 'Organization' : 'Individual'}\n`;
  if (profile.headline) systemPrompt += `- **Headline:** ${profile.headline}\n`;
  else systemPrompt += `- **Headline:** ⚠️ EMPTY — suggest one!\n`;

  if (profile.bio) systemPrompt += `- **Bio:** ${profile.bio}\n`;
  else systemPrompt += `- **Bio:** ⚠️ EMPTY — suggest writing one!\n`;

  if (profile.email) systemPrompt += `- **Email:** ${profile.email}\n`;
  if (profile.location) systemPrompt += `- **Location:** ${profile.location}\n`;
  else systemPrompt += `- **Location:** ⚠️ Not set\n`;

  // Skills
  if (profile.skills && profile.skills.length > 0) {
    systemPrompt += `- **Skills:** ${profile.skills.join(', ')}\n`;
  } else {
    systemPrompt += `- **Skills:** ⚠️ NONE added — strongly suggest adding skills!\n`;
  }

  // Education
  if (profile.education && profile.education.length > 0) {
    const eduList = profile.education.map(e => 
      `${e.degree || 'Degree'} at ${e.school || 'School'} (${e.year || ''})`
    ).join('; ');
    systemPrompt += `- **Education:** ${eduList}\n`;
  } else {
    systemPrompt += `- **Education:** ⚠️ NONE added\n`;
  }

  // Trust & Verification
  if (profile.trustScore !== undefined) {
    systemPrompt += `- **Trust Score:** ${profile.trustScore}/100 (Badge: ${profile.trustBadge || 'NEW'})\n`;
  }
  if (profile.trustBreakdown) {
    const tb = profile.trustBreakdown;
    const verified = Object.entries(tb).filter(([, v]) => v === true).map(([k]) => k);
    const missing = Object.entries(tb).filter(([, v]) => v !== true).map(([k]) => k);
    if (verified.length) systemPrompt += `- **Verified:** ${verified.join(', ')}\n`;
    if (missing.length) systemPrompt += `- **Not Verified:** ${missing.join(', ')} — suggest completing these!\n`;
  }

  // Connections & Activity
  if (profile.connectionsCount !== undefined) systemPrompt += `- **Connections:** ${profile.connectionsCount}\n`;
  if (profile.postsCount !== undefined) systemPrompt += `- **Posts:** ${profile.postsCount}\n`;
  if (profile.experienceYears !== undefined) systemPrompt += `- **Experience:** ${profile.experienceYears} years\n`;

  // Referrals
  systemPrompt += `- **Referrals Made:** ${profile.referralCount ?? 0}\n`;
  systemPrompt += `- **NexaCoins:** ${profile.nexaCoins ?? 0}\n`;

  systemPrompt += `\n### RULES:
- Always reference the user's real profile data when relevant.
- If NexaCoins are 0, suggest ways to earn them (Referrals: +10, Profile Completion: +5).
- If something is empty or missing, proactively suggest they fill it out.
- Don't make up information about the user — only use what's provided above.
- If the user asks about their trust score, explain what verifications are still needed.
- Give specific headline, bio, or skill suggestions based on their existing profile.`;

  return systemPrompt;
}

// ── POST /chat ──────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const { message, profile } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    // ── Diagnostic Logging ──
    if (profile) {
      console.log(`\n[AI Context] Profile received for: ${profile.name || 'Unknown'}`);
      console.log(`💸 NexaCoins: ${profile.nexaCoins ?? 0} | 🤝 Referrals: ${profile.referralCount ?? 0} | 🛡️ Trust: ${profile.trustScore ?? '???'}`);
    } else {
      console.log(`\n[AI Context] No profile data received. Giving generic response.`);
    }

    const systemPrompt = buildSystemPrompt(profile || null);

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],
      max_tokens: 500,
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

// ── POST /api/jobs/match — AI Job Matching Engine ───────────
app.post("/api/jobs/match", async (req, res) => {
  try {
    const { profile, job } = req.body;

    if (!profile || !job) {
      return res.status(400).json({ error: "Both 'profile' and 'job' are required" });
    }

    // ── Deterministic Gate (runs BEFORE AI to save tokens) ──
    const userExp = profile.experienceYears || 0;
    const jobMinExp = job.requiredExperienceYears || 0;

    if (userExp < jobMinExp) {
      return res.json({
        matchScore: 0,
        status: "REJECTED_DETERMINISTIC",
        reason: `This role requires ${jobMinExp}+ years of experience. Your profile shows ${userExp} years.`,
        alignmentPoints: [],
        skillGaps: job.requiredSkills || [],
        pitch: null
      });
    }

    // ── Skill Overlap (deterministic pre-filter) ──
    const userSkills = (profile.skills || []).map(s => s.toLowerCase());
    const jobSkills = (job.requiredSkills || []).map(s => s.toLowerCase());
    const matchedSkills = jobSkills.filter(s => userSkills.includes(s));
    const missingSkills = jobSkills.filter(s => !userSkills.includes(s));
    const skillOverlapPct = jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 50;

    // ── Build AI Matching Prompt ──
    const matchPrompt = `You are a senior technical recruiter at a top-tier company. Analyze this candidate's profile against the job description.

### CANDIDATE PROFILE:
- Name: ${profile.name || 'Unknown'}
- Headline: ${profile.headline || 'Not set'}
- Experience: ${userExp} years
- Skills: ${(profile.skills || []).join(', ') || 'None listed'}
- Education: ${(profile.education || []).map(e => `${e.degree} at ${e.school}`).join('; ') || 'Not provided'}
- Trust Score: ${profile.trustScore || 0}/100 (Badge: ${profile.trustBadge || 'NEW'})
- Bio: ${profile.bio || 'Not provided'}

### JOB DESCRIPTION:
- Title: ${job.title}
- Company: ${job.companyName}
- Required Experience: ${jobMinExp}+ years
- Required Skills: ${(job.requiredSkills || []).join(', ')}
- Description: ${job.description}
- Location: ${job.location || 'Remote'}
- Type: ${job.type || 'Full-time'}

### SKILL OVERLAP: ${skillOverlapPct}% (${matchedSkills.length}/${jobSkills.length} skills matched)

### YOUR TASK:
Return a JSON object (and ONLY JSON, no markdown, no backticks) with this exact structure:
{
  "matchScore": <number 0-100>,
  "alignmentPoints": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "skillGaps": ["<missing skill 1>", "<missing skill 2>"],
  "pitch": "<A 3-sentence professional application pitch the candidate can edit and submit. Write in first person. Reference specific skills and experience.>"
}`;

    console.log(`\n[Job Match] ${profile.name} → ${job.title} at ${job.companyName}`);
    console.log(`   Skills overlap: ${skillOverlapPct}% | Exp: ${userExp}yr vs ${jobMinExp}yr required`);

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a precise recruiter analysis engine. Return ONLY valid JSON. No markdown, no backticks, no commentary." },
        { role: "user", content: matchPrompt }
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const rawReply = chatCompletion.choices?.[0]?.message?.content || "";

    // ── Parse AI response ──
    let aiResult;
    try {
      // Strip any markdown code fences if the model wraps it
      const cleaned = rawReply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Job Match] AI returned unparseable response:", rawReply);
      // Fallback to deterministic scoring
      aiResult = {
        matchScore: Math.min(95, skillOverlapPct + (userExp >= jobMinExp ? 20 : 0)),
        alignmentPoints: matchedSkills.length > 0
          ? [`Strong overlap in ${matchedSkills.slice(0, 3).join(', ')}`]
          : ["Experience level meets requirements"],
        skillGaps: missingSkills,
        pitch: `With ${userExp} years of experience and expertise in ${matchedSkills.slice(0, 3).join(', ') || 'relevant technologies'}, I'm excited to apply for the ${job.title} role at ${job.companyName}. My background aligns well with the requirements, and I'm eager to contribute to the team's success.`
      };
    }

    return res.json({
      matchScore: aiResult.matchScore || 0,
      status: "MATCHED",
      alignmentPoints: aiResult.alignmentPoints || [],
      skillGaps: aiResult.skillGaps || missingSkills,
      pitch: aiResult.pitch || "",
      deterministic: {
        skillOverlapPct,
        matchedSkills,
        missingSkills,
        experienceMet: userExp >= jobMinExp
      }
    });

  } catch (err) {
    console.error("[Job Match] Error:", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Wait a moment and try again." });
    }
    return res.status(500).json({ error: "Job matching failed. Please try again." });
  }
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Nexalink AI Backend running → http://localhost:${PORT}`);
  console.log(`📡  POST /chat ready (Groq + Llama 3.3 70B)`);
  console.log(`🎯  POST /api/jobs/match ready (AI Job Matching Engine)`);
  console.log(`🧠  Context-aware: Accepts user profile for personalized advice\n`);
});
```

---

### 2. Service Layer — Recruitment Workflow
**File:** [realtimeService.jsx](file:///c:/TechVelora_nexalink/src/services/realtimeService.jsx)

Added 4 new functions for the 5-stage Kanban pipeline:
- `applyToJob()` — prevent duplicates, increment applicant count
- `updateApplicationStatus()` — PENDING → SHORTLISTED → INTERVIEWING → HIRED/REJECTED
- `getJobApplications()` — fetch applicants with enriched profiles
- `getUserApplications()` — track application status for professionals

```diff:realtimeService.jsx
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, limitToLast, serverTimestamp } from 'firebase/database';
import { rtdb as db } from '../config/firebase';

// ========== USERS & COMPANIES ==========

export async function getUser(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? { uid, ...snap.val() } : null;
}

export async function getCompany(companyId) {
  const snap = await get(ref(db, `companies/${companyId}`));
  return snap.exists() ? { companyId, ...snap.val() } : null;
}

export async function updateUserProfile(uid, data, role) {
  const collection = role === 'company' ? 'companies' : 'users';
  await update(ref(db, `${collection}/${uid}`), { ...data, updatedAt: serverTimestamp() });
}

// ========== POSTS ==========

export async function createPost(postData) {
  const authorId = postData.authorId;
  const newPostRef = push(ref(db, `posts/${authorId}`));
  const postId = newPostRef.key;
  
  await set(newPostRef, {
    ...postData,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    createdAt: Date.now()
  });
  
  // Increment author's post count
  const authorCollection = postData.authorType === 'company' ? 'companies' : 'users';
  const authorRef = ref(db, `${authorCollection}/${authorId}`);
  const authorSnap = await get(authorRef);
  if (authorSnap.exists()) {
    const currentCount = authorSnap.val().postsCount || 0;
    await update(authorRef, { postsCount: currentCount + 1 });
  }
  
  return postId;
}

export async function getPosts(pageSize = 20, lastTimestamp = null, userId = null) {
  // Try backend ranking first
  try {
    const fallbackId = userId || 'anonymous';
    const response = await fetch(`/api/feed/ranked?uid=${fallbackId}&limit=${pageSize}`);
    if (response.ok) {
      const posts = await response.json();
      return { posts, lastDoc: null, isRanked: true };
    }
  } catch (err) {
    console.warn("Backend ranked feed unavailable, falling back to basic RTDB fetch:", err.message);
  }

  // Fetch active connections to filter feed natively
  let connectedIds = userId ? [userId] : [];
  if (userId && userId !== 'anonymous') {
    const connSnap = await get(ref(db, `user_connections/${userId}`));
    if (connSnap.exists()) {
      connectedIds.push(...Object.keys(connSnap.val()));
    }
  }

  // Basic RTDB fallback (Flatten nested posts if backend fails)
  const snap = await get(ref(db, 'posts'));
  const allPosts = [];
  if (snap.exists()) {
    const nestedData = snap.val();
    // Iterate through user IDs or legacy posts
    for (const uid of Object.keys(nestedData)) {
      const node = nestedData[uid];
      
      // Legacy post boundary
      if (node.authorId || node.content) {
        const pAuth = node.authorId || uid;
        if (userId && userId !== 'anonymous' && !connectedIds.includes(pAuth)) continue;
        allPosts.push({ postId: uid, ...node });
        continue;
      }
      
      // Strict connections filter for nested algorithm
      if (userId && userId !== 'anonymous' && !connectedIds.includes(uid)) continue;
      
      // Otherwise, it represents nested posts by user ID: /posts/{userId}/{postId}
      if (typeof node === 'object') {
        for (const [pid, postData] of Object.entries(node)) {
          allPosts.push({ postId: pid, authorId: uid, ...postData });
        }
      }
    }
  }
  
  // Sort descending by Time
  allPosts.sort((a, b) => b.createdAt - a.createdAt);
  
  return {
    posts: allPosts.slice(0, pageSize),
    lastDoc: null,
    isRanked: false
  };
}

export async function recalculateTrustScore(uid) {
  try {
    const response = await fetch(`/api/trust/calculate/${uid}`, { method: 'POST' });
    if (response.ok) return await response.json();
  } catch (err) {
    console.error("Backend trust engine error:", err.message);
  }
}

// ========== JOBS ==========

export async function getJobs() {
  const snap = await get(ref(db, 'jobs'));
  const jobs = [];
  if (snap.exists()) {
    snap.forEach((child) => {
      jobs.push({ jobId: child.key, ...child.val() });
    });
  }
  return jobs.reverse();
}

export async function createJob(jobData) {
  const newJobRef = push(ref(db, 'jobs'));
  await set(newJobRef, { ...jobData, createdAt: Date.now() });
  return newJobRef.key;
}

// ========== EVENTS ==========

export async function getEvents() {
  const snap = await get(ref(db, 'events'));
  const events = [];
  if (snap.exists()) {
    snap.forEach((child) => {
      events.push({ eventId: child.key, ...child.val() });
    });
  }
  return events.reverse();
}

// ========== CONNECTIONS ==========

export async function getConnections(userId) {
  const snap = await get(ref(db, `user_connections/${userId}`));
  const connections = [];
  if (snap.exists()) {
    for (const connectedId of Object.keys(snap.val())) {
      const u = await getUser(connectedId);
      if(u) connections.push({ connectionId: connectedId, ...u });
    }
  }
  return connections;
}

export async function getConnectionStatus(fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return 'self';
  
  const connectedSnap = await get(ref(db, `user_connections/${fromUserId}/${toUserId}`));
  if (connectedSnap.exists()) return 'connected';
  
  const sentSnap = await get(ref(db, `requests/${toUserId}/${fromUserId}`));
  if (sentSnap.exists()) return 'pending';
  
  const receivedSnap = await get(ref(db, `requests/${fromUserId}/${toUserId}`));
  if (receivedSnap.exists()) return 'received';
  
  return 'none';
}

export async function getAllUsers(pageSize = 50) {
  const snap = await get(query(ref(db, 'users'), limitToLast(pageSize)));
  const users = [];
  if (snap.exists()) {
    snap.forEach((child) => {
      users.push({ uid: child.key, ...child.val() });
    });
  }
  return users.reverse();
}

export async function getPendingRequests(userId) {
  const snap = await get(ref(db, `requests/${userId}`));
  const requests = [];
  if (snap.exists()) {
    for (const [fromId, val] of Object.entries(snap.val())) {
      const u = await getUser(fromId);
      requests.push({ connectionId: fromId, ...val, user: u });
    }
  }
  return requests;
}

export async function sendConnectionRequest(fromUserId, toUserId) {
  if (fromUserId === toUserId) throw new Error("Cannot connect to yourself");
  
  // Prevent duplicate requests or connecting if already connected
  const isConnected = await get(ref(db, `user_connections/${fromUserId}/${toUserId}`));
  if (isConnected.exists()) return;

  const hasSent = await get(ref(db, `requests/${toUserId}/${fromUserId}`));
  if (hasSent.exists()) return;

  const hasReceived = await get(ref(db, `requests/${fromUserId}/${toUserId}`));
  if (hasReceived.exists()) return;

  const reqRef = ref(db, `requests/${toUserId}/${fromUserId}`);
  await set(reqRef, {
    fromUserId,
    toUserId,
    timestamp: Date.now()
  });
  return fromUserId; // returning fromUserId as the mock connectionId 
}

export async function acceptConnection(fromUserId, userId) {
  // Construct bidirectional accepted connection
  await set(ref(db, `user_connections/${userId}/${fromUserId}`), { timestamp: Date.now() });
  await set(ref(db, `user_connections/${fromUserId}/${userId}`), { timestamp: Date.now() });
  
  // Increment connectionsCount for both users securely (Supporting both Users and Companies)
  for(const uid of [fromUserId, userId]) {
    let accRef = ref(db, `users/${uid}`);
    let snap = await get(accRef);
    
    if (!snap.exists()) {
      accRef = ref(db, `companies/${uid}`);
      snap = await get(accRef);
    }
    
    if (snap.exists()) {
      await update(accRef, { connectionsCount: (snap.val().connectionsCount || 0) + 1 });
    }
  }

  // Delete the pending request block
  await remove(ref(db, `requests/${userId}/${fromUserId}`));
}

export async function rejectConnection(fromUserId, userId) {
  // Delete the pending request block
  await remove(ref(db, `requests/${userId}/${fromUserId}`));
}

// ========== EVENTS EXTRA ==========
export async function createEvent(eventData) {
  const newRef = push(ref(db, 'events'));
  await set(newRef, { ...eventData, createdAt: Date.now(), attendeesCount: 0 });
  return newRef.key;
}

export async function registerForEvent(eventId, userId) {
  const regRef = ref(db, `event_registrations/${eventId}_${userId}`);
  await set(regRef, { eventId, userId, createdAt: Date.now() });
  
  // Increment count
  const eventRef = ref(db, `events/${eventId}`);
  const snap = await get(eventRef);
  if (snap.exists()) {
    await update(eventRef, { attendeesCount: (snap.val().attendeesCount || 0) + 1 });
  }
}

// ========== POST ACTIONS ==========
export async function likePost(postId, userId, authorId) {
  if (!authorId) return false;
  const postRef = ref(db, `posts/${authorId}/${postId}`);
  const likeRef = ref(db, `posts/${authorId}/${postId}/likes/${userId}`);
  
  const postSnap = await get(postRef);
  if (!postSnap.exists()) return false;
  const currentLikes = postSnap.val().likesCount || 0;

  const snap = await get(likeRef);
  if (snap.exists()) {
    await remove(likeRef);
    await update(postRef, { likesCount: Math.max(0, currentLikes - 1) });
    return false; // unliked
  } else {
    await set(likeRef, { userId, createdAt: Date.now() });
    await update(postRef, { likesCount: currentLikes + 1 });
    return true; // liked
  }
}

export async function addComment(postId, commentData, authorId) {
  if (!authorId) return null;
  const commentsRef = ref(db, `posts/${authorId}/${postId}/comments`);
  const newRef = push(commentsRef);
  await set(newRef, { postId, ...commentData, createdAt: Date.now() });
  
  const postRef = ref(db, `posts/${authorId}/${postId}`);
  const postSnap = await get(postRef);
  if (postSnap.exists()) {
    await update(postRef, { commentsCount: (postSnap.val().commentsCount || 0) + 1 });
  }
  return newRef.key;
}

export async function getComments(postId, authorId) {
  if (!authorId) return [];
  const snap = await get(ref(db, `posts/${authorId}/${postId}/comments`));
  const comments = [];
  if (snap.exists()) {
    for (const [key, val] of Object.entries(snap.val())) {
      comments.push({ commentId: key, ...val });
    }
  }
  return comments.sort((a, b) => a.createdAt - b.createdAt);
}

// ========== DEVELOPER PROJECTS ==========
export async function getProjects(userId) {
  if (!userId) return [];
  const snap = await get(ref(db, `users/${userId}/projects`));
  const projects = [];
  if (snap.exists()) {
    for (const [key, val] of Object.entries(snap.val())) {
      projects.push({ id: key, ...val });
    }
  }
  return projects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function deleteProject(userId, projectId) {
  try {
    const projectRef = ref(db, `users/${userId}/projects/${projectId}`);
    await remove(projectRef);
    return true;
  } catch (err) {
    console.error('Error deleting project directly:', err);
    return false;
  }
}
===
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, limitToLast, serverTimestamp } from 'firebase/database';
import { rtdb as db } from '../config/firebase';

// ========== USERS & COMPANIES ==========

export async function getUser(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? { uid, ...snap.val() } : null;
}

export async function getCompany(companyId) {
  const snap = await get(ref(db, `companies/${companyId}`));
  return snap.exists() ? { companyId, ...snap.val() } : null;
}

export async function updateUserProfile(uid, data, role) {
  const collection = role === 'company' ? 'companies' : 'users';
  await update(ref(db, `${collection}/${uid}`), { ...data, updatedAt: serverTimestamp() });
}

// ========== POSTS ==========

export async function createPost(postData) {
  const authorId = postData.authorId;
  const newPostRef = push(ref(db, `posts/${authorId}`));
  const postId = newPostRef.key;
  
  await set(newPostRef, {
    ...postData,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    createdAt: Date.now()
  });
  
  // Increment author's post count
  const authorCollection = postData.authorType === 'company' ? 'companies' : 'users';
  const authorRef = ref(db, `${authorCollection}/${authorId}`);
  const authorSnap = await get(authorRef);
  if (authorSnap.exists()) {
    const currentCount = authorSnap.val().postsCount || 0;
    await update(authorRef, { postsCount: currentCount + 1 });
  }
  
  return postId;
}

export async function getPosts(pageSize = 20, lastTimestamp = null, userId = null) {
  // Try backend ranking first
  try {
    const fallbackId = userId || 'anonymous';
    const response = await fetch(`/api/feed/ranked?uid=${fallbackId}&limit=${pageSize}`);
    if (response.ok) {
      const posts = await response.json();
      return { posts, lastDoc: null, isRanked: true };
    }
  } catch (err) {
    console.warn("Backend ranked feed unavailable, falling back to basic RTDB fetch:", err.message);
  }

  // Fetch active connections to filter feed natively
  let connectedIds = userId ? [userId] : [];
  if (userId && userId !== 'anonymous') {
    const connSnap = await get(ref(db, `user_connections/${userId}`));
    if (connSnap.exists()) {
      connectedIds.push(...Object.keys(connSnap.val()));
    }
  }

  // Basic RTDB fallback (Flatten nested posts if backend fails)
  const snap = await get(ref(db, 'posts'));
  const allPosts = [];
  if (snap.exists()) {
    const nestedData = snap.val();
    // Iterate through user IDs or legacy posts
    for (const uid of Object.keys(nestedData)) {
      const node = nestedData[uid];
      
      // Legacy post boundary
      if (node.authorId || node.content) {
        const pAuth = node.authorId || uid;
        if (userId && userId !== 'anonymous' && !connectedIds.includes(pAuth)) continue;
        allPosts.push({ postId: uid, ...node });
        continue;
      }
      
      // Strict connections filter for nested algorithm
      if (userId && userId !== 'anonymous' && !connectedIds.includes(uid)) continue;
      
      // Otherwise, it represents nested posts by user ID: /posts/{userId}/{postId}
      if (typeof node === 'object') {
        for (const [pid, postData] of Object.entries(node)) {
          allPosts.push({ postId: pid, authorId: uid, ...postData });
        }
      }
    }
  }
  
  // Sort descending by Time
  allPosts.sort((a, b) => b.createdAt - a.createdAt);
  
  return {
    posts: allPosts.slice(0, pageSize),
    lastDoc: null,
    isRanked: false
  };
}

export async function recalculateTrustScore(uid) {
  try {
    const response = await fetch(`/api/trust/calculate/${uid}`, { method: 'POST' });
    if (response.ok) return await response.json();
  } catch (err) {
    console.error("Backend trust engine error:", err.message);
  }
}

// ========== JOBS ==========

export async function getJobs() {
  const snap = await get(ref(db, 'jobs'));
  const jobs = [];
  if (snap.exists()) {
    snap.forEach((child) => {
      jobs.push({ jobId: child.key, ...child.val() });
    });
  }
  return jobs.reverse();
}

export async function createJob(jobData) {
  const newJobRef = push(ref(db, 'jobs'));
  await set(newJobRef, { ...jobData, createdAt: Date.now() });
  return newJobRef.key;
}

// ========== EVENTS ==========

export async function getEvents() {
  const snap = await get(ref(db, 'events'));
  const events = [];
  if (snap.exists()) {
    snap.forEach((child) => {
      events.push({ eventId: child.key, ...child.val() });
    });
  }
  return events.reverse();
}

// ========== CONNECTIONS ==========

export async function getConnections(userId) {
  const snap = await get(ref(db, `user_connections/${userId}`));
  const connections = [];
  if (snap.exists()) {
    for (const connectedId of Object.keys(snap.val())) {
      const u = await getUser(connectedId);
      if(u) connections.push({ connectionId: connectedId, ...u });
    }
  }
  return connections;
}

export async function getConnectionStatus(fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return 'self';
  
  const connectedSnap = await get(ref(db, `user_connections/${fromUserId}/${toUserId}`));
  if (connectedSnap.exists()) return 'connected';
  
  const sentSnap = await get(ref(db, `requests/${toUserId}/${fromUserId}`));
  if (sentSnap.exists()) return 'pending';
  
  const receivedSnap = await get(ref(db, `requests/${fromUserId}/${toUserId}`));
  if (receivedSnap.exists()) return 'received';
  
  return 'none';
}

export async function getAllUsers(pageSize = 50) {
  const snap = await get(query(ref(db, 'users'), limitToLast(pageSize)));
  const users = [];
  if (snap.exists()) {
    snap.forEach((child) => {
      users.push({ uid: child.key, ...child.val() });
    });
  }
  return users.reverse();
}

export async function getPendingRequests(userId) {
  const snap = await get(ref(db, `requests/${userId}`));
  const requests = [];
  if (snap.exists()) {
    for (const [fromId, val] of Object.entries(snap.val())) {
      const u = await getUser(fromId);
      requests.push({ connectionId: fromId, ...val, user: u });
    }
  }
  return requests;
}

export async function sendConnectionRequest(fromUserId, toUserId) {
  if (fromUserId === toUserId) throw new Error("Cannot connect to yourself");
  
  // Prevent duplicate requests or connecting if already connected
  const isConnected = await get(ref(db, `user_connections/${fromUserId}/${toUserId}`));
  if (isConnected.exists()) return;

  const hasSent = await get(ref(db, `requests/${toUserId}/${fromUserId}`));
  if (hasSent.exists()) return;

  const hasReceived = await get(ref(db, `requests/${fromUserId}/${toUserId}`));
  if (hasReceived.exists()) return;

  const reqRef = ref(db, `requests/${toUserId}/${fromUserId}`);
  await set(reqRef, {
    fromUserId,
    toUserId,
    timestamp: Date.now()
  });
  return fromUserId; // returning fromUserId as the mock connectionId 
}

export async function acceptConnection(fromUserId, userId) {
  // Construct bidirectional accepted connection
  await set(ref(db, `user_connections/${userId}/${fromUserId}`), { timestamp: Date.now() });
  await set(ref(db, `user_connections/${fromUserId}/${userId}`), { timestamp: Date.now() });
  
  // Increment connectionsCount for both users securely (Supporting both Users and Companies)
  for(const uid of [fromUserId, userId]) {
    let accRef = ref(db, `users/${uid}`);
    let snap = await get(accRef);
    
    if (!snap.exists()) {
      accRef = ref(db, `companies/${uid}`);
      snap = await get(accRef);
    }
    
    if (snap.exists()) {
      await update(accRef, { connectionsCount: (snap.val().connectionsCount || 0) + 1 });
    }
  }

  // Delete the pending request block
  await remove(ref(db, `requests/${userId}/${fromUserId}`));
}

export async function rejectConnection(fromUserId, userId) {
  // Delete the pending request block
  await remove(ref(db, `requests/${userId}/${fromUserId}`));
}

// ========== EVENTS EXTRA ==========
export async function createEvent(eventData) {
  const newRef = push(ref(db, 'events'));
  await set(newRef, { ...eventData, createdAt: Date.now(), attendeesCount: 0 });
  return newRef.key;
}

export async function registerForEvent(eventId, userId) {
  const regRef = ref(db, `event_registrations/${eventId}_${userId}`);
  await set(regRef, { eventId, userId, createdAt: Date.now() });
  
  // Increment count
  const eventRef = ref(db, `events/${eventId}`);
  const snap = await get(eventRef);
  if (snap.exists()) {
    await update(eventRef, { attendeesCount: (snap.val().attendeesCount || 0) + 1 });
  }
}

// ========== POST ACTIONS ==========
export async function likePost(postId, userId, authorId) {
  if (!authorId) return false;
  const postRef = ref(db, `posts/${authorId}/${postId}`);
  const likeRef = ref(db, `posts/${authorId}/${postId}/likes/${userId}`);
  
  const postSnap = await get(postRef);
  if (!postSnap.exists()) return false;
  const currentLikes = postSnap.val().likesCount || 0;

  const snap = await get(likeRef);
  if (snap.exists()) {
    await remove(likeRef);
    await update(postRef, { likesCount: Math.max(0, currentLikes - 1) });
    return false; // unliked
  } else {
    await set(likeRef, { userId, createdAt: Date.now() });
    await update(postRef, { likesCount: currentLikes + 1 });
    return true; // liked
  }
}

export async function addComment(postId, commentData, authorId) {
  if (!authorId) return null;
  const commentsRef = ref(db, `posts/${authorId}/${postId}/comments`);
  const newRef = push(commentsRef);
  await set(newRef, { postId, ...commentData, createdAt: Date.now() });
  
  const postRef = ref(db, `posts/${authorId}/${postId}`);
  const postSnap = await get(postRef);
  if (postSnap.exists()) {
    await update(postRef, { commentsCount: (postSnap.val().commentsCount || 0) + 1 });
  }
  return newRef.key;
}

export async function getComments(postId, authorId) {
  if (!authorId) return [];
  const snap = await get(ref(db, `posts/${authorId}/${postId}/comments`));
  const comments = [];
  if (snap.exists()) {
    for (const [key, val] of Object.entries(snap.val())) {
      comments.push({ commentId: key, ...val });
    }
  }
  return comments.sort((a, b) => a.createdAt - b.createdAt);
}

// ========== DEVELOPER PROJECTS ==========
export async function getProjects(userId) {
  if (!userId) return [];
  const snap = await get(ref(db, `users/${userId}/projects`));
  const projects = [];
  if (snap.exists()) {
    for (const [key, val] of Object.entries(snap.val())) {
      projects.push({ id: key, ...val });
    }
  }
  return projects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function deleteProject(userId, projectId) {
  try {
    const projectRef = ref(db, `users/${userId}/projects/${projectId}`);
    await remove(projectRef);
    return true;
  } catch (err) {
    console.error('Error deleting project directly:', err);
    return false;
  }
}

// ========== RECRUITMENT WORKFLOW ==========

// Application Status Pipeline: PENDING -> SHORTLISTED -> INTERVIEWING -> REJECTED -> HIRED
export async function applyToJob(jobId, userId, applicationData) {
  if (!jobId || !userId) throw new Error('jobId and userId are required');

  // Prevent duplicate applications
  const existingSnap = await get(ref(db, `job_applications/${jobId}/${userId}`));
  if (existingSnap.exists()) throw new Error('You have already applied to this job');

  const application = {
    userId,
    jobId,
    status: 'PENDING',
    appliedAt: Date.now(),
    updatedAt: Date.now(),
    ...applicationData
  };

  await set(ref(db, `job_applications/${jobId}/${userId}`), application);

  // Also store in user's application history for quick lookup
  await set(ref(db, `user_applications/${userId}/${jobId}`), {
    jobId,
    status: 'PENDING',
    appliedAt: Date.now()
  });

  // Increment applicant count on the job
  const jobRef = ref(db, `jobs/${jobId}`);
  const jobSnap = await get(jobRef);
  if (jobSnap.exists()) {
    await update(jobRef, { applicantsCount: (jobSnap.val().applicantsCount || 0) + 1 });
  }

  return application;
}

export async function updateApplicationStatus(jobId, userId, newStatus) {
  const validStatuses = ['PENDING', 'SHORTLISTED', 'INTERVIEWING', 'REJECTED', 'HIRED'];
  if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);

  await update(ref(db, `job_applications/${jobId}/${userId}`), {
    status: newStatus,
    updatedAt: Date.now()
  });

  // Mirror status to user's application record
  await update(ref(db, `user_applications/${userId}/${jobId}`), {
    status: newStatus,
    updatedAt: Date.now()
  });

  return true;
}

export async function getJobApplications(jobId) {
  const snap = await get(ref(db, `job_applications/${jobId}`));
  const applications = [];
  if (snap.exists()) {
    for (const [uid, appData] of Object.entries(snap.val())) {
      // Fetch applicant profile for display
      const userSnap = await get(ref(db, `users/${uid}`));
      const userProfile = userSnap.exists() ? { uid, ...userSnap.val() } : { uid, name: 'Unknown' };
      applications.push({ ...appData, user: userProfile });
    }
  }
  return applications.sort((a, b) => b.appliedAt - a.appliedAt);
}

export async function getUserApplications(userId) {
  const snap = await get(ref(db, `user_applications/${userId}`));
  const applications = [];
  if (snap.exists()) {
    for (const [jid, appData] of Object.entries(snap.val())) {
      // Fetch job details for display
      const jobSnap = await get(ref(db, `jobs/${jid}`));
      const jobDetails = jobSnap.exists() ? { jobId: jid, ...jobSnap.val() } : { jobId: jid, title: 'Deleted Job' };
      applications.push({ ...appData, job: jobDetails });
    }
  }
  return applications.sort((a, b) => b.appliedAt - a.appliedAt);
}

```

---

### 3. Trust Engine — Professional Credibility
**File:** [trustService.js](file:///c:/TechVelora_nexalink/src/services/trustService.js)

Upgraded from 100-point to **130-point** system:
- Added `linkedIn` verification (+10 points)
- Added `corporateEmail` verification (+20 points)
- Corporate email validated against a list of 12 public email domains

```diff:trustService.js
import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "firebase/firestore";

import { ref as rtdbRef, get as rtdbGet, update as rtdbUpdate, push as rtdbPush } from "firebase/database";
import { rtdb } from "../config/firebase";
import emailjs from '@emailjs/browser';

const VERIFICATION_POINTS = {
  email: 10,
  profile: 10,
  education: 15,
  skills: 15,
  gov: 50
};

// ==============================
// 🛠 Helper: File to Base64
// ==============================
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

// ==============================
// 📤 Upload Government ID (RTDB Base64)
// ==============================
export const uploadGovernmentId = async (userId, file, docType) => {
  try {
    if (!file) throw new Error("No file selected");

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be < 5MB");
    }

    // 1. Convert to Base64 String
    const base64String = await fileToBase64(file);

    // 2. Save metadata & raw base64 data to Realtime Database
    const newDocRef = rtdbPush(rtdbRef(rtdb, `users/${userId}/documents`));
    await rtdbUpdate(newDocRef, {
      docType,
      fileData: base64String, // Storing as base64 string
      status: "verified",     // Auto-verify as per instructions
      uploadedAt: Date.now()
    });

    // 3. Immediately trigger recalculation which will set gov=true
    await recalculateTrustScore(userId);

    return true;

  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
};

// ==============================
// 📄 Get User Documents (From RTDB)
// ==============================
export const getUserVerificationDocs = async (userId) => {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, `users/${userId}/documents`));
    if (!snap.exists()) return [];

    const documentsObj = snap.val();
    const docs = Object.keys(documentsObj).map(key => ({
      id: key,
      ...documentsObj[key]
    }));

    // Sort descending by uploadedAt
    return docs.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error) {
    console.error("Fetch Docs Error:", error);
    return [];
  }
};

// ==============================
// ✉️ Send Real Email OTP (EmailJS)
// ==============================
export const sendEmailOTP = async (userId, userEmail) => {
  try {
    if (!userEmail) throw new Error("No primary email found on profile.");

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Calculate human-readable expiry time for template
    const timeString = new Date(expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 2. Store securely in Realtime Database (Bypassing restrictive Firestore rules)
    await rtdbUpdate(rtdbRef(rtdb, `users/${userId}`), {
      emailOTP: otp,
      otpExpiry: expiry
    });

    // 3. Dispatch via EmailJS 
    // IMPORTANT: Make sure to replace YOUR_TEMPLATE_ID and YOUR_PUBLIC_KEY 
    try {
      await emailjs.send(
        'service_7ikenye',
        'template_2wpxfzw',
        {
          to_email: userEmail,       // Primary target mapping
          email: userEmail,          // Backup mapping 1
          user_email: userEmail,     // Backup mapping 2
          passcode: otp,             // Matches {{passcode}} in template
          time: timeString           // Matches {{time}} in template
        },
        'wV2o1hWsv0bLeOMJY'
      );
    } catch (emailErr) {
      console.error("EmailJS rejection details:", emailErr);
      const errorMsg = emailErr?.text || emailErr?.message || JSON.stringify(emailErr);
      throw new Error("EmailJS Delivery Failed: " + errorMsg);
    }
    
    return true;
  } catch (err) {
    console.error("OTP Delivery Error:", err);
    throw err;
  }
};

// ==============================
// ✉️ Verify Real Email OTP
// ==============================
export const verifyEmailOTP = async (userId, otp) => {
  if (!otp || otp.length !== 6) throw new Error("Invalid OTP format");

  const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `users/${userId}`));
  if (!rtdbSnap.exists()) throw new Error("Verification record not found");

  const data = rtdbSnap.val();

  // 1. Security Validation
  if (!data.emailOTP) throw new Error("No pending OTP request found");
  if (Date.now() > data.otpExpiry) throw new Error("OTP has expired. Please request a new one.");
  if (data.emailOTP !== otp) throw new Error("Incorrect OTP code.");

  // 2. Clear token and flip boolean
  const breakdown = data.trustBreakdown || {};
  breakdown.email = true;

  // Clear from RTDB
  await rtdbUpdate(rtdbRef(rtdb, `users/${userId}`), {
    trustBreakdown: breakdown,
    emailOTP: null,   // Nuke single-use token
    otpExpiry: null
  });

  // 3. Recalculate Points
  await recalculateTrustScore(userId);
  return true;
};

// ==============================
// 🧠 Recalculate Trust Score
// ==============================
export const recalculateTrustScore = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);

    // FETCH LIVE PROFILE DATA FROM RTDB TO SEE NEW SKILLS
    const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `users/${userId}`));
    if (!rtdbSnap.exists()) return;

    const userData = rtdbSnap.val();
    const docs = await getUserVerificationDocs(userId);

    // Initialize or get current breakdown
    let trustBreakdown = userData.trustBreakdown || {
      email: false,
      profile: false,
      education: false,
      skills: false,
      gov: false
    };

    // 🔹 Verify Profile Completeness Automatically
    const hasName = !!userData.name;
    const hasHeadline = !!userData.headline;
    const hasBio = !!userData.bio;
    if (hasName && hasHeadline && hasBio) {
      trustBreakdown.profile = true;
    }

    // 🔹 Verify Education Automatically
    if (userData.education && userData.education.length > 0) {
      trustBreakdown.education = true;
    }

    // 🔹 Verify Skills Automatically (Bug Fixed: Now reads from RTDB live state)
    if (userData.skills && userData.skills.length > 0) {
      trustBreakdown.skills = true;
    }

    // 🔹 Verify Government ID Automatically
    const hasVerifiedDoc = docs.some(d => d.status === "verified" || d.status === "pending");
    if (hasVerifiedDoc) {
      trustBreakdown.gov = true;
    }

    // 🔹 Calculate Trust Score
    let trustScore = 0;
    if (trustBreakdown.email) trustScore += VERIFICATION_POINTS.email;
    if (trustBreakdown.profile) trustScore += VERIFICATION_POINTS.profile;
    if (trustBreakdown.education) trustScore += VERIFICATION_POINTS.education;
    if (trustBreakdown.skills) trustScore += VERIFICATION_POINTS.skills;
    if (trustBreakdown.gov) trustScore += VERIFICATION_POINTS.gov;

    // 🔹 Calculate Badge
    let trustBadge = "NEW";
    if (trustScore >= 80) trustBadge = "HIGH";
    else if (trustScore >= 50) trustBadge = "MEDIUM";

    const verificationPayload = {
      trustScore,
      trustBadge,
      trustBreakdown,
      verificationPoints: VERIFICATION_POINTS
    };

    // 🔹 Save back to Firestore (To satisfy Database Architecture)
    await updateDoc(userRef, verificationPayload).catch(() => {
      // Fallback in case user doc doesnt exist yet in firestore
      // we can setDoc instead
    });

    // 🔹 Save back to RTDB (So UI instantly updates!)
    await rtdbUpdate(rtdbRef(rtdb, `users/${userId}`), verificationPayload);

  } catch (error) {
    console.error("Trust Score Error:", error);
  }
};
===
import { db } from "../config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "firebase/firestore";

import { ref as rtdbRef, get as rtdbGet, update as rtdbUpdate, push as rtdbPush } from "firebase/database";
import { rtdb } from "../config/firebase";
import emailjs from '@emailjs/browser';

const VERIFICATION_POINTS = {
  email: 10,
  profile: 10,
  education: 15,
  skills: 15,
  linkedIn: 10,
  corporateEmail: 20,
  gov: 50
};

// Common public email domains that don't qualify as "corporate"
const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'protonmail.com', 'icloud.com', 'aol.com', 'mail.com',
  'yandex.com', 'zoho.com', 'gmx.com', 'live.com'
];

// ==============================
// 🛠 Helper: File to Base64
// ==============================
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

// ==============================
// 📤 Upload Government ID (RTDB Base64)
// ==============================
export const uploadGovernmentId = async (userId, file, docType) => {
  try {
    if (!file) throw new Error("No file selected");

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be < 5MB");
    }

    // 1. Convert to Base64 String
    const base64String = await fileToBase64(file);

    // 2. Save metadata & raw base64 data to Realtime Database
    const newDocRef = rtdbPush(rtdbRef(rtdb, `users/${userId}/documents`));
    await rtdbUpdate(newDocRef, {
      docType,
      fileData: base64String, // Storing as base64 string
      status: "verified",     // Auto-verify as per instructions
      uploadedAt: Date.now()
    });

    // 3. Immediately trigger recalculation which will set gov=true
    await recalculateTrustScore(userId);

    return true;

  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
};

// ==============================
// 📄 Get User Documents (From RTDB)
// ==============================
export const getUserVerificationDocs = async (userId) => {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, `users/${userId}/documents`));
    if (!snap.exists()) return [];

    const documentsObj = snap.val();
    const docs = Object.keys(documentsObj).map(key => ({
      id: key,
      ...documentsObj[key]
    }));

    // Sort descending by uploadedAt
    return docs.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error) {
    console.error("Fetch Docs Error:", error);
    return [];
  }
};

// ==============================
// ✉️ Send Real Email OTP (EmailJS)
// ==============================
export const sendEmailOTP = async (userId, userEmail) => {
  try {
    if (!userEmail) throw new Error("No primary email found on profile.");

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Calculate human-readable expiry time for template
    const timeString = new Date(expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 2. Store securely in Realtime Database (Bypassing restrictive Firestore rules)
    await rtdbUpdate(rtdbRef(rtdb, `users/${userId}`), {
      emailOTP: otp,
      otpExpiry: expiry
    });

    // 3. Dispatch via EmailJS 
    // IMPORTANT: Make sure to replace YOUR_TEMPLATE_ID and YOUR_PUBLIC_KEY 
    try {
      await emailjs.send(
        'service_7ikenye',
        'template_2wpxfzw',
        {
          to_email: userEmail,       // Primary target mapping
          email: userEmail,          // Backup mapping 1
          user_email: userEmail,     // Backup mapping 2
          passcode: otp,             // Matches {{passcode}} in template
          time: timeString           // Matches {{time}} in template
        },
        'wV2o1hWsv0bLeOMJY'
      );
    } catch (emailErr) {
      console.error("EmailJS rejection details:", emailErr);
      const errorMsg = emailErr?.text || emailErr?.message || JSON.stringify(emailErr);
      throw new Error("EmailJS Delivery Failed: " + errorMsg);
    }
    
    return true;
  } catch (err) {
    console.error("OTP Delivery Error:", err);
    throw err;
  }
};

// ==============================
// ✉️ Verify Real Email OTP
// ==============================
export const verifyEmailOTP = async (userId, otp) => {
  if (!otp || otp.length !== 6) throw new Error("Invalid OTP format");

  const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `users/${userId}`));
  if (!rtdbSnap.exists()) throw new Error("Verification record not found");

  const data = rtdbSnap.val();

  // 1. Security Validation
  if (!data.emailOTP) throw new Error("No pending OTP request found");
  if (Date.now() > data.otpExpiry) throw new Error("OTP has expired. Please request a new one.");
  if (data.emailOTP !== otp) throw new Error("Incorrect OTP code.");

  // 2. Clear token and flip boolean
  const breakdown = data.trustBreakdown || {};
  breakdown.email = true;

  // Clear from RTDB
  await rtdbUpdate(rtdbRef(rtdb, `users/${userId}`), {
    trustBreakdown: breakdown,
    emailOTP: null,   // Nuke single-use token
    otpExpiry: null
  });

  // 3. Recalculate Points
  await recalculateTrustScore(userId);
  return true;
};

// ==============================
// 🧠 Recalculate Trust Score
// ==============================
export const recalculateTrustScore = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);

    // FETCH LIVE PROFILE DATA FROM RTDB TO SEE NEW SKILLS
    const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `users/${userId}`));
    if (!rtdbSnap.exists()) return;

    const userData = rtdbSnap.val();
    const docs = await getUserVerificationDocs(userId);

    // Initialize or get current breakdown
    let trustBreakdown = userData.trustBreakdown || {
      email: false,
      profile: false,
      education: false,
      skills: false,
      linkedIn: false,
      corporateEmail: false,
      gov: false
    };

    // 🔹 Verify Profile Completeness Automatically
    const hasName = !!userData.name;
    const hasHeadline = !!userData.headline;
    const hasBio = !!userData.bio;
    if (hasName && hasHeadline && hasBio) {
      trustBreakdown.profile = true;
    }

    // 🔹 Verify Education Automatically
    if (userData.education && userData.education.length > 0) {
      trustBreakdown.education = true;
    }

    // 🔹 Verify Skills Automatically (Bug Fixed: Now reads from RTDB live state)
    if (userData.skills && userData.skills.length > 0) {
      trustBreakdown.skills = true;
    }

    // 🔹 Verify LinkedIn URL Automatically
    if (userData.linkedInUrl && userData.linkedInUrl.includes('linkedin.com/')) {
      trustBreakdown.linkedIn = true;
    }

    // 🔹 Verify Corporate Email Automatically
    if (userData.corporateEmail) {
      const domain = userData.corporateEmail.split('@')[1]?.toLowerCase();
      if (domain && !PUBLIC_EMAIL_DOMAINS.includes(domain)) {
        trustBreakdown.corporateEmail = true;
      }
    }

    // 🔹 Verify Government ID Automatically
    const hasVerifiedDoc = docs.some(d => d.status === "verified" || d.status === "pending");
    if (hasVerifiedDoc) {
      trustBreakdown.gov = true;
    }

    // 🔹 Calculate Trust Score
    let trustScore = 0;
    if (trustBreakdown.email) trustScore += VERIFICATION_POINTS.email;
    if (trustBreakdown.profile) trustScore += VERIFICATION_POINTS.profile;
    if (trustBreakdown.education) trustScore += VERIFICATION_POINTS.education;
    if (trustBreakdown.skills) trustScore += VERIFICATION_POINTS.skills;
    if (trustBreakdown.linkedIn) trustScore += VERIFICATION_POINTS.linkedIn;
    if (trustBreakdown.corporateEmail) trustScore += VERIFICATION_POINTS.corporateEmail;
    if (trustBreakdown.gov) trustScore += VERIFICATION_POINTS.gov;

    // 🔹 Calculate Badge
    let trustBadge = "NEW";
    if (trustScore >= 80) trustBadge = "HIGH";
    else if (trustScore >= 50) trustBadge = "MEDIUM";

    const verificationPayload = {
      trustScore,
      trustBadge,
      trustBreakdown,
      verificationPoints: VERIFICATION_POINTS
    };

    // 🔹 Save back to Firestore (To satisfy Database Architecture)
    await updateDoc(userRef, verificationPayload).catch(() => {
      // Fallback in case user doc doesnt exist yet in firestore
      // we can setDoc instead
    });

    // 🔹 Save back to RTDB (So UI instantly updates!)
    await rtdbUpdate(rtdbRef(rtdb, `users/${userId}`), verificationPayload);

  } catch (error) {
    console.error("Trust Score Error:", error);
  }
};
```

---

### 4. Registration — Fresher Gate
**File:** [RegisterPage.jsx](file:///c:/TechVelora_nexalink/src/pages/RegisterPage.jsx)

- Added "Years of Professional Experience" dropdown
- Inline warning when "Fresher (0 years)" is selected
- Hard block on registration submit if < 1 year
- Added LinkedIn URL and Corporate Email fields with trust score indicators

```diff:RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { recalculateTrustScore } from '../services/realtimeService';
import { findUserByReferralCode, recordReferral } from '../services/referralService';

export default function RegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    if (refCode) {
      findUserByReferralCode(refCode).then(user => {
        if (user) setReferrerName(user.name);
      }).catch(() => {});
    }
  }, [refCode]);

  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await registerWithEmail(email, password, name, role, {
        industry,
        referredByCode: refCode || null
      });
      // Record the referral attribution
      if (refCode && user?.uid) {
        recordReferral(refCode, user.uid, email).catch(err => {
          console.warn('Referral attribution failed:', err.message);
        });
      }
      // Trigger initial trust calculation in background
      if (user?.uid) {
        recalculateTrustScore(user.uid).catch(err => {
          console.error('Trigger trust calc failed:', err);
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to register');
    }
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign up with Google');
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="auth-logo">
          <div className="navbar-brand-icon" style={{ width: 40, height: 40, fontSize: 16 }}>TL</div>
          <span style={{
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Nexalink</span>
        </div>

        <div className="auth-card">
          <h1 className="auth-title">Join Nexalink</h1>
          <p className="auth-subtitle">Build your trusted professional network</p>

          {/* Referral Badge */}
          {referrerName && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
            }}>
              <span>🎉</span>
              <span>Referred by <strong style={{ color: 'var(--color-primary)' }}>{referrerName}</strong></span>
            </div>
          )}

          {/* Role Selector */}
          <div className="role-selector">
            <div
              className={`role-option ${role === 'individual' ? 'selected' : ''}`}
              onClick={() => setRole('individual')}
              id="role-individual"
            >
              <div className="role-option-icon">👤</div>
              <div className="role-option-title">Individual</div>
              <div className="role-option-desc">Professional</div>
            </div>
            <div
              className={`role-option ${role === 'company' ? 'selected' : ''}`}
              onClick={() => setRole('company')}
              id="role-company"
            >
              <div className="role-option-icon">🏢</div>
              <div className="role-option-title">Company</div>
              <div className="role-option-desc">Organization</div>
            </div>
          </div>

          <button
            className="google-btn"
            onClick={handleGoogleSignup}
            disabled={loading}
            id="google-register-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">or</div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="register-name">
                {role === 'company' ? 'Company Name' : 'Full Name'}
              </label>
              <input
                type="text"
                className="form-input"
                id="register-name"
                placeholder={role === 'company' ? 'Acme Inc.' : 'John Doe'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {role === 'company' && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-industry">Industry</label>
                <select
                  className="form-select"
                  id="register-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">Select industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Retail">Retail</option>
                  <option value="Media">Media</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="register-email">Work Email</label>
              <input
                type="email"
                className="form-input"
                id="register-email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Password</label>
              <input
                type="password"
                className="form-input"
                id="register-password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="form-error mb-3">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              id="register-btn"
            >
              {loading ? '⏳ Creating account...' : `Create ${role === 'company' ? 'Company' : ''} Account`}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" id="login-link">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
===
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { recalculateTrustScore } from '../services/realtimeService';
import { findUserByReferralCode, recordReferral } from '../services/referralService';

export default function RegisterPage() {
  const [faceVerified, setFaceVerified] = useState(false);

  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [role, setRole] = useState('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [corporateEmail, setCorporateEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refCode = searchParams.get('ref') || '';
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    if (!refCode) return;

    findUserByReferralCode(refCode)
      .then((user) => {
        if (user) setReferrerName(user.name || '');
      })
      .catch(() => {});
  }, [refCode]);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'FACE_VERIFIED') {
        setFaceVerified(true);
        setError('');
        alert('Face enrollment completed');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (role === 'individual' && !faceVerified) {
      setError('Please complete face verification before registering.');
      setLoading(false);
      return;
    }

    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (role === 'company' && (!industry || !registrationNumber)) {
      setError('Please fill in both Industry and Registration Number');
      setLoading(false);
      return;
    }

    // ── Fresher Gate: Block registration for individuals with < 1 year experience ──
    if (role === 'individual') {
      const expYrs = parseInt(experienceYears) || 0;
      if (expYrs < 1) {
        setError('Nexalink is an experienced-professionals-only platform. You need at least 1 year of professional experience to register.');
        setLoading(false);
        return;
      }
    }

    try {
      let bizVerifyData = null;
      if (role === 'company') {
        try {
          const bizResponse = await fetch("/api/verify-company", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyName: name,
              registrationNumber: registrationNumber
            })
          });
          
          bizVerifyData = await bizResponse.json();
          
          if (!bizVerifyData.valid) {
            if (bizVerifyData.fallback) {
              console.warn('BizVerify Fallback Mode: Continuing with manual verification status.');
              bizVerifyData.status = 'PENDING_MANUAL';
              bizVerifyData.trustScore = 20;
            } else {
              setError(bizVerifyData.message || 'Verification failed. We could not validate this organization.');
              setLoading(false);
              return;
            }
          }
        } catch (bizErr) {
          setError('Organization verification service unreachable. Please try again later.');
          setLoading(false);
          return;
        }
      }

      const user = await registerWithEmail(email, password, name, role, {
        industry,
        registrationNumber,
        bizVerifyData,
        experienceYears: parseInt(experienceYears) || 0,
        linkedInUrl: linkedInUrl.trim() || null,
        corporateEmail: corporateEmail.trim() || null,
        referredByCode: refCode || null,
      });

      if (refCode && user?.uid) {
        recordReferral(refCode, user.uid, email).catch((err) => {
          console.warn('Referral attribution failed:', err?.message || err);
        });
      }

      if (user?.uid) {
        recalculateTrustScore(user.uid).catch((err) => {
          console.error('Trigger trust calc failed:', err);
        });
      }

      navigate('/');
    } catch (err) {
      setError(err?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError('');

    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Failed to sign up with Google');
    } finally {
      setLoading(false);
    }
  }

  function handleFaceEnroll() {
    if (!email.trim()) {
      setError('Please enter your email before face enrollment.');
      return;
    }

    const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
    window.open(`http://localhost:3000/?mode=enroll&userId=${encodedEmail}`, '_blank');
  }

  return (
    <div className="auth-page">
      <div className="auth-split-container">
        {/* Left Panel - Explanatory */}
        <div className="auth-side-panel">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="auth-logo" style={{ justifyContent: 'flex-start', color: 'white', marginBottom: 32 }}>
              <div className="navbar-brand-icon" style={{ width: 44, height: 44, fontSize: 18, background: 'white', color: 'var(--color-primary)' }}>TL</div>
              <span style={{ fontSize: 28 }}>Nexalink</span>
            </div>
            
            <h2 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
              The World's Most <br/> Trusted Network.
            </h2>
            <p style={{ fontSize: 16, opacity: 0.9, lineHeight: 1.5, maxWidth: 440, marginBottom: 32 }}>
              Nexalink uses advanced AI face authentication and corporate verification 
              to ensure every profile is real. Connect, collaborate, and grow with 
              verified professionals and validated organizations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { title: 'Verified Identity', desc: 'Face authentication for every individual.' },
                { title: 'Corporate Validation', desc: 'Direct BizVerify integration for companies.' },
                { title: 'Trust Scoring', desc: 'Real-time metrics based on system interactions.' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{item.title}</div>
                    <div style={{ fontSize: 14, opacity: 0.8 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-form-panel no-scrollbar">
          <motion.div
            className="auth-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="auth-card">
              <p className="auth-subtitle" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 20 }}>Join the trusted professional community</p>

              {referrerName && (
                <div
                  style={{
                    background: 'rgba(37,99,235,0.05)',
                    border: '1px solid rgba(37,99,235,0.1)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Referred by <strong>{referrerName}</strong></span>
                </div>
              )}

              <div className="role-selector">
                <div
                  className={`role-option ${role === 'individual' ? 'selected' : ''}`}
                  onClick={() => setRole('individual')}
                  id="role-individual"
                >
                  <div className="role-option-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div className="role-option-title">Individual</div>
                </div>

                <div
                  className={`role-option ${role === 'company' ? 'selected' : ''}`}
                  onClick={() => setRole('company')}
                  id="role-company"
                >
                  <div className="role-option-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/></svg>
                  </div>
                  <div className="role-option-title">Organization</div>
                </div>
              </div>

              <form onSubmit={handleRegister} className="auth-compact-fields">
                <div className="form-group">
                  <label className="form-label">{role === 'company' ? 'Organization Name' : 'Full Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={role === 'company' ? 'e.g. Acme Corp' : 'John Doe'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {role === 'company' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Industry</label>
                      <select className="form-select" value={industry} onChange={(e) => setIndustry(e.target.value)} required>
                        <option value="">Select industry</option>
                        <option value="Technology">Technology</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Registration Number (GSTIN/CIN)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">{role === 'company' ? 'HR Working Email' : 'Email Address'}</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="form-error mb-4">{error}</div>}

                {role === 'individual' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Years of Professional Experience *</label>
                      <select
                        className="form-select"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        required
                        id="experience-years-select"
                      >
                        <option value="">Select experience</option>
                        <option value="0">Fresher (0 years)</option>
                        <option value="1">1 year</option>
                        <option value="2">2 years</option>
                        <option value="3">3 years</option>
                        <option value="5">5+ years</option>
                        <option value="7">7+ years</option>
                        <option value="10">10+ years</option>
                        <option value="15">15+ years</option>
                      </select>
                      {experienceYears === '0' && (
                        <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)' }}>
                          ⚠️ Nexalink is designed for experienced professionals only. Freshers cannot register at this time.
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">LinkedIn Profile
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>+10 Trust</span>
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="linkedin.com/in/yourname"
                          value={linkedInUrl}
                          onChange={(e) => setLinkedInUrl(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Corporate Email
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>+20 Trust</span>
                        </label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="you@company.com"
                          value={corporateEmail}
                          onChange={(e) => setCorporateEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {role === 'individual' && (
                  <motion.button
                    type="button"
                    className={`btn btn-secondary btn-lg btn-full enroll-face-btn${faceVerified ? ' verified' : ''}`}
                    style={{
                      marginBottom: 12,
                      height: 40,
                      border: faceVerified ? '2px solid var(--color-success)' : undefined,
                      background: faceVerified ? 'var(--color-success-light)' : undefined,
                      color: faceVerified ? 'var(--color-success)' : undefined,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFaceEnroll}
                    disabled={faceVerified}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>
                    {faceVerified ? 'Identity Verified' : 'Verify Identity with Face Auth'}
                  </motion.button>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={loading || (role === 'individual' && !faceVerified)}
                  style={{
                    opacity: (role === 'individual' && !faceVerified) ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      {role === 'company' ? 'Verifying Organization...' : 'Creating Account...'}
                    </div>
                  ) : `Create ${role === 'company' ? 'Organization ' : ''}Account`}
                </button>
              </form>

              <div className="auth-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
```

---

### 5. Auth Context — Profile Persistence
**File:** [AuthContext.jsx](file:///c:/TechVelora_nexalink/src/contexts/AuthContext.jsx)

Persists `experienceYears`, `linkedInUrl`, `corporateEmail` from registration to RTDB.

```diff:AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, googleProvider, rtdb as db } from '../config/firebase';
import { generateReferralCode } from '../services/referralService';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(uid) {
    try {
      const userSnap = await get(ref(db, `users/${uid}`));
      if (userSnap.exists()) {
        const profile = { uid, ...userSnap.val() };
        setUserProfile(profile);
        return profile;
      }
      // Check if company
      const companySnap = await get(ref(db, `companies/${uid}`));
      if (companySnap.exists()) {
        const profile = { uid, ...companySnap.val() };
        setUserProfile(profile);
        return profile;
      }
      
      // Fallback for legacy auth users missing in RTDB
      const legacyProfile = {
        uid,
        name: 'Legacy User',
        email: '',
        role: 'individual',
        headline: 'Professional Profile',
        trustScore: 10,
        trustBadge: 'NEW',
        education: [],
        skills: []
      };
      setUserProfile(legacyProfile);
      return legacyProfile;
    } catch (err) {
      console.error('Error fetching profile from RTDB:', err);
      // Fallback for missing permissions
      const fallbackProfile = {
        uid,
        name: currentUser?.displayName || 'Demo User',
        email: currentUser?.email || '',
        role: 'individual',
        headline: 'Professional Profile (Local)',
        trustScore: 10,
        trustBadge: 'NEW',
        education: [],
        skills: []
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  }

  async function registerWithEmail(email, password, name, role, extraData = {}) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const collection = role === 'company' ? 'companies' : 'users';
    const profileData = role === 'company' ? {
      name,
      email,
      role: 'company',
      domain: email.split('@')[1],
      industry: extraData.industry || '',
      description: '',
      logoUrl: '',
      coverUrl: '',
      website: '',
      verified: false,
      trustScore: 10,
      trustBadge: 'NEW',
      employeeCount: 0,
      jobsCount: 0,
      postsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } : {
      name,
      email,
      role: 'individual',
      headline: extraData.headline || '',
      bio: '',
      avatarUrl: '',
      location: '',
      skills: [],
      education: [],
      experienceYears: 0,
      trustScore: 10,
      trustBadge: 'NEW',
      emailVerified: false,
      connectionsCount: 0,
      postsCount: 0,
      referralCode: generateReferralCode(name),
      referralCount: 0,
      verifiedReferralCount: 0,
      referralTier: 'none',
      nexaCoins: 0,
      referredBy: extraData.referredBy || null,
      referredByCode: extraData.referredByCode || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(ref(db, `${collection}/${cred.user.uid}`), profileData);
    setUserProfile({ uid: cred.user.uid, ...profileData });
    return cred.user;
  }

  async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(cred.user.uid);
    return cred.user;
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await fetchUserProfile(cred.user.uid);
    
    if (!profile) {
      // New Google user — create individual profile by default
      const profileData = {
        name: cred.user.displayName || 'User',
        email: cred.user.email,
        role: 'individual',
        headline: '',
        bio: '',
        avatarUrl: cred.user.photoURL || '',
        location: '',
        skills: [],
        education: [],
        experienceYears: 0,
        trustScore: 15,
        trustBadge: 'NEW',
        emailVerified: true,
        connectionsCount: 0,
        postsCount: 0,
        referralCode: generateReferralCode(cred.user.displayName || 'USER'),
        referralCount: 0,
        verifiedReferralCount: 0,
        referralTier: 'none',
        nexaCoins: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await set(ref(db, `users/${cred.user.uid}`), profileData);
      setUserProfile({ uid: cred.user.uid, ...profileData });
    }
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  }

  async function updateUserProfile(data) {
    if (!currentUser) return;
    const collection = userProfile?.role === 'company' ? 'companies' : 'users';
    
    // In RTDB, we can just use update() on the ref, but since we are replacing setDoc {merge: true},
    // We import update from firebase/database in the top later. But let's just do a manual merge here to avoid importing update right now.
    // Wait, let's just use set with the combined data since we have it via prev
    const currentProfileRef = ref(db, `${collection}/${currentUser.uid}`);
    const snap = await get(currentProfileRef);
    if(snap.exists()) {
      await set(currentProfileRef, {
        ...snap.val(),
        ...data,
        updatedAt: Date.now()
      });
    }
    setUserProfile(prev => ({ ...prev, ...data }));
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
    updateUserProfile,
    fetchUserProfile,
    isCompany: userProfile?.role === 'company',
    isIndividual: userProfile?.role === 'individual'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
===
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, googleProvider, rtdb as db } from '../config/firebase';
import { generateReferralCode } from '../services/referralService';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(uid) {
    try {
      const userSnap = await get(ref(db, `users/${uid}`));
      if (userSnap.exists()) {
        const profile = { uid, ...userSnap.val() };
        setUserProfile(profile);
        return profile;
      }
      // Check if company
      const companySnap = await get(ref(db, `companies/${uid}`));
      if (companySnap.exists()) {
        const profile = { uid, ...companySnap.val() };
        setUserProfile(profile);
        return profile;
      }
      
      // Fallback for legacy auth users missing in RTDB
      const legacyProfile = {
        uid,
        name: 'Legacy User',
        email: '',
        role: 'individual',
        headline: 'Professional Profile',
        trustScore: 10,
        trustBadge: 'NEW',
        education: [],
        skills: []
      };
      setUserProfile(legacyProfile);
      return legacyProfile;
    } catch (err) {
      console.error('Error fetching profile from RTDB:', err);
      // Fallback for missing permissions
      const fallbackProfile = {
        uid,
        name: currentUser?.displayName || 'Demo User',
        email: currentUser?.email || '',
        role: 'individual',
        headline: 'Professional Profile (Local)',
        trustScore: 10,
        trustBadge: 'NEW',
        education: [],
        skills: []
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  }

  async function registerWithEmail(email, password, name, role, extraData = {}) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const collection = role === 'company' ? 'companies' : 'users';
    const profileData = role === 'company' ? {
      name,
      email,
      role: 'company',
      domain: email.split('@')[1],
      industry: extraData.industry || '',
      description: '',
      logoUrl: '',
      coverUrl: '',
      website: '',
      verified: false,
      trustScore: 10,
      trustBadge: 'NEW',
      employeeCount: 0,
      jobsCount: 0,
      postsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } : {
      name,
      email,
      role: 'individual',
      headline: extraData.headline || '',
      bio: '',
      avatarUrl: '',
      location: '',
      skills: [],
      education: [],
      experienceYears: extraData.experienceYears || 0,
      linkedInUrl: extraData.linkedInUrl || null,
      corporateEmail: extraData.corporateEmail || null,
      trustScore: 10,
      trustBadge: 'NEW',
      emailVerified: false,
      connectionsCount: 0,
      postsCount: 0,
      referralCode: generateReferralCode(name),
      referralCount: 0,
      verifiedReferralCount: 0,
      referralTier: 'none',
      nexaCoins: 0,
      referredBy: extraData.referredBy || null,
      referredByCode: extraData.referredByCode || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(ref(db, `${collection}/${cred.user.uid}`), profileData);
    setUserProfile({ uid: cred.user.uid, ...profileData });
    return cred.user;
  }

  async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(cred.user.uid);
    return cred.user;
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await fetchUserProfile(cred.user.uid);
    
    if (!profile) {
      // New Google user — create individual profile by default
      const profileData = {
        name: cred.user.displayName || 'User',
        email: cred.user.email,
        role: 'individual',
        headline: '',
        bio: '',
        avatarUrl: cred.user.photoURL || '',
        location: '',
        skills: [],
        education: [],
        experienceYears: 0,
        trustScore: 15,
        trustBadge: 'NEW',
        emailVerified: true,
        connectionsCount: 0,
        postsCount: 0,
        referralCode: generateReferralCode(cred.user.displayName || 'USER'),
        referralCount: 0,
        verifiedReferralCount: 0,
        referralTier: 'none',
        nexaCoins: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await set(ref(db, `users/${cred.user.uid}`), profileData);
      setUserProfile({ uid: cred.user.uid, ...profileData });
    }
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  }

  async function updateUserProfile(data) {
    if (!currentUser) return;
    const collection = userProfile?.role === 'company' ? 'companies' : 'users';
    
    // In RTDB, we can just use update() on the ref, but since we are replacing setDoc {merge: true},
    // We import update from firebase/database in the top later. But let's just do a manual merge here to avoid importing update right now.
    // Wait, let's just use set with the combined data since we have it via prev
    const currentProfileRef = ref(db, `${collection}/${currentUser.uid}`);
    const snap = await get(currentProfileRef);
    if(snap.exists()) {
      await set(currentProfileRef, {
        ...snap.val(),
        ...data,
        updatedAt: Date.now()
      });
    }
    setUserProfile(prev => ({ ...prev, ...data }));
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
    updateUserProfile,
    fetchUserProfile,
    isCompany: userProfile?.role === 'company',
    isIndividual: userProfile?.role === 'individual'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### 6. Profile Page — Credibility Fields
**File:** [ProfilePage.jsx](file:///c:/TechVelora_nexalink/src/pages/ProfilePage.jsx)

Added "Professional Credibility" section in the edit modal with:
- Experience years dropdown
- LinkedIn URL input (+10 Trust label)
- Corporate Email input (+20 Trust label)

```diff:ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, deleteProject, getUser, getConnectionStatus, sendConnectionRequest, acceptConnection } from '../services/realtimeService';
import { recalculateTrustScore } from '../services/trustService';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import TrustScoreWidget from '../components/trust/TrustScoreWidget';
import Modal from '../components/shared/Modal';
import UploadProjectModal from '../components/profile/UploadProjectModal';

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile: myProfile, updateUserProfile, isCompany, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('about');
  const [saving, setSaving] = useState(false);
  const [eduInput, setEduInput] = useState({ school: '', degree: '', year: '' });
  const [projects, setProjects] = useState([]);
  const [uploadProjectOpen, setUploadProjectOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const targetId = userId || currentUser?.uid;
      const isSelf = !userId || userId === currentUser?.uid;
      setIsOwnProfile(isSelf);

      if (isSelf) {
        setProfile(myProfile);
        if (myProfile?.uid) {
          getProjects(myProfile.uid).then(setProjects).catch(console.error);
        }
      } else {
        try {
          const u = await getUser(targetId);
          setProfile(u);
          if (u) {
            getProjects(u.uid).then(setProjects).catch(console.error);
            const status = await getConnectionStatus(currentUser.uid, u.uid);
            setConnectionStatus(status);
          }
        } catch (err) {
          console.error('Error loading external profile:', err);
        }
      }
    }
    loadProfile();
  }, [userId, myProfile, currentUser]);

  if (!profile) {
    return <div className="page-full text-center p-5 text-muted">Loading profile...</div>;
  }

  const handleConnect = async () => {
    try {
      await sendConnectionRequest(currentUser.uid, profile.uid);
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Connection request error:', err);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptConnection(profile.uid, currentUser.uid);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  async function handleDeleteProject(e, projectId) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Direct deletion as requested, no confirm prompt
    try {
      const success = await deleteProject(currentUser.uid, projectId);
      if (success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        alert('Could not reach the database to delete this project.');
      }
    } catch (err) {
      console.error('Direct delete error:', err);
    }
  }

  function openEdit() {
    setEditData({ ...profile, education: profile.education || [], skills: profile.skills || [] });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { uid, createdAt, updatedAt, ...data } = editData;
      await updateUserProfile(data);
      // Trigger trust score recalculation on profile update
      await recalculateTrustScore(currentUser.uid);
      // Fetch fresh profile from RTDB to show updated trust score immediately
      if (fetchUserProfile) await fetchUserProfile(currentUser.uid);
      setEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
    setSaving(false);
  }

  function handleSkillInput(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const skill = e.target.value.trim();
      setEditData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
      e.target.value = '';
    }
  }

  function removeSkill(index) {
    setEditData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  }

  function handleAddEdu() {
    if (!eduInput.school || !eduInput.degree) return;
    setEditData(prev => ({
      ...prev,
      education: [...(prev.education || []), { ...eduInput }]
    }));
    setEduInput({ school: '', degree: '', year: '' });
  }

  function removeEdu(index) {
    setEditData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="page-full" style={{ maxWidth: 940, margin: '0 auto' }}>
      {/* Profile Header Block */}
      <motion.div
        className="card mb-4"
        style={{ overflow: 'hidden' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ height: 200, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -50, left: 32, borderRadius: '50%', border: '4px solid var(--color-surface)', background: 'var(--color-surface)' }}>
            <Avatar 
              src={profile.avatarUrl || profile.logoUrl}
              name={profile.name} 
              size="2xl" 
            />
          </div>
        </div>
        
        <div className="card-body" style={{ paddingTop: 64, paddingLeft: 32, paddingRight: 32, paddingBottom: 24 }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile.name}
                {profile.trustScore === 100 && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--color-primary)' }}>
                    <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM10.5 17L5.5 12L6.9 10.6L10.5 14.2L17.1 7.6L18.5 9L10.5 17Z" fill="currentColor"/>
                  </svg>
                )}
                {profile.trustScore < 100 && (
                   <TrustBadge badge={profile.trustBadge || 'NEW'} size="md" />
                )}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--color-text-primary)', marginTop: 4 }}>
                {profile.role === 'company' ? profile.industry : (profile.headline || 'Professional')}
              </p>
              
              <div className="text-sm text-secondary mt-2 flex items-center gap-4">
                {profile.location && (<span>📍 {profile.location}</span>)}
                {profile.role === 'company' && profile.website && (<span>🌐 <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary">{profile.website.replace('https://', '')}</a></span>)}
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>• {profile.connectionsCount || 0} connections</span>
              </div>
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  {profile.trustScore < 100 && (
                    <button className="btn btn-outline-primary" onClick={() => navigate('/verify')} style={{ gap: 6 }}>
                      <span style={{ fontSize: 16 }}>🛡️</span> Get Verified
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={openEdit}>✏️ Edit</button>
                </>
              ) : (
                <>
                  {connectionStatus === 'connected' ? (
                    <button className="btn btn-secondary" disabled>✅ Connected</button>
                  ) : connectionStatus === 'pending' ? (
                    <button className="btn btn-secondary" disabled>⏳ Pending</button>
                  ) : connectionStatus === 'received' ? (
                    <button className="btn btn-primary" onClick={handleAccept}>Accept Request</button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleConnect}>+ Connect</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }}>
        {/* Main Content Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* About Section */}
          <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>About</h3>
            {profile.bio || profile.description ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {profile.role === 'company' ? profile.description : profile.bio}
              </p>
            ) : (
              <div className="text-center p-4">
                <p className="text-sm text-muted mb-2">{isOwnProfile ? "You haven't written anything about yourself yet." : "No description provided."}</p>
                {isOwnProfile && <button className="btn btn-sm btn-outline-primary" onClick={openEdit}>Add summary</button>}
              </div>
            )}
          </motion.div>

          {/* Education Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex justify-between items-center mb-12">
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Education</h3>
              </div>
              
              {profile.education && profile.education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {profile.education.map((edu, i) => (
                    <div key={i} className="flex gap-3 pt-3" style={{ borderTop: i > 0 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <div style={{ padding: '8px', background: 'var(--color-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🎓
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{edu.school}</div>
                        <div className="text-sm text-secondary">{edu.degree}</div>
                        {edu.year && <div className="text-xs text-muted mt-1">{edu.year}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted">No education details added.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Skills Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>Skills</h3>
              {(profile.skills && profile.skills.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="badge badge-skill" style={{ padding: '8px 14px', fontSize: '13px' }}>{skill}</span>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted">Showcase your top skills to stand out.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* AI Evaluated Projects Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Verified Projects</h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>AI Scored & Audited Codebases</div>
                </div>
                {isOwnProfile && (
                  <button className="btn btn-sm btn-primary" onClick={() => setUploadProjectOpen(true)}>
                    + Upload Repo
                  </button>
                )}
              </div>

              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {projects.map(proj => (
                    <div key={proj.id} style={{ padding: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                      <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {proj.title} 🔗
                          </a>
                          <span className={`badge ${proj.rating !== 'Error' && proj.rating !== 'Pending' ? 'badge-high-trust' : 'badge-new'}`} style={{ width: 'fit-content', marginTop: '4px' }}>
                            {proj.rating}
                          </span>
                        </div>
                        {isOwnProfile && (
                          <button 
                            className="btn btn-icon btn-sm" 
                            onClick={(e) => handleDeleteProject(e, proj.id)}
                            title="Delete Project"
                            style={{ 
                              color: 'var(--color-danger)', 
                              position: 'relative', 
                              zIndex: 10,
                              background: 'rgba(239, 68, 68, 0.1)'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>AI Review: </strong>
                        {proj.aiReview}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-sm text-muted">Upload a project ZIP file to receive a recruiter-grade AI assessment natively added to your profile.</p>
                </div>
              )}
            </motion.div>
          )}

        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <TrustScoreWidget 
              score={profile.trustScore || 0} 
              badge={profile.trustBadge || 'NEW'} 
            />
          </motion.div>

          <motion.div className="card card-body" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 16 }}>Your Dashboard</h4>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-light">
                <span className="text-sm text-secondary">Profile viewers</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 50) + 12}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-light">
                <span className="text-sm text-secondary">Post impressions</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 500) + 120}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Search appearances</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 30) + 5}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Edit Profile"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={editData.name || ''} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        
        {!isCompany && (
          <div className="form-group">
            <label className="form-label">Headline</label>
            <input className="form-input" placeholder="e.g. Senior Software Engineer at Google" value={editData.headline || ''} onChange={(e) => setEditData(prev => ({ ...prev, headline: e.target.value }))} />
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">{isCompany ? 'Company Description' : 'Summary / Bio'}</label>
          <textarea className="form-textarea" placeholder="Tell us about yourself..." value={isCompany ? (editData.description || '') : (editData.bio || '')} onChange={(e) => setEditData(prev => ({ ...prev, [isCompany ? 'description' : 'bio']: e.target.value }))} style={{ minHeight: 100 }} />
        </div>
        
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" placeholder="e.g. San Francisco, CA" value={editData.location || ''} onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))} />
        </div>

        {!isCompany && (
          <>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Education</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8, marginBottom: 12 }}>
              <input className="form-input input-sm" placeholder="School/University" value={eduInput.school} onChange={e => setEduInput(p => ({...p, school: e.target.value}))} />
              <input className="form-input input-sm" placeholder="Degree/Major" value={eduInput.degree} onChange={e => setEduInput(p => ({...p, degree: e.target.value}))} />
              <input className="form-input input-sm" placeholder="Year" value={eduInput.year} onChange={e => setEduInput(p => ({...p, year: e.target.value}))} />
            </div>
            <button className="btn btn-sm btn-outline-primary mb-4 w-full" onClick={handleAddEdu}>+ Add Education</button>
            
            {(editData.education || []).map((edu, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 mb-2 bg-surface rounded border border-light">
                <div><strong>{edu.school}</strong> — {edu.degree} <span className="text-muted">({edu.year})</span></div>
                <button className="text-danger p-1" onClick={() => removeEdu(i)}>✕</button>
              </div>
            ))}

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <div className="form-group">
              <label className="form-label">Skills (Press Enter to add)</label>
              <input className="form-input" placeholder="e.g. React, Python, Product Management..." onKeyDown={handleSkillInput} />
              <div className="flex flex-wrap gap-2 mt-2">
                {(editData.skills || []).map((skill, i) => (
                  <span key={i} className="badge badge-skill flex items-center gap-1">
                    {skill} 
                    <span style={{ cursor: 'pointer', fontSize: 10, padding: 2 }} onClick={() => removeSkill(i)}>✕</span>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>

      <UploadProjectModal 
        isOpen={uploadProjectOpen} 
        onClose={() => setUploadProjectOpen(false)} 
        onProjectUploaded={() => {
          getProjects(userProfile.uid).then(setProjects).catch(console.error);
        }} 
      />
    </div>
  );
}
===
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, deleteProject, getUser, getConnectionStatus, sendConnectionRequest, acceptConnection } from '../services/realtimeService';
import { recalculateTrustScore } from '../services/trustService';
import Avatar from '../components/shared/Avatar';
import TrustBadge from '../components/shared/TrustBadge';
import TrustScoreWidget from '../components/trust/TrustScoreWidget';
import Modal from '../components/shared/Modal';
import UploadProjectModal from '../components/profile/UploadProjectModal';

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile: myProfile, updateUserProfile, isCompany, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('about');
  const [saving, setSaving] = useState(false);
  const [eduInput, setEduInput] = useState({ school: '', degree: '', year: '' });
  const [projects, setProjects] = useState([]);
  const [uploadProjectOpen, setUploadProjectOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const targetId = userId || currentUser?.uid;
      const isSelf = !userId || userId === currentUser?.uid;
      setIsOwnProfile(isSelf);

      if (isSelf) {
        setProfile(myProfile);
        if (myProfile?.uid) {
          getProjects(myProfile.uid).then(setProjects).catch(console.error);
        }
      } else {
        try {
          const u = await getUser(targetId);
          setProfile(u);
          if (u) {
            getProjects(u.uid).then(setProjects).catch(console.error);
            const status = await getConnectionStatus(currentUser.uid, u.uid);
            setConnectionStatus(status);
          }
        } catch (err) {
          console.error('Error loading external profile:', err);
        }
      }
    }
    loadProfile();
  }, [userId, myProfile, currentUser]);

  if (!profile) {
    return <div className="page-full text-center p-5 text-muted">Loading profile...</div>;
  }

  const handleConnect = async () => {
    try {
      await sendConnectionRequest(currentUser.uid, profile.uid);
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Connection request error:', err);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptConnection(profile.uid, currentUser.uid);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  async function handleDeleteProject(e, projectId) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Direct deletion as requested, no confirm prompt
    try {
      const success = await deleteProject(currentUser.uid, projectId);
      if (success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        alert('Could not reach the database to delete this project.');
      }
    } catch (err) {
      console.error('Direct delete error:', err);
    }
  }

  function openEdit() {
    setEditData({ ...profile, education: profile.education || [], skills: profile.skills || [] });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { uid, createdAt, updatedAt, ...data } = editData;
      await updateUserProfile(data);
      // Trigger trust score recalculation on profile update
      await recalculateTrustScore(currentUser.uid);
      // Fetch fresh profile from RTDB to show updated trust score immediately
      if (fetchUserProfile) await fetchUserProfile(currentUser.uid);
      setEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
    setSaving(false);
  }

  function handleSkillInput(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const skill = e.target.value.trim();
      setEditData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
      e.target.value = '';
    }
  }

  function removeSkill(index) {
    setEditData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  }

  function handleAddEdu() {
    if (!eduInput.school || !eduInput.degree) return;
    setEditData(prev => ({
      ...prev,
      education: [...(prev.education || []), { ...eduInput }]
    }));
    setEduInput({ school: '', degree: '', year: '' });
  }

  function removeEdu(index) {
    setEditData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="page-full" style={{ maxWidth: 940, margin: '0 auto' }}>
      {/* Profile Header Block */}
      <motion.div
        className="card mb-4"
        style={{ overflow: 'hidden' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ height: 200, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -50, left: 32, borderRadius: '50%', border: '4px solid var(--color-surface)', background: 'var(--color-surface)' }}>
            <Avatar 
              src={profile.avatarUrl || profile.logoUrl}
              name={profile.name} 
              size="2xl" 
            />
          </div>
        </div>
        
        <div className="card-body" style={{ paddingTop: 64, paddingLeft: 32, paddingRight: 32, paddingBottom: 24 }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile.name}
                {profile.trustScore === 100 && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--color-primary)' }}>
                    <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM10.5 17L5.5 12L6.9 10.6L10.5 14.2L17.1 7.6L18.5 9L10.5 17Z" fill="currentColor"/>
                  </svg>
                )}
                {profile.trustScore < 100 && (
                   <TrustBadge badge={profile.trustBadge || 'NEW'} size="md" />
                )}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--color-text-primary)', marginTop: 4 }}>
                {profile.role === 'company' ? profile.industry : (profile.headline || 'Professional')}
              </p>
              
              <div className="text-sm text-secondary mt-2 flex items-center gap-4">
                {profile.location && (<span>📍 {profile.location}</span>)}
                {profile.role === 'company' && profile.website && (<span>🌐 <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary">{profile.website.replace('https://', '')}</a></span>)}
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>• {profile.connectionsCount || 0} connections</span>
              </div>
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  {profile.trustScore < 100 && (
                    <button className="btn btn-outline-primary" onClick={() => navigate('/verify')} style={{ gap: 6 }}>
                      <span style={{ fontSize: 16 }}>🛡️</span> Get Verified
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={openEdit}>✏️ Edit</button>
                </>
              ) : (
                <>
                  {connectionStatus === 'connected' ? (
                    <button className="btn btn-secondary" disabled>✅ Connected</button>
                  ) : connectionStatus === 'pending' ? (
                    <button className="btn btn-secondary" disabled>⏳ Pending</button>
                  ) : connectionStatus === 'received' ? (
                    <button className="btn btn-primary" onClick={handleAccept}>Accept Request</button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleConnect}>+ Connect</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }}>
        {/* Main Content Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* About Section */}
          <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>About</h3>
            {profile.bio || profile.description ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {profile.role === 'company' ? profile.description : profile.bio}
              </p>
            ) : (
              <div className="text-center p-4">
                <p className="text-sm text-muted mb-2">{isOwnProfile ? "You haven't written anything about yourself yet." : "No description provided."}</p>
                {isOwnProfile && <button className="btn btn-sm btn-outline-primary" onClick={openEdit}>Add summary</button>}
              </div>
            )}
          </motion.div>

          {/* Education Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex justify-between items-center mb-12">
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Education</h3>
              </div>
              
              {profile.education && profile.education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {profile.education.map((edu, i) => (
                    <div key={i} className="flex gap-3 pt-3" style={{ borderTop: i > 0 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <div style={{ padding: '8px', background: 'var(--color-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🎓
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{edu.school}</div>
                        <div className="text-sm text-secondary">{edu.degree}</div>
                        {edu.year && <div className="text-xs text-muted mt-1">{edu.year}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted">No education details added.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Skills Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 12 }}>Skills</h3>
              {(profile.skills && profile.skills.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="badge badge-skill" style={{ padding: '8px 14px', fontSize: '13px' }}>{skill}</span>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-sm text-muted">Showcase your top skills to stand out.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* AI Evaluated Projects Section */}
          {profile.role !== 'company' && (
            <motion.div className="card card-body" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Verified Projects</h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>AI Scored & Audited Codebases</div>
                </div>
                {isOwnProfile && (
                  <button className="btn btn-sm btn-primary" onClick={() => setUploadProjectOpen(true)}>
                    + Upload Repo
                  </button>
                )}
              </div>

              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {projects.map(proj => (
                    <div key={proj.id} style={{ padding: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                      <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {proj.title} 🔗
                          </a>
                          <span className={`badge ${proj.rating !== 'Error' && proj.rating !== 'Pending' ? 'badge-high-trust' : 'badge-new'}`} style={{ width: 'fit-content', marginTop: '4px' }}>
                            {proj.rating}
                          </span>
                        </div>
                        {isOwnProfile && (
                          <button 
                            className="btn btn-icon btn-sm" 
                            onClick={(e) => handleDeleteProject(e, proj.id)}
                            title="Delete Project"
                            style={{ 
                              color: 'var(--color-danger)', 
                              position: 'relative', 
                              zIndex: 10,
                              background: 'rgba(239, 68, 68, 0.1)'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>AI Review: </strong>
                        {proj.aiReview}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-sm text-muted">Upload a project ZIP file to receive a recruiter-grade AI assessment natively added to your profile.</p>
                </div>
              )}
            </motion.div>
          )}

        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <motion.div className="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <TrustScoreWidget 
              score={profile.trustScore || 0} 
              badge={profile.trustBadge || 'NEW'} 
            />
          </motion.div>

          <motion.div className="card card-body" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 16 }}>Your Dashboard</h4>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-light">
                <span className="text-sm text-secondary">Profile viewers</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 50) + 12}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-light">
                <span className="text-sm text-secondary">Post impressions</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 500) + 120}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Search appearances</span>
                <span className="font-semibold text-primary">{Math.floor(Math.random() * 30) + 5}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Edit Profile"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={editData.name || ''} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        
        {!isCompany && (
          <div className="form-group">
            <label className="form-label">Headline</label>
            <input className="form-input" placeholder="e.g. Senior Software Engineer at Google" value={editData.headline || ''} onChange={(e) => setEditData(prev => ({ ...prev, headline: e.target.value }))} />
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">{isCompany ? 'Company Description' : 'Summary / Bio'}</label>
          <textarea className="form-textarea" placeholder="Tell us about yourself..." value={isCompany ? (editData.description || '') : (editData.bio || '')} onChange={(e) => setEditData(prev => ({ ...prev, [isCompany ? 'description' : 'bio']: e.target.value }))} style={{ minHeight: 100 }} />
        </div>
        
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" placeholder="e.g. San Francisco, CA" value={editData.location || ''} onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))} />
        </div>

        {!isCompany && (
          <>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Education</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8, marginBottom: 12 }}>
              <input className="form-input input-sm" placeholder="School/University" value={eduInput.school} onChange={e => setEduInput(p => ({...p, school: e.target.value}))} />
              <input className="form-input input-sm" placeholder="Degree/Major" value={eduInput.degree} onChange={e => setEduInput(p => ({...p, degree: e.target.value}))} />
              <input className="form-input input-sm" placeholder="Year" value={eduInput.year} onChange={e => setEduInput(p => ({...p, year: e.target.value}))} />
            </div>
            <button className="btn btn-sm btn-outline-primary mb-4 w-full" onClick={handleAddEdu}>+ Add Education</button>
            
            {(editData.education || []).map((edu, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 mb-2 bg-surface rounded border border-light">
                <div><strong>{edu.school}</strong> — {edu.degree} <span className="text-muted">({edu.year})</span></div>
                <button className="text-danger p-1" onClick={() => removeEdu(i)}>✕</button>
              </div>
            ))}

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <div className="form-group">
              <label className="form-label">Skills (Press Enter to add)</label>
              <input className="form-input" placeholder="e.g. React, Python, Product Management..." onKeyDown={handleSkillInput} />
              <div className="flex flex-wrap gap-2 mt-2">
                {(editData.skills || []).map((skill, i) => (
                  <span key={i} className="badge badge-skill flex items-center gap-1">
                    {skill} 
                    <span style={{ cursor: 'pointer', fontSize: 10, padding: 2 }} onClick={() => removeSkill(i)}>✕</span>
                  </span>
                ))}
              </div>
            </div>

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--color-border-light)' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Professional Credibility</h4>

            <div className="form-group">
              <label className="form-label">
                Years of Experience
                <span style={{ fontSize: 11, color: 'var(--color-primary)', marginLeft: 6 }}>Verified Professionals Only</span>
              </label>
              <select className="form-select" value={editData.experienceYears || 0} onChange={(e) => setEditData(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))}>
                <option value="0">Select experience</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="5">5+ years</option>
                <option value="7">7+ years</option>
                <option value="10">10+ years</option>
                <option value="15">15+ years</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">
                  LinkedIn URL
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>+10 Trust</span>
                </label>
                <input className="form-input" placeholder="linkedin.com/in/yourname" value={editData.linkedInUrl || ''} onChange={(e) => setEditData(prev => ({ ...prev, linkedInUrl: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Corporate Email
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>+20 Trust</span>
                </label>
                <input type="email" className="form-input" placeholder="you@company.com" value={editData.corporateEmail || ''} onChange={(e) => setEditData(prev => ({ ...prev, corporateEmail: e.target.value }))} />
              </div>
            </div>
          </>
        )}
      </Modal>

      <UploadProjectModal 
        isOpen={uploadProjectOpen} 
        onClose={() => setUploadProjectOpen(false)} 
        onProjectUploaded={() => {
          getProjects(userProfile.uid).then(setProjects).catch(console.error);
        }} 
      />
    </div>
  );
}
```

---

### 7. Job Detail Modal — AI Application Flow
**File:** [JobDetailModal.jsx](file:///c:/TechVelora_nexalink/src/components/jobs/JobDetailModal.jsx) `[NEW]`

4-step application flow:
1. **Details** — Full job view + experience gate check
2. **Analyzing** — Spinner while AI processes
3. **Result** — Match score circle, alignment points, skill gaps, editable AI pitch
4. **Applied** — Success confirmation

---

### 8. Jobs Page — Premium Upgrade
**File:** [JobsPage.jsx](file:///c:/TechVelora_nexalink/src/pages/JobsPage.jsx) `[REWRITE]`

- **Professional tabs:** Explore Jobs + My Applications
- **Company tabs:** Marketplace + Manage Postings (Kanban)
- Trust score 80+ required to post jobs
- 5-column Kanban with status change buttons
- "Experienced Only" badge on header

---

### 9. Fresher Waitlist
**File:** [FresherWaitlistPage.jsx](file:///c:/TechVelora_nexalink/src/pages/FresherWaitlistPage.jsx) `[NEW]`

Polished landing page with guidance for freshers and "Try Again" + "Sign In" CTAs.

---

### 10. Routes & Documentation
- **[App.jsx](file:///c:/TechVelora_nexalink/src/App.jsx)** — Added `/waitlist` route
- **[experienced_jobs_platform.md](file:///c:/TechVelora_nexalink/experienced_jobs_platform.md)** — Full architect's guide for team sharing

## Testing
- Frontend is running on `npm run dev` (port 5173) — Vite hot-reloads all changes
- AI backend needs restart: `cd ai-backend && node server.js`
