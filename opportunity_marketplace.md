# Nexalink — Business Opportunity Marketplace
## Feature Architecture & Implementation Guide

> **Author:** TechVelora Team  
> **Version:** 2.0 — B2B Pro Edition  
> **Last Updated:** April 2026

---

## 1. What This Feature Does

The **Opportunity Marketplace** is a trust-verified discovery hub where **startups, businesses, investors, buyers, partners, and service providers** can find each other for:

| Type | Icon | Use Case |
|------|------|----------|
| **Funding** | 🏦 | Investors ↔ Startups (seed rounds, Series A, grants) |
| **Acquisition** | 🛒 | Buyers ↔ Sellers (M&A, asset purchases) |
| **Partnership** | 🤝 | Strategic partnerships (distribution, co-marketing) |
| **Service** | ⚡ | Service providers ↔ Clients (dev agencies, consultants) |
| **Collaboration** | 🎯 | Co-founders, joint ventures, co-building |
| **Growth** | 📈 | Growth hacking, distribution deals, affiliate partnerships |

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite/React)                    │
│  Port: 5173                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  OpportunityMarketplacePage.jsx                       │ │
│  │  ┌─────────────┬──────────────┬────────────────────┐  │ │
│  │  │  Discover   │ My Interests │  My Postings       │  │ │
│  │  │  (Grid)     │ (Status)     │  (Pipeline)        │  │ │
│  │  └─────────────┴──────────────┴────────────────────┘  │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │                                    │
│  ┌────────────────────▼──────────────────────────────────┐ │
│  │  OpportunityCard.jsx   │  OpportunityDetailModal.jsx  │ │
│  │  (Type-coded cards)    │  (4-step AI proposal flow)   │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │                                    │
│  ┌────────────────────▼──────────────────────────────────┐ │
│  │         realtimeService.jsx (RTDB Layer)               │ │
│  │  • createOpportunity()     • expressInterest()         │ │
│  │  • getOpportunities()      • updateInterestStatus()    │ │
│  │  • getOpportunityInterests() • getUserInterests()      │ │
│  │  • closeOpportunity()                                  │ │
│  └───────────────────────┬───────────────────────────────┘ │
└──────────────────────────┬────────────────────────────────┘
                           │ Firebase RTDB
┌──────────────────────────▼────────────────────────────────┐
│                 AI BACKEND (Node.js/Express)                │
│  Port: 3001                                                │
│  POST /api/opportunities/match                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1. Trust Gate (score ≥ 40)                           │ │
│  │  2. Tag Overlap (deterministic pre-filter)            │ │
│  │  3. Groq Llama 3.3 70B Semantic Analysis              │ │
│  │  4. Returns: fitScore, alignmentPoints, concerns,     │ │
│  │     proposalDraft                                     │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (Firebase RTDB)

```
opportunities/
  └── {oppId}/
      ├── type: "FUNDING" | "ACQUISITION" | "PARTNERSHIP" | "SERVICE" | "COLLABORATION" | "GROWTH"
      ├── title: string
      ├── description: string
      ├── category: string (SaaS, FinTech, HealthTech, etc.)
      ├── budget: string ("$50K–$200K", "Equity-based")
      ├── timeline: string ("Q3 2026", "Immediate")
      ├── location: string
      ├── tags: string[]
      ├── requirements: string
      ├── postedBy: uid
      ├── posterName: string
      ├── posterRole: "individual" | "company"
      ├── posterTrustBadge: string
      ├── posterTrustScore: number
      ├── status: "open" | "closed"
      ├── interestCount: number
      ├── createdAt: timestamp
      └── updatedAt: timestamp

opportunity_interests/
  └── {oppId}/
      └── {userId}/
          ├── status: "PENDING" | "ACCEPTED" | "IN_DISCUSSION" | "DECLINED"
          ├── proposal: string
          ├── matchScore: number
          ├── senderName: string
          ├── senderTrustScore: number
          ├── requireNDA: boolean
          ├── createdAt: timestamp
          └── updatedAt: timestamp

user_interests/
  └── {userId}/
      └── {oppId}/
          ├── status: string (mirrored)
          └── sentAt: timestamp
```

---

## 4. Trust Gates

| Action | Required Trust Score | Rationale |
|--------|---------------------|-----------|
| **Post Opportunity** | 60+ | Higher bar prevents spam, lower than jobs (80) since opportunities are exploratory |
| **Express Interest** | 40+ | Prevents brand-new unverified accounts from cold-pitching |
| **View Opportunities** | 0 (anyone) | Discovery is open for all authenticated users |

---

## 5. AI Opportunity Matching Engine

### Endpoint: `POST /api/opportunities/match`

**Two-phase Architecture (identical pattern to job matching):**

### Phase 1: Deterministic Gate (Zero API Cost)
```javascript
// Trust check
if (userTrust < 40) → REJECT

// Tag overlap
const matchedTags = oppTags.filter(t => userSkills.includes(t));
const tagOverlapPct = (matchedTags.length / oppTags.length) * 100;
```

### Phase 2: Semantic Analysis (Groq API)
- **Model:** `llama-3.3-70b-versatile`
- **Temperature:** `0.3` (precision)
- **Role:** "Senior Business Development Analyst"
- **Output:** JSON with `fitScore`, `alignmentPoints`, `concerns`, `proposalDraft`

### Fallback (if AI returns bad JSON):
```javascript
fitScore = Math.min(90, tagOverlapPct + (trustMet ? 20 : 10))
```

### AI Response Schema:
```json
{
  "fitScore": 82,
  "alignmentPoints": ["Strong expertise in AI and ML aligns with the technical opportunity", ...],
  "concerns": ["No prior experience in climate tech sector"],
  "proposalDraft": "I'm excited about your climate analytics opportunity..."
}
```

---

## 6. Frontend Components

### OpportunityMarketplacePage.jsx
**3 Tabs:**
1. **🔍 Discover** — Browse with 6-type filter chips, category dropdown, search
2. **📋 My Interests** — Track all submitted proposals with status badges
3. **📊 My Postings** — 4-column Kanban pipeline to manage incoming interest

**Header:** Prominent `🚀 Post New Opportunity` CTA button with gradient background (`#2563eb → #7c3aed`) and glow shadow. Trust-gated: shows `🔒 Boost Trust to Post` if trust < 60.

### OpportunityCard.jsx
- **Top gradient accent bar** (type-colored)
- Color-coded type badges + AI Verification badges
- Poster name + TrustBadge
- Budget, timeline, location, AI trust score chips
- Tags with overflow indicator
- **Sticky footer** with interest count + `View & Propose →` CTA button

### OpportunityDetailModal.jsx
**4-Step Flow:**
```
Details → AI Fit Analysis → Business Alignment Radar + Proposal + NDA → Confirmation
```
- Owner detection: Prevents self-interaction
- Trust gate: Shows warning if trust < 40
- **Business Alignment Radar:** Two-column Deal-Makers (🟢) vs Deal-Breakers (🔴) split
- **NDA Toggle:** Professional Edge feature for confidential profile sharing
- **Gradient CTA buttons** (Analyze = blue→violet, Submit = green gradient)

---

## 7. Interest Pipeline (Poster's View)

```
PENDING → ACCEPTED → IN_DISCUSSION → DECLINED
```

Each pipeline card shows:
- Sender Avatar + Name + Headline
- Trust Badge + Fit Score
- Proposal preview (2 lines)
- Action buttons to move between states

---

## 8. Demo Data

The page comes pre-loaded with **6 realistic demo opportunities** covering all types:
1. 🏦 **Seed Round** — AI-powered HR platform ($500K)
2. 🛒 **Acquisition** — Profitable e-commerce brands ($1M–$5M)
3. 🤝 **Partnership** — FinTech distribution in Southeast Asia
4. ⚡ **Service** — Full-stack dev agency for HealthTech MVP
5. 🎯 **Collaboration** — Climate tech co-founder search
6. 📈 **Growth** — Developer tool distribution partnership

---

## 9. Setup & Running

### Prerequisites
- Node.js 18+
- Firebase project with RTDB enabled
- Groq API Key (free at console.groq.com)

### Environment Files

**`/.env`** (Frontend)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
```

**`/ai-backend/.env`**
```
PORT=3001
GROQ_API_KEY=gsk_...
```

### Running
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: AI Backend (RESTART after adding new endpoint)
cd ai-backend && node server.js
```

---

## 10. Files Changed / Created

| File | Change |
|------|--------|
| `ai-backend/server.js` | Added `POST /api/opportunities/match` + `POST /api/opportunities/verify` endpoints |
| `src/services/realtimeService.jsx` | Added 8 opportunity marketplace functions |
| `src/pages/OpportunityMarketplacePage.jsx` | **NEW** — Full marketplace page |
| `src/components/opportunities/OpportunityCard.jsx` | **NEW** — Type-coded cards |
| `src/components/opportunities/OpportunityDetailModal.jsx` | **NEW** — AI fit + proposal modal |
| `src/App.jsx` | Added `/opportunities` route |
| `src/components/layout/Navbar.jsx` | Added "Deals" nav item |

---

## 11. AI Listing Verification System

Every opportunity posted on the marketplace is **automatically verified by AI** using your Groq API key.

### How It Works:
1. User clicks "Post Opportunity"
2. Before saving to RTDB, the frontend calls `POST /api/opportunities/verify`
3. AI analyzes listing text for legitimacy, scam patterns, quality, and professionalism
4. Returns a **verification stamp** that gets saved with the opportunity data
5. Cards and detail modals show the verification badge + quality report

### Verification Endpoint: `POST /api/opportunities/verify`

**Input:** `{ opportunity, poster }`

**Output:**
```json
{
  "verificationScore": 88,
  "status": "VERIFIED",
  "qualityChecks": {
    "descriptionClarity": 5,
    "budgetRealism": 4,
    "requirementsSpecificity": 5,
    "legitimacySignals": 4,
    "professionalTone": 5
  },
  "flags": [],
  "strengths": ["Clear acquisition criteria", "PE-backed credibility"],
  "recommendation": "Legitimate acquisition opportunity from a verified holding company."
}
```

### Verification Statuses:
| Status | Badge | Meaning |
|--------|-------|---------|
| `VERIFIED` | ✅ AI Verified | Score ≥ 70, no major flags |
| `CAUTION` | ⚠️ Review Needed | Score 40-69, some concerns |
| `FLAGGED` | 🚩 Flagged | Score < 40, serious red flags detected |

### Quality Checks (5-point scale each):
- 📝 Description Clarity — Is it clear what the opportunity is?
- 💰 Budget Realism — Are financial figures realistic?
- 🎯 Requirements Specificity — Are requirements well-defined?
- 🔐 Legitimacy Signals — Does it appear legitimate?
- ✍️ Professional Tone — Is the language professional?

### Visual Display:
- **Cards:** Show verification badge (✅/⚠️/🚩) + percentage score chip
- **Detail Modal:** Full AI Verification Report panel with quality bar grid, strengths, flags, and recommendation

---

## 12. How It Integrates With Existing Features

| Existing Feature | Integration |
|-----------------|-------------|
| **Trust Score Engine** | Trust gates (60+ to post, 40+ to express interest) |
| **AI Backend (Groq)** | New endpoint uses same Llama 3.3 70B model |
| **Firebase RTDB** | 3 new nodes (opportunities, interests, user_interests) |
| **Job Marketplace** | Same architectural pattern (deterministic → AI → pipeline) |
| **Auth System** | Protected route, role-based poster info |
| **Shared Components** | Reuses Modal, Avatar, TrustBadge, EmptyState |

---

## 13. Security

| Concern | Mitigation |
|---------|------------|
| Spam postings | Trust score 60+ required to post |
| Cold pitching | Trust score 40+ required to express interest |
| Self-interaction | Owner detection prevents expressing interest on own opportunity |
| Duplicate interest | RTDB check prevents double-submission |
| Status tampering | Only poster can modify interest pipeline |
| Data integrity | Dual-sided writes (opportunity_interests + user_interests) |
| Confidential profiles | NDA toggle flags submissions requiring signed NDA before profile reveal |

---

## 14. B2B Pro UI Features

### Business Alignment Radar
The AI fit result screen now presents analysis in a **two-column layout:**
- **🟢 Deal-Makers** — Animated list of strategic alignment points (green check marks)
- **🔴 Deal-Breakers / Risks** — Animated list of concerns with red markers + count badges

This replaces the generic list format with a clear pros/cons visual that mirrors professional M&A due diligence reports.

### NDA Toggle (Professional Edge)
During the proposal step, users see a sleek **toggle switch** labeled "🔐 Require NDA":
- **Visual:** Violet-themed toggle with expandable explanation panel
- **Behavior:** Adds `requireNDA: true` to the interest submission
- **UX:** Animated expand/collapse explanation when toggled on
- **Backend:** Currently UI-only state flag. Future: integrate with e-signature API

### Premium CTA Buttons
- **Page Header:** `🚀 Post New Opportunity` — Gradient blue→violet with glow shadow
- **Card Footer:** `View & Propose →` — Primary blue with hover scale
- **Modal:** Gradient `🤖 Analyze Fit with AI` (blue→violet) and `📤 Submit Interest` (green gradient)

---

*Built by TechVelora — The World's Most Trusted Professional Network*
