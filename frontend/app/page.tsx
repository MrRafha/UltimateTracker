'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Inter } from 'next/font/google';
import { useEffect, useRef } from 'react';
import FloatingLangSwitcher from './components/FloatingLangSwitcher';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] });

const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=1475280862768529498&permissions=2147568640&integration_type=0&scope=bot+applications.commands`;
const PAYPAL_DONATE_URL = process.env.NEXT_PUBLIC_PAYPAL_DONATE_URL ?? 'https://www.paypal.com/donate/?business=S53JLJTYQN3FL&no_recurring=0&item_name=help+me+to+keep+the+servers+on&currency_code=USD';
const DISCORD_SERVER_URL = process.env.NEXT_PUBLIC_DISCORD_SERVER_URL ?? 'https://discord.com/invite/kekQ2qSyEY';
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? 'https://github.com/MrRafha/UltimateTracker';

export default function LandingPage() {
  const t = useTranslations();
  const videoRef = useRef<HTMLIFrameElement>(null);

  const FEATURES = [
    { title: t('landing.feature_1_title'), desc: t('landing.feature_1_desc') },
    { title: t('landing.feature_2_title'), desc: t('landing.feature_2_desc') },
    { title: t('landing.feature_0_title'), desc: t('landing.feature_0_desc') },
  ];

  const COMMANDS = [
    { name: '/setup', desc: t('landing.cmd_0_desc') },
    { name: '/role',  desc: t('landing.cmd_1_desc') },
    { name: '/scout', desc: t('landing.cmd_2_desc') },
    { name: '/mapa',  desc: t('landing.cmd_3_desc') },
  ];

  // Intersection Observer para animações de scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Intersection Observer para autoplay do vídeo
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Inicia o vídeo quando entra no viewport
            const iframe = videoElement;
            const src = iframe.src;
            if (!src.includes('autoplay=1')) {
              iframe.src = src.replace('autoplay=0', 'autoplay=1');
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(videoElement);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={inter.className} style={{ minHeight: '100vh', background: '#0D0D0D', color: '#E0E0E0', scrollBehavior: 'smooth' }}>
      <style>{`
        html { scroll-behavior: smooth; }
        
        /* Animações de scroll */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .animate-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .ut-cta-primary { 
          display: flex; align-items: center; gap: 10px; 
          background: #5865F2; color: #fff; 
          padding: 12px 20px; border-radius: 10px; 
          font-size: 15px; font-weight: 700; text-decoration: none; 
          box-shadow: 0 4px 24px rgba(88,101,242,.35); 
          transition: opacity .15s ease; 
        }
        .ut-cta-primary:hover { opacity: .88; }
        .ut-cta-secondary { 
          display: flex; align-items: center; gap: 10px; 
          background: transparent; color: #E0E0E0; 
          padding: 12px 20px; border-radius: 10px; 
          font-size: 15px; font-weight: 700; text-decoration: none; 
          border: 1.5px solid #1F1F1F; 
          transition: border-color .15s ease, color .15s ease; 
        }
        .ut-cta-secondary:hover { border-color: rgba(255,255,255,.45); color: #fff; }
        .ut-commands-grid { 
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; 
        }
        @media(max-width: 560px) { .ut-commands-grid { grid-template-columns: 1fr; } }
        .ut-footer-icon { 
          display: inline-flex; align-items: center; justify-content: center; 
          width: 38px; height: 38px; border-radius: 10px; 
          background: #111111; border: 1px solid #1F1F1F; 
          transition: background .15s ease, border-color .15s ease; 
          color: #8A8A8A; 
        }
        .ut-footer-icon:hover { background: rgba(88,101,242,0.1); border-color: #5865F2; color: #E0E0E0; }
        .ut-nav-link { 
          font-size: 13px; font-weight: 600; 
          color: #8A8A8A; text-decoration: none; 
          padding: 6px 4px; transition: color .15s ease; 
        }
        .ut-nav-link:hover { color: #E0E0E0; }
        .ut-footer-nav-link {
          font-size: 14px; font-weight: 500;
          color: #8A8A8A; text-decoration: none;
          transition: color .15s ease;
        }
        .ut-footer-nav-link:hover { color: #FFFFFF; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1F1F1F',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/brand/icon.png"
            alt="Ultimate Tracker"
            height={34}
            style={{ display: 'block', width: 'auto' }}
          />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>UltimateTracker</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href={DISCORD_SERVER_URL} target="_blank" rel="noreferrer" className="ut-nav-link">
            Discord
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="ut-nav-link">
            GitHub
          </a>
          <Link
            href="/login"
            style={{
              fontSize: 13, fontWeight: 700,
              background: '#5865F2', color: '#fff',
              padding: '7px 18px', borderRadius: 10,
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
        <div style={{
          display: 'inline-block',
          background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.3)',
          borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#8a93f5',
          marginBottom: 24, fontWeight: 600, letterSpacing: 0.5,
        }}>
          {t('landing.badge')}
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, margin: '0 0 20px', color: '#FFFFFF', maxWidth: 700 }}>
          {t('landing.hero_h1_a')}<br />
          <span style={{ color: '#5865F2' }}>{t('landing.hero_h1_b')}</span>
        </h1>
        <p style={{ fontSize: 17, color: '#8A8A8A', maxWidth: 500, lineHeight: 1.6, margin: '0 0 40px', fontWeight: 400 }}>
          {t('landing.hero_p')}
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={BOT_INVITE} target="_blank" rel="noreferrer" className="ut-cta-primary">
            <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
            </svg>
            {t('landing.cta_discord')}
          </a>
          <a href={PAYPAL_DONATE_URL} target="_blank" rel="noreferrer" className="ut-cta-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z" />
            </svg>
            {t('landing.cta_donate')}
          </a>
        </div>
      </section>

      {/* VIDEO SECTION */}
      <section id="demo" className="animate-on-scroll" style={{ padding: '48px 32px', maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>
          {t('landing.video_section_title')}
        </h2>
        <p style={{ textAlign: 'center', color: '#8A8A8A', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
          {t('landing.video_section_desc')}
        </p>
        <div style={{ 
          position: 'relative', 
          paddingBottom: '56.25%', 
          height: 0, 
          overflow: 'hidden', 
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <iframe 
            ref={videoRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            src="https://www.youtube.com/embed/NWUapGS1Ajc?si=GBOx3-5qIhYS7bTd&controls=0&autoplay=0&mute=1&clip=Ugkx7yJL1cFZGCT_78w4TA7oOr0FAZeYjfB9&clipt=EJS0BhiNtgc" 
            title="YouTube video player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen
          />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="animate-on-scroll" style={{ padding: '48px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#FFFFFF', marginBottom: 48 }}>
          {t('landing.features_h2')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {FEATURES.map((f, idx) => (
            <div
              key={f.title}
              className="animate-on-scroll"
              style={{
                background: '#111111', 
                border: '1px solid #1F1F1F',
                borderRadius: 16, 
                padding: 24,
                transitionDelay: `${idx * 0.1}s`
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: '#FFFFFF', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#8A8A8A', lineHeight: 1.6, fontWeight: 400 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMANDS */}
      <section className="animate-on-scroll" style={{ padding: '48px 32px', maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>
          {t('landing.commands_h2')}
        </h2>
        <p style={{ textAlign: 'center', color: '#8A8A8A', fontSize: 14, marginBottom: 40, fontWeight: 400 }}>
          {t('landing.commands_subtitle')}
        </p>
        <div className="ut-commands-grid">
          {COMMANDS.map((c, idx) => (
            <div
              key={c.name}
              className="animate-on-scroll"
              style={{
                background: '#111111',
                border: '1px solid #1F1F1F',
                borderRadius: 12, 
                padding: '20px 22px',
                display: 'flex', 
                flexDirection: 'column', 
                gap: 10,
                transitionDelay: `${idx * 0.1}s`
              }}
            >
              <code style={{
                background: 'rgba(88,101,242,0.15)', 
                color: '#8a93f5',
                border: '1px solid rgba(88,101,242,0.25)',
                borderRadius: 6, 
                padding: '4px 12px', 
                fontSize: 14, 
                fontWeight: 700,
                display: 'inline-block', 
                alignSelf: 'flex-start',
              }}>
                {c.name}
              </code>
              <span style={{ fontSize: 13, color: '#8A8A8A', lineHeight: 1.6, fontWeight: 400 }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #1F1F1F',
        padding: '32px 24px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16, 
        alignItems: 'center',
        background: '#0D0D0D'
      }}>
        <div style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          color: '#5865F2',
          marginBottom: 8 
        }}>
          UltimateTracker
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: 20, 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          marginBottom: 8 
        }}>
          <a href="#features" className="ut-footer-nav-link">Features</a>
          <a href="#demo" className="ut-footer-nav-link">Demo</a>
          <Link href="/pricing" className="ut-footer-nav-link">Doações</Link>
          <a href={DISCORD_SERVER_URL} target="_blank" rel="noreferrer" className="ut-footer-nav-link">Suporte</a>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a href={DISCORD_SERVER_URL} target="_blank" rel="noreferrer" className="ut-footer-icon" aria-label="Discord">
            <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
            </svg>
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="ut-footer-icon" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
            </svg>
          </a>
          <a href={PAYPAL_DONATE_URL} target="_blank" rel="noreferrer" className="ut-footer-icon" aria-label="PayPal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.011 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.379 3.968-.878 8.766-7.613 8.766H9.31l-1.37 8.668h4.44c.458 0 .848-.334.92-.788l.038-.197 1.32-8.37.085-.46a.929.929 0 0 1 .92-.787h.578c3.75 0 6.69-1.524 7.547-5.93.347-1.784.162-3.264-.566-4.361z" />
            </svg>
          </a>
        </div>

        <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginTop: 8, fontWeight: 400 }}>
          {t('common.footer_legal')}
        </div>
      </footer>

      <FloatingLangSwitcher />
    </div>
  );
}

