import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function ContextualAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    setResponse('');
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setError('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `SYSTEM CONTEXT: You are an AI assistant built for the Nexalink professional network. Give highly concise, actionable professional advice. The user is currently browsing the ${location.pathname} page.\n\nUSER QUESTION: ${prompt}` }]
          }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7
          }
        })
      });
      
      const data = await res.json();

      if (!res.ok || data.error) {
        const code = data?.error?.code || res.status;
        const msg = data?.error?.message || `API returned status ${res.status}`;
        if (code === 429) {
          throw new Error('Rate limit reached. Please wait a moment and try again.');
        }
        throw new Error(msg);
      }
      
      if (data.candidates && data.candidates.length > 0) {
        const text = data.candidates[0]?.content?.parts?.[0]?.text;
        if (text) {
          setResponse(text);
        } else {
          setError('AI returned an empty response. Please try rephrasing your question.');
        }
      } else {
        setError('No response generated. The request may have been filtered.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to AI. Please check your API key and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Circle bottom right icon - Floating on all pages */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 0
        }}
      >
        {isOpen ? '✕' : '✨'}
      </button>

      {/* Widget Container */}
      {isOpen && (
        <div 
          className="suggestion-panel slide-up"
          style={{
            position: 'fixed', bottom: '90px', right: '24px',
            width: '320px', zIndex: 9998,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            margin: 0
          }}
        >
          <div className="suggestion-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Nexalink Assistant</span>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            {error && <div className="form-error" style={{ marginBottom: '16px' }}>{error}</div>}
            
            {/* Real Text Input */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Ask anything about your profile or network:
              </label>
              <textarea 
                className="form-input" 
                placeholder="E.g., How can I improve my headline?" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
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
              {isGenerating ? 'Analyzing...' : 'Ask AI'}
            </button>

            {/* Response Area */}
            {response && (
              <div style={{
                marginTop: '16px', padding: '12px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-primary)'
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
