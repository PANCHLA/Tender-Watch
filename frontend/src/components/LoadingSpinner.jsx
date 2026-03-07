export default function LoadingSpinner({ size = 20, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg
                width={size} height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                className="animate-spin-slow"
            >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            {label && <span style={{ color: 'var(--text2)', fontSize: 13 }}>{label}</span>}
        </div>
    )
}

export function PageLoader() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            gap: 16,
        }}>
            <LoadingSpinner size={32} />
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Loading…</span>
        </div>
    )
}
