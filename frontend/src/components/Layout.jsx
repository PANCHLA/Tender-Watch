import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { signOut } from '../lib/supabase'
import {
    LayoutDashboard,
    Bookmark,
    ListChecks,
    Bell,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut,
} from 'lucide-react'

const NAV = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/saved', label: 'Saved', icon: Bookmark },
    { to: '/app/watchlists', label: 'Watchlists', icon: ListChecks },
    { to: '/app/alerts', label: 'Alerts', icon: Bell },
    { to: '/app/settings', label: 'Settings', icon: Settings },
]

export default function Layout({ children }) {
    const { user, clearUser } = useAuthStore()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)

    async function handleSignOut() {
        await signOut()
        clearUser()
        navigate('/login')
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* ── Sidebar ─────────────────────────────────────────── */}
            <aside className="sidebar" style={{
                width: collapsed ? 56 : 220,
                minWidth: collapsed ? 56 : 220,
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                padding: collapsed ? '20px 8px' : '20px 12px',
                transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1), padding 0.25s cubic-bezier(.4,0,.2,1)',
                overflow: 'hidden',
            }}>
                {/* Logo + Toggle */}
                <div style={{
                    padding: collapsed ? '0 0 16px' : '0 8px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    gap: 8,
                    transition: 'padding 0.25s ease',
                }}>
                    {!collapsed && (
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontFamily: 'Playfair Display, serif',
                                fontSize: 20,
                                fontWeight: 700,
                                color: 'var(--text)',
                                letterSpacing: '-0.02em',
                                whiteSpace: 'nowrap',
                            }}>
                                Tender<span style={{ color: 'var(--accent)' }}>Watch</span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'DM Mono' }}>
                                GOV CONTRACT INTEL
                            </div>
                        </div>
                    )}
                    <button
                        className="panel-toggle"
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {NAV.map(n => {
                        const Icon = n.icon
                        return (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                end={n.to === '/app'}
                                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                                title={collapsed ? n.label : undefined}
                            >
                                <Icon size={16} strokeWidth={1.8} />
                                {!collapsed && <span>{n.label}</span>}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* User */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                    }}>
                        <div style={{
                            width: 30, height: 30,
                            borderRadius: '50%',
                            background: 'var(--accent-dim)',
                            border: '1px solid var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, color: 'var(--accent)', fontWeight: 700,
                            flexShrink: 0,
                        }}>
                            {user?.email?.[0]?.toUpperCase() || 'D'}
                        </div>
                        {!collapsed && (
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user?.email || 'Demo User'}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono' }}>FREE PLAN</div>
                            </div>
                        )}
                    </div>
                    <button
                        className="btn btn-ghost"
                        onClick={handleSignOut}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            marginTop: 4,
                            fontSize: 12,
                            color: 'var(--text3)',
                        }}
                        title="Sign out"
                    >
                        {collapsed ? <LogOut size={14} strokeWidth={1.8} /> : 'Sign out'}
                    </button>
                </div>
            </aside>

            {/* ── Main content ─────────────────────────────────────── */}
            <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
                {children}
            </main>
        </div>
    )
}
