import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

export function GET() {
  const filePath = join(process.cwd(), 'data', 'all_questions.json')
  const content = readFileSync(filePath, 'utf-8')
  return new Response(content, {
    headers: { 'Content-Type': 'application/json' },
  })
}
