import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanStore, useToastStore } from '../store'
import { openScanStream, fetchTenders, fetchHistory } from '../lib/api'
import TenderCard from '../components/TenderCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import {
    Landmark, FileText, Shield, TrainFront, Route,
    Zap, Search, PanelLeftClose, PanelLeftOpen,
    Clock, CheckCircle2, XCircle, Timer, TrendingUp,
} from 'lucide-react'

const ALL_PORTALS = [
    { key: 'gem', label: 'GeM', icon: Landmark },
    { key: 'cppp', label: 'CPPP', icon: FileText },
    { key: 'mod', label: 'Defence', icon: Shield },
    { key: 'ireps', label: 'Railways', icon: TrainFront },
    { key: 'nhai', label: 'NHAI', icon: Route },
]

function formatTimer(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function DashboardPage() {
    const { show } = useToastStore()
    const navigate = useNavigate()
    const { scanning, activityLog, results, portalStatus, startScan, stopScan, addActivity, setPortalStatus, addResults, setSaved } = useScanStore()

    const [keywords, setKeywords] = useState('')
    const [selectedPortals, setSelectedPortals] = useState(['gem', 'cppp'])
    const [minValue, setMinValue] = useState('')
    const [maxValue, setMaxValue] = useState('')
    const [location, setLocation] = useState('')
    const [sortBy, setSortBy] = useState('deadline')
    const [searchCollapsed, setSearchCollapsed] = useState(false)

    // Agent progress state
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [scanStartTime, setScanStartTime] = useState(null)
    const [scanSummary, setScanSummary] = useState(null)
    const timerRef = useRef(null)

    // Recent searches for empty state
    const [recentSearches, setRecentSearches] = useState([])
    const [initialLoading, setInitialLoading] = useState(true)

    const abortRef = useRef(null)
    const feedRef = useRef(null)

    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = 0
    }, [activityLog.length])

    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    // Load recent tenders from DB on mount (survives page refresh)
    useEffect(() => {
        if (results.length === 0 && !scanning) {
            loadRecentTenders(1)
        } else {
            setInitialLoading(false)
        }
        // Load recent searches for empty state chips
        fetchHistory()
            .then(data => setRecentSearches((data.history || []).slice(0, 6)))
            .catch(() => { })
    }, [])

    // Elapsed timer
    useEffect(() => {
        if (scanning) {
            setScanStartTime(Date.now())
            setElapsedSeconds(0)
            setScanSummary(null)
            timerRef.current = setInterval(() => {
                setElapsedSeconds(s => s + 1)
            }, 1000)
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [scanning])

    async function loadRecentTenders(p) {
        setLoadingMore(true)
        try {
            const data = await fetchTenders({ page_size: 50, page: p })
            const newTenders = data.tenders || []
            if (newTenders.length > 0) {
                addResults(newTenders)
            }
            setHasMore(newTenders.length === 50)
            setPage(p)
        } catch { }
        setLoadingMore(false)
        setInitialLoading(false)
    }

    function togglePortal(key) {
        setSelectedPortals(prev =>
            prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
        )
    }

    async function handleScan(e) {
        e.preventDefault()
        if (!keywords.trim()) return show('Enter keywords to search', 'error')
        if (!selectedPortals.length) return show('Select at least one portal', 'error')

        // Stop any existing scan
        abortRef.current?.()
        startScan(selectedPortals, keywords)

        addActivity({ type: 'START', message: `Starting scan: "${keywords}"`, timestamp: new Date().toISOString() })

        abortRef.current = openScanStream(
            {
                keywords,
                portals: selectedPortals,
                min_value: minValue ? Number(minValue) : undefined,
                max_value: maxValue ? Number(maxValue) : undefined,
                location: location || undefined,
            },
            {
                onStart: (e) => {
                    addActivity({ type: 'START', message: `Dispatching agents to ${e.portals.length} portals`, timestamp: new Date().toISOString() })
                },
                onProgress: (e) => {
                    setPortalStatus(e.portal, 'scanning')
                    addActivity({ type: 'PROGRESS', portal: e.portal, message: `${e.portal_name}: scanning…`, timestamp: new Date().toISOString() })
                },
                onPortalComplete: (e) => {
                    setPortalStatus(e.portal, 'done')
                    addActivity({ type: 'COMPLETE', portal: e.portal, message: `${e.portal_name}: found ${e.count} tender${e.count !== 1 ? 's' : ''}`, timestamp: new Date().toISOString() })
                    addResults(e.tenders)
                },
                onError: (e) => {
                    if (e.portal) {
                        setPortalStatus(e.portal, 'error')
                    } else {
                        stopScan()
                    }
                    addActivity({ type: 'ERROR', portal: e.portal, message: `${e.portal_name || 'Error'}: ${e.error}`, timestamp: new Date().toISOString() })
                    show(`${e.portal_name || 'Scan'} failed: ${e.error || 'unknown error'}`, 'error')
                },
                onDone: (e) => {
                    const totalTime = elapsedSeconds
                    stopScan()
                    addActivity({ type: 'DONE', message: `Scan complete — ${e.total} tenders found`, timestamp: new Date().toISOString() })
                    show(`Found ${e.total} tenders`, 'success')
                    setScanSummary({
                        totalTime,
                        totalTenders: e.total,
                        portalsScanned: selectedPortals.length,
                    })
                },
            }
        )
    }

    function handleStop() {
        abortRef.current?.()
        stopScan()
        addActivity({ type: 'STOP', message: 'Scan stopped by user', timestamp: new Date().toISOString() })
    }

    function handleSaveToggle(id, newState) {
        setSaved(id, newState)
    }

    // Compute progress stats
    const completedPortals = Object.values(portalStatus).filter(s => s === 'done').length
    const errorPortals = Object.values(portalStatus).filter(s => s === 'error').length
    const totalPortals = Object.keys(portalStatus).length

    const sorted = [...results].sort((a, b) => {
        if (sortBy === 'deadline') {
            const now = new Date().toISOString().slice(0, 10)
            const aOpen = (a.deadline || '9999-99-99') >= now
            const bOpen = (b.deadline || '9999-99-99') >= now
            if (aOpen !== bOpen) return aOpen ? -1 : 1
            if (aOpen) return (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99')
            return (b.deadline || '').localeCompare(a.deadline || '')
        }
        if (sortBy === 'value') return (b.value || b.value_numeric || 0) - (a.value || a.value_numeric || 0)
        return 0
    })

    const statusColor = { scanning: 'var(--amber)', done: 'var(--accent)', error: 'var(--red)', pending: 'var(--text3)' }
    const statusIcon = {
        done: <CheckCircle2 size={12} strokeWidth={2} style={{ color: 'var(--accent)' }} />,
        error: <XCircle size={12} strokeWidth={2} style={{ color: 'var(--red)' }} />,
    }
    const activityColor = { START: 'var(--accent)', PROGRESS: 'var(--blue)', COMPLETE: 'var(--accent)', ERROR: 'var(--red)', DONE: 'var(--accent)', STOP: 'var(--text3)' }

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* ── Search Panel ─────────────────────────────────────── */}
            <aside style={{
                width: searchCollapsed ? 0 : 280,
                minWidth: searchCollapsed ? 0 : 280,
                borderRight: searchCollapsed ? 'none' : '1px solid var(--border)',
                padding: searchCollapsed ? 0 : 20,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex', flexDirection: 'column', gap: 20,
                transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1), padding 0.25s cubic-bezier(.4,0,.2,1)',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: '0 0 4px', fontSize: 16, whiteSpace: 'nowrap' }}>Search Tenders</h2>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>AI agents scan portals in real-time</p>
                    </div>
                    <button
                        className="panel-toggle"
                        onClick={() => setSearchCollapsed(true)}
                        title="Collapse search panel"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <PanelLeftClose size={15} />
                    </button>
                </div>

                <form onSubmit={handleScan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Keywords */}
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Keywords
                        </label>
                        <input
                            className="input"
                            value={keywords}
                            onChange={e => setKeywords(e.target.value)}
                            placeholder="e.g. IT networking equipment"
                        />
                    </div>

                    {/* Portal selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            Portals
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {ALL_PORTALS.map(p => {
                                const Icon = p.icon
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        className={`portal-chip${selectedPortals.includes(p.key) ? ' active' : ''}`}
                                        onClick={() => togglePortal(p.key)}
                                    >
                                        <Icon size={12} strokeWidth={2} /> {p.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Value range */}
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Value Range (₹)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input className="input" value={minValue} onChange={e => setMinValue(e.target.value)} placeholder="Min" type="number" />
                            <input className="input" value={maxValue} onChange={e => setMaxValue(e.target.value)} placeholder="Max" type="number" />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Location (optional)
                        </label>
                        <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Maharashtra" />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={scanning} style={{ flex: 1 }}>
                            {scanning ? <><LoadingSpinner size={14} /> Scanning…</> : <><Zap size={14} strokeWidth={2} /> Scan Portals</>}
                        </button>
                        {scanning && (
                            <button type="button" className="btn btn-secondary" onClick={handleStop}>Stop</button>
                        )}
                    </div>
                </form>

                {/* ── Portal Progress (enhanced) ──────────────────────── */}
                {Object.keys(portalStatus).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        {/* Timer + counter header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Agent Status
                            </div>
                            {scanning && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Timer size={12} strokeWidth={2} style={{ color: 'var(--amber)' }} />
                                    <span className="scan-timer">{formatTimer(elapsedSeconds)}</span>
                                </div>
                            )}
                        </div>

                        {/* Progress counter */}
                        {totalPortals > 0 && (
                            <div style={{
                                fontSize: 12,
                                color: 'var(--text2)',
                                marginBottom: 10,
                                padding: '8px 10px',
                                background: 'var(--surface2)',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span>
                                    <strong style={{ color: 'var(--accent)' }}>{completedPortals}</strong>
                                    <span style={{ color: 'var(--text3)' }}> of </span>
                                    <strong>{totalPortals}</strong>
                                    <span style={{ color: 'var(--text3)' }}> portals complete</span>
                                </span>
                                {errorPortals > 0 && (
                                    <span style={{ color: 'var(--red)', fontSize: 11 }}>
                                        {errorPortals} failed
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Per-portal step indicator */}
                        {ALL_PORTALS.filter(p => selectedPortals.includes(p.key)).map(p => {
                            const Icon = p.icon
                            const status = portalStatus[p.key] || 'pending'
                            return (
                                <div key={p.key} className="progress-step">
                                    <span className={`progress-step-dot ${status}`} />
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, color: status === 'done' ? 'var(--accent)' : status === 'error' ? 'var(--red)' : 'var(--text2)' }}>
                                        <Icon size={13} strokeWidth={1.8} /> {p.label}
                                    </span>
                                    <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {statusIcon[status] || null}
                                        <span style={{ color: statusColor[status] || 'var(--text3)' }}>
                                            {status === 'scanning' ? 'working…' : status}
                                        </span>
                                    </span>
                                </div>
                            )
                        })}

                        {/* ETA hint */}
                        {scanning && (
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
                                ~2–4 min per portal depending on results
                            </div>
                        )}
                    </div>
                )}
            </aside>

            {/* ── Results Area ──────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Activity feed */}
                {activityLog.length > 0 && (
                    <div ref={feedRef} style={{
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--surface)',
                        padding: '10px 20px',
                        maxHeight: 120,
                        overflowY: 'auto',
                    }}>
                        {activityLog.slice(0, 8).map((entry, i) => (
                            <div key={i} className="feed-item">
                                <span className="feed-dot" style={{ background: activityColor[entry.type] || 'var(--text3)' }} />
                                <span style={{ color: 'var(--text3)', marginRight: 6 }}>
                                    {new Date(entry.timestamp).toLocaleTimeString('en', { hour12: false })}
                                </span>
                                <span>{entry.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Scan summary banner */}
                {scanSummary && !scanning && (
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                        <div className="scan-summary">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)' }}>
                                <CheckCircle2 size={20} strokeWidth={2} />
                                <span style={{ fontSize: 14, fontWeight: 600 }}>Scan Complete</span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 32 }}>
                                <div className="summary-stat">
                                    <div className="summary-stat-value">{formatTimer(scanSummary.totalTime)}</div>
                                    <div className="summary-stat-label">Duration</div>
                                </div>
                                <div className="summary-stat">
                                    <div className="summary-stat-value">{scanSummary.portalsScanned}</div>
                                    <div className="summary-stat-label">Portals</div>
                                </div>
                                <div className="summary-stat">
                                    <div className="summary-stat-value">{scanSummary.totalTenders}</div>
                                    <div className="summary-stat-label">Tenders</div>
                                </div>
                            </div>
                            <button className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--text3)' }} onClick={() => setScanSummary(null)}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Results header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {searchCollapsed && (
                            <button
                                className="panel-toggle"
                                onClick={() => setSearchCollapsed(false)}
                                title="Show search panel"
                                style={{ marginRight: 4 }}
                            >
                                <PanelLeftOpen size={16} />
                            </button>
                        )}
                        <h2 style={{ margin: 0, fontSize: 16 }}>
                            {sorted.length > 0 ? `${sorted.length} Tenders Found` : 'Tender Results'}
                        </h2>
                        {scanning && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <LoadingSpinner size={16} label="scanning…" />
                                <span className="scan-timer" style={{ fontSize: 12 }}>{formatTimer(elapsedSeconds)}</span>
                            </div>
                        )}
                    </div>
                    {sorted.length > 0 && (
                        <select
                            className="input"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                        >
                            <option value="deadline">Sort: Deadline</option>
                            <option value="value">Sort: Value</option>
                        </select>
                    )}
                </div>

                {/* Card grid */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {/* Skeleton loading */}
                    {initialLoading && sorted.length === 0 && !scanning && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="skeleton-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div className="skeleton-line" style={{ width: 60 }} />
                                        <div className="skeleton-line" style={{ width: 50 }} />
                                    </div>
                                    <div className="skeleton-line" style={{ width: '90%', height: 16 }} />
                                    <div className="skeleton-line" style={{ width: '70%' }} />
                                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                        <div className="skeleton-line" style={{ width: 60 }} />
                                        <div className="skeleton-line" style={{ width: 50 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state with recent searches */}
                    {sorted.length === 0 && !scanning && !initialLoading && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'var(--accent-dim)', color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <Search size={24} />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Start your tender search</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)', maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>
                                Enter keywords and select portals to deploy AI agents across government procurement platforms
                            </p>

                            {/* Recent search chips */}
                            {recentSearches.length > 0 && (
                                <div style={{ marginTop: 24 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                                        Recent Searches
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                        {recentSearches.map(s => (
                                            <button
                                                key={s.id}
                                                className="search-chip"
                                                onClick={() => navigate(`/app/history/${s.id}`)}
                                            >
                                                <Search size={11} strokeWidth={2} />
                                                {s.keywords}
                                                <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono' }}>
                                                    {s.tenders_found}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {sorted.length === 0 && scanning && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'var(--accent-dim)', color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <Zap size={24} className="animate-pulse-dot" />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Agents working…</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)', maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>
                                AI agents are scanning portals in real time. Results appear as each portal completes.
                            </p>
                            <div className="scan-timer" style={{ marginTop: 16, fontSize: 18 }}>
                                {formatTimer(elapsedSeconds)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                                {completedPortals} of {totalPortals} portals complete
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {sorted.map(t => (
                            <TenderCard key={t.id} tender={t} onSaveToggle={handleSaveToggle} />
                        ))}
                    </div>
                    {hasMore && !scanning && results.length > 0 && (
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <button className="btn btn-secondary" disabled={loadingMore} onClick={() => loadRecentTenders(page + 1)}>
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
