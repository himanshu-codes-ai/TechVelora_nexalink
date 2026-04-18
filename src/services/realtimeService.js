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
