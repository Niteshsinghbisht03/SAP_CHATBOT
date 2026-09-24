import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export async function chunkPdf(buffer, { chunkSize, chunkOverlap }) {
  const pages = await new PDFLoader(new Blob([buffer])).load()

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', '']
  })
  const docs = await splitter.splitDocuments(pages)

  return docs
    .map(d => ({ content: d.pageContent.trim(), page: d.metadata?.loc?.pageNumber }))
    .filter(c => c.content.length > 0)
    .map((c, i) => ({
      chunkIndex: i,
      content: c.content,
      metadata: JSON.stringify({ page: c.page })
    }))
}