'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './components/LanguageSwitcher';

const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=1475280862768529498&permissions=2147568640&integration_type=0&scope=bot+applications.commands`;

export default function LandingPage() {
  const t = useTranslations();

  const FEATURES = [
    { icon: '🗺️', title: t('landing.feature_0_title'), desc: t('landing.feature_0_desc') },
    { icon: '⏱️', title: t('landing.feature_1_title'), desc: t('landing.feature_1_desc') },
    { icon: '🤖', title: t('landing.feature_2_title'), desc: t('landing.feature_2_desc') },
    { icon: '🛡️', title: t('landing.feature_3_title'), desc: t('landing.feature_3_desc') },
  ];

  const COMMANDS = [
    { name: '/setup', desc: t('landing.cmd_0_desc') },
    { name: '/role',  desc: t('landing.cmd_1_desc') },
    { name: '/scout', desc: t('landing.cmd_2_desc') },
    { name: '/mapa',  desc: t('landing.cmd_3_desc') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', fontFamily: 'system-ui, sans-serif', color: '#e0e0e0' }}>
      <style>{`
        .ut-hero-logo {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          cursor: default;
          border-radius: 16px;
          padding: 12px 24px;
          transition: filter 0.25s ease, box-shadow 0.25s ease;
        }
        .ut-hero-logo:hover {
          filter: drop-shadow(0 0 18px rgba(88,101,242,0.75)) drop-shadow(0 0 40px rgba(88,101,242,0.40));
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 56,
      }}>
        <img
            src="/brand/icon.png"
            alt="Ultimate Tracker"
            height={44}
            style={{ display: 'block', width: 'auto' }}
          />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <LanguageSwitcher />
          <Link
            href="/pricing"
            style={{
              fontSize: 13, fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
              padding: '6px 4px',
            }}
          >
            {t('nav.pricing')}
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 13, fontWeight: 700,
              background: '#5865F2', color: '#fff',
              padding: '7px 18px', borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            {t('nav.login')}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        padding: '100px 24px 80px',
      }}>
        {/* Hero logo */}
        <div className="ut-hero-logo" style={{ marginBottom: 32 }}>
          <img src="/brand/UltimateTracker.png" alt="Ultimate Tracker" style={{ display: 'block', width: 'min(520px, 80vw)', height: 'auto' }} />
        </div>

        <div style={{
          display: 'inline-block',
          background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.3)',
          borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#8a93f5',
          marginBottom: 24, fontWeight: 600, letterSpacing: 0.5,
        }}>
          {t('landing.badge')}
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px', color: '#fff', maxWidth: 700 }}>
          {t('landing.hero_h1_a')}<br />
          <span style={{ color: '#5865F2' }}>{t('landing.hero_h1_b')}</span>
        </h1>
        <p style={{ fontSize: 17, color: '#777', maxWidth: 500, lineHeight: 1.6, margin: '0 0 40px' }}>
          {t('landing.hero_p')}
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href={BOT_INVITE}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#5865F2', color: '#fff',
              padding: '13px 28px', borderRadius: 10,
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(88,101,242,0.35)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
            </svg>
            {t('landing.cta_discord')}
          </a>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '60px 32px', maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 48 }}>
          {t('landing.features_h2')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: '#111116', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '26px 22px',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMANDS */}
      <section style={{ padding: '60px 32px', maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
          {t('landing.commands_h2')}
        </h2>
        <p style={{ textAlign: 'center', color: '#555', fontSize: 14, marginBottom: 40 }}>
          {t('landing.commands_subtitle')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {COMMANDS.map((c) => (
            <div
              key={c.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: '#111116', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '14px 20px',
              }}
            >
              <code style={{
                background: 'rgba(88,101,242,0.15)', color: '#8a93f5',
                border: '1px solid rgba(88,101,242,0.25)',
                borderRadius: 6, padding: '3px 10px', fontSize: 13, fontWeight: 700,
                flexShrink: 0,
              }}>
                {c.name}
              </code>
              <span style={{ fontSize: 13, color: '#777' }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center', padding: '28px 24px',
        fontSize: 12, color: '#444',
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/pricing" style={{ color: '#555', textDecoration: 'none' }}>{t('nav.pricing')}</Link>
          <Link href="/login" style={{ color: '#555', textDecoration: 'none' }}>{t('nav.login')}</Link>
        </div>
        {t('common.footer_legal')}
      </footer>
    </div>
  );
}

