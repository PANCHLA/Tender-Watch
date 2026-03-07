import { useState } from 'react'
import { useTenderStore, useToastStore, getUrgency, formatValue } from '../store'
import { saveTender, readTender } from '../lib/api'
import TenderDetailModal from './TenderDetailModal'
import {
    Landmark, FileText, Shield, TrainFront, Route,
    Globe, Calendar, MapPin, Bookmark, BookmarkCheck,
} from 'lucide-react'

const PORTAL_META = {
    gem: { label: 'GeM', icon: Landmark, color: 'var(--blue)' },
    cppp: { label: 'CPPP', icon: FileText, color: 'var(--accent)' },
    mod: { label: 'Defence', icon: Shield, color: 'var(--amber)' },
    ireps: { label: 'Railways', icon: TrainFront, color: 'var(--red)' },
    nhai: { label: 'NHAI', icon: Route, color: '#a78bfa' },
}

export default function TenderCard({ tender, onSaveToggle }) {
    const { show } = useToastStore()
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [localSaved, setLocalSaved] = useState(tender.is_saved)

    const urgency = getUrgency(tender.deadline)
    const value = formatValue(tender.value || tender.value_numeric)
    const portal = PORTAL_META[tender.portal] || { label: tender.portal, icon: Globe, color: 'var(--text2)' }
    const PortalIcon = portal.icon

    async function handleSave(e) {
        e.stopPropagation()
        setSaving(true)
        try {
            const res = await saveTender(tender.id)
            setLocalSaved(res.is_saved)
            onSaveToggle?.(tender.id, res.is_saved)
            show(res.is_saved ? 'Tender saved' : 'Tender removed from saved', 'success')
        } catch {
            show('Failed to save tender', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function handleOpen() {
        if (!tender.is_read) {
            try { await readTender(tender.id) } catch { }
        }
        setShowModal(true)
    }

    const urgencyClass = {
        urgent: 'badge-urgent',
        medium: 'badge-medium',
        open: 'badge-open',
    }[urgency.color] || 'badge-open'

    return (
        <>
            <div
                className="card"
                onClick={handleOpen}
                style={{
                    padding: '18px 20px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${urgency.color === 'urgent' ? 'var(--red)' :
                        urgency.color === 'medium' ? 'var(--amber)' : 'var(--border)'
                        }`,
                    opacity: tender.is_read ? 0.8 : 1,
                }}
            >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PortalIcon size={14} strokeWidth={1.8} style={{ color: portal.color }} />
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono', fontWeight: 500 }}>
                            {portal.label}
                        </span>
                        {!tender.is_read && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                        )}
                    </div>
                    <span className={`badge ${urgencyClass}`}>{urgency.label}</span>
                </div>

                {/* Title */}
                <h3 style={{
                    margin: '0 0 8px',
                    fontSize: 14,
                    fontFamily: 'DM Sans',
                    fontWeight: 600,
                    color: 'var(--text)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {tender.title}
                </h3>

                {/* Department */}
                {tender.department && (
                    <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
                        {tender.department}
                    </p>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {value && (
                        <span className="value-green" style={{ fontSize: 15, fontWeight: 600 }}>{value}</span>
                    )}
                    {tender.deadline && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} strokeWidth={1.8} /> {urgency.days !== null ? `${urgency.days}d left` : tender.deadline}
                        </span>
                    )}
                    {tender.location && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} strokeWidth={1.8} /> {tender.location}
                        </span>
                    )}
                </div>

                {/* Reference + Save */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    {tender.reference_number ? (
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono' }}>
                            {tender.reference_number}
                        </span>
                    ) : <span />}
                    <button
                        className={`btn btn-ghost`}
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            color: localSaved ? 'var(--accent)' : 'var(--text3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {localSaved
                            ? <><BookmarkCheck size={13} strokeWidth={2} /> Saved</>
                            : <><Bookmark size={13} strokeWidth={1.8} /> Save</>
                        }
                    </button>
                </div>
            </div>

            {showModal && (
                <TenderDetailModal
                    tender={tender}
                    onClose={() => setShowModal(false)}
                    onSaveToggle={onSaveToggle}
                />
            )}
        </>
    )
}
