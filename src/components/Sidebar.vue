<script setup>
import { computed, ref } from 'vue'
import servidorIcon from '@/components/icons/servidor.svg'
import { useCategories } from '@/data/useCategories'
import { resolveIcon } from '@/data/icons'

const { categories } = useCategories()
// Acesso rapido mostra a primeira categoria
const quickCategories = computed(() => categories.value.slice(0, 1))

defineProps({
  title: {
    type: String,
    default: 'Homelab',
  },
})

const emit = defineEmits(['close'])

// Categorias abertas por padrao (todas)
const closedCategories = ref({})

function toggleCategory(id) {
  closedCategories.value[id] = !closedCategories.value[id]
}
</script>

<template>
  <div class="sidebar-container">
    <aside>
      <header class="header">
        <img class="header-logo" :src="servidorIcon" alt="Homelab logo" />
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="emit('close')" aria-label="Fechar menu">✕</button>
      </header>

      <hr class="divider" />

      <main class="main-content">
        <p class="section-title">ACESSO RÁPIDO</p>

        <div v-for="category in quickCategories" :key="category.id" class="category">
          <button class="category-toggle" @click="toggleCategory(category.id)">
            <span>{{ category.label }}</span>
            <span class="chevron" :class="{ open: !closedCategories[category.id] }">▾</span>
          </button>

          <nav v-show="!closedCategories[category.id]" class="menu">
            <a
              v-for="service in category.services"
              :key="service.id ?? service.name"
              class="links"
              :href="service.url"
              target="_blank"
              rel="noopener"
            >
              <img v-if="resolveIcon(service.icon)" :src="resolveIcon(service.icon)" :alt="service.name" />
              <span>{{ service.name }}</span>
            </a>
          </nav>
        </div>
      </main>
    </aside>
  </div>
</template>

<style scoped>
.sidebar-container {
  width: 260px;
  min-height: 100vh;
  background: #111827;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px;
  flex-shrink: 0;
  overflow-y: auto;
}

.header {
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 22px;
}

.header-logo {
  width: 34px;
  height: 34px;
  margin-right: 10px;
}

.header h3 {
  flex: 1;
}

.close-btn {
  display: none;
  background: none;
  border: none;
  color: #f8fafc;
  font-size: 18px;
  cursor: pointer;
}

.divider {
  border: none;
  border-top: 1px solid #334155;
  margin: 20px 0;
  width: 100%;
}

.section-title {
  color: #64748b;
  margin-bottom: 16px;
  font-size: 13px;
  letter-spacing: 0.05em;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  width: 100%;
}

.category {
  width: 100%;
  margin-bottom: 4px;
}

.category-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 6px;
  cursor: pointer;
}

.chevron {
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 0;
  width: 100%;
  margin-bottom: 8px;
}

.links {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  width: 100%;
  padding: 10px 12px;

  color: white;
  text-decoration: none;
  border-radius: 10px;
  transition: background-color 0.2s;
}

.links img {
  width: 26px;
  height: 26px;
  border-radius: 6px;
}

.links:hover {
  background-color: #2563eb;
}

@media (max-width: 900px) {
  .close-btn {
    display: block;
  }
}
</style>
