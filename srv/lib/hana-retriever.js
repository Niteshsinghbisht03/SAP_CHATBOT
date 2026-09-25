import cds from '@sap/cds'
import { BaseRetriever } from '@langchain/core/retrievers'
import { Document } from '@langchain/core/documents'
import { toVectorString } from './embed.js'

// HANA's driver can return long text as a Buffer
export const asText = v => (Buffer.isBuffer(v) ? v.toString('utf8') : v)

export class HanaRetriever extends BaseRetriever {
  lc_namespace = ['ragchatbot', 'retrievers']

  constructor({ embeddings, k = 8 }) {
    super()
    this.embeddings = embeddings
    this.k = k
  }

  async _getRelevantDocuments(query) {
    const vec = await this.embeddings.embedQuery(query)

    const rows = await cds.db.run(
      `SELECT c.CONTENT  AS "content",
              d.FILENAME AS "filename",
              c.METADATA AS "metadata",
              COSINE_SIMILARITY(c.EMBEDDING, TO_REAL_VECTOR(?)) AS "score"
         FROM RAGCHATBOT_DB_CHUNKS AS c
         JOIN RAGCHATBOT_DB_DOCUMENTS AS d ON d.ID = c.DOCUMENT_ID
        WHERE d.STATUS = 'ready'
        ORDER BY "score" DESC
        LIMIT ?`,
      [toVectorString(vec), this.k]
    )

    return rows.map(r => {
      const meta = JSON.parse(asText(r.metadata) || '{}')
      return new Document({
        pageContent: asText(r.content),
        metadata: { filename: r.filename, page: meta.page, score: r.score }
      })
    })
  }
}