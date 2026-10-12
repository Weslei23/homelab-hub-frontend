import { ref } from 'vue'
import { categories as defaults } from '@/data/services'
import * as api from '@/data/catalogApi'

// Sem backend, mostra o catalogo padrao (somente leitura)
const categories = ref(defaults)
const apiOnline = ref(true)

export async function loadCatalog() {
  try {
    categories.value = await api.fetchCatalog()
    apiOnline.value = true
  } catch {
    categories.value = defaults
    apiOnline.value = false
  }
}

// Apos cada alteracao, recarrega do servidor para refletir ids e ordem reais
async function mutate(action) {
  const result = await action()
  await loadCatalog()
  return result
}

const actions = {
  addCategory: (label) => mutate(() => api.createCategory(label)),
  renameCategory: (id, label) => mutate(() => api.renameCategory(id, label)),
  removeCategory: (id) => mutate(() => api.deleteCategory(id)),
  addCard: (categoryId, card) => mutate(() => api.createCard(categoryId, card)),
  updateCard: (id, card) => mutate(() => api.updateCard(id, card)),
  removeCard: (id) => mutate(() => api.deleteCard(id)),
}

export function useCategories() {
  return { categories, apiOnline, ...actions }
}
