import { useToastStore } from '../store'

export default function Toast() {
    const { toasts, remove } = useToastStore()
    if (!toasts.length) return null

    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
                        <span>{t.message}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
