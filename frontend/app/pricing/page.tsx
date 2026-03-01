'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';

const PAYPAL_DONATE_URL = process.env.NEXT_PUBLIC_PAYPAL_DONATE_URL ?? 'https://www.paypal.com/donate/?business=S53JLJTYQN3FL&no_recurring=0&item_name=help+me+to+keep+the+servers+on&currency_code=USD';

export default function DonatePage() {
  const t = useTranslations();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% -10%, rgba(88,101,242,0.12) 0%, #0a0a0f 55%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e0e0e0',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 56,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/brand/icon.png" alt="Ultimate Tracker" height={36} style={{ display: 'block', width: 'auto' }} />
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <LanguageSwitcher />
          <Link href="/pricing" style={{ fontSize: 13, fontWeight: 700, color: '#8a93f5', textDecoration: 'none', padding: '6px 4px' }}>
            {t('nav.donate')}
          </Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 700, background: '#5865F2', color: '#fff', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>
            {t('nav.login')}
          </Link>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '80px 24px 48px' }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.3)',
          borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#8a93f5',
          marginBottom: 24, fontWeight: 600, letterSpacing: 0.5,
        }}>
          {t('donation.badge')}
        </div>
        <h1 style={{ margin: '0 0 16px', fontSize: 44, fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>
          {t('donation.h1_a')}<br />
          <span style={{ color: '#5865F2' }}>{t('donation.h1_b')}</span>
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 540, marginInline: 'auto', lineHeight: 1.7 }}>
          {t('donation.subtitle')}
        </p>
      </section>

      <section style={{ maxWidth: 520, margin: '0 auto', padding: '0 24px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{
          width: '100%',
          background: 'linear-gradient(160deg, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.04) 100%)',
          border: '1px solid rgba(88,101,242,0.4)',
          borderRadius: 24, padding: '40px 36px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          boxShadow: '0 0 60px rgba(88,101,242,0.12)', textAlign: 'center',
        }}>
          <span className="material-icons" style={{ fontSize: 52, color: '#e05a5a' }}>favorite</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{t('donation.card_title')}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{t('donation.card_desc')}</div>
          </div>
          <ul style={{ textAlign: 'left', width: '100%', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[t('donation.benefit_0'), t('donation.benefit_1'), t('donation.benefit_2')].map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                <span className="material-icons" style={{ fontSize: 16, color: '#5865F2', flexShrink: 0 }}>check_circle</span>
                {item}
              </li>
            ))}
          </ul>
          <a
            href={PAYPAL_DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: '#0070BA', color: '#fff',
              padding: '14px 36px', borderRadius: 12,
              textDecoration: 'none', fontWeight: 800, fontSize: 16,
              boxShadow: '0 4px 24px rgba(0,112,186,0.35)',
              width: '100%',
            }}
          >
            <span className="material-icons" style={{ fontSize: 20 }}>volunteer_activism</span>
            {t('donation.cta')}
          </a>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>{t('donation.secure_note')}</p>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.8 }}>{t('donation.footer_note')}</p>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', padding: '28px 24px', fontSize: 12, color: '#444' }}>
        {t('common.footer_legal')}
      </footer>
    </div>
  );
}

