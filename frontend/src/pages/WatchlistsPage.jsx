import { useEffect, useState } from 'react'
import { fetchWatchlists, createWatchlist, updateWatchlist, deleteWatchlist } from '../lib/api'
import { useToastStore } from '../store'
import EmptyState from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import {
    Landmark, FileText, Shield, TrainFront, Route,
    ListChecks, X,
} from 'lucide-react'

const ALL_PORTALS = [
    { key: 'gem', label: 'GeM', icon: Landmark },
    { key: 'cppp', label: 'CPPP', icon: FileText },
    { key: 'mod', label: 'Defence', icon: Shield },
    { key: 'ireps', label: 'Railways', icon: TrainFront },
    { key: 'nhai', label: 'NHAI', icon: Route },
]

function WatchlistModal({ initial, onClose, onSave }) {
    const [name, setName] = useState(initial?.name || '')
    const [keywords, setKeywords] = useState(initial?.keywords?.join(', ') || '')
    const [portals, setPortals] = useState(initial?.portals || ['gem'])
    const [freq, setFreq] = useState(initial?.scan_frequency || 'daily')
    const [saving, setSaving] = useState(false)

    function togglePortal(key) {
        setPortals(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!name.trim() || !keywords.trim()) return
        setSaving(true)
        const body = {
            name, scan_frequency: freq,
            keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
            portals,
        }
        await onSave(body)
        setSaving(false)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 520 }}>
                <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{initial ? 'Edit Watchlist' : 'Create Watchlist'}</h2>
                    <button className="panel-toggle" onClick={onClose} style={{ padding: 4 }} title="Close"><X size={18} strokeWidth={1.8} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Watchlist Name</label>
                        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. IT Hardware Projects" required />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Keywords (comma-separated)</label>
                        <input className="input" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="networking, switches, routers" required />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Portals</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {ALL_PORTALS.map(p => {
                                const Icon = p.icon
                                return (
                                    <button key={p.key} type="button" className={`portal-chip${portals.includes(p.key) ? ' active' : ''}`} onClick={() => togglePortal(p.key)}>
                                        <Icon size={12} strokeWidth={2} /> {p.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Scan Frequency</label>
                        <select className="input" value={freq} onChange={e => setFreq(e.target.value)}>
                            <option value="daily">Daily</option>
                            <option value="twice_daily">Twice Daily</option>
                            <option value="hourly">Hourly (Pro)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : initial ? 'Update Watchlist' : 'Create Watchlist'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function WatchlistsPage() {
    const { show } = useToastStore()
    const [watchlists, setWatchlists] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [editing, setEditing] = useState(null)

    useEffect(() => {
        fetchWatchlists().then(setWatchlists).finally(() => setLoading(false))
    }, [])

    async function handleCreate(body) {
        try {
            const wl = await createWatchlist(body)
            setWatchlists(prev => [...prev, wl])
            show('Watchlist created', 'success')
        } catch { show('Failed to create', 'error') }
    }

    async function handleUpdate(id, body) {
        try {
            const wl = await updateWatchlist(id, body)
            setWatchlists(prev => prev.map(w => w.id === id ? wl : w))
            show('Watchlist updated', 'success')
        } catch { show('Failed to update', 'error') }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this watchlist?')) return
        try {
            await deleteWatchlist(id)
            setWatchlists(prev => prev.filter(w => w.id !== id))
            show('Watchlist deleted', 'success')
        } catch { show('Failed to delete', 'error') }
    }

    if (loading) return <PageLoader />

    return (
        <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: 24 }}>Watchlists</h1>
                    <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13 }}>
                        Automated monitoring — agents scan on your schedule
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    + New Watchlist
                </button>
            </div>

            {watchlists.length === 0 ? (
                <EmptyState
                    icon={ListChecks}
                    title="No watchlists yet"
                    subtitle="Create a watchlist to automatically monitor portals for relevant tenders on a schedule."
                    action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Watchlist</button>}
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {watchlists.map(wl => (
                        <div key={wl.id} className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'DM Sans', fontWeight: 700 }}>{wl.name}</h3>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <span className={`badge ${wl.is_active ? 'badge-open' : 'badge-blue'}`}>
                                        {wl.is_active ? 'ACTIVE' : 'PAUSED'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                                {wl.keywords?.map(k => (
                                    <span key={k} style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', color: 'var(--text2)', fontFamily: 'DM Mono' }}>
                                        {k}
                                    </span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                {wl.portals?.map(p => (
                                    <span key={p} className="portal-chip active" style={{ fontSize: 10 }}>{p.toUpperCase()}</span>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono' }}>
                                    {wl.scan_frequency || 'daily'}
                                    {wl.last_scanned_at ? ` • last: ${new Date(wl.last_scanned_at).toLocaleDateString()}` : ''}
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-secondary" onClick={() => setEditing(wl)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                        Edit
                                    </button>
                                    <button className="btn btn-danger" onClick={() => handleDelete(wl.id)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <WatchlistModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
            )}
            {editing && (
                <WatchlistModal
                    initial={editing}
                    onClose={() => setEditing(null)}
                    onSave={(body) => handleUpdate(editing.id, body)}
                />
            )}
        </div>
    )
}
