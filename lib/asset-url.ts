const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
export const assetUrl = (path: string) => `${BASE}${path}`
