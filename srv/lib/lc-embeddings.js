import { Embeddings } from '@langchain/core/embeddings'
import { embedTexts } from './embed.js'

// Wraps embed.js so LangChain components can use it.
// Documents and questions use different Gemini task types.
export class GeminiEmbeddings extends Embeddings {
  constructor() {
    super({})
  }
  async embedDocuments(texts) {
    return embedTexts(texts, 'RETRIEVAL_DOCUMENT')
  }
  async embedQuery(text) {
    const [vec] = await embedTexts([text], 'RETRIEVAL_QUERY')
    return vec
  }
}