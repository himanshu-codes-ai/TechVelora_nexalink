import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function FresherWaitlistPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
          color: 'white'
        }}
      >
        {/* Icon */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: 64, marginBottom: 24 }}
        >
          🚀
        </motion.div>

        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          You're on the <span style={{ color: '#818cf8' }}>Nexalink Waitlist</span>
        </h1>

        <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.7, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
          Nexalink is an <strong>experienced professionals only</strong> platform. 
          We require at least <strong>1 year</strong> of professional experience to join.
        </p>

        {/* What You Can Do */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 28,
          textAlign: 'left',
          marginBottom: 32
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            📚 While You Wait — Level Up
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '💻', title: 'Build Real Projects', desc: 'Contribute to open-source or build portfolio projects on GitHub.' },
              { icon: '📜', title: 'Get Certified', desc: 'AWS, Google Cloud, or industry certifications boost your credibility.' },
              { icon: '🤝', title: 'Find Internships', desc: 'Gain professional experience through internships or freelance work.' },
              { icon: '🎯', title: 'Come Back Stronger', desc: 'Once you have 1+ year of experience, register and join the verified community.' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
              >
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-secondary" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
            ← Try Again
          </Link>
          <Link to="/login" className="btn btn-primary">
            Sign In (Returning Pro)
          </Link>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.4 }}>
          Nexalink — The World's Most Trusted Professional Network
        </p>
      </motion.div>
    </div>
  );
}
