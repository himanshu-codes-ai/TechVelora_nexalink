import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Avatar from '../shared/Avatar';
import TrustBadge from '../shared/TrustBadge';
import { useAuth } from '../../contexts/AuthContext';
import { likePost, addComment, getComments } from '../../services/realtimeService';

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function PostCard({ post, onUpdate }) {
  const { currentUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  async function handleLike() {
    if (!currentUser) return;
    try {
      const isLiked = await likePost(post.postId, currentUser.uid, post.authorId);
      setLiked(isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('Error liking post:', err);
    }
  }

  async function handleToggleComments() {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const data = await getComments(post.postId, post.authorId);
        setComments(data);
      } catch (err) {
        console.error('Error loading comments:', err);
      }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  }

  async function handleAddComment() {
    if (!commentText.trim() || !currentUser) return;
    try {
      await addComment(post.postId, {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'User',
        content: commentText.trim()
      }, post.authorId);
      setComments(prev => [...prev, {
        commentId: Date.now().toString(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'User',
        content: commentText.trim(),
        createdAt: { toDate: () => new Date() }
      }]);
      setCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  }

  return (
    <motion.div
      className="post-card fade-in"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="post-header">
        <Avatar 
          src={post.authorAvatar} 
          name={post.authorName || 'User'} 
          size="md" 
        />
        <div className="post-author-info">
          <div className="post-author-name">
            {post.authorName || 'Anonymous'}
            {post.authorTrustBadge && (
              <TrustBadge badge={post.authorTrustBadge} />
            )}
          </div>
          <div className="post-author-headline">{post.authorHeadline || ''}</div>
          <div className="post-timestamp">{timeAgo(post.createdAt)}</div>
        </div>
        {post.postType && (
          <span className="badge badge-verified" style={{ fontSize: '11px' }}>
            {post.postType === 'achievement' ? '🏆' : 
             post.postType === 'project' ? '🚀' :
             post.postType === 'certification' ? '📜' :
             post.postType === 'milestone' ? '🎉' : '📢'} 
            {post.postType}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="post-content">
        {post.content}
      </div>

      {/* Media */}
      {post.mediaUrl && (
        <img src={post.mediaUrl} alt="Post media" className="post-media" />
      )}

      {/* Stats */}
      <div className="post-stats">
        <span>{likesCount > 0 ? `👍 ${likesCount} likes` : ''}</span>
        <span>
          {(post.commentsCount || 0) > 0 ? `${post.commentsCount} comments` : ''}
          {(post.repostsCount || 0) > 0 ? ` · ${post.repostsCount} reposts` : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="post-actions">
        <button 
          className={`post-action-btn ${liked ? 'liked' : ''}`} 
          onClick={handleLike}
          id={`like-btn-${post.postId}`}
        >
          {liked ? '👍' : '👍'} Like
        </button>
        <button 
          className="post-action-btn" 
          onClick={handleToggleComments}
          id={`comment-btn-${post.postId}`}
        >
          💬 Comment
        </button>
        <button className="post-action-btn" id={`repost-btn-${post.postId}`}>
          🔄 Repost
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comment-section fade-in">
          <div className="comment-input-row">
            <Avatar name={currentUser?.displayName || 'U'} size="xs" />
            <input
              className="comment-input"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button 
              className="btn btn-sm btn-primary" 
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              Post
            </button>
          </div>
          {loadingComments ? (
            <div className="text-sm text-muted text-center p-4">Loading comments...</div>
          ) : (
            comments.map(comment => (
              <div className="comment-item" key={comment.commentId}>
                <Avatar name={comment.authorName} size="xs" />
                <div className="comment-bubble">
                  <div className="comment-author">{comment.authorName}</div>
                  <div className="comment-text">{comment.content}</div>
                  <div className="comment-time">{timeAgo(comment.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
