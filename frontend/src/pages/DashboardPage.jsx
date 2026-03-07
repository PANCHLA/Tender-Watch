import { useState, useRef, useEffect } from 'react'
import { useScanStore, useToastStore } from '../store'
import { openScanStream, fetchTenders } from '../lib/api'
import TenderCard from '../components/TenderCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import {
    Landmark, FileText, Shield, TrainFront, Route,
    Zap, Search, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

const ALL_PORTALS = [
    { key: 'gem', label: 'GeM', icon: Landmark },
    { key: 'cppp', label: 'CPPP', icon: FileText },
    { key: 'mod', label: 'Defence', icon: Shield },
    { key: 'ireps', label: 'Railways', icon: TrainFront },
    { key: 'nhai', label: 'NHAI', icon: Route },
]

export default function DashboardPage() {
    const { show } = useToastStore()
    const { scanning, activityLog, results, portalStatus, startScan, stopScan, addActivity, setPortalStatus, addResults, toggleSave } = useScanStore()

    const [keywords, setKeywords] = useState('')
    const [selectedPortals, setSelectedPortals] = useState(['gem', 'cppp'])
    const [minValue, setMinValue] = useState('')
    const [maxValue, setMaxValue] = useState('')
    const [location, setLocation] = useState('')
    const [sortBy, setSortBy] = useState('deadline')
    const [searchCollapsed, setSearchCollapsed] = useState(false)

    const abortRef = useRef(null)
    const feedRef = useRef(null)

    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = 0
    }, [activityLog.length])

    // Load recent tenders from DB on mount (survives page refresh)
    useEffect(() => {
        if (results.length === 0 && !scanning) {
            fetchTenders({ page_size: 50 })
                .then(data => {
                    if (data.tenders?.length > 0) {
                        addResults(data.tenders)
                    }
                })
                .catch(() => { })
        }
    }, [])

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
                    // Tenders arrive with real DB UUIDs from the backend
                    addResults(e.tenders)
                },
                onError: (e) => {
                    if (e.portal) {
                        setPortalStatus(e.portal, 'error')
                    } else {
                        // Global error (e.g. network / backend down) — stop scanning
                        stopScan()
                    }
                    addActivity({ type: 'ERROR', portal: e.portal, message: `${e.portal_name || 'Error'}: ${e.error}`, timestamp: new Date().toISOString() })
                    show(`${e.portal_name || 'Scan'} failed: ${e.error || 'unknown error'}`, 'error')
                },
                onDone: (e) => {
                    stopScan()
                    addActivity({ type: 'DONE', message: `Scan complete — ${e.total} tenders found`, timestamp: new Date().toISOString() })
                    show(`Found ${e.total} tenders`, 'success')
                },
            }
        )
    }

    function handleStop() {
        abortRef.current?.()
        stopScan()
        addActivity({ type: 'STOP', message: 'Scan stopped by user', timestamp: new Date().toISOString() })
    }

    function handleSaveToggle(id) {
        toggleSave(id)
    }

    const sorted = [...results].sort((a, b) => {
        if (sortBy === 'deadline') {
            const now = new Date().toISOString().slice(0, 10)
            const aOpen = (a.deadline || '9999-99-99') >= now
            const bOpen = (b.deadline || '9999-99-99') >= now
            // Open tenders first, closed last
            if (aOpen !== bOpen) return aOpen ? -1 : 1
            // Among open: nearest deadline first; among closed: most recent first
            if (aOpen) return (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99')
            return (b.deadline || '').localeCompare(a.deadline || '')
        }
        if (sortBy === 'value') return (b.value || b.value_numeric || 0) - (a.value || a.value_numeric || 0)
        return 0
    })

    const statusColor = { scanning: 'var(--amber)', done: 'var(--accent)', error: 'var(--red)', pending: 'var(--text3)' }
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

                {/* Portal status indicators */}
                {Object.keys(portalStatus).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                            Portal Status
                        </div>
                        {ALL_PORTALS.filter(p => selectedPortals.includes(p.key)).map(p => {
                            const Icon = p.icon
                            return (
                                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Icon size={13} strokeWidth={1.8} /> {p.label}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: statusColor[portalStatus[p.key]] || 'var(--text3)' }}>
                                        {portalStatus[p.key] === 'scanning' && <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />}
                                        {portalStatus[p.key] || 'pending'}
                                    </span>
                                </div>
                            )
                        })}
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
                        {scanning && <LoadingSpinner size={16} label="scanning…" />}
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
                    {sorted.length === 0 && !scanning && (
                        <EmptyState
                            icon={Search}
                            title="Start your tender search"
                            subtitle="Enter keywords and select portals to deploy AI agents across government procurement platforms"
                        />
                    )}
                    {sorted.length === 0 && scanning && (
                        <EmptyState icon={Zap} title="Agents working…" subtitle="AI agents are scanning portals in real time. Results appear as each portal completes." />
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {sorted.map(t => (
                            <TenderCard key={t.id} tender={t} onSaveToggle={handleSaveToggle} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
