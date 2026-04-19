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

// ========== OPPORTUNITY MARKETPLACE ==========

export async function createOpportunity(data) {
  if (!data.title || !data.description || !data.type) {
    throw new Error('Title, description, and type are required');
  }
  const newRef = push(ref(db, 'opportunities'));
  const opportunity = {
    ...data,
    oppId: newRef.key,
    status: 'open',
    interestCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(newRef, opportunity);
  return opportunity;
}

export async function getOpportunities(filters = {}) {
  const snap = await get(ref(db, 'opportunities'));
  let opportunities = [];
  if (snap.exists()) {
    for (const [id, data] of Object.entries(snap.val())) {
      opportunities.push({ oppId: id, ...data });
    }
  }
  // Apply filters
  if (filters.type) opportunities = opportunities.filter(o => o.type === filters.type);
  if (filters.category) opportunities = opportunities.filter(o => o.category === filters.category);
  if (filters.status) opportunities = opportunities.filter(o => o.status === filters.status);
  return opportunities.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getOpportunity(oppId) {
  const snap = await get(ref(db, `opportunities/${oppId}`));
  if (!snap.exists()) return null;
  const opp = { oppId, ...snap.val() };
  // Enrich with poster profile
  const posterSnap = await get(ref(db, `users/${opp.postedBy}`));
  if (!posterSnap.exists()) {
    const compSnap = await get(ref(db, `companies/${opp.postedBy}`));
    opp.poster = compSnap.exists() ? { uid: opp.postedBy, ...compSnap.val() } : null;
  } else {
    opp.poster = { uid: opp.postedBy, ...posterSnap.val() };
  }
  return opp;
}

export async function expressInterest(oppId, userId, interestData) {
  if (!oppId || !userId) throw new Error('oppId and userId are required');

  // Prevent duplicate interests
  const existingSnap = await get(ref(db, `opportunity_interests/${oppId}/${userId}`));
  if (existingSnap.exists()) throw new Error('You have already expressed interest in this opportunity');

  const interest = {
    userId,
    oppId,
    status: 'PENDING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...interestData
  };

  await set(ref(db, `opportunity_interests/${oppId}/${userId}`), interest);

  // Mirror to user's interests for quick lookup
  await set(ref(db, `user_interests/${userId}/${oppId}`), {
    oppId,
    status: 'PENDING',
    sentAt: Date.now()
  });

  // Increment interest count
  const oppRef = ref(db, `opportunities/${oppId}`);
  const oppSnap = await get(oppRef);
  if (oppSnap.exists()) {
    await update(oppRef, { interestCount: (oppSnap.val().interestCount || 0) + 1 });
  }

  return interest;
}

export async function updateInterestStatus(oppId, userId, newStatus) {
  const validStatuses = ['PENDING', 'ACCEPTED', 'IN_DISCUSSION', 'DECLINED'];
  if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);

  await update(ref(db, `opportunity_interests/${oppId}/${userId}`), {
    status: newStatus,
    updatedAt: Date.now()
  });

  await update(ref(db, `user_interests/${userId}/${oppId}`), {
    status: newStatus,
    updatedAt: Date.now()
  });

  return true;
}

export async function getOpportunityInterests(oppId) {
  const snap = await get(ref(db, `opportunity_interests/${oppId}`));
  const interests = [];
  if (snap.exists()) {
    for (const [uid, data] of Object.entries(snap.val())) {
      const userSnap = await get(ref(db, `users/${uid}`));
      let profile = userSnap.exists() ? { uid, ...userSnap.val() } : null;
      if (!profile) {
        const compSnap = await get(ref(db, `companies/${uid}`));
        profile = compSnap.exists() ? { uid, ...compSnap.val() } : { uid, name: 'Unknown' };
      }
      interests.push({ ...data, user: profile });
    }
  }
  return interests.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUserInterests(userId) {
  const snap = await get(ref(db, `user_interests/${userId}`));
  const interests = [];
  if (snap.exists()) {
    for (const [oid, data] of Object.entries(snap.val())) {
      const oppSnap = await get(ref(db, `opportunities/${oid}`));
      const oppDetails = oppSnap.exists() ? { oppId: oid, ...oppSnap.val() } : { oppId: oid, title: 'Deleted Opportunity' };
      interests.push({ ...data, opportunity: oppDetails });
    }
  }
  return interests.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
}

export async function closeOpportunity(oppId, userId) {
  const oppSnap = await get(ref(db, `opportunities/${oppId}`));
  if (!oppSnap.exists()) throw new Error('Opportunity not found');
  if (oppSnap.val().postedBy !== userId) throw new Error('Only the poster can close this opportunity');
  await update(ref(db, `opportunities/${oppId}`), { status: 'closed', updatedAt: Date.now() });
  return true;
}
