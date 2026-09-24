import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-embedding-001'
export const DIMS = 768   // MUST match Vector(768) in schema.cds
const BATCH = 50

let client
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }))
}

const normalize = v => {
  const n = Math.hypot(...v)
  return n ? v.map(x => x / n) : v
}

export async function embedTexts(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  const out = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await getClient().models.embedContent({
      model: MODEL,
      contents: texts.slice(i, i + BATCH),
      config: { taskType, outputDimensionality: DIMS }
    })
    out.push(...res.embeddings.map(e => normalize(e.values)))
  }
  return out
}

export const toVectorString = v => `[${v.join(',')}]`