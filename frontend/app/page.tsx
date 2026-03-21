'use client';

import { useTranslations } from 'next-intl';
import { Inter } from 'next/font/google';
import FloatingLangSwitcher from './components/FloatingLangSwitcher';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] });

const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=1475280862768529498&permissions=2147568640&integration_type=0&scope=bot+applications.commands`;
const PAYPAL_DONATE_URL = process.env.NEXT_PUBLIC_PAYPAL_DONATE_URL ?? 'https://www.paypal.com/donate/?business=S53JLJTYQN3FL&no_recurring=0&item_name=help+me+to+keep+the+servers+on&currency_code=USD';
const DISCORD_SERVER_URL = process.env.NEXT_PUBLIC_DISCORD_SERVER_URL ?? 'https://discord.com/invite/kekQ2qSyEY';
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? 'https://github.com/MrRafha/UltimateTracker';

const FRONTEND_PAUSED = process.env.NEXT_PUBLIC_FRONTEND_PAUSED !== 'false';

export default function LandingPage() {
  const t = useTranslations();

  // Keep integration variables available for fast rollback when project resumes.
  void BOT_INVITE;
  void PAYPAL_DONATE_URL;

  return (
    <div className={inter.className} style={{ minHeight: '100vh', background: '#0D0D0D', color: '#E0E0E0', scrollBehavior: 'smooth' }}>
      <style>{`
        html { scroll-behavior: smooth; }

        .ut-nav-link {
          font-size: 13px; font-weight: 600;
          color: #8A8A8A; text-decoration: none;
          padding: 6px 4px; transition: color .15s ease;
        }
        .ut-nav-link:hover { color: #E0E0E0; }

        .ut-status-card {
          width: min(760px, 100%);
          border: 1px solid #1F1F1F;
          background: linear-gradient(145deg, #121212 0%, #0e0e0e 100%);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.35);
        }
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
        </div>
      </nav>

      <main style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px'
      }}>
        <section className="ut-status-card" style={{ textAlign: 'left' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(246, 173, 85, 0.16)',
            border: '1px solid rgba(246, 173, 85, 0.34)',
            borderRadius: 999,
            padding: '5px 14px',
            fontSize: 12,
            color: '#f6c26b',
            marginBottom: 18,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}>
            {t('landing.paused_badge')}
          </div>

          <h1 style={{
            fontSize: 'clamp(30px, 6vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: '0 0 14px',
            color: '#FFFFFF'
          }}>
            {FRONTEND_PAUSED ? t('landing.paused_title') : `${t('landing.hero_h1_a')} ${t('landing.hero_h1_b')}`}
          </h1>

          <p style={{
            margin: '0 0 10px',
            color: '#B3B3B3',
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 660,
          }}>
            {FRONTEND_PAUSED ? t('landing.paused_desc') : t('landing.hero_p')}
          </p>

          <p style={{ margin: 0, color: '#7A7A7A', fontSize: 13 }}>
            {t('common.footer_legal')}
          </p>
        </section>
      </main>

      <FloatingLangSwitcher />
    </div>
  );
}

