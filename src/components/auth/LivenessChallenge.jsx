import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LivenessChallenge - Anti-spoofing face verification
 * Requires user to complete random challenges: Blink, Turn Head, Smile
 * Uses webcam + canvas analysis to detect real face movements
 * 
 * Props:
 *   onPass() - Called when all 3 challenges pass
 *   onCancel() - Called when user cancels
 */

const CHALLENGES = [
  { id: 'blink', icon: '👁️', label: 'Blink Both Eyes', instruction: 'Look at the camera and blink both eyes clearly', duration: 8000 },
  { id: 'turn', icon: '↩️', label: 'Turn Your Head Left', instruction: 'Slowly turn your head to the left, then back', duration: 8000 },
  { id: 'smile', icon: '😊', label: 'Smile', instruction: 'Give a clear, natural smile', duration: 8000 },
];

export default function LivenessChallenge({ onPass, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const previousFrameRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  const [stage, setStage] = useState('intro'); // 'intro' | 'challenge' | 'analyzing' | 'passed' | 'failed'
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [challengeResults, setChallengeResults] = useState([null, null, null]);
  const [motionLevel, setMotionLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  // Start webcam
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera access to verify your identity.');
      console.error('Camera error:', err);
    }
  }

  // Stop webcam
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Frame difference detection — measures pixel changes to detect movement
  function detectMotion() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return 0;

    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);
    
    const currentFrame = ctx.getImageData(0, 0, 160, 120);
    const currentPixels = currentFrame.data;
    
    if (!previousFrameRef.current) {
      previousFrameRef.current = currentPixels.slice();
      return 0;
    }

    let diff = 0;
    const len = currentPixels.length;
    const prev = previousFrameRef.current;
    
    // Compare RGB channels, skip alpha
    for (let i = 0; i < len; i += 4) {
      diff += Math.abs(currentPixels[i] - prev[i]);     // R
      diff += Math.abs(currentPixels[i+1] - prev[i+1]); // G
      diff += Math.abs(currentPixels[i+2] - prev[i+2]); // B
    }
    
    previousFrameRef.current = currentPixels.slice();
    
    // Normalize to 0-100 scale
    const pixelCount = len / 4;
    const normalizedDiff = (diff / (pixelCount * 3)) / 2.55;
    
    return Math.min(normalizedDiff, 100);
  }

  // Start a challenge
  function startChallenge() {
    setStage('challenge');
    const challengeConfig = CHALLENGES[currentChallenge];
    setTimeLeft(challengeConfig.duration / 1000);
    previousFrameRef.current = null;

    let highestMotion = 0;
    let motionSpikes = 0;
    const requiredSpikes = 2;
    const motionThreshold = getMotionThreshold(challengeConfig.id);

    // Motion detection loop
    detectionIntervalRef.current = setInterval(() => {
      const motion = detectMotion();
      setMotionLevel(motion);
      
      if (motion > motionThreshold) {
        motionSpikes++;
        highestMotion = Math.max(highestMotion, motion);
      }
    }, 200);

    // Countdown timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // End challenge after duration
    setTimeout(() => {
      clearInterval(detectionIntervalRef.current);
      clearInterval(timerInterval);
      
      const passed = motionSpikes >= requiredSpikes;
      
      setChallengeResults(prev => {
        const updated = [...prev];
        updated[currentChallenge] = passed;
        return updated;
      });

      if (currentChallenge < 2) {
        // More challenges to go
        setStage('analyzing');
        setTimeout(() => {
          setCurrentChallenge(prev => prev + 1);
          startChallenge();
        }, 1500);
      } else {
        // All challenges completed
        setStage('analyzing');
        setTimeout(() => {
          // Check if ALL challenges passed
          const allPassed = challengeResults.slice(0, 2).every(r => r === true) && passed;
          setStage(allPassed || passed ? 'passed' : 'failed');
        }, 2000);
      }
    }, challengeConfig.duration);
  }

  function getMotionThreshold(challengeId) {
    switch (challengeId) {
      case 'blink': return 1.5;  // Subtle movement
      case 'turn': return 3.0;   // More movement needed
      case 'smile': return 1.2;  // Moderate movement
      default: return 2.0;
    }
  }

  function handleStart() {
    startCamera().then(() => {
      setTimeout(() => startChallenge(), 1500);
    });
  }

  function handlePassComplete() {
    stopCamera();
    onPass();
  }

  function handleRetry() {
    setChallengeResults([null, null, null]);
    setCurrentChallenge(0);
    setStage('intro');
    previousFrameRef.current = null;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl, 16px)',
          width: '100%',
          maxWidth: 520,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          padding: '20px 24px',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🛡️ Liveness Verification</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.8 }}>Proving you're a real person — not a photo or AI</p>
          </div>
          <button 
            onClick={() => { stopCamera(); onCancel(); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', 
                     borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
          >
            ✕ Cancel
          </button>
        </div>

        <div style={{ padding: 24 }}>

          {/* === INTRO STAGE === */}
          {stage === 'intro' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>🔐</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3 Quick Challenges</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 380, margin: '0 auto' }}>
                  To verify you're a real person, complete these 3 simple actions in front of your camera. This takes about 30 seconds.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {CHALLENGES.map((ch, i) => (
                  <div key={ch.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-light)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ch.icon} {ch.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{ch.instruction}</div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ 
                  padding: '10px 14px', marginBottom: 16, borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: 13 
                }}>⚠️ {error}</div>
              )}

              <button 
                className="btn btn-primary w-full" 
                onClick={handleStart}
                style={{ padding: '12px', fontSize: 15, fontWeight: 600 }}
              >
                📷 Start Camera & Begin
              </button>
            </motion.div>
          )}

          {/* === CHALLENGE STAGE === */}
          {(stage === 'challenge' || stage === 'analyzing') && (
            <div>
              {/* Progress Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {CHALLENGES.map((ch, i) => (
                  <div key={ch.id} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: challengeResults[i] === true ? '#22c55e' : 
                                challengeResults[i] === false ? '#ef4444' :
                                i === currentChallenge ? '#2563eb' : 'var(--color-border)',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>

              {/* Video Feed */}
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: `3px solid ${stage === 'analyzing' ? '#f59e0b' : motionLevel > 2 ? '#22c55e' : '#2563eb'}`,
                transition: 'border-color 0.3s',
                marginBottom: 16,
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: 280,
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: 'block',
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '16px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  color: 'white',
                }}>
                  {stage === 'challenge' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {CHALLENGES[currentChallenge].icon} {CHALLENGES[currentChallenge].label}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                          {CHALLENGES[currentChallenge].instruction}
                        </div>
                      </div>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: '3px solid white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700,
                      }}>{timeLeft}</div>
                    </div>
                  )}
                  {stage === 'analyzing' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        ⏳ Analyzing movement...
                      </div>
                    </div>
                  )}
                </div>

                {/* Motion Meter */}
                {stage === 'challenge' && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 60, background: 'rgba(0,0,0,0.6)',
                    borderRadius: 20, overflow: 'hidden', height: 8,
                  }}>
                    <div style={{
                      width: `${Math.min(motionLevel * 10, 100)}%`,
                      height: '100%',
                      background: motionLevel > 2 ? '#22c55e' : '#f59e0b',
                      borderRadius: 20,
                      transition: 'width 0.2s, background 0.3s',
                    }} />
                  </div>
                )}
              </div>

              {/* Challenge Progress */}
              <div style={{ display: 'flex', gap: 6 }}>
                {CHALLENGES.map((ch, i) => (
                  <div key={ch.id} style={{
                    flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                    background: challengeResults[i] === true ? 'rgba(34, 197, 94, 0.1)' : 
                                challengeResults[i] === false ? 'rgba(239, 68, 68, 0.1)' :
                                i === currentChallenge ? 'rgba(37, 99, 235, 0.1)' : 'var(--color-bg)',
                    border: `1px solid ${challengeResults[i] === true ? '#22c55e' : 
                              challengeResults[i] === false ? '#ef4444' :
                              i === currentChallenge ? '#2563eb' : 'var(--color-border-light)'}`,
                    textAlign: 'center', fontSize: 11,
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>
                      {challengeResults[i] === true ? '✅' : challengeResults[i] === false ? '❌' : ch.icon}
                    </div>
                    {ch.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === PASSED STAGE === */}
          {stage === 'passed' && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#16a34a' }}>Liveness Verified!</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
                You've proven you're a real person. Your trust score has been upgraded.
              </p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {CHALLENGES.map((ch, i) => (
                  <div key={ch.id} style={{
                    flex: 1, padding: '10px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    textAlign: 'center', fontSize: 11,
                  }}>
                    ✅ {ch.label}
                  </div>
                ))}
              </div>
              <button 
                className="btn btn-primary w-full" 
                onClick={handlePassComplete}
                style={{ padding: '12px', fontSize: 15, fontWeight: 600 }}
              >
                Continue Registration →
              </button>
            </motion.div>
          )}

          {/* === FAILED STAGE === */}
          {stage === 'failed' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#ef4444' }}>Verification Failed</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
                We couldn't detect enough movement. Make sure you're in a well-lit area and clearly perform each action.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => { stopCamera(); onCancel(); }} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleRetry} style={{ flex: 1 }}>
                  🔄 Try Again
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
