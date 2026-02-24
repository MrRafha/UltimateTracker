'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function PricingPage() {
  const t = useTranslations();

  const PLANS = [
    {
      name: t('pricing.plan_basic_name'),
      price: 'R$ 25',
      period: t('pricing.period'),
      highlight: false,
      badge: null,
      description: t('pricing.plan_basic_desc'),
      features: [
        t('pricing.feature_basic_0'),
        t('pricing.feature_basic_1'),
        t('pricing.feature_basic_2'),
        t('pricing.feature_basic_3'),
        t('pricing.feature_basic_4'),
      ],
      cta: t('pricing.cta_basic'),
    },
    {
      name: t('pricing.plan_plus_name'),
      price: 'R$ 30',
      period: t('pricing.period'),
      highlight: true,
      badge: t('pricing.badge_popular'),
      description: t('pricing.plan_plus_desc'),
      features: [
        t('pricing.feature_plus_0'),
        t('pricing.feature_plus_1'),
        t('pricing.feature_plus_2'),
        t('pricing.feature_plus_3'),
        t('pricing.feature_plus_4'),
      ],
      cta: t('pricing.cta_plus'),
    },
    {
      name: t('pricing.plan_premium_name'),
      price: 'R$ 40',
      period: t('pricing.period'),
      highlight: false,
      badge: null,
      description: t('pricing.plan_premium_desc'),
      features: [
        t('pricing.feature_premium_0'),
        t('pricing.feature_premium_1'),
        t('pricing.feature_premium_2'),
        t('pricing.feature_premium_3'),
        t('pricing.feature_premium_4'),
        t('pricing.feature_premium_5'),
      ],
      cta: t('pricing.cta_premium'),
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% -10%, rgba(88,101,242,0.12) 0%, #0a0a0f 55%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e0e0e0',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Navbar */}
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
          <Link
            href="/pricing"
            style={{
              fontSize: 13, fontWeight: 700,
              color: '#8a93f5',
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

      {/* Header */}
      <section style={{
        textAlign: 'center',
        padding: '72px 24px 56px',
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.3)',
          borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#8a93f5',
          marginBottom: 24, fontWeight: 600, letterSpacing: 0.5,
        }}>
          {t('pricing.badge')}
        </div>
        <h1 style={{
          margin: '0 0 16px',
          fontSize: 44, fontWeight: 900, lineHeight: 1.1, color: '#fff',
        }}>
          {t('pricing.h1_a')}<br />
          <span style={{ color: '#5865F2' }}>{t('pricing.h1_b')}</span>
        </h1>
        <p style={{
          margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.4)',
          maxWidth: 460, marginInline: 'auto', lineHeight: 1.6,
        }}>
          {t('pricing.subtitle')}
        </p>
      </section>

      {/* Cards */}
      <section style={{
        maxWidth: 1040, margin: '0 auto', padding: '0 24px 100px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        alignItems: 'center',
      }}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </section>

      {/* FAQ / note */}
      <section style={{
        maxWidth: 600, margin: '0 auto', padding: '0 24px 80px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', lineHeight: 1.8 }}>
          {t('pricing.footer_note')}
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center', padding: '28px 24px',
        fontSize: 12, color: '#444',
      }}>
        Ultimate Tracker · Albion Online Node Tracker · Não afiliado à Sandbox Interactive
      </footer>
    </div>
  );
}

type PlanItem = {
  name: string; price: string; period: string; highlight: boolean;
  badge: string | null; description: string; features: string[]; cta: string;
};

function PlanCard({ plan }: { plan: PlanItem }) {
  return (
    <div style={{
      position: 'relative',
      background: plan.highlight
        ? 'linear-gradient(160deg, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.04) 100%)'
        : 'rgba(255,255,255,0.025)',
      border: plan.highlight
        ? '1px solid rgba(88,101,242,0.5)'
        : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20,
      padding: plan.highlight ? '32px 28px' : '28px 24px',
      display: 'flex', flexDirection: 'column', gap: 0,
      boxShadow: plan.highlight ? '0 0 40px rgba(88,101,242,0.15)' : 'none',
      transform: plan.highlight ? 'scale(1.03)' : 'none',
    }}>
      {/* Badge */}
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #5865F2, #7b84f5)',
          borderRadius: 999, padding: '4px 16px',
          fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 0.6,
          whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(88,101,242,0.5)',
        }}>
          {plan.badge}
        </div>
      )}

      {/* Plan name */}
      <div style={{ fontSize: 12, fontWeight: 700, color: plan.highlight ? '#8a93f5' : 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        {plan.name}
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>{plan.price}</span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{plan.period}</span>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: '0 0 24px' }}>
        {plan.description}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 24 }} />

      {/* Features */}
      <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        style={{
          marginTop: 'auto',
          padding: '12px 20px',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
          background: plan.highlight
            ? 'linear-gradient(135deg, #5865F2 0%, #4752c4 100%)'
            : 'rgba(255,255,255,0.06)',
          color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.7)',
          boxShadow: plan.highlight ? '0 4px 20px rgba(88,101,242,0.4)' : 'none',
          transition: 'filter 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        onClick={() => { /* TODO: link to contact/WhatsApp/Discord */ }}
      >
        {plan.cta}
      </button>
    </div>
  );
}
