import api from './client'
import type { Collection, CollectionCreate, CollectionStats } from '../types'

export const getCollections = () =>
  api.get<Collection[]>('/collections').then((r) => r.data)

export const createCollection = (data: CollectionCreate) =>
  api.post<Collection>('/collections', data).then((r) => r.data)

export const updateCollection = (id: number, data: Partial<CollectionCreate>) =>
  api.put<Collection>(`/collections/${id}`, data).then((r) => r.data)

export const deleteCollection = (id: number) =>
  api.delete(`/collections/${id}`).then((r) => r.data)

export const getCollectionStats = (id: number) =>
  api.get<CollectionStats>(`/collections/${id}/stats`).then((r) => r.data)
