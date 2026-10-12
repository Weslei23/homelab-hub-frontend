import { getToken, logout } from '@/data/useAuth'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    // 401: token ausente, invalido ou expirado -> volta para a tela de login
    if (res.status === 401) {
      logout()
      throw new Error('Sessão expirada. Entre novamente.')
    }
    let message = 'Erro ao comunicar com o servidor'
    try {
      message = (await res.json()).message || message
    } catch {
      /* corpo vazio */
    }
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

export const fetchCatalog = () => request('/catalog')

export const createCategory = (label) => request('/categories', json('POST', { label }))
export const renameCategory = (id, label) => request(`/categories/${id}`, json('PUT', { label }))
export const deleteCategory = (id) => request(`/categories/${id}`, { method: 'DELETE' })

export const createCard = (categoryId, card) => request(`/categories/${categoryId}/cards`, json('POST', card))
export const updateCard = (id, card) => request(`/cards/${id}`, json('PUT', card))
export const deleteCard = (id) => request(`/cards/${id}`, { method: 'DELETE' })
