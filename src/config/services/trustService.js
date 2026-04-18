// services/trustService.js

import { db, storage } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";


// ==============================
// 📤 Upload Government ID
// ==============================
export const uploadGovernmentId = async (userId, file, docType) => {
  try {
    // 🔐 VALIDATION
    if (!file) throw new Error("No file selected");

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only JPG, PNG, PDF allowed");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be < 5MB");
    }

    // 1. Upload to Storage
    const storageRef = ref(
      storage,
      `documents/${userId}/${Date.now()}_${file.name}`
    );

    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);

    // 2. Save metadata
    await addDoc(
      collection(db, "users", userId, "documents"),
      {
        docType,
        fileUrl,
        status: "pending",
        uploadedAt: serverTimestamp()
      }
    );

    return true;

  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
};


// ==============================
// 📄 Get User Documents
// ==============================
export const getUserVerificationDocs = async (userId) => {
  try {
    const q = query(
      collection(db, "users", userId, "documents"),
      orderBy("uploadedAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error("Fetch Docs Error:", error);
    return [];
  }
};


// ==============================
// 🧠 Recalculate Trust Score
// ==============================
export const recalculateTrustScore = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const docs = await getUserVerificationDocs(userId);

    let trustBreakdown = {
      email: 0,
      profile: 0,
      education: 0,
      skills: 0,
      gov: 0
    };

    // 🔹 GOV Verification
    const hasVerifiedDoc = docs.some(d => d.status === "verified");
    if (hasVerifiedDoc) trustBreakdown.gov = 50;

    // 🔹 Basic checks (you can refine later)
    trustBreakdown.email = 10;
    trustBreakdown.profile = 10;
    trustBreakdown.education = 15;
    trustBreakdown.skills = 10;

    const trustScore = Object.values(trustBreakdown)
      .reduce((a, b) => a + b, 0);

    let trustBadge = "NEW";
    if (trustScore >= 80) trustBadge = "HIGH";
    else if (trustScore >= 50) trustBadge = "MEDIUM";

    await updateDoc(userRef, {
      trustScore,
      trustBadge,
      trustBreakdown
    });

  } catch (error) {
    console.error("Trust Score Error:", error);
  }
};