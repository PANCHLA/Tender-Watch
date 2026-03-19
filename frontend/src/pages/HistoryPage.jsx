import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchHistory, deleteHistory } from '../lib/api'
import { useToastStore } from '../store'
import { History, Trash2, Search, ChevronRight } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function HistoryPage() {
    const { show } = useToastStore()
    const navigate = useNavigate()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadHistory()
    }, [])

    async function loadHistory() {
        try {
            setLoading(true)
            const data = await fetchHistory()
            setHistory(data.history || [])
        } catch (err) {
            show('Failed to load history', 'error')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(e, id) {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this history record?')) return
        try {
            await deleteHistory(id)
            setHistory(prev => prev.filter(h => h.id !== id))
            show('History record deleted', 'success')
        } catch (err) {
            show('Failed to delete history', 'error')
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <LoadingSpinner size={32} />
            </div>
        )
    }

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--amber-dim)', color: 'var(--amber)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <History size={20} />
                </div>
                <h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.02em' }}>Scan History</h1>
            </div>
            <p style={{ margin: '0 0 32px', color: 'var(--text3)' }}>
                Click on a past search to view its results.
            </p>

            {history.length === 0 ? (
                <EmptyState
                    icon={History}
                    title="No scan history"
                    subtitle="You haven't run any manual scans yet."
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {history.map(item => (
                        <div
                            key={item.id}
                            className="card hover-fx"
                            onClick={() => navigate(`/app/history/${item.id}`)}
                            style={{
                                padding: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 20,
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
                                        <Search size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle', color: 'var(--text3)' }} />
                                        &quot;{item.keywords}&quot;
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                                        {new Date(item.created_at).toLocaleString()}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text2)' }}>
                                    <div><span style={{ color: 'var(--text3)' }}>Portals:</span> {item.portals.join(', ').toUpperCase()}</div>
                                    {(item.min_value || item.max_value) && (
                                        <div>
                                            <span style={{ color: 'var(--text3)' }}>Value:</span> ₹{item.min_value || 0} - ₹{item.max_value || 'Any'}
                                        </div>
                                    )}
                                    {item.location && <div><span style={{ color: 'var(--text3)' }}>Location:</span> {item.location}</div>}
                                    <div style={{ color: item.tenders_found > 0 ? 'var(--accent)' : 'inherit', fontWeight: item.tenders_found > 0 ? 600 : 400 }}>
                                        {item.tenders_found} tender{item.tenders_found !== 1 ? 's' : ''} found
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    onClick={(e) => handleDelete(e, item.id)}
                                    className="btn btn-ghost"
                                    style={{ color: 'var(--text3)', padding: 8 }}
                                    title="Delete history"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
