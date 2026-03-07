import { isValidElement, createElement } from 'react'

export default function EmptyState({ icon, title, subtitle, action }) {
    // icon can be a Lucide component (forwardRef object or function), a React element, or a string
    let iconEl
    if (isValidElement(icon)) {
        iconEl = icon
    } else if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
        iconEl = createElement(icon, { size: 48, strokeWidth: 1.2, color: 'var(--text3)' })
    } else {
        iconEl = <span style={{ fontSize: 48, opacity: 0.4 }}>{icon || '📭'}</span>
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: 12,
            textAlign: 'center',
        }}>
            <div style={{ opacity: 0.5 }}>{iconEl}</div>
            <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Playfair Display, serif', color: 'var(--text2)' }}>
                {title}
            </h3>
            {subtitle && (
                <p style={{ margin: 0, color: 'var(--text3)', fontSize: 13, maxWidth: 360 }}>
                    {subtitle}
                </p>
            )}
            {action && <div style={{ marginTop: 8 }}>{action}</div>}
        </div>
    )
}
