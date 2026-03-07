import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmail, signInWithGoogle } from '../lib/supabase'
import { useAuthStore, useToastStore } from '../store'
import LoadingSpinner from '../components/LoadingSpinner'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { setUser } = useAuthStore()
    const { show } = useToastStore()
    const navigate = useNavigate()

    async function handleLogin(e) {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await signInWithEmail(email, password)
        setLoading(false)
        if (error) return show(error.message, 'error')
        setUser(data.user, data.session)
        navigate('/app')
    }

    async function handleGoogle() {
        const { error } = await signInWithGoogle()
        if (error) show(error.message, 'error')
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
            <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700 }}>
                        Tender<span style={{ color: 'var(--accent)' }}>Watch</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontFamily: 'DM Mono' }}>
                        GOVERNMENT CONTRACT INTELLIGENCE
                    </div>
                </div>

                <div className="card" style={{ padding: 28 }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: 18, textAlign: 'center' }}>Sign In</h2>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email</label>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Password</label>
                            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                            {loading ? <LoadingSpinner size={16} /> : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ position: 'relative', margin: '20px 0', textAlign: 'center' }}>
                        <hr className="divider" />
                        <span style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', fontSize: 11, color: 'var(--text3)' }}>
                            OR
                        </span>
                    </div>

                    <button className="btn btn-secondary" onClick={handleGoogle} style={{ width: '100%', justifyContent: 'center' }}>
                        <span>G</span> Continue with Google
                    </button>

                    <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                        Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign up</Link>
                    </p>
                </div>

                {/* Dev bypass */}
                <button
                    className="btn btn-ghost"
                    onClick={() => { setUser({ email: 'demo@tenderwatch.in' }, null); navigate('/app') }}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 12, color: 'var(--text3)', fontSize: 12 }}
                >
                    Continue as Demo User (no auth required)
                </button>
            </div>
        </div>
    )
}
