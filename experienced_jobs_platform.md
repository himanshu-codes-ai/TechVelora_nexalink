# Nexalink — Experienced Professionals Job Platform
## Feature Architecture & Implementation Guide

> **Author:** TechVelora Team  
> **Version:** 2.0  
> **Last Updated:** April 2026

---

## 1. Executive Summary

Nexalink has evolved from a general professional network into an **exclusive, high-trust job ecosystem** designed specifically for **verified businesses and experienced professionals**. Freshers are completely out of scope — they cannot register, cannot browse jobs, and cannot apply.

### Core Pillars
| Pillar | Implementation |
|--------|---------------|
| **Quality Hiring** | AI-powered semantic matching + deterministic pre-filters |
| **Professional Credibility** | Trust Score engine (130-point system) with 7 verification categories |
| **Business-Focused Workflows** | 5-stage Kanban recruitment pipeline |
| **Ecosystem Integrity** | Fresher gate at registration + HIGH trust (80+) for job posting |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite/React)                  │
│  Port: 5173                                              │
│  ┌──────────────┬──────────────┬──────────────────────┐  │
│  │ RegisterPage │  JobsPage    │  ProfilePage          │  │
│  │ (Gate)       │  (Kanban)    │  (Credibility)        │  │
│  └──────┬───────┴──────┬───────┴──────────┬───────────┘  │
│         │              │                  │               │
│  ┌──────▼──────────────▼──────────────────▼───────────┐  │
│  │         realtimeService.jsx (RTDB Layer)            │  │
│  │  • applyToJob()    • updateApplicationStatus()      │  │
│  │  • getJobApps()    • getUserApplications()          │  │
│  └───────────────────────┬────────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────▼────────────────────────────┐  │
│  │          trustService.js (130-Point Engine)         │  │
│  │  • Email (10)   • Profile (10)   • Education (15)   │  │
│  │  • Skills (15)  • LinkedIn (10)  • Corp Email (20)  │  │
│  │  • Gov ID (50)                                      │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────┘
                              │
                              │ Firebase RTDB
                              │
┌─────────────────────────────▼───────────────────────────┐
│                 AI BACKEND (Node.js/Express)              │
│  Port: 3001                                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  POST /chat         — Context-aware AI assistant    │  │
│  │  POST /api/jobs/match — Semantic Job Matching        │  │
│  │                                                      │  │
│  │  Engine: Groq Cloud → Llama 3.3 70B Versatile       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  1. Deterministic Gate (exp check, skill %)   │   │  │
│  │  │  2. AI Semantic Analysis (if gate passes)     │   │  │
│  │  │  3. Structured JSON Response                  │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Onboarding Gate — Fresher Exclusion

### File: `src/pages/RegisterPage.jsx`

**Logic:**
```javascript
// Fresher Gate: Block registration for individuals with < 1 year experience
if (role === 'individual') {
  const expYrs = parseInt(experienceYears) || 0;
  if (expYrs < 1) {
    setError('Nexalink is an experienced-professionals-only platform...');
    return;
  }
}
```

**UX Flow:**
1. User selects "Individual" role
2. "Years of Professional Experience" dropdown appears
3. If user selects "Fresher (0 years)", an inline warning appears
4. On submit with < 1 year, registration is blocked
5. User is redirected to `/waitlist` (FresherWaitlistPage)

### File: `src/pages/FresherWaitlistPage.jsx`
A polished landing page that:
- Explains why freshers can't join yet
- Provides actionable guidance (build projects, get certified, find internships)
- Offers a "Try Again" link back to registration

---

## 4. Professional Credibility — Trust Score V2

### File: `src/services/trustService.js`

**130-Point Scale:**

| Category | Points | Verification Method |
|----------|--------|-------------------|
| Email Verification | 10 | EmailJS OTP |
| Profile Completion | 10 | Name + Headline + Bio |
| Education | 15 | At least 1 entry added |
| Skills | 15 | At least 1 skill added |
| LinkedIn URL | 10 | Valid `linkedin.com/` URL |
| Corporate Email | 20 | Non-public domain email |
| Government ID | 50 | Base64 doc upload (RTDB) |

**Corporate Email Validation:**
```javascript
const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'protonmail.com', 'icloud.com', 'aol.com', 'mail.com'
];

// Only non-public domains qualify
const domain = userData.corporateEmail.split('@')[1]?.toLowerCase();
if (domain && !PUBLIC_EMAIL_DOMAINS.includes(domain)) {
  trustBreakdown.corporateEmail = true;
}
```

**Fields Added to Profile:**
- `linkedInUrl` — string, stored in RTDB
- `corporateEmail` — string, stored in RTDB
- `experienceYears` — number, stored in RTDB

---

## 5. AI Job Matching Engine

### File: `ai-backend/server.js` → `POST /api/jobs/match`

**Two-Phase Architecture:**

### Phase 1: Deterministic Gate (Zero API Cost)
```javascript
// Hard rejection if experience doesn't meet minimum
if (userExp < jobMinExp) {
  return { matchScore: 0, status: "REJECTED_DETERMINISTIC", ... };
}

// Skill overlap calculation
const matchedSkills = jobSkills.filter(s => userSkills.includes(s));
const skillOverlapPct = (matchedSkills.length / jobSkills.length) * 100;
```

### Phase 2: Semantic AI Analysis (Groq API)
Only runs if the deterministic gate passes.

**Prompt Engineering:**
- Model: `llama-3.3-70b-versatile`
- Temperature: `0.3` (precision over creativity)
- Role: "Senior Technical Recruiter"
- Output: Structured JSON with `matchScore`, `alignmentPoints`, `skillGaps`, `pitch`

**AI Response Schema:**
```json
{
  "matchScore": 78,
  "alignmentPoints": ["5 years of Python experience matches requirement", ...],
  "skillGaps": ["Kubernetes", "MLOps"],
  "pitch": "With 5 years of backend engineering experience..."
}
```

**Fallback:** If AI returns unparseable JSON, a deterministic score is calculated:
```javascript
matchScore = Math.min(95, skillOverlapPct + (expMet ? 20 : 0))
```

---

## 6. Recruitment Workflow (Kanban Pipeline)

### File: `src/services/realtimeService.jsx`

**Pipeline Stages:**
```
PENDING → SHORTLISTED → INTERVIEWING → HIRED
                                     → REJECTED
```

**Functions:**
| Function | Purpose |
|----------|---------|
| `applyToJob(jobId, userId, data)` | Submit application, prevent duplicates |
| `updateApplicationStatus(jobId, userId, status)` | Move through pipeline |
| `getJobApplications(jobId)` | Company: fetch all applicants + profiles |
| `getUserApplications(userId)` | Professional: track all applications |

**Database Schema (RTDB):**
```
job_applications/
  └── {jobId}/
      └── {userId}/
          ├── status: "PENDING"
          ├── pitch: "..."
          ├── matchScore: 78
          ├── appliedAt: 1713500000000
          └── updatedAt: 1713500000000

user_applications/
  └── {userId}/
      └── {jobId}/
          ├── status: "PENDING"
          └── appliedAt: 1713500000000
```

---

## 7. Frontend Components

### JobsPage.jsx — Role-Based Views

**Professional Tabs:**
1. **Explore Jobs** — Browse and search open positions
2. **My Applications** — Track status across all applications

**Company Tabs:**
1. **Marketplace** — View all open positions
2. **Manage Postings** — Kanban board per job posting

### JobDetailModal.jsx — 4-Step Application Flow
```
Details → AI Analysis → Match Report + Editable Pitch → Confirmation
```

### JobCard.jsx — Enhanced Cards
- Trust badge display
- Experience requirement tags
- Click to open detail modal

---

## 8. Setup & Running

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

# Terminal 2: AI Backend
cd ai-backend && node server.js
```

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Fresher Bypass | Gate enforced at registration + profile level |
| Fake Companies | Trust score 80+ required to post |
| Data Harvesting | Government ID stored as Base64 in RTDB |
| AI Manipulation | Deterministic gate runs BEFORE AI call |
| Duplicate Applications | RTDB check prevents double-apply |
| Status Tampering | Only company account owner can modify pipeline |

---

## 10. Files Modified

| File | Change |
|------|--------|
| `ai-backend/server.js` | Added `POST /api/jobs/match` endpoint |
| `src/services/realtimeService.jsx` | Added recruitment workflow functions |
| `src/services/trustService.js` | Added LinkedIn + Corporate Email verification |
| `src/pages/RegisterPage.jsx` | Added experience gate + credibility fields |
| `src/pages/JobsPage.jsx` | Full rewrite with Kanban + tabs |
| `src/pages/ProfilePage.jsx` | Added professional credibility section |
| `src/pages/FresherWaitlistPage.jsx` | **NEW** — Fresher redirect page |
| `src/components/jobs/JobDetailModal.jsx` | **NEW** — AI match + application modal |
| `src/contexts/AuthContext.jsx` | Persists new profile fields |
| `src/App.jsx` | Added `/waitlist` route |

---

*Built by TechVelora — Powering the World's Most Trusted Professional Network*
