<script setup>
import { computed, ref, watch } from 'vue'
import { MONITOR_OPTIONS, requestMedia, searchMedia } from '@/data/mediaApi'

// Busca um filme (Radarr) ou serie (Sonarr) e pede o download. So aparece para ADMIN.

const props = defineProps({
  /** Quais tipos estao disponiveis: { movie: boolean, series: boolean } */
  available: { type: Object, required: true },
})
const emit = defineEmits(['requested'])

const type = ref(props.available.movie ? 'movie' : 'series')
const term = ref('')
const monitor = ref('all')
const results = ref([])
const searched = ref(false)
const searching = ref(false)
const requesting = ref(new Set())
const feedback = ref(null) // { ok, text }

const placeholder = computed(() => (type.value === 'movie' ? 'Nome do filme' : 'Nome da série'))

// Trocar o tipo limpa a busca anterior
watch(type, () => {
  results.value = []
  searched.value = false
  feedback.value = null
})

async function search() {
  const query = term.value.trim()
  if (query.length < 2) {
    feedback.value = { ok: false, text: 'Digite pelo menos 2 letras para buscar' }
    return
  }
  searching.value = true
  feedback.value = null
  try {
    results.value = await searchMedia(type.value, query)
    searched.value = true
  } catch (e) {
    feedback.value = { ok: false, text: e.message }
  } finally {
    searching.value = false
  }
}

async function request(result) {
  requesting.value = new Set(requesting.value).add(result.id)
  feedback.value = null
  try {
    const response = await requestMedia(result.type, result.id, monitor.value)
    results.value = results.value.map((r) => (r.id === result.id ? { ...r, inLibrary: true } : r))
    feedback.value = { ok: true, text: response.message }
    emit('requested')
  } catch (e) {
    feedback.value = { ok: false, text: e.message }
  } finally {
    const next = new Set(requesting.value)
    next.delete(result.id)
    requesting.value = next
  }
}
</script>

<template>
  <div class="media-request">
    <form class="search-form" @submit.prevent="search">
      <div class="type-toggle" role="radiogroup" aria-label="Tipo">
        <label :class="{ active: type === 'movie', disabled: !available.movie }">
          <input v-model="type" type="radio" value="movie" :disabled="!available.movie" /> 🎬 Filme
        </label>
        <label :class="{ active: type === 'series', disabled: !available.series }">
          <input v-model="type" type="radio" value="series" :disabled="!available.series" /> 📺 Série
        </label>
      </div>
      <input v-model="term" type="search" :placeholder="placeholder" :aria-label="placeholder" maxlength="100" />
      <select v-if="type === 'series'" v-model="monitor" aria-label="Quais episódios baixar">
        <option v-for="option in MONITOR_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <button type="submit" class="primary" :disabled="searching">{{ searching ? 'Buscando...' : 'Buscar' }}</button>
    </form>
    <p v-if="feedback" class="feedback" :class="{ error: !feedback.ok }" role="status">{{ feedback.text }}</p>

    <p v-if="searched && results.length === 0" class="muted">Nada encontrado para "{{ term.trim() }}".</p>
    <ul v-else-if="results.length" class="results">
      <li v-for="result in results" :key="result.id">
        <img v-if="result.posterUrl" :src="result.posterUrl" alt="" loading="lazy" class="poster" />
        <div v-else class="poster empty">{{ result.type === 'movie' ? '🎬' : '📺' }}</div>
        <div class="info">
          <strong>{{ result.title }}<small v-if="result.year"> ({{ result.year }})</small></strong>
          <p v-if="result.overview" class="overview">{{ result.overview }}</p>
        </div>
        <button v-if="result.inLibrary" type="button" class="small" disabled>✓ Na biblioteca</button>
        <button
          v-else
          type="button"
          class="small primary"
          :disabled="requesting.has(result.id)"
          :aria-label="`Baixar ${result.title}`"
          @click="request(result)"
        >
          {{ requesting.has(result.id) ? 'Pedindo...' : 'Baixar' }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.media-request {
  margin-bottom: 4px;
}

.search-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.search-form input[type='search'] {
  flex: 1;
  min-width: 200px;
}

.type-toggle {
  display: flex;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}

.type-toggle label {
  padding: 8px 12px;
  font-size: 14px;
  color: #94a3b8;
  cursor: pointer;
  background: #0f172a;
}

.type-toggle label.active {
  background: #2563eb;
  color: #fff;
}

.type-toggle label.disabled {
  opacity: 0.4;
  cursor: default;
}

.type-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

input,
select {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 9px 12px;
  color: #f8fafc;
  font-size: 14px;
  outline: none;
}

input:focus,
select:focus {
  border-color: #2563eb;
}

button {
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #334155;
  background: #0f172a;
  color: #cbd5e1;
  flex-shrink: 0;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

button.small {
  padding: 6px 12px;
  font-size: 13px;
}

.feedback {
  margin-top: 8px;
  font-size: 13px;
  color: #86efac;
}

.feedback.error {
  color: #f87171;
}

.muted {
  color: #94a3b8;
  font-size: 13px;
  margin-top: 10px;
}

.results {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.results li {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #0f172a;
  border-radius: 8px;
  padding: 8px;
}

.poster {
  width: 46px;
  height: 69px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: #1e293b;
}

.poster.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.info {
  flex: 1;
  min-width: 0;
}

.info strong {
  font-size: 14px;
  font-weight: 600;
}

.info small {
  color: #94a3b8;
  font-weight: 400;
}

.overview {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
