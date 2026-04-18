from fastapi import APIRouter, HTTPException, Query
from config.firebase_config import db
from datetime import datetime, timedelta
import math

router = APIRouter(prefix="/feed", tags=["feed"])

@router.get("/ranked")
async def get_ranked_feed(uid: str, limit: int = 20):
    """
    Retrieves and ranks posts based on trust, engagement, and recency.
    Ranking Score = (Engagement * TrustModifier) / (TimeDecay)
    """
    try:
        # Fetch connections for current user to filter feed
        connected_ids = [uid]
        if uid and uid != 'anonymous':
            conns_ref = db.child(f'user_connections/{uid}').get()
            if conns_ref and isinstance(conns_ref, dict):
                connected_ids.extend(list(conns_ref.keys()))

        posts = []
        if posts_ref:
            # posts_ref is dict: { "userId": { "postId": { postData }, ... } }
            for user_id, user_posts in posts_ref.items():
                if uid != 'anonymous' and user_id not in connected_ids:
                    continue  # EXCLUSIVE Connections Feed filter
                if isinstance(user_posts, dict):
                    for pid, p in user_posts.items():
                        if isinstance(p, dict):
                            p['postId'] = pid
                            p['authorId'] = user_id
                            posts.append(p)

        if not posts:
            return []

        # Ranking Algorithm
        now = datetime.now()
        
        def calculate_score(post):
            # Trust Modifier (0.5 to 1.5)
            badge = post.get('authorTrustBadge', 'NEW')
            trust_mod = 1.0
            if badge == 'HIGH_TRUST': trust_mod = 1.5
            elif badge == 'TRUSTED': trust_mod = 1.3
            elif badge == 'VERIFIED': trust_mod = 1.1
            
            # Engagement Score
            likes = post.get('likesCount', 0)
            comments = post.get('commentsCount', 0)
            engagement = (likes * 1) + (comments * 2) + 1 # +1 to avoid 0
            
            # Time Decay (Gravity = 1.5)
            created_at = post.get('createdAt')
            if created_at:
                # Milliseconds timestamp from JS
                hours_ago = (now.timestamp() * 1000 - created_at) / 3600000
            else:
                hours_ago = 1
            
            # Ensure hours_ago is not negative
            hours_ago = max(0, hours_ago)
            decay = math.pow(hours_ago + 2, 1.5)
            
            return (engagement * trust_mod) / decay

        # Sort by calculated score
        posts.sort(key=calculate_score, reverse=True)

        return posts[:limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
