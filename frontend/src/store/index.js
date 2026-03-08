import { create } from 'zustand'
import { fetchTenders, fetchStats, saveTender as apiSave, fetchWatchlists } from '../lib/api'

// ── Utility ───────────────────────────────────────────────────
export function getUrgency(deadline) {
    if (!deadline) return { label: 'OPEN', color: 'open', days: null }
    const days = (new Date(deadline) - new Date()) / 86400000
    if (days < 0) return { label: 'CLOSED', color: 'open', days }
    if (days < 3) return { label: 'URGENT', color: 'urgent', days: Math.ceil(days) }
    if (days < 10) return { label: '< 10 DAYS', color: 'medium', days: Math.ceil(days) }
    return { label: 'OPEN', color: 'open', days: Math.ceil(days) }
}

export function formatValue(value) {
    if (!value) return null
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`
    return `₹${Number(value).toLocaleString('en-IN')}`
}

// ── Auth Store ────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
    user: null,
    session: null,
    loading: true,
    setUser: (user, session) => set({ user, session, loading: false }),
    clearUser: () => set({ user: null, session: null, loading: false }),
}))

// ── Scan Store ────────────────────────────────────────────────
export const useScanStore = create((set, get) => ({
    scanning: false,
    portalStatus: {},   // portal_key → 'pending'|'scanning'|'done'|'error'
    activityLog: [],
    results: [],        // flat list of tenders from current/last scan
    lastSearch: null,

    startScan: (portals, keywords) => set({
        scanning: true,
        results: [],
        activityLog: [],
        lastSearch: { keywords, portals },
        portalStatus: Object.fromEntries(portals.map(p => [p, 'pending'])),
    }),

    addActivity: (entry) => set(s => ({
        activityLog: [entry, ...s.activityLog].slice(0, 60),
    })),

    setPortalStatus: (portal, status) => set(s => ({
        portalStatus: { ...s.portalStatus, [portal]: status },
    })),

    addResults: (tenders) => set(s => ({
        results: [...s.results, ...tenders],
    })),

    setSaved: (id, is_saved) => set(s => ({
        results: s.results.map(t =>
            t.id === id ? { ...t, is_saved } : t
        ),
    })),

    stopScan: () => set({ scanning: false }),
}))

// ── Tenders Store ─────────────────────────────────────────────
export const useTenderStore = create((set, get) => ({
    tenders: [],
    stats: null,
    loading: false,
    selectedTender: null,

    loadTenders: async (params, append = false) => {
        set({ loading: true })
        try {
            const data = await fetchTenders(params)
            set(s => ({
                tenders: append ? [...s.tenders, ...(data.tenders || [])] : (data.tenders || []),
                loading: false
            }))
        } catch (err) {
            set({ loading: false })
            useToastStore.getState().show(err.message || 'Failed to load tenders', 'error')
        }
    },

    loadStats: async () => {
        try {
            const stats = await fetchStats()
            set({ stats })
        } catch (err) {
            useToastStore.getState().show('Failed to load dashboard statistics', 'error')
        }
    },

    toggleSave: async (id) => {
        try {
            const res = await apiSave(id)
            set(s => ({
                tenders: s.tenders.map(t => t.id === id ? { ...t, is_saved: res.is_saved } : t),
            }))
            return res
        } catch (err) {
            useToastStore.getState().show('Failed to save tender', 'error')
            throw err
        }
    },

    setSelected: (tender) => set({ selectedTender: tender }),
    clearSelected: () => set({ selectedTender: null }),
}))

// ── Watchlists Store ──────────────────────────────────────────
export const useWatchlistStore = create((set) => ({
    watchlists: [],
    loading: false,

    load: async () => {
        set({ loading: true })
        try {
            const data = await fetchWatchlists()
            set({ watchlists: data, loading: false })
        } catch (err) {
            set({ loading: false })
            useToastStore.getState().show('Failed to load watchlists', 'error')
        }
    },

    add: (wl) => set(s => ({ watchlists: [...s.watchlists, wl] })),
    update: (id, wl) => set(s => ({ watchlists: s.watchlists.map(w => w.id === id ? wl : w) })),
    remove: (id) => set(s => ({ watchlists: s.watchlists.filter(w => w.id !== id) })),
}))

// ── Toast Store ───────────────────────────────────────────────
export const useToastStore = create((set) => ({
    toasts: [],
    show: (message, type = 'info') => {
        const id = Date.now()
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => {
            set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
        }, 4000)
    },
    remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
