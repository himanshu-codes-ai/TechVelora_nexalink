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
import { generateNexusId } from '../services/searchService';

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
    const nexusId = extraData.nexusId || generateNexusId(name);
    const profileData = role === 'company' ? {
      name,
      email,
      role: 'company',
      nexusId,
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
      nexusId,
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
      livenessVerified: false,
      identityVerified: false,
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
        nexusId: generateNexusId(cred.user.displayName || 'User'),
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
        livenessVerified: false,
        identityVerified: false,
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
