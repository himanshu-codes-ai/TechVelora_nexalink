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
Keep answers under 300 words. Be friendly but professional.
When suggesting improvements, be VERY specific — reference the user's actual data, name exact fields, and give example text they can copy-paste.\n\n`;

  if (!profile) {
    systemPrompt += `The user has not shared their profile. Give general professional advice.`;
    return systemPrompt;
  }

  const isCompany = profile.role === 'company';

  // ── Build rich context from ALL profile fields ──
  systemPrompt += `### USER PROFILE (COMPLETE DATA — use this to personalize ALL advice):\n`;
  systemPrompt += `- **Name:** ${profile.name || '⚠️ NOT SET'}\n`;
  systemPrompt += `- **Account Type:** ${isCompany ? 'Organization/Company' : 'Individual Professional'}\n`;
  systemPrompt += `- **Email:** ${profile.email || '⚠️ NOT SET'}\n`;
  systemPrompt += `- **Email Verified:** ${profile.emailVerified ? '✅ Yes' : '❌ No — suggest verifying!'}\n`;

  // Headline
  if (profile.headline) systemPrompt += `- **Headline:** "${profile.headline}"\n`;
  else systemPrompt += `- **Headline:** ⚠️ EMPTY — this is critical! Suggest a compelling one.\n`;

  // Bio
  if (profile.bio) systemPrompt += `- **Bio:** "${profile.bio}"\n`;
  else systemPrompt += `- **Bio:** ⚠️ EMPTY — suggest writing a 2-3 sentence professional bio.\n`;

  // Profile Photo
  systemPrompt += `- **Profile Photo:** ${profile.avatarUrl ? '✅ Has photo' : '❌ NO PHOTO — profiles with photos get 14x more views!'}\n`;

  // Location
  if (profile.location) systemPrompt += `- **Location:** ${profile.location}\n`;
  else systemPrompt += `- **Location:** ⚠️ Not set — suggest adding it for local networking.\n`;

  // ── Company-specific fields ──
  if (isCompany) {
    systemPrompt += `\n#### COMPANY DETAILS:\n`;
    systemPrompt += `- **Industry:** ${profile.industry || '⚠️ NOT SET'}\n`;
    systemPrompt += `- **Domain:** ${profile.domain || '⚠️ NOT SET'}\n`;
    systemPrompt += `- **Website:** ${profile.website || '⚠️ NOT SET — suggest adding company website!'}\n`;
    systemPrompt += `- **Description:** ${profile.description || '⚠️ EMPTY — suggest writing company description!'}\n`;
    systemPrompt += `- **Employee Count:** ${profile.employeeCount || '⚠️ NOT SET'}\n`;
    systemPrompt += `- **Verified Organization:** ${profile.verified ? '✅ Yes' : '❌ No — suggest getting verified!'}\n`;
    systemPrompt += `- **Jobs Posted:** ${profile.jobsCount ?? 0}\n`;
  }

  // ── Individual-specific fields ──
  if (!isCompany) {
    systemPrompt += `\n#### PROFESSIONAL DETAILS:\n`;
    systemPrompt += `- **Experience:** ${profile.experienceYears ?? 0} years\n`;
    systemPrompt += `- **LinkedIn:** ${profile.linkedInUrl || '❌ NOT LINKED — connecting LinkedIn boosts trust score!'}\n`;
    systemPrompt += `- **Corporate Email:** ${profile.corporateEmail || '❌ NOT SET — adding a corporate email proves employment!'}\n`;
    systemPrompt += `- **Website/Portfolio:** ${profile.website || '❌ NONE — suggest adding personal website or portfolio!'}\n`;
  }

  // Skills
  if (profile.skills && profile.skills.length > 0) {
    systemPrompt += `- **Skills (${profile.skills.length}):** ${profile.skills.join(', ')}\n`;
    if (profile.skills.length < 5) systemPrompt += `  ⚠️ Only ${profile.skills.length} skills — suggest adding more relevant ones!\n`;
  } else {
    systemPrompt += `- **Skills:** ⚠️ ZERO skills added — this is a major gap! Strongly suggest adding 5-10 relevant skills.\n`;
  }

  // Education
  if (profile.education && profile.education.length > 0) {
    const eduList = profile.education.map(e => 
      `${e.degree || 'Degree'} at ${e.school || 'School'} (${e.year || ''})`
    ).join('; ');
    systemPrompt += `- **Education:** ${eduList}\n`;
  } else {
    systemPrompt += `- **Education:** ⚠️ NONE added — suggest adding education history.\n`;
  }

  // ── Trust & Verification ──
  systemPrompt += `\n#### TRUST & VERIFICATION:\n`;
  systemPrompt += `- **Trust Score:** ${profile.trustScore ?? 0}/130 (Badge: ${profile.trustBadge || 'NEW'})\n`;
  
  if (profile.trustBreakdown) {
    const tb = profile.trustBreakdown;
    const verified = Object.entries(tb).filter(([, v]) => v === true).map(([k]) => k);
    const missing = Object.entries(tb).filter(([, v]) => v !== true).map(([k]) => k);
    if (verified.length) systemPrompt += `- **✅ Verified:** ${verified.join(', ')}\n`;
    if (missing.length) systemPrompt += `- **❌ Not Verified:** ${missing.join(', ')} — completing these will boost trust score!\n`;
  }

  // ── Activity & Engagement ──
  systemPrompt += `\n#### ACTIVITY & ENGAGEMENT:\n`;
  systemPrompt += `- **Connections:** ${profile.connectionsCount ?? 0}\n`;
  systemPrompt += `- **Posts Published:** ${profile.postsCount ?? 0}\n`;

  // ── Referral & Rewards ──
  systemPrompt += `\n#### REFERRAL & REWARDS:\n`;
  systemPrompt += `- **Referral Code:** ${profile.referralCode || 'NOT GENERATED'}\n`;
  systemPrompt += `- **Referrals Made:** ${profile.referralCount ?? 0} (Verified: ${profile.verifiedReferralCount ?? 0})\n`;
  systemPrompt += `- **Referral Tier:** ${profile.referralTier || 'none'}\n`;
  systemPrompt += `- **NexaCoins:** ${profile.nexaCoins ?? 0}\n`;

  // ── Account Age ──
  if (profile.createdAt) {
    const daysSinceCreation = Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24));
    systemPrompt += `\n- **Account Age:** ${daysSinceCreation} days\n`;
  }

  // ── PROFILE COMPLETENESS SCORECARD ──
  const completenessChecks = isCompany ? [
    { field: 'Name', filled: !!profile.name },
    { field: 'Industry', filled: !!profile.industry },
    { field: 'Description', filled: !!profile.description },
    { field: 'Website', filled: !!profile.website },
    { field: 'Logo/Photo', filled: !!profile.avatarUrl },
    { field: 'Location', filled: !!profile.location },
    { field: 'Employee Count', filled: !!profile.employeeCount },
    { field: 'Email Verified', filled: !!profile.emailVerified },
    { field: 'Posted Jobs', filled: (profile.jobsCount ?? 0) > 0 },
    { field: 'Active Posts', filled: (profile.postsCount ?? 0) > 0 },
  ] : [
    { field: 'Name', filled: !!profile.name },
    { field: 'Headline', filled: !!profile.headline },
    { field: 'Bio', filled: !!profile.bio },
    { field: 'Profile Photo', filled: !!profile.avatarUrl },
    { field: 'Location', filled: !!profile.location },
    { field: 'Skills (3+)', filled: (profile.skills?.length ?? 0) >= 3 },
    { field: 'Education', filled: (profile.education?.length ?? 0) > 0 },
    { field: 'Experience Years', filled: (profile.experienceYears ?? 0) > 0 },
    { field: 'LinkedIn Connected', filled: !!profile.linkedInUrl },
    { field: 'Email Verified', filled: !!profile.emailVerified },
    { field: 'Made Connections', filled: (profile.connectionsCount ?? 0) > 0 },
    { field: 'Published Posts', filled: (profile.postsCount ?? 0) > 0 },
  ];

  const filledCount = completenessChecks.filter(c => c.filled).length;
  const totalCount = completenessChecks.length;
  const completenessPercent = Math.round((filledCount / totalCount) * 100);
  const missingFields = completenessChecks.filter(c => !c.filled).map(c => c.field);

  systemPrompt += `\n### PROFILE COMPLETENESS: ${completenessPercent}% (${filledCount}/${totalCount} fields)\n`;
  if (missingFields.length > 0) {
    systemPrompt += `**Missing:** ${missingFields.join(', ')}\n`;
  } else {
    systemPrompt += `**🎉 All fields complete!** Focus on quality improvements.\n`;
  }

  // ── Rules & Behavior ──
  systemPrompt += `
### RULES:
1. **Always use the actual profile data above** — never guess or make up information about the user.
2. **When asked to "review", "improve", or "audit" the profile**, do a STRUCTURED review:
   - Start with their completeness score (${completenessPercent}%)
   - List the TOP 3 most impactful missing items
   - For each missing item, give a SPECIFIC suggestion (e.g., write an example headline they can actually use)
   - End with one "quick win" they can do in under 2 minutes
3. **When suggesting a headline**, write 2-3 options they can copy-paste, based on their skills/role/experience.
4. **When suggesting a bio**, write a ready-to-use 2-3 sentence bio based on their actual data.
5. **Earning NexaCoins:** Referrals (+10), Profile Completion (+5), Daily Login (+1), Creating Posts (+3).
6. **Trust Score improvements:** Explain which verifications are missing and how to complete them.
7. **Be direct and actionable** — don't just say "add a headline", write the headline for them.
8. **If the profile is already strong** (>80% complete), suggest quality improvements like refining headline, adding more niche skills, or growing connections.
9. **For company profiles**, focus on employer branding, job posting optimization, and company page completeness.
10. **Reference specific numbers:** "You have ${profile.connectionsCount ?? 0} connections — aim for 50+ to unlock network effects."`;

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

// ── POST /api/opportunities/match — AI Opportunity Matching ──
app.post("/api/opportunities/match", async (req, res) => {
  try {
    const { profile, opportunity } = req.body;

    if (!profile || !opportunity) {
      return res.status(400).json({ error: "Both 'profile' and 'opportunity' are required" });
    }

    // ── Deterministic Gate ──
    const userTrust = profile.trustScore || 0;
    if (userTrust < 40) {
      return res.json({
        fitScore: 0,
        status: "REJECTED_TRUST",
        reason: `Your trust score (${userTrust}) is below the minimum (40) required to express interest.`,
        alignmentPoints: [],
        concerns: ["Build trust by completing profile verification"],
        proposalDraft: null
      });
    }

    // Tag overlap
    const userSkills = (profile.skills || []).map(s => s.toLowerCase());
    const oppTags = (opportunity.tags || []).map(t => t.toLowerCase());
    const matchedTags = oppTags.filter(t => userSkills.includes(t));
    const tagOverlapPct = oppTags.length > 0 ? Math.round((matchedTags.length / oppTags.length) * 100) : 50;

    // ── Build AI Prompt ──
    const matchPrompt = `You are a senior Business Development Analyst evaluating strategic fit between a professional/business and a business opportunity.

### PROFILE:
- Name: ${profile.name || 'Unknown'}
- Role: ${profile.role === 'company' ? 'Organization' : 'Individual Professional'}
- Headline: ${profile.headline || 'Not set'}
- Experience: ${profile.experienceYears || 0} years
- Skills/Expertise: ${(profile.skills || []).join(', ') || 'None listed'}
- Industry: ${profile.industry || 'Not specified'}
- Trust Score: ${profile.trustScore || 0}/130 (Badge: ${profile.trustBadge || 'NEW'})
- Bio: ${profile.bio || 'Not provided'}

### OPPORTUNITY:
- Type: ${opportunity.type} (${
  opportunity.type === 'FUNDING' ? 'Seeking investment/investors' :
  opportunity.type === 'ACQUISITION' ? 'Seeking buyers/sellers' :
  opportunity.type === 'PARTNERSHIP' ? 'Seeking strategic partners' :
  opportunity.type === 'SERVICE' ? 'Seeking service providers/clients' :
  opportunity.type === 'COLLABORATION' ? 'Seeking co-builders/joint ventures' :
  'Seeking growth/distribution'
})
- Title: ${opportunity.title}
- Description: ${opportunity.description}
- Category: ${opportunity.category || 'General'}
- Budget: ${opportunity.budget || 'Not specified'}
- Timeline: ${opportunity.timeline || 'Flexible'}
- Requirements: ${opportunity.requirements || 'Not specified'}
- Tags: ${(opportunity.tags || []).join(', ')}
- Posted by: ${opportunity.posterName} (Trust: ${opportunity.posterTrustScore || 0})

### TAG OVERLAP: ${tagOverlapPct}% (${matchedTags.length}/${oppTags.length})

### TASK:
Evaluate the strategic fit. Return ONLY a JSON object (no markdown, no backticks):
{
  "fitScore": <number 0-100>,
  "alignmentPoints": ["<strategic strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<potential concern or gap 1>", "<concern 2>"],
  "proposalDraft": "<A 3-4 sentence professional proposal the user can edit. Write in first person. Explain why you're interested and what value you bring. Be specific.>"
}`;

    console.log(`\n[Opp Match] ${profile.name} → "${opportunity.title}" (${opportunity.type})`);
    console.log(`   Tag overlap: ${tagOverlapPct}% | Trust: ${userTrust}`);

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a precise business analysis engine. Return ONLY valid JSON. No markdown, no backticks, no commentary." },
        { role: "user", content: matchPrompt }
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const rawReply = chatCompletion.choices?.[0]?.message?.content || "";

    let aiResult;
    try {
      const cleaned = rawReply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Opp Match] AI returned unparseable response:", rawReply);
      aiResult = {
        fitScore: Math.min(90, tagOverlapPct + (userTrust >= 60 ? 20 : 10)),
        alignmentPoints: matchedTags.length > 0
          ? [`Relevant expertise in ${matchedTags.slice(0, 3).join(', ')}`]
          : ["Verified professional with relevant experience"],
        concerns: oppTags.length > matchedTags.length ? ["Some required expertise areas not covered"] : [],
        proposalDraft: `I'm interested in your ${opportunity.type.toLowerCase()} opportunity "${opportunity.title}". With my background in ${(profile.skills || []).slice(0, 3).join(', ') || 'relevant areas'} and ${profile.experienceYears || 'several'} years of experience, I believe I can bring significant value. I'd love to discuss how we can collaborate.`
      };
    }

    return res.json({
      fitScore: aiResult.fitScore || 0,
      status: "MATCHED",
      alignmentPoints: aiResult.alignmentPoints || [],
      concerns: aiResult.concerns || [],
      proposalDraft: aiResult.proposalDraft || "",
      deterministic: {
        tagOverlapPct,
        matchedTags,
        trustMet: userTrust >= 40
      }
    });

  } catch (err) {
    console.error("[Opp Match] Error:", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Wait a moment and try again." });
    }
    return res.status(500).json({ error: "Opportunity matching failed. Please try again." });
  }
});

// ── POST /api/opportunities/verify — AI Listing Verification ──
app.post("/api/opportunities/verify", async (req, res) => {
  try {
    const { opportunity, poster } = req.body;

    if (!opportunity) {
      return res.status(400).json({ error: "'opportunity' object is required" });
    }

    const verifyPrompt = `You are a business listing verification analyst. Analyze this opportunity listing for legitimacy, trust, and quality. Check for red flags like scams, unrealistic claims, spam, vague descriptions, or predatory tactics.

### LISTING:
- Type: ${opportunity.type || 'Unknown'}
- Title: ${opportunity.title || 'Untitled'}
- Description: ${opportunity.description || 'No description'}
- Category: ${opportunity.category || 'General'}
- Budget: ${opportunity.budget || 'Not specified'}
- Timeline: ${opportunity.timeline || 'Not specified'}
- Location: ${opportunity.location || 'Not specified'}
- Requirements: ${opportunity.requirements || 'None'}
- Tags: ${(opportunity.tags || []).join(', ')}

### POSTER:
- Name: ${poster?.name || 'Anonymous'}
- Role: ${poster?.role || 'Unknown'}
- Trust Score: ${poster?.trustScore || 0}/130
- Trust Badge: ${poster?.trustBadge || 'NEW'}

### TASK:
Evaluate listing quality and legitimacy. Return ONLY a JSON object (no markdown):
{
  "verificationScore": <number 0-100>,
  "status": "VERIFIED" | "CAUTION" | "FLAGGED",
  "qualityChecks": {
    "descriptionClarity": <1-5>,
    "budgetRealism": <1-5>,
    "requirementsSpecificity": <1-5>,
    "legitimacySignals": <1-5>,
    "professionalTone": <1-5>
  },
  "flags": ["<any red flag found>"],
  "strengths": ["<listing strength 1>", "<strength 2>"],
  "recommendation": "<one sentence verdict for users viewing this listing>"
}`;

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a precise business verification engine. Return ONLY valid JSON. No markdown, no backticks." },
        { role: "user", content: verifyPrompt }
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const rawReply = chatCompletion.choices?.[0]?.message?.content || "";
    let aiResult;
    try {
      const cleaned = rawReply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Verify] Parse error:", rawReply);
      // Fallback: basic trust-based verification
      const score = (poster?.trustScore || 0) >= 60 ? 72 : 50;
      aiResult = {
        verificationScore: score,
        status: score >= 70 ? "VERIFIED" : "CAUTION",
        qualityChecks: { descriptionClarity: 3, budgetRealism: 3, requirementsSpecificity: 3, legitimacySignals: 3, professionalTone: 3 },
        flags: [],
        strengths: ["Posted by registered user"],
        recommendation: "Listing appears legitimate but could benefit from more detail."
      };
    }

    console.log(`[Verify] "${opportunity.title}" → ${aiResult.status} (${aiResult.verificationScore})`);

    return res.json(aiResult);

  } catch (err) {
    console.error("[Verify] Error:", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "Rate limit. Wait and retry." });
    }
    return res.status(500).json({ error: "Verification failed" });
  }
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Nexalink AI Backend running → http://localhost:${PORT}`);
  console.log(`📡  POST /chat ready (Groq + Llama 3.3 70B)`);
  console.log(`🎯  POST /api/jobs/match ready (AI Job Matching Engine)`);
  console.log(`🏢  POST /api/opportunities/match ready (AI Opportunity Matching)`);
  console.log(`🔍  POST /api/opportunities/verify ready (AI Listing Verification)`);
  console.log(`🧠  Context-aware: Accepts user profile for personalized advice\n`);
});


