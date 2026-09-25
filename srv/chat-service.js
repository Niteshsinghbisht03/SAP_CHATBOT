import cds from '@sap/cds'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { ragGraph, retriever } from './lib/rag-graph.js'
import { asText } from './lib/hana-retriever.js'

const HISTORY_LIMIT = 10

export default class ChatService extends cds.ApplicationService {
  init() {
    const { ChatSessions, ChatMessages } = cds.entities('ragchatbot.db')

    // Debug helper: shows retrieval only, no Gemini answer
    this.on('search', async req => {
      const { question, topK = 4 } = req.data
      if (!question?.trim()) return req.reject(400, 'question is required')
      retriever.k = topK
      const docs = await retriever.invoke(question)
      retriever.k = 5
      return docs.map(d => ({
        content: d.pageContent,
        filename: d.metadata.filename,
        metadata: JSON.stringify({ page: d.metadata.page }),
        score: d.metadata.score
      }))
    })

    this.on('chat', async req => {
      const question = req.data.question?.trim()
      if (!question) return req.reject(400, 'question is required')
      if (question.length > 2000) return req.reject(400, 'question is too long (max 2000 characters)')

      const userId = req.user.id

      let sessionId = req.data.sessionId
      if (sessionId) {
        const s = await SELECT.one.from(ChatSessions).where({ ID: sessionId, userId })
        if (!s) return req.reject(404, 'Session not found')
      } else {
        sessionId = cds.utils.uuid()
        await INSERT.into(ChatSessions).entries({ ID: sessionId, userId, title: question.slice(0, 80) })
      }

      const recent = await SELECT.from(ChatMessages)
        .where({ session_ID: sessionId })
        .orderBy('createdAt desc', 'role asc')
        .limit(HISTORY_LIMIT)
      const rows = recent.reverse()
      while (rows[0]?.role === 'ai') rows.shift()
      const history = rows.map(m =>
        m.role === 'ai' ? new AIMessage(asText(m.content)) : new HumanMessage(asText(m.content))
      )

      const result = await ragGraph.invoke({ question, history })

      await INSERT.into(ChatMessages).entries([
        { session_ID: sessionId, role: 'human', content: question },
        { session_ID: sessionId, role: 'ai', content: result.answer }
      ])

      const seen = new Set()
      const sources = []
      for (const d of result.docs ?? []) {
        const { filename, page, score } = d.metadata
        const key = `${filename}#${page}`
        if (seen.has(key)) continue
        seen.add(key)
        sources.push({ filename, page, score })
      }

      return { sessionId, answer: result.answer, sources }
    })

    // List this user's conversations, newest first
    this.on('mySessions', req =>
      SELECT.from(ChatSessions)
        .columns('ID', 'title', 'createdAt')
        .where({ userId: req.user.id })
        .orderBy('createdAt desc')
    )

    // Load one conversation (only if it belongs to this user)
    this.on('sessionMessages', async req => {
      const { sessionId } = req.data
      const s = await SELECT.one.from(ChatSessions).where({ ID: sessionId, userId: req.user.id })
      if (!s) return req.reject(404, 'Session not found')
      const rows = await SELECT.from(ChatMessages)
        .columns('role', 'content', 'createdAt')
        .where({ session_ID: sessionId })
        .orderBy('createdAt asc', 'role desc') // human before ai when timestamps match
      return rows.map(r => ({ ...r, content: asText(r.content) }))
    })

    // Delete a conversation and its messages
    this.on('deleteSession', async req => {
      const { sessionId } = req.data
      const s = await SELECT.one.from(ChatSessions).where({ ID: sessionId, userId: req.user.id })
      if (!s) return req.reject(404, 'Session not found')
      await DELETE.from(ChatMessages).where({ session_ID: sessionId })
      await DELETE.from(ChatSessions).where({ ID: sessionId })
      return true
    })
    
     this.on('me', req => ({ id: req.user.id, isAdmin: req.user.is('Admin') }))
    return super.init()
  }
}