import React from 'react';
import { Layers, Disc, ArrowRight, Sun, Moon } from 'lucide-react';
import type { Theme } from '../utils/theme';

interface LandingPageProps {
  onEnter: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, theme, onToggleTheme }) => {
  return (
    <div className="landing-container" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--bg-studio)',
      color: 'var(--text-main)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Dynamic Grid Background Accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'var(--studio-grid)',
        backgroundSize: '30px 30px',
        pointerEvents: 'none'
      }} />

      {/* Brand & Entrance Info Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '80px',
        zIndex: 2,
        position: 'relative',
        maxWidth: '800px',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Tiny Studio tag */}
        <div className="animate-fade-up" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: '24px',
          animationDelay: '0.1s'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            backgroundColor: 'var(--text-main)',
            display: 'inline-block'
          }} />
          Developer-Grade Print Engine v1.0.0
        </div>

        {/* Title / Logo Image */}
        <div className="animate-fade-up" style={{ marginBottom: '24px', animationDelay: '0.2s' }}>
          <img 
            src="/logo.png" 
            alt="Design Customs Logo" 
            style={{ 
              maxWidth: '500px', 
              width: '100%', 
              height: 'auto',
              // Invert the black logo for dark mode so it's visible
              filter: theme === 'dark' ? 'invert(1) brightness(1.2)' : 'none'
            }} 
          />
        </div>

        {/* Subtitle */}
        <p className="animate-fade-up" style={{
          fontSize: '1.1rem',
          color: 'var(--text-muted)',
          maxWidth: '520px',
          lineHeight: '1.6',
          marginBottom: '40px',
          fontWeight: 300,
          animationDelay: '0.3s',
          textAlign: 'justify'
        }}>
          Multi-tool For Brands and indie creators.
          <br /><br />
          "Design Customs" is a concept for a web platform that helps you customize your brand. The idea for the brand itself comes from the lack of similar products on the market that gives you full control of the design process and makes it easy and interactive.
          <br /><br />
          Combining clothing with customization, print ready color palette and affordability.
        </p>

        {/* Enter Studio CTA */}
        <button 
          onClick={onEnter}
          className="enter-button animate-fade-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'center',
            gap: '12px',
            backgroundColor: 'var(--text-main)',
            color: 'var(--bg-studio)',
            padding: '16px 32px',
            fontSize: '0.95rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            border: '2px solid transparent',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
            animationDelay: '0.4s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-studio)';
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.borderColor = 'var(--cmyk-magenta)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(255,0,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--text-main)';
            e.currentTarget.style.color = 'var(--bg-studio)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Enter Customizer Studio
          <ArrowRight size={18} />
        </button>

        {/* Specs Grid */}
        <div className="animate-fade-up" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginTop: '64px',
          borderTop: '1px solid var(--border-muted)',
          paddingTop: '32px',
          animationDelay: '0.5s'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', marginBottom: '8px' }}>
              <Layers size={16} color="var(--cmyk-magenta)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CMYK Stack Layering</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Compile base hues, vector overlays, patterns, and dynamic high-res image stacks exactly.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', marginBottom: '8px' }}>
              <Disc size={16} color="var(--cmyk-yellow)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vector Canvas Mod</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Seamless drag-and-drop overlays, scaling, rotations, and custom color-tint SVG filters.
            </p>
          </div>
        </div>
      </div>

      {/* Theme Toggle & CMYK Corner Labels */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        zIndex: 10
      }}>
        <button
          onClick={onToggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-studio)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-main)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ color: 'var(--cmyk-cyan)' }}>C: 100%</span>
          <span style={{ color: 'var(--cmyk-magenta)' }}>M: 100%</span>
          <span style={{ color: 'var(--cmyk-yellow)' }}>Y: 100%</span>
          <span style={{ color: 'var(--text-main)' }}>K: 100%</span>
        </div>
      </div>
    </div>
  );
};
