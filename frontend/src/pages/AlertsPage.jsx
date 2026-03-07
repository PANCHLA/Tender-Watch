import { useEffect, useState } from 'react'
import { fetchAlertSettings, updateAlertSettings, sendTestEmail } from '../lib/api'
import { useToastStore } from '../store'
import { PageLoader } from '../components/LoadingSpinner'
import { Mail } from 'lucide-react'

const ALERT_TYPES = [
    { key: 'new_tender', label: 'New tender found', desc: 'Notify when a watchlist scan finds new tenders' },
    { key: 'deadline_approaching', label: 'Deadline approaching', desc: 'Notify 3 days before a saved tender\'s deadline' },
]

export default function AlertsPage() {
    const { show } = useToastStore()
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    useEffect(() => {
        fetchAlertSettings().then(setSettings).finally(() => setLoading(false))
    }, [])

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true)
        try {
            await updateAlertSettings(settings)
            show('Alert settings saved', 'success')
        } catch { show('Failed to save', 'error') }
        finally { setSaving(false) }
    }

    async function handleTest() {
        setTesting(true)
        try {
            await sendTestEmail()
            show('Test email sent (check your inbox)', 'success')
        } catch { show('Failed to send test email', 'error') }
        finally { setTesting(false) }
    }

    function toggleAlertType(key) {
        setSettings(s => ({
            ...s,
            alert_on: s.alert_on?.includes(key)
                ? s.alert_on.filter(a => a !== key)
                : [...(s.alert_on || []), key],
        }))
    }

    if (loading) return <PageLoader />

    return (
        <div style={{ padding: 32, maxWidth: 600 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: 24 }}>Alert Settings</h1>
                <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13 }}>
                    Configure when and how you receive tender alerts
                </p>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Email toggle */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>Email Alerts</div>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Receive digest emails via Resend</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings?.email_enabled || false}
                                onChange={e => setSettings(s => ({ ...s, email_enabled: e.target.checked }))}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    {settings?.email_enabled && (
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email Address</label>
                            <input
                                className="input"
                                type="email"
                                value={settings?.email_address || ''}
                                onChange={e => setSettings(s => ({ ...s, email_address: e.target.value }))}
                                placeholder="you@company.com"
                            />
                        </div>
                    )}
                </div>

                {/* Alert types */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Alert Triggers</div>
                    {ALERT_TYPES.map(t => (
                        <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{t.desc}</div>
                            </div>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={settings?.alert_on?.includes(t.key) || false}
                                    onChange={() => toggleAlertType(t.key)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    ))}
                </div>

                {/* Digest time */}
                <div className="card" style={{ padding: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Daily Digest Time</label>
                    <input
                        className="input"
                        type="time"
                        value={settings?.digest_time || '08:00'}
                        onChange={e => setSettings(s => ({ ...s, digest_time: e.target.value }))}
                        style={{ width: 'auto', maxWidth: 160 }}
                    />
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text3)' }}>
                        Daily summary email will be sent at this time (UTC)
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing}>
                        {testing ? 'Sending…' : <><Mail size={14} strokeWidth={1.8} /> Send Test Email</>}
                    </button>
                </div>
            </form>
        </div>
    )
}
