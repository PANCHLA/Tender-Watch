import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { signOut } from '../lib/supabase'
import { fetchHistory } from '../lib/api'
import {
    LayoutDashboard,
    Bookmark,
    ListChecks,
    Bell,
    History,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut,
    Search,
    Clock,
} from 'lucide-react'

const NAV = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/saved', label: 'Saved', icon: Bookmark },
    { to: '/app/watchlists', label: 'Watchlists', icon: ListChecks },
    { to: '/app/alerts', label: 'Alerts', icon: Bell },
    { to: '/app/history', label: 'History', icon: History, showBadge: true },
    { to: '/app/settings', label: 'Settings', icon: Settings },
]

function relativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return `${Math.floor(days / 7)}w`
}

export default function Layout({ children }) {
    const { user, clearUser } = useAuthStore()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [recentSearches, setRecentSearches] = useState([])
    const [historyCount, setHistoryCount] = useState(0)

    // Fetch recent history for sidebar
    useEffect(() => {
        fetchHistory()
            .then(data => {
                const items = data.history || []
                setHistoryCount(items.length)
                setRecentSearches(items.slice(0, 8))
            })
            .catch(() => { })
    }, [])

    async function handleSignOut() {
        await signOut()
        clearUser()
        navigate('/login')
    }

    const textClass = `sidebar-text${collapsed ? ' collapsed' : ''}`

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
                    <span className={textClass} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
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
                    </span>
                    <button
                        className="panel-toggle"
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                <span className={textClass}>
                                    {n.label}
                                    {n.showBadge && historyCount > 0 && (
                                        <span className="nav-badge" style={{ marginLeft: 6 }}>{historyCount}</span>
                                    )}
                                </span>
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                    <div style={{
                        flex: 1,
                        borderTop: '1px solid var(--border)',
                        marginTop: 16,
                        paddingTop: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        overflow: 'hidden',
                        opacity: collapsed ? 0 : 1,
                        transition: 'opacity 0.2s ease',
                        pointerEvents: collapsed ? 'none' : 'auto',
                    }}>
                        <div style={{
                            fontSize: 10,
                            color: 'var(--text3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '0 10px 8px',
                            fontFamily: 'DM Mono',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}>
                            <Clock size={10} strokeWidth={2} />
                            Recent Searches
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {recentSearches.map(item => (
                                <div
                                    key={item.id}
                                    className="history-item"
                                    onClick={() => navigate(`/app/history/${item.id}`)}
                                    title={`"${item.keywords}" — ${item.tenders_found} results`}
                                >
                                    <Search size={12} strokeWidth={1.8} style={{ flexShrink: 0, color: 'var(--text3)' }} />
                                    <span className="history-item-text">{item.keywords}</span>
                                    <span className="history-item-meta">{relativeTime(item.created_at)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Spacer when collapsed or no history */}
                {(collapsed || recentSearches.length === 0) && <div style={{ flex: 1 }} />}

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
                        <span className={textClass} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.email || 'Demo User'}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono' }}>FREE PLAN</div>
                        </span>
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
                        <LogOut size={14} strokeWidth={1.8} />
                        <span className={textClass}>Sign out</span>
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
