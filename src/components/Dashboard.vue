<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useCategories, loadCatalog } from '@/data/useCategories'
import CardModal from '@/components/CardModal.vue'
import CategoryModal from '@/components/CategoryModal.vue'
import ServiceCard from '@/components/ServiceCard.vue'

const { categories, apiOnline, addCategory, renameCategory, removeCategory, addCard, updateCard, removeCard } =
  useCategories()

const search = ref('')
const editMode = ref(false)
// Controles de edicao so aparecem com o backend online e o modo de edicao ligado
const canEdit = computed(() => apiOnline.value && editMode.value)
const cardTarget = ref(null)
const categoryTarget = ref(null)

const submitCard = (payload) =>
  cardTarget.value.mode === 'edit'
    ? updateCard(cardTarget.value.card.id, payload)
    : addCard(cardTarget.value.categoryId, payload)

const submitCategory = (label) =>
  categoryTarget.value.mode === 'edit'
    ? renameCategory(categoryTarget.value.category.id, label)
    : addCategory(label)

async function deleteCategory(category) {
  const count = category.services.length
  const extra = count ? ` e seus ${count} card(s)` : ''
  if (!confirm(`Excluir a categoria "${category.label}"${extra}?`)) return
  try {
    await removeCategory(category.id)
  } catch (e) {
    alert(e.message)
  }
}

const now = ref(new Date())
let timer

onMounted(() => {
  loadCatalog()
  timer = setInterval(() => (now.value = new Date()), 1000 * 30)
})
onUnmounted(() => clearInterval(timer))
const greeting = computed(() => {
  const h = now.value.getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const formattedDate = computed(() =>
  now.value.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
)
const formattedTime = computed(() =>
  now.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
)

const filteredCategories = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return categories.value

  return categories.value
    .map((category) => ({
      ...category,
      services: category.services.filter(
        (service) =>
          service.name.toLowerCase().includes(term) ||
          (service.description || '').toLowerCase().includes(term)
      ),
    }))
    .filter((category) => category.services.length > 0)
})
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div>
        <h1>{{ greeting }} 👋</h1>
        <p class="subtitle">{{ formattedDate }} · {{ formattedTime }}</p>
      </div>

      <div class="header-actions">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="search" type="text" placeholder="Buscar serviço..." aria-label="Buscar serviço" />
        </div>
        <button
          v-if="canEdit"
          class="add-category"
          @click="categoryTarget = { mode: 'create' }"
        >
          + Categoria
        </button>
        <button
          v-if="apiOnline"
          class="edit-toggle"
          :class="{ active: editMode }"
          :aria-pressed="editMode"
          @click="editMode = !editMode"
        >
          {{ editMode ? '✓ Concluir' : '✎ Editar' }}
        </button>
      </div>
    </header>

    <p v-if="!apiOnline" class="offline">
      Backend indisponível — exibindo o catálogo padrão; não é possível editar.
    </p>

    <section v-for="category in filteredCategories" :key="category.id" class="category-section">
      <div class="category-title">
        <h2>{{ category.label }}</h2>
        <template v-if="canEdit && !search.trim()">
          <button class="icon-btn" title="Renomear categoria" aria-label="Renomear categoria"
            @click="categoryTarget = { mode: 'edit', category }">✎</button>
          <button class="icon-btn" title="Excluir categoria" aria-label="Excluir categoria"
            @click="deleteCategory(category)">🗑</button>
        </template>
      </div>
      <div class="grid">
        <ServiceCard
          v-for="service in category.services"
          :key="service.id ?? service.name"
          :service="service"
          :editable="canEdit"
          @edit="cardTarget = { mode: 'edit', card: $event }"
        />
        <button
          v-if="canEdit && !search.trim()"
          class="add-card"
          @click="cardTarget = { mode: 'create', categoryId: category.id }"
        >
          + Novo card
        </button>
      </div>
    </section>

    <p v-if="filteredCategories.length === 0" class="empty">
      <template v-if="search.trim()">Nenhum serviço encontrado para "{{ search }}".</template>
      <template v-else>Nenhuma categoria ainda. Clique em "Editar" e depois em "+ Categoria".</template>
    </p>

    <CardModal :target="cardTarget" :on-submit="submitCard" :on-delete="() => removeCard(cardTarget.card.id)"
      @close="cardTarget = null" />
    <CategoryModal :target="categoryTarget" :on-submit="submitCategory" @close="categoryTarget = null" />
  </div>
</template>

<style scoped>
.dashboard {
  flex: 1;
  padding: 32px 40px;
  min-height: 100vh;
  background: #0f172a;
  color: #f8fafc;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}

.dashboard-header h1 {
  font-size: 26px;
  margin: 0 0 6px 0;
}

.subtitle {
  color: #94a3b8;
  font-size: 14px;
  text-transform: capitalize;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 10px 14px;
  min-width: 260px;
}

.search-box input {
  border: none;
  outline: none;
  background: transparent;
  color: #f8fafc;
  font-size: 14px;
  width: 100%;
}

.search-box input::placeholder {
  color: #64748b;
}

.category-section {
  margin-bottom: 32px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.add-category,
.add-card {
  background: transparent;
  border: 1px dashed #475569;
  color: #94a3b8;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
}

.add-category {
  padding: 10px 14px;
}

.edit-toggle {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  cursor: pointer;
}

.edit-toggle:hover {
  border-color: #2563eb;
}

.edit-toggle.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.add-card {
  min-height: 74px;
}

.add-category:hover,
.add-card:hover {
  border-color: #2563eb;
  color: #f8fafc;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}

.category-title h2 {
  margin: 0;
}

.icon-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 6px;
}

.icon-btn:hover {
  background: #1e293b;
  color: #f8fafc;
}

.category-section h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 14px;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.offline {
  background: #3b1d1d;
  border: 1px solid #7f1d1d;
  color: #fca5a5;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 20px;
}

.empty {
  color: #94a3b8;
  font-size: 14px;
}

@media (max-width: 640px) {
  .dashboard {
    padding: 20px;
  }
}
</style>
