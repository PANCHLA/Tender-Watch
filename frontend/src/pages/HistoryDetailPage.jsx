import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchHistoryDetail } from '../lib/api'
import { useToastStore } from '../store'
import TenderCard from '../components/TenderCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import {
    ArrowLeft, Search, Calendar, MapPin, Landmark,
    FileText, Shield, TrainFront, Route, Globe,
} from 'lucide-react'

const PORTAL_META = {
    gem: { label: 'GeM', icon: Landmark, color: 'var(--blue)' },
    cppp: { label: 'CPPP', icon: FileText, color: 'var(--accent)' },
    mod: { label: 'Defence', icon: Shield, color: 'var(--amber)' },
    ireps: { label: 'Railways', icon: TrainFront, color: 'var(--red)' },
    nhai: { label: 'NHAI', icon: Route, color: '#a78bfa' },
}

export default function HistoryDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { show } = useToastStore()
    const [record, setRecord] = useState(null)
    const [tenders, setTenders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetchHistoryDetail(id)
            .then(data => {
                setRecord(data.history)
                setTenders(data.tenders || [])
            })
            .catch(() => show('Failed to load search details', 'error'))
            .finally(() => setLoading(false))
    }, [id])

    function handleSaveToggle(tenderId, newState) {
        setTenders(prev => prev.map(t =>
            t.id === tenderId ? { ...t, is_saved: newState } : t
        ))
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <LoadingSpinner size={32} />
            </div>
        )
    }

    if (!record) {
        return (
            <div style={{ padding: '32px 40px' }}>
                <EmptyState icon={Search} title="Search not found" subtitle="This search record doesn't exist or has been deleted." />
            </div>
        )
    }

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
            {/* Back button */}
            <button
                className="btn btn-ghost"
                onClick={() => navigate('/app/history')}
                style={{ marginBottom: 20, padding: '6px 12px', fontSize: 13, color: 'var(--text2)' }}
            >
                <ArrowLeft size={14} strokeWidth={2} /> Back to History
            </button>

            {/* Search metadata header */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: 'var(--accent-dim)', color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Search size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: '0 0 4px', fontSize: 22, letterSpacing: '-0.02em' }}>
                            "{record.keywords}"
                        </h1>
                        <div style={{ fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={12} strokeWidth={1.8} />
                            {new Date(record.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Search params */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                    {/* Portals */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portals:</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {(record.portals || []).map(p => {
                                const meta = PORTAL_META[p] || { label: p.toUpperCase(), icon: Globe, color: 'var(--text2)' }
                                const Icon = meta.icon
                                return (
                                    <span key={p} className="portal-chip active" style={{ fontSize: 10, padding: '2px 8px' }}>
                                        <Icon size={10} strokeWidth={2} /> {meta.label}
                                    </span>
                                )
                            })}
                        </div>
                    </div>

                    {/* Value range */}
                    {(record.min_value || record.max_value) && (
                        <div style={{ color: 'var(--text2)' }}>
                            <span style={{ color: 'var(--text3)' }}>Value:</span> ₹{record.min_value || 0} – ₹{record.max_value || 'Any'}
                        </div>
                    )}

                    {/* Location */}
                    {record.location && (
                        <div style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} strokeWidth={1.8} /> {record.location}
                        </div>
                    )}

                    {/* Result count */}
                    <div style={{
                        color: tenders.length > 0 ? 'var(--accent)' : 'var(--text3)',
                        fontWeight: 600,
                        fontFamily: 'DM Mono',
                    }}>
                        {tenders.length} tender{tenders.length !== 1 ? 's' : ''} found
                    </div>
                </div>
            </div>

            {/* Tender results */}
            {tenders.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title="No tenders from this search"
                    subtitle="This search didn't return any results, or the tenders may have been removed."
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {tenders.map(t => (
                        <TenderCard key={t.id} tender={t} onSaveToggle={handleSaveToggle} />
                    ))}
                </div>
            )}
        </div>
    )
}
