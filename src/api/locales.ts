export type Locale = {
    code: string
    name: string
    is_current: number
}

export async function getLocales(): Promise<Locale[]> {
    const res = await fetch('/api/field/locales')
    return res.json()
}
