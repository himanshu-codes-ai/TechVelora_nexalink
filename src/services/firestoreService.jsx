import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, increment, serverTimestamp,
  arrayUnion, arrayRemove, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

// ========== USERS ==========
export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

// ========== COMPANIES ==========
export async function getCompany(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId));
  return snap.exists() ? { companyId, ...snap.data() } : null;
}

export async function getAllCompanies(pageSize = 20) {
  const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ companyId: d.id, ...d.data() }));
}

// ========== POSTS ==========
export async function createPost(postData) {
  const ref = await addDoc(collection(db, 'posts'), {
    ...postData,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    createdAt: serverTimestamp()
  });

  // Increment author's post count
  const authorCollection = postData.authorType === 'company' ? 'companies' : 'users';
  await updateDoc(doc(db, authorCollection, postData.authorId), {
    postsCount: increment(1)
  });

  return ref.id;
}

export async function getPosts(pageSize = 20, lastDoc = null, userId = null) {
  // If we have a userId and no pagination, try the ranked backend feed first
  if (userId && !lastDoc) {
    try {
      const response = await fetch(`/api/feed/ranked?uid=${userId}&limit=${pageSize}`);
      if (response.ok) {
        const posts = await response.json();
        return { posts, lastDoc: null, isRanked: true };
      }
    } catch (err) {
      console.warn("Backend ranked feed unavailable, falling back to Firestore:", err.message);
    }
  }

  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  const snap = await getDocs(q);
  return {
    posts: snap.docs.map(d => ({ postId: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    isRanked: false
  };
}

export async function recalculateTrustScore(uid) {
  try {
    const response = await fetch(`/api/trust/calculate/${uid}`, { method: 'POST' });
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Trust calculation failed');
  } catch (err) {
    console.error("Backend trust engine error:", err.message);
    throw err;
  }
}

export async function likePost(postId, userId) {
  const likeId = `${postId}_${userId}`;
  const likeRef = doc(db, 'posts_likes', likeId);
  const existing = await getDoc(likeRef);

  if (existing.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'posts', postId), { likesCount: increment(-1) });
    return false;
  } else {
    await setDoc(likeRef, { postId, userId, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'posts', postId), { likesCount: increment(1) });
    return true;
  }
}

export async function checkLiked(postId, userId) {
  const likeId = `${postId}_${userId}`;
  const snap = await getDoc(doc(db, 'posts_likes', likeId));
  return snap.exists();
}

export async function addComment(postId, commentData) {
  const ref = await addDoc(collection(db, 'posts_comments'), {
    postId,
    ...commentData,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
  return ref.id;
}

export async function getComments(postId) {
  const q = query(
    collection(db, 'posts_comments'),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ commentId: d.id, ...d.data() }));
}

export async function deletePost(postId, authorId, authorType) {
  await deleteDoc(doc(db, 'posts', postId));
  const authorCollection = authorType === 'company' ? 'companies' : 'users';
  await updateDoc(doc(db, authorCollection, authorId), {
    postsCount: increment(-1)
  });
}

// ========== JOBS ==========
export async function createJob(jobData) {
  if (jobData.requiredExperienceYears < 1) {
    throw new Error('Only experienced roles allowed. Minimum 1 year experience required.');
  }
  const ref = await addDoc(collection(db, 'jobs'), {
    ...jobData,
    applicantsCount: 0,
    status: 'open',
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'companies', jobData.companyId), {
    jobsCount: increment(1)
  });
  return ref.id;
}

export async function getJobs(filters = {}, pageSize = 20) {
  let constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];

  if (filters.companyId) {
    constraints.unshift(where('companyId', '==', filters.companyId));
  }
  if (filters.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  const q = query(collection(db, 'jobs'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ jobId: d.id, ...d.data() }));
}

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'jobs', jobId));
  return snap.exists() ? { jobId, ...snap.data() } : null;
}

export async function applyToJob(jobId, applicationData) {
  const existingQ = query(
    collection(db, 'applications'),
    where('jobId', '==', jobId),
    where('userId', '==', applicationData.userId)
  );
  const existing = await getDocs(existingQ);
  if (!existing.empty) throw new Error('Already applied to this job');

  const ref = await addDoc(collection(db, 'applications'), {
    jobId,
    ...applicationData,
    status: 'applied',
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'jobs', jobId), { applicantsCount: increment(1) });
  return ref.id;
}

export async function getApplications(jobId) {
  const q = query(
    collection(db, 'applications'),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ applicationId: d.id, ...d.data() }));
}

export async function getUserApplications(userId) {
  const q = query(
    collection(db, 'applications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ applicationId: d.id, ...d.data() }));
}

// ========== EVENTS ==========
export async function createEvent(eventData) {
  const ref = await addDoc(collection(db, 'events'), {
    ...eventData,
    attendeesCount: 0,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function getEvents(pageSize = 20) {
  const q = query(
    collection(db, 'events'),
    orderBy('date', 'asc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ eventId: d.id, ...d.data() }));
}

export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? { eventId, ...snap.data() } : null;
}

export async function registerForEvent(eventId, userId) {
  const regId = `${eventId}_${userId}`;
  const regRef = doc(db, 'event_registrations', regId);
  const existing = await getDoc(regRef);

  if (existing.exists()) throw new Error('Already registered');

  await setDoc(regRef, {
    eventId,
    userId,
    status: 'registered',
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'events', eventId), { attendeesCount: increment(1) });
}

export async function checkEventRegistration(eventId, userId) {
  const regId = `${eventId}_${userId}`;
  const snap = await getDoc(doc(db, 'event_registrations', regId));
  return snap.exists();
}

// ========== CONNECTIONS ==========
export async function sendConnectionRequest(fromUserId, toUserId) {
  // Check if connection already exists
  const q1 = query(
    collection(db, 'connections'),
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId)
  );
  const q2 = query(
    collection(db, 'connections'),
    where('fromUserId', '==', toUserId),
    where('toUserId', '==', fromUserId)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!snap1.empty || !snap2.empty) throw new Error('Connection already exists');

  const ref = await addDoc(collection(db, 'connections'), {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function acceptConnection(connectionId, userId) {
  const connRef = doc(db, 'connections', connectionId);
  const snap = await getDoc(connRef);
  if (!snap.exists()) throw new Error('Connection not found');

  const conn = snap.data();
  if (conn.toUserId !== userId) throw new Error('Unauthorized');

  await updateDoc(connRef, { status: 'accepted', updatedAt: serverTimestamp() });

  // Increment connection counts for both users
  await updateDoc(doc(db, 'users', conn.fromUserId), { connectionsCount: increment(1) });
  await updateDoc(doc(db, 'users', conn.toUserId), { connectionsCount: increment(1) });
}

export async function rejectConnection(connectionId, userId) {
  const connRef = doc(db, 'connections', connectionId);
  const snap = await getDoc(connRef);
  if (!snap.exists()) throw new Error('Connection not found');
  if (snap.data().toUserId !== userId) throw new Error('Unauthorized');

  await updateDoc(connRef, { status: 'rejected', updatedAt: serverTimestamp() });
}

export async function getConnections(userId) {
  const q1 = query(
    collection(db, 'connections'),
    where('fromUserId', '==', userId),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    collection(db, 'connections'),
    where('toUserId', '==', userId),
    where('status', '==', 'accepted')
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const connections = [];
  snap1.docs.forEach(d => connections.push({ connectionId: d.id, connectedUserId: d.data().toUserId, ...d.data() }));
  snap2.docs.forEach(d => connections.push({ connectionId: d.id, connectedUserId: d.data().fromUserId, ...d.data() }));

  return connections;
}

export async function getPendingRequests(userId) {
  const q = query(
    collection(db, 'connections'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ connectionId: d.id, ...d.data() }));
}

export async function getAllUsers(pageSize = 50) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ========== REAL-TIME LISTENERS ==========
export function onPostsChange(callback) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map(d => ({ postId: d.id, ...d.data() }));
    callback(posts);
  });
}

export function onConnectionRequests(userId, callback) {
  const q = query(
    collection(db, 'connections'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map(d => ({ connectionId: d.id, ...d.data() }));
    callback(requests);
  });
}
