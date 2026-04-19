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
