export function hoursAgo(hours: number): string {
    return new Date(Date.now() - hours * 3_600_000).toISOString()
}
