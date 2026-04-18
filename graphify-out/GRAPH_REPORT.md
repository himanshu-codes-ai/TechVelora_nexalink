# Graph Report - C:\TechVelora_nexalink  (2026-04-19)

## Corpus Check
- 51 files · ~25,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 202 nodes · 220 edges · 30 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 21 edges
2. `calculateTrustScore()` - 10 edges
3. `clamp()` - 8 edges
4. `uploadFile()` - 6 edges
5. `logCoinTransaction()` - 5 edges
6. `ReferralPage()` - 4 edges
7. `verifyReferral()` - 4 edges
8. `PostCard()` - 3 edges
9. `ShareModal()` - 3 edges
10. `MilestoneTracker()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [INFERRED]
  C:\TechVelora_nexalink\src\App.jsx → C:\TechVelora_nexalink\src\contexts\AuthContext.jsx
- `PublicRoute()` --calls--> `useAuth()`  [INFERRED]
  C:\TechVelora_nexalink\src\App.jsx → C:\TechVelora_nexalink\src\contexts\AuthContext.jsx
- `CreatePostModal()` --calls--> `useAuth()`  [INFERRED]
  C:\TechVelora_nexalink\src\components\feed\CreatePostModal.jsx → C:\TechVelora_nexalink\src\contexts\AuthContext.jsx
- `PostCard()` --calls--> `useAuth()`  [INFERRED]
  C:\TechVelora_nexalink\src\components\feed\PostCard.jsx → C:\TechVelora_nexalink\src\contexts\AuthContext.jsx
- `Navbar()` --calls--> `useAuth()`  [INFERRED]
  C:\TechVelora_nexalink\src\components\layout\Navbar.jsx → C:\TechVelora_nexalink\src\contexts\AuthContext.jsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (18): ProtectedRoute(), PublicRoute(), useAuth(), CreatePostModal(), EventsPage(), HomePage(), JobsPage(), LoginPage() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (0): 

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (3): getConnections(), getPendingRequests(), getUser()

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (13): LeaderboardPage(), MilestoneTracker(), ReferralPage(), getTierLabel(), logCoinTransaction(), checkAndAwardMilestones(), getMilestones(), getNextMilestone() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (10): assignReferralCode(), buildReferralLink(), buildShareText(), calculateTier(), findUserByReferralCode(), generateReferralCode(), recordReferral(), updateLeaderboard() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.26
Nodes (14): TrustBadge(), calculateAccountAge(), calculateCompanyTrustScore(), calculateConnectionsScore(), calculateConsistency(), calculateEmailVerified(), calculateEngagementScore(), calculateExperienceScore() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (6): uploadAvatar(), uploadCompanyLogo(), uploadEventImage(), uploadFile(), uploadPostMedia(), uploadResume()

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (6): BaseModel, Event, Job, Post, TrustSignal, UserProfile

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): initialize_firebase(), Initializes Firebase Admin SDK with Realtime Database.

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (2): get_ranked_feed(), Retrieves and ranks posts based on trust, engagement, and recency.     Ranking

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (2): calculate_trust_score(), get_badge()

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (2): PostCard(), timeAgo()

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **2 isolated node(s):** `Initializes Firebase Admin SDK with Realtime Database.`, `Retrieves and ranks posts based on trust, engagement, and recency.     Ranking`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (2 nodes): `ContextualAIAssistant.jsx`, `ContextualAIAssistant()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `ConnectionCard.jsx`, `ConnectionCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `EventCard.jsx`, `EventCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `JobCard.jsx`, `JobCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `LeaderboardTable.jsx`, `LeaderboardTable()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `RewardCatalog.jsx`, `RewardCatalog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `Avatar()`, `Avatar.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `EmptyState.jsx`, `EmptyState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `Modal.jsx`, `Modal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Skeleton.jsx`, `Skeleton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `TrustScoreWidget.jsx`, `TrustScoreWidget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `server.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `firebase.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 0` to `Community 3`, `Community 12`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `ReferralPage()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `getTierLabel()` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `useAuth()` (e.g. with `ProtectedRoute()` and `PublicRoute()`) actually correct?**
  _`useAuth()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Initializes Firebase Admin SDK with Realtime Database.`, `Retrieves and ranks posts based on trust, engagement, and recency.     Ranking` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._