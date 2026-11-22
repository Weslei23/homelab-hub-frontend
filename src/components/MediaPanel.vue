<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as api from '@/data/mediaApi'
import MediaRequest from '@/components/MediaRequest.vue'

// Painel de filmes e series: downloads (Sonarr/Radarr), proximos lancamentos e Jellyfin.
// Se o backend nao tem nenhum dos servicos configurado, o painel nao aparece.

const props = defineProps({
  /** ADMIN tambem ve a busca para pedir filmes e series */
  admin: { type: Boolean, default: false },
})

const OPEN_KEY = 'homepage.media.open'
const { POLL_ACTIVE_MS, POLL_IDLE_MS } = api

const SERVICES = [
  { key: 'sonarr', label: 'Sonarr' },
  { key: 'radarr', label: 'Radarr' },
  { key: 'jellyfin', label: 'Jellyfin' },
]
const STATE_LABELS = {
  queued: 'Na fila',
  downloading: 'Baixando',
  paused: 'Pausado',
  importing: 'Importando',
  warning: 'Atenção',
  failed: 'Falhou',
}

const overview = ref(null)
const loadError = ref('')
const open = ref(localStorage.getItem(OPEN_KEY) !== 'false')

let pollTimer = null
let unmounted = false

const services = computed(() => overview.value?.services ?? {})
const configured = computed(() => SERVICES.filter((s) => services.value[s.key]?.configured))
const visible = computed(() => configured.value.length > 0)
const online = (key) => services.value[key]?.configured && services.value[key]?.reachable
/** Tipos que podem ser pedidos: o Radarr (filmes) e o Sonarr (series) precisam estar online. */
const requestable = computed(() => ({ movie: !!online('radarr'), series: !!online('sonarr') }))
const canRequest = computed(() => props.admin && (requestable.value.movie || requestable.value.series))
const hasArr = computed(() => services.value.sonarr?.configured || services.value.radarr?.configured)
const hasActive = computed(() => (overview.value?.queue ?? []).some((i) => i.state !== 'paused'))

watch(open, (value) => {
  try {
    localStorage.setItem(OPEN_KEY, String(value))
  } catch {
    /* sem localStorage: so nao lembra a preferencia */
  }
  if (value) refresh()
  else clearTimeout(pollTimer)
})

async function refresh() {
  try {
    overview.value = await api.fetchMediaOverview()
    loadError.value = ''
  } catch (e) {
    loadError.value = e.message
  }
  schedule()
}

function schedule() {
  clearTimeout(pollTimer)
  if (unmounted || !open.value || !visible.value) return
  pollTimer = setTimeout(refresh, hasActive.value ? POLL_ACTIVE_MS : POLL_IDLE_MS)
}

function chipText(service) {
  const info = services.value[service.key]
  return info.reachable ? `${service.label} ${info.version}` : `${service.label} offline`
}

function stateLabel(item) {
  return STATE_LABELS[item.state] ?? item.state
}

/** "00:12:34" -> "12 min"; "02:05:00" -> "2 h 5 min"; dias vem como "1.02:00:00". */
function formatTimeLeft(value) {
  if (!value) return ''
  const match = /^(?:(\d+)\.)?(\d+):(\d+):(\d+)/.exec(value)
  if (!match) return value
  const hours = Number(match[1] ?? 0) * 24 + Number(match[2])
  const minutes = Number(match[3])
  if (hours > 0) return `${hours} h${minutes ? ` ${minutes} min` : ''}`
  return minutes > 0 ? `${minutes} min` : 'menos de 1 min'
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Data do lancamento: "Hoje 21:00", "Amanhã 02:00" ou "sex., 28/11 21:00". Filmes nao tem horario. */
function formatWhen(item) {
  const date = new Date(item.date)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const time = item.kind === 'episode' ? ` ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''
  if (sameDay(date, now)) return `Hoje${time}`
  if (sameDay(date, tomorrow)) return `Amanhã${time}`
  return `${date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}${time}`
}

onMounted(refresh)

onUnmounted(() => {
  unmounted = true
  clearTimeout(pollTimer)
})
</script>

<template>
  <section v-if="visible" class="media-panel" aria-label="Filmes e séries">
    <button type="button" class="panel-toggle" :aria-expanded="open" @click="open = !open">
      <span class="title">🎬 Filmes e séries</span>
      <span
        v-for="service in configured"
        :key="service.key"
        class="chip"
        :class="services[service.key].reachable ? 'online' : 'offline'"
      >
        {{ chipText(service) }}
      </span>
      <span class="chevron" :class="{ open }">▾</span>
    </button>

    <div v-show="open" class="panel-body">
      <p v-if="loadError" class="notice error">{{ loadError }}</p>
      <ul v-if="overview.errors.length" class="notice warning" aria-label="Avisos">
        <li v-for="error in overview.errors" :key="error">{{ error }}</li>
      </ul>

      <MediaRequest v-if="canRequest" :available="requestable" @requested="refresh" />

      <div class="columns">
        <div v-if="hasArr" class="block">
          <div class="block-title">
            <h3>Baixando agora</h3>
            <a v-if="services.sonarr?.url" :href="`${services.sonarr.url}/activity/queue`" target="_blank" rel="noopener" class="link-btn">Sonarr ↗</a>
            <a v-if="services.radarr?.url" :href="`${services.radarr.url}/activity/queue`" target="_blank" rel="noopener" class="link-btn">Radarr ↗</a>
          </div>
          <p v-if="overview.queue.length === 0" class="muted">Nenhum download em andamento.</p>
          <ul v-else class="list queue">
            <li v-for="(item, index) in overview.queue" :key="`${item.title}-${item.detail}-${index}`" :class="item.state">
              <div class="line">
                <span class="name">
                  {{ item.kind === 'movie' ? '🎬' : '📺' }} {{ item.title }}<small v-if="item.detail"> — {{ item.detail }}</small>
                </span>
                <span class="state">{{ stateLabel(item) }}</span>
              </div>
              <div
                class="bar"
                role="progressbar"
                :aria-valuenow="item.progress"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Progresso de ${item.title}`"
              >
                <span :style="{ width: `${item.progress}%` }" />
              </div>
              <small class="meta">
                {{ Math.round(item.progress) }}%<template v-if="item.timeLeft && item.state === 'downloading'"> · faltam {{ formatTimeLeft(item.timeLeft) }}</template>
              </small>
              <small v-if="item.message" class="warning-text">{{ item.message }}</small>
            </li>
          </ul>
        </div>

        <div v-if="services.jellyfin?.configured" class="block">
          <div class="block-title">
            <h3>Assistindo agora</h3>
            <a v-if="services.jellyfin.url" :href="services.jellyfin.url" target="_blank" rel="noopener" class="link-btn">Jellyfin ↗</a>
          </div>
          <p v-if="overview.nowPlaying.length === 0" class="muted">Ninguém assistindo.</p>
          <ul v-else class="list">
            <li v-for="(item, index) in overview.nowPlaying" :key="`${item.user}-${index}`" class="playing">
              <img v-if="item.imageUrl" :src="item.imageUrl" alt="" loading="lazy" class="thumb" />
              <div class="playing-info">
                <span class="name">{{ item.paused ? '⏸' : '▶' }} {{ item.title }}<small v-if="item.detail"> — {{ item.detail }}</small></span>
                <small class="meta">{{ item.user }}<template v-if="item.device"> · {{ item.device }}</template></small>
                <div class="bar" role="progressbar" :aria-valuenow="item.progress" aria-valuemin="0" aria-valuemax="100"
                  :aria-label="`Andamento de ${item.title}`">
                  <span :style="{ width: `${item.progress}%` }" />
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div v-if="hasArr" class="block">
          <div class="block-title">
            <h3>Próximos lançamentos</h3>
            <small class="muted">14 dias</small>
          </div>
          <p v-if="overview.upcoming.length === 0" class="muted">Nada previsto para os próximos dias.</p>
          <ul v-else class="list upcoming">
            <li v-for="(item, index) in overview.upcoming" :key="`${item.title}-${item.detail}-${index}`">
              <span class="when">{{ formatWhen(item) }}</span>
              <span class="name">
                {{ item.kind === 'movie' ? '🎬' : '📺' }} {{ item.title }}<small v-if="item.detail"> — {{ item.detail }}</small>
              </span>
              <span v-if="item.hasFile" class="badge" title="Já baixado">✓</span>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="services.jellyfin?.configured && overview.recent.length" class="block recent">
        <div class="block-title">
          <h3>Adicionados recentemente</h3>
        </div>
        <ul class="posters">
          <li v-for="item in overview.recent" :key="item.id">
            <a :href="item.link" target="_blank" rel="noopener" :title="[item.title, item.detail].filter(Boolean).join(' — ')">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" loading="lazy" />
              <span class="poster-title">{{ item.title }}</span>
              <small v-if="item.detail" class="poster-detail">{{ item.detail }}</small>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.media-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  margin-bottom: 32px;
}

.panel-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: none;
  border: none;
  color: #f8fafc;
  padding: 14px 18px;
  cursor: pointer;
  font-size: 15px;
  text-align: left;
}

.title {
  font-weight: 600;
  margin-right: 4px;
}

.chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #334155;
}

.chip.online {
  color: #86efac;
  border-color: #166534;
  background: #052e16;
}

.chip.offline {
  color: #fca5a5;
  border-color: #7f1d1d;
  background: #3b1d1d;
}

.chevron {
  margin-left: auto;
  color: #64748b;
  transform: rotate(-90deg);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: none;
}

.panel-body {
  padding: 0 18px 18px;
}

.notice {
  font-size: 13px;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 0 14px;
  list-style: none;
}

.notice.error {
  color: #fca5a5;
  background: #3b1d1d;
}

.notice.warning {
  color: #fde68a;
  background: #3a2e0b;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.block-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.block-title h3 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin: 0;
  margin-right: auto;
}

.link-btn {
  color: #60a5fa;
  font-size: 12px;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}

.muted {
  color: #94a3b8;
  font-size: 13px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.list li {
  background: #0f172a;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.name small,
.meta {
  color: #94a3b8;
}

.meta {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.state {
  color: #94a3b8;
  flex-shrink: 0;
}

.bar {
  height: 4px;
  background: #1e293b;
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}

.queue li.importing .bar span {
  background: #22c55e;
}

.queue li.warning .bar span {
  background: #eab308;
}

.queue li.failed .bar span {
  background: #ef4444;
}

.warning-text {
  display: block;
  margin-top: 4px;
  color: #fbbf24;
}

.playing {
  display: flex;
  gap: 10px;
  align-items: center;
}

.thumb {
  width: 36px;
  height: 54px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.playing-info {
  flex: 1;
  min-width: 0;
}

.upcoming li {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.when {
  color: #60a5fa;
  font-size: 12px;
  flex-shrink: 0;
  min-width: 92px;
}

.upcoming .name {
  flex: 1;
  min-width: 0;
}

.badge {
  color: #86efac;
}

.recent {
  margin-top: 18px;
}

.posters {
  list-style: none;
  margin: 0;
  padding: 0 0 6px;
  display: flex;
  gap: 12px;
  overflow-x: auto;
}

.posters li {
  flex: 0 0 110px;
}

.posters a {
  display: flex;
  flex-direction: column;
  color: #f8fafc;
  text-decoration: none;
}

.posters img {
  width: 110px;
  height: 165px;
  object-fit: cover;
  border-radius: 8px;
  background: #0f172a;
  margin-bottom: 6px;
}

.posters a:hover img {
  outline: 2px solid #2563eb;
}

.poster-title,
.poster-detail {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster-detail {
  color: #94a3b8;
}
</style>
