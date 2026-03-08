import { Link } from 'react-router-dom'
import {
    Zap, Landmark, ListChecks, Bell, BarChart3, Lock,
    FileText, Shield, TrainFront, Route, ArrowRight,
} from 'lucide-react'

const FEATURES = [
    { icon: Zap, title: 'Real-Time AI Agents', desc: 'TinyFish browser agents scan live government portals simultaneously — no stale data, no manual checking.' },
    { icon: Landmark, title: '5 Portals, One Dashboard', desc: 'GeM, CPPP, Defence, Railways, NHAI — all results unified with urgency scoring and value formatting.' },
    { icon: ListChecks, title: 'Automated Watchlists', desc: 'Set keywords and schedules. Get notified the moment a relevant tender is posted anywhere.' },
    { icon: Bell, title: 'Smart Alert Emails', desc: 'Instant digest with urgency breakdown. Know about critical deadlines before everyone else.' },
    { icon: BarChart3, title: 'Urgency Intelligence', desc: 'Custom scoring flags URGENT (< 3 days), closing soon (< 10 days), and open opportunities.' },
    { icon: Lock, title: 'Secure & Private', desc: 'Supabase auth with Row Level Security. Your saved tenders and watchlists are completely private.' },
]

const PORTALS = [
    { icon: Landmark, name: 'GeM Portal', url: 'gem.gov.in', color: '#4db8ff' },
    { icon: FileText, name: 'CPPP', url: 'eprocure.gov.in', color: '#00e09e' },
    { icon: Shield, name: 'Defence', url: 'mod.gov.in', color: '#ffb547' },
    { icon: TrainFront, name: 'IREPS', url: 'ireps.gov.in', color: '#ff4d6a' },
    { icon: Route, name: 'NHAI', url: 'nhai.gov.in', color: '#a78bfa' },
]

const STATS = [
    { value: '5', label: 'Portals Monitored' },
    { value: '24/7', label: 'Automated Scanning' },
    { value: '<15 min', label: 'Result Latency' },
    { value: '∞', label: 'Tenders Tracked' },
]

export default function LandingPage() {
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
            {/* ── Nav ────────────────────────────────────────────────── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 40,
                background: 'rgba(11,15,14,0.9)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
                padding: '0 40px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: 60,
            }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Tender<span style={{ color: 'var(--accent)' }}>Watch</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link to="/login" className="btn btn-ghost" style={{ fontSize: 13 }}>Sign In</Link>
                    <Link to="/signup" className="btn btn-primary">Get Started →</Link>
                </div>
            </nav>

            {/* ── Hero ───────────────────────────────────────────────── */}
            <section style={{
                padding: '100px 40px 80px',
                textAlign: 'center',
                maxWidth: 860,
                margin: '0 auto',
                position: 'relative',
            }}>
                {/* Glow orb */}
                <div style={{
                    position: 'absolute',
                    top: 60, left: '50%', transform: 'translateX(-50%)',
                    width: 600, height: 400,
                    background: 'radial-gradient(ellipse at center, rgba(0,224,158,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{
                    display: 'inline-block',
                    fontSize: 11, fontFamily: 'DM Mono',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    padding: '4px 14px',
                    borderRadius: 20,
                    marginBottom: 20,
                    letterSpacing: '0.1em',
                }}>
                    POWERED BY TINYFISH AI AGENTS
                </div>

                <h1 style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: 'clamp(40px, 6vw, 64px)',
                    fontWeight: 700,
                    lineHeight: 1.15,
                    margin: '0 0 20px',
                    letterSpacing: '-0.02em',
                }}>
                    Never Miss a{' '}
                    <span style={{ color: 'var(--accent)', display: 'inline-block' }}>
                        Government Contract
                    </span>
                    {' '}Again
                </h1>

                <p style={{
                    fontSize: 18,
                    color: 'var(--text2)',
                    lineHeight: 1.7,
                    maxWidth: 600,
                    margin: '0 auto 36px',
                }}>
                    AI agents monitor every major Indian procurement portal 24/7 — GeM, CPPP, Defence, Railways, NHAI — and deliver results to your dashboard in real time.
                </p>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/app" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 15 }}>
                        <Zap size={16} strokeWidth={2} /> Open Dashboard
                    </Link>
                    <Link to="/signup" className="btn btn-secondary" style={{ padding: '13px 28px', fontSize: 15 }}>
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* ── Stats bar ──────────────────────────────────────────── */}
            <div style={{
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: '24px 40px',
            }}>
                <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
                    {STATS.map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Portals ────────────────────────────────────────────── */}
            <section style={{ padding: '72px 40px', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Portals We Monitor
                </div>
                <h2 style={{ fontSize: 32, margin: '0 0 40px' }}>One Platform. Every Portal.</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {PORTALS.map(p => (
                        <div key={p.name} className="card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 160 }}>
                            {(() => { const Icon = p.icon; return <Icon size={24} strokeWidth={1.5} style={{ color: p.color }} /> })()}
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: p.color, fontFamily: 'DM Mono', marginTop: 2 }}>{p.url}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ───────────────────────────────────────────── */}
            <section style={{ padding: '0 40px 80px', maxWidth: 900, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                        Platform Features
                    </div>
                    <h2 style={{ fontSize: 32, margin: 0 }}>Enterprise-Grade Intel for Every Contractor</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {FEATURES.map(f => {
                        const Icon = f.icon
                        return (
                            <div key={f.title} className="card" style={{ padding: 24 }}>
                                <div style={{ marginBottom: 14, color: 'var(--accent)' }}><Icon size={28} strokeWidth={1.5} /></div>
                                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontFamily: 'DM Sans', fontWeight: 700 }}>{f.title}</h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{f.desc}</p>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────── */}
            <section style={{
                margin: '0 40px 80px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '56px 40px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                maxWidth: 860,
                marginInline: 'auto',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(0,224,158,0.06) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }} />
                <h2 style={{ fontSize: 32, margin: '0 0 12px' }}>Ready to Win More Contracts?</h2>
                <p style={{ color: 'var(--text2)', fontSize: 15, margin: '0 0 28px', maxWidth: 480, marginInline: 'auto' }}>
                    Stop relying on manual portal checks. Deploy your AI agent team and never miss a deadline again.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <Link to="/app" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 15 }}>
                        <Zap size={16} strokeWidth={2} /> Start Scanning Now
                    </Link>
                    <Link to="/signup" className="btn btn-secondary" style={{ padding: '13px 28px', fontSize: 15 }}>
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <footer style={{
                borderTop: '1px solid var(--border)',
                padding: '24px 40px',
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: 12,
                fontFamily: 'DM Mono',
            }}>
                TenderWatch — Built for the TinyFish Hackathon 2026 &nbsp;·&nbsp; Powered by TinyFish AI Agents
            </footer>
        </div>
    )
}
