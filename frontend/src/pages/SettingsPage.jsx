import { useAuthStore } from '../store'

export default function SettingsPage() {
    const { user } = useAuthStore()

    return (
        <div style={{ padding: 32, maxWidth: 580 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: 24 }}>Settings</h1>
                <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13 }}>Manage your profile and API configuration</p>
            </div>

            {/* Profile */}
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text2)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>
                    Profile
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email</label>
                        <input className="input" value={user?.email || 'dev@tenderwatch.in'} disabled style={{ opacity: 0.6 }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Full Name</label>
                        <input className="input" defaultValue={user?.user_metadata?.full_name || ''} placeholder="Your name" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Company</label>
                        <input className="input" defaultValue="" placeholder="Your company" />
                    </div>
                    <button className="btn btn-primary" style={{ width: 'fit-content' }}>Save Profile</button>
                </div>
            </div>

            {/* Plan */}
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Current Plan</div>
                        <div style={{ fontSize: 22, fontFamily: 'Playfair Display', fontWeight: 700 }}>Free</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Basic search • 3 watchlists • Daily alerts</div>
                    </div>
                    <button className="btn btn-primary">
                        Upgrade to Pro ↗
                    </button>
                </div>
            </div>
        </div>
    )
}
