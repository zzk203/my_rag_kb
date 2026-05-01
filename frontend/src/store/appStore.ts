import { create } from 'zustand'
import type { Collection, Conversation, Message } from '../types'
import * as collectionsApi from '../api/collections'
import * as chatApi from '../api/chat'

interface AppStore {
  collections: Collection[]
  currentCollectionId: number | null
  conversations: Conversation[]
  currentConversationId: number | null
  messages: Message[]

  loadCollections: () => Promise<void>
  setCurrentCollection: (id: number | null) => void
  loadConversations: () => Promise<void>
  setCurrentConversation: (id: number | null) => void
  loadMessages: (convId: number) => Promise<void>
  addMessage: (msg: Message) => void
  replaceMessage: (id: number, msg: Message) => void
  removeMessage: (id: number) => void
  addConversation: (conv: Conversation) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  collections: [],
  currentCollectionId: null,
  conversations: [],
  currentConversationId: null,
  messages: [],

  loadCollections: async () => {
    const data = await collectionsApi.getCollections()
    set({ collections: data })
    if (!get().currentCollectionId && data.length > 0) {
      set({ currentCollectionId: data[0].id })
    }
  },

  setCurrentCollection: (id) => {
    set({ currentCollectionId: id, currentConversationId: null, messages: [] })
    get().loadConversations()
  },

  loadConversations: async () => {
    const cid = get().currentCollectionId
    const data = cid ? await chatApi.getConversations(cid) : []
    set({ conversations: data })
  },

  setCurrentConversation: async (id) => {
    set({ currentConversationId: id, messages: [] })
    if (id) {
      await get().loadMessages(id)
    }
  },

  loadMessages: async (convId) => {
    const data = await chatApi.getConversationMessages(convId)
    set({ messages: data })
  },

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  replaceMessage: (id, msg) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? msg : m)),
    })),

  removeMessage: (id) =>
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== id),
    })),

  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),
}))
