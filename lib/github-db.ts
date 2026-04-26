const OWNER = 'yalcins'
const REPO = 'yds-trainer'
const DB_PATH = 'data/user_questions.json'

async function ghFetch(path: string, options?: RequestInit) {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      ...(options?.headers ?? {}),
    },
  })
}

export async function readUserQuestions(): Promise<any[]> {
  const res = await ghFetch(`contents/${DB_PATH}`)
  if (res.status === 404) return []
  const data = await res.json()
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
}

export async function writeUserQuestions(questions: any[]) {
  // get current SHA
  const res = await ghFetch(`contents/${DB_PATH}`)
  const sha = res.status === 200 ? (await res.json()).sha : undefined

  const content = Buffer.from(JSON.stringify(questions, null, 2)).toString('base64')

  await ghFetch(`contents/${DB_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `update user_questions [${new Date().toISOString().slice(0, 10)}]`,
      content,
      ...(sha ? { sha } : {}),
    }),
  })
}

export async function appendUserQuestion(question: any) {
  const existing = await readUserQuestions()
  existing.push(question)
  await writeUserQuestions(existing)
}
