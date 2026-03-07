import { useEffect, useState } from 'react'
import { fetchTenders } from '../lib/api'
import TenderCard from '../components/TenderCard'
import EmptyState from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'

export default function SavedPage() {
    const [tenders, setTenders] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchTenders({ is_saved: true })
            .then(data => setTenders(data.tenders || []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    function handleUnsave(id, newState) {
        if (!newState) setTenders(prev => prev.filter(t => t.id !== id))
    }

    if (loading) return <PageLoader />

    return (
        <div style={{ padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: 24 }}>Saved Tenders</h1>
                <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13 }}>
                    {tenders.length} tender{tenders.length !== 1 ? 's' : ''} saved
                </p>
            </div>

            {tenders.length === 0 ? (
                <EmptyState
                    icon={Bookmark}
                    title="No saved tenders"
                    subtitle="Save tenders from the dashboard to keep track of opportunities you're interested in."
                    action={
                        <button className="btn btn-primary" onClick={() => navigate('/app')}>
                            Search Tenders
                        </button>
                    }
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {tenders.map(t => (
                        <TenderCard key={t.id} tender={t} onSaveToggle={handleUnsave} />
                    ))}
                </div>
            )}
        </div>
    )
}
