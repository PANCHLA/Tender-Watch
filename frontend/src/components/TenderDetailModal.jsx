import { useState } from 'react'
import { getUrgency, formatValue, useToastStore } from '../store'
import { saveTender } from '../lib/api'
import { Bookmark, BookmarkCheck, X, ExternalLink } from 'lucide-react'

export default function TenderDetailModal({ tender, onClose, onSaveToggle }) {
    const { show } = useToastStore()
    const [saving, setSaving] = useState(false)
    const [localSaved, setLocalSaved] = useState(tender.is_saved)

    const urgency = getUrgency(tender.deadline)
    const value = formatValue(tender.value || tender.value_numeric)

    // Prefer tender_url (direct listing link), fall back to source_url (portal base)
    const portalLink = tender.tender_url || tender.source_url

    const urgencyClass = {
        urgent: 'badge-urgent',
        medium: 'badge-medium',
        open: 'badge-open',
    }[urgency.color] || 'badge-open'

    function handleBg(e) {
        if (e.target === e.currentTarget) onClose()
    }

    async function handleSave() {
        setSaving(true)
        try {
            const res = await saveTender(tender.id)
            setLocalSaved(res.is_saved)
            onSaveToggle?.(tender.id, res.is_saved)
            show(res.is_saved ? 'Tender saved' : 'Tender unsaved', 'success')
        } catch {
            show('Failed to save tender', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={handleBg}>
            <div className="modal-box">
                {/* Header */}
                <div style={{ padding: '24px 24px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                        <span className={`badge ${urgencyClass}`}>
                            {urgency.label}
                            {urgency.days !== null && ` — ${urgency.days}d left`}
                        </span>
                        <button className="panel-toggle" onClick={onClose} style={{ padding: 4 }} title="Close">
                            <X size={18} strokeWidth={1.8} />
                        </button>
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 20, lineHeight: 1.3 }}>{tender.title}</h2>
                    {tender.department && (
                        <p style={{ margin: '0 0 4px', color: 'var(--text2)', fontSize: 13 }}>{tender.department}</p>
                    )}
                </div>

                <hr className="divider" style={{ margin: '16px 0' }} />

                {/* Details grid */}
                <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {[
                        { label: 'Contract Value', value: value, mono: true, accent: true },
                        { label: 'Submission Deadline', value: tender.deadline, mono: true },
                        { label: 'Portal', value: tender.portal?.toUpperCase() },
                        { label: 'Location', value: tender.location || 'Not specified' },
                        { label: 'Reference No.', value: tender.reference_number, mono: true, span: 2 },
                    ].filter(f => f.value).map(field => (
                        <div key={field.label} style={{ gridColumn: field.span ? `span ${field.span}` : undefined }}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                                {field.label}
                            </div>
                            <div style={{
                                fontSize: field.accent ? 18 : 13,
                                fontFamily: field.mono ? 'DM Mono' : 'DM Sans',
                                color: field.accent ? 'var(--accent)' : 'var(--text)',
                                fontWeight: field.accent ? 700 : 400,
                            }}>
                                {field.value}
                            </div>
                        </div>
                    ))}
                </div>

                {tender.description && (
                    <div style={{ padding: '0 24px 16px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            Description
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                            {tender.description}
                        </p>
                    </div>
                )}

                <hr className="divider" />

                {/* Actions */}
                <div style={{ padding: '16px 24px', display: 'flex', gap: 10 }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        {localSaved
                            ? <><BookmarkCheck size={14} strokeWidth={2} /> Saved</>
                            : <><Bookmark size={14} strokeWidth={1.8} /> Save Tender</>
                        }
                    </button>
                    {portalLink && (
                        <a
                            href={portalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            View Portal <ExternalLink size={13} strokeWidth={1.8} />
                        </a>
                    )}
                    <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
