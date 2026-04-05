export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60_000) return 'just now'

    const minutes = Math.floor(diff / 60_000)
    const hours   = Math.floor(minutes / 60)
    const days    = Math.floor(hours / 24)
    const weeks   = Math.floor(days / 7)

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (minutes < 60) return rtf.format(-minutes, 'minute')
    if (hours < 24)   return rtf.format(-hours,   'hour')
    if (days < 7)     return rtf.format(-days,     'day')
    return rtf.format(-weeks, 'week')
}
