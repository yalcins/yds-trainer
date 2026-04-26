const ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'

export async function githubAI(
  messages: { role: string; content: string }[],
  stream = false
) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub Models API error: ${res.status} ${err}`)
  }

  return res
}
