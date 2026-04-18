import React, { useState } from 'react';

const AI_BACKEND_URL = 'http://localhost:3001';

export default function ContextualAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch(`${AI_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      if (data.reply) {
        setResponse(data.reply);
      } else {
        setError('AI returned an empty response. Please try again.');
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Cannot reach AI backend. Make sure the server is running on port 3001.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <>
      {/* Floating AI Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 0,
        }}
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* Chat Widget */}
      {isOpen && (
        <div
          className="suggestion-panel slide-up"
          style={{
            position: 'fixed', bottom: '90px', right: '24px',
            width: '340px', zIndex: 9998,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            margin: 0,
          }}
        >
          <div className="suggestion-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Nexalink Assistant</span>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            {error && <div className="form-error" style={{ marginBottom: '12px' }}>{error}</div>}

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Ask anything about your profile or network:
              </label>
              <textarea
                className="form-input"
                placeholder="E.g., How can I improve my headline?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                style={{ resize: 'none', fontSize: '13px' }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="btn btn-primary btn-full shadow-sm"
              style={{ padding: '8px' }}
            >
              {isGenerating ? 'Thinking...' : 'Ask AI'}
            </button>

            {response && (
              <div style={{
                marginTop: '12px', padding: '12px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-primary)',
              }}>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {response}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
