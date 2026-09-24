import cds from '@sap/cds'
import { chunkPdf } from './lib/chunker.js'
import { embedTexts, toVectorString } from './lib/embed.js'

export default class AdminService extends cds.ApplicationService {
  init() {
    const { Documents, Chunks } = cds.entities('ragchatbot.db')

    this.on('uploadDocument', async req => {
      const { filename, fileBase64, chunkSize = 1000, chunkOverlap = 200 } = req.data

      if (!filename || !fileBase64) return req.reject(400, 'filename and fileBase64 are required')
      if (chunkOverlap >= chunkSize) return req.reject(400, 'chunkOverlap must be smaller than chunkSize')

      const buffer = Buffer.from(fileBase64, 'base64')
      const chunks = await chunkPdf(buffer, { chunkSize, chunkOverlap })
      if (!chunks.length) return req.reject(422, 'No text found. Is this a scanned PDF?')

      const vectors = await embedTexts(chunks.map(c => c.content), 'RETRIEVAL_DOCUMENT')

      const documentId = cds.utils.uuid()
      await INSERT.into(Documents).entries({
        ID: documentId,
        filename,
        uploadedBy: req.user.id,
        chunkSize,
        chunkOverlap,
        chunkingStrategy: 'hybrid',
        status: 'ready'
      })

      const rows = chunks.map((c, i) => ({
        document_ID: documentId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        embedding: toVectorString(vectors[i]),
        metadata: c.metadata
      }))
      for (let i = 0; i < rows.length; i += 100) {
        await INSERT.into(Chunks).entries(rows.slice(i, i + 100))
      }

      return { documentId, chunkCount: rows.length }
    })

    this.on('deleteDocument', async req => {
      const { documentId } = req.data
      await DELETE.from(Chunks).where({ document_ID: documentId })
      const n = await DELETE.from(Documents).where({ ID: documentId })
      return n > 0
    })

    return super.init()
  }
}