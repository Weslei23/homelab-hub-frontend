<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as api from '@/data/musicApi'

// Painel de downloads pelo Downtify. So aparece para ADMIN e quando o backend tem DOWNTIFY_URL.

const OPEN_KEY = 'homepage.music.open'
const { POLL_ACTIVE_MS, POLL_IDLE_MS } = api

const STATUS_LABELS = { queued: 'Na fila', downloading: 'Baixando', done: 'Concluído', error: 'Erro' }
/** Mensagem apos colocar na fila, conforme o tipo de link. */
function queuedMessage({ queued, type }) {
  if (type === 'faixa') return 'Faixa enviada para a fila'
  const origin = type === 'album' ? 'do álbum' : 'da playlist'
  return `${queued} faixa(s) ${origin} enviada(s) para a fila`
}

const status = ref(null)
const open = ref(localStorage.getItem(OPEN_KEY) !== 'false')

const link = ref('')
const downloading = ref(false)
const feedback = ref(null) // { ok: boolean, text }

const queue = ref([])
const queueError = ref('')

const playlists = ref([])
const playlistUrl = ref('')
const playlistName = ref('')
const adding = ref(false)
const playlistFeedback = ref(null)
const syncing = ref(new Set())

let pollTimer = null
let unmounted = false

const hasActive = computed(() => queue.value.some((item) => item.status === 'queued' || item.status === 'downloading'))
const hasFinished = computed(() => queue.value.some((item) => item.status === 'done' || item.status === 'error'))

watch(open, (value) => {
  try {
    localStorage.setItem(OPEN_KEY, String(value))
  } catch {
    /* sem localStorage: so nao lembra a preferencia */
  }
  // Recolhido: cancela a proxima atualizacao ja agendada; ao abrir, atualiza na hora
  if (value) refreshQueue()
  else clearTimeout(pollTimer)
})

async function loadStatus() {
  try {
    status.value = await api.fetchMusicStatus()
  } catch {
    status.value = null
  }
}

async function refreshQueue() {
  try {
    queue.value = await api.fetchMusicQueue()
    queueError.value = ''
  } catch (e) {
    queueError.value = e.message
  }
  schedulePoll()
}

function schedulePoll() {
  clearTimeout(pollTimer)
  if (unmounted || !open.value) return
  pollTimer = setTimeout(refreshQueue, hasActive.value ? POLL_ACTIVE_MS : POLL_IDLE_MS)
}

async function loadPlaylists() {
  try {
    playlists.value = await api.fetchPlaylists()
  } catch (e) {
    playlistFeedback.value = { ok: false, text: e.message }
  }
}

async function download() {
  const url = link.value.trim()
  if (!api.spotifyType(url)) {
    feedback.value = { ok: false, text: 'Cole um link do Spotify de faixa, álbum ou playlist (https://open.spotify.com/...)' }
    return
  }
  downloading.value = true
  feedback.value = null
  try {
    const result = await api.downloadMusic(url)
    feedback.value = { ok: true, text: queuedMessage(result) }
    link.value = ''
    await refreshQueue()
  } catch (e) {
    feedback.value = { ok: false, text: e.message }
  } finally {
    downloading.value = false
  }
}

async function clearFinished() {
  try {
    await api.clearCompletedQueue()
    await refreshQueue()
  } catch (e) {
    queueError.value = e.message
  }
}

async function add() {
  const url = playlistUrl.value.trim()
  if (api.spotifyType(url) !== 'playlist') {
    playlistFeedback.value = { ok: false, text: 'Use o link de uma playlist do Spotify (https://open.spotify.com/playlist/...)' }
    return
  }
  adding.value = true
  playlistFeedback.value = null
  try {
    const created = await api.addPlaylist(url, playlistName.value.trim())
    playlistFeedback.value = { ok: created.lastSyncOk !== false, text: `"${created.name}": ${created.lastSyncMessage ?? 'cadastrada'}` }
    playlistUrl.value = ''
    playlistName.value = ''
    await Promise.all([loadPlaylists(), refreshQueue()])
  } catch (e) {
    playlistFeedback.value = { ok: false, text: e.message }
  } finally {
    adding.value = false
  }
}

function replace(updated) {
  playlists.value = playlists.value.map((p) => (p.id === updated.id ? updated : p))
}

async function toggle(playlist) {
  try {
    replace(await api.setPlaylistEnabled(playlist.id, !playlist.enabled))
  } catch (e) {
    playlistFeedback.value = { ok: false, text: e.message }
  }
}

async function sync(playlist) {
  syncing.value = new Set(syncing.value).add(playlist.id)
  try {
    const updated = await api.syncPlaylist(playlist.id)
    replace(updated)
    playlistFeedback.value = { ok: updated.lastSyncOk !== false, text: `"${updated.name}": ${updated.lastSyncMessage}` }
    await refreshQueue()
  } catch (e) {
    playlistFeedback.value = { ok: false, text: e.message }
  } finally {
    const next = new Set(syncing.value)
    next.delete(playlist.id)
    syncing.value = next
  }
}

async function remove(playlist) {
  if (!confirm(`Parar de acompanhar "${playlist.name}"? As músicas já baixadas continuam no Downtify.`)) return
  try {
    await api.deletePlaylist(playlist.id)
    playlists.value = playlists.value.filter((p) => p.id !== playlist.id)
  } catch (e) {
    playlistFeedback.value = { ok: false, text: e.message }
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function progressOf(item) {
  if (item.status === 'done') return 100
  return Math.max(0, Math.min(100, Math.round(item.progress ?? 0)))
}

onMounted(async () => {
  await loadStatus()
  if (status.value?.configured) {
    await Promise.all([loadPlaylists(), open.value ? refreshQueue() : Promise.resolve()])
  }
})

onUnmounted(() => {
  unmounted = true
  clearTimeout(pollTimer)
})
</script>

<template>
  <section v-if="status?.configured" class="music-panel" aria-label="Downloads de música">
    <button type="button" class="panel-toggle" :aria-expanded="open" @click="open = !open">
      <span class="title">🎵 Músicas</span>
      <span class="chip" :class="status.reachable ? 'online' : 'offline'">
        {{ status.reachable ? `Downtify ${status.version} · online` : 'Downtify indisponível' }}
      </span>
      <span class="chevron" :class="{ open }">▾</span>
    </button>

    <div v-show="open" class="panel-body">
      <form class="download-form" @submit.prevent="download">
        <input
          v-model="link"
          type="url"
          aria-label="Link do Spotify"
          placeholder="Cole um link do Spotify: faixa, álbum ou playlist"
        />
        <button type="submit" class="primary" :disabled="downloading">{{ downloading ? 'Enviando...' : 'Baixar' }}</button>
      </form>
      <p v-if="feedback" class="feedback" :class="{ error: !feedback.ok }" role="status">{{ feedback.text }}</p>

      <div class="columns">
        <div class="block queue">
          <div class="block-title">
            <h3>Fila do Downtify</h3>
            <button v-if="hasFinished" type="button" class="link-btn" @click="clearFinished">Limpar concluídos</button>
          </div>
          <p v-if="queueError" class="feedback error">{{ queueError }}</p>
          <p v-else-if="queue.length === 0" class="muted">Nada na fila.</p>
          <ul v-else class="queue-list">
            <li v-for="(item, index) in queue" :key="`${item.title}-${index}`" :class="item.status">
              <div class="queue-line">
                <span class="track">
                  {{ item.title ?? 'Faixa sem nome' }}<small v-if="item.artists"> — {{ item.artists }}</small>
                </span>
                <span class="state">{{ STATUS_LABELS[item.status] ?? item.status }}</span>
              </div>
              <div
                class="bar"
                role="progressbar"
                :aria-valuenow="progressOf(item)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Progresso de ${item.title}`"
              >
                <span :style="{ width: `${progressOf(item)}%` }" />
              </div>
              <small v-if="item.status === 'error' && item.message" class="error-text">{{ item.message }}</small>
            </li>
          </ul>
        </div>

        <div class="block playlists">
          <div class="block-title">
            <h3>Playlists automáticas</h3>
            <small class="muted">conferidas a cada {{ status.syncInterval }}</small>
          </div>

          <p v-if="playlists.length === 0" class="muted">
            Nenhuma playlist acompanhada. As faixas novas de uma playlist cadastrada são baixadas sozinhas.
          </p>
          <ul v-else class="playlist-list">
            <li v-for="playlist in playlists" :key="playlist.id" :class="{ failed: playlist.lastSyncOk === false }">
              <div class="playlist-info">
                <a :href="playlist.url" target="_blank" rel="noopener">{{ playlist.name }}</a>
                <small class="muted">
                  {{ playlist.knownTracks }} faixa(s)
                  <template v-if="playlist.lastSyncAt"> · {{ formatDate(playlist.lastSyncAt) }}: {{ playlist.lastSyncMessage }}</template>
                  <template v-else> · ainda não sincronizada</template>
                </small>
              </div>
              <label class="switch" :title="playlist.enabled ? 'Sincronização automática ligada' : 'Sincronização automática desligada'">
                <input type="checkbox" :checked="playlist.enabled" :aria-label="`Automática: ${playlist.name}`" @change="toggle(playlist)" />
                Automática
              </label>
              <button type="button" class="small" :disabled="syncing.has(playlist.id)" @click="sync(playlist)">
                {{ syncing.has(playlist.id) ? 'Sincronizando...' : 'Sincronizar' }}
              </button>
              <button type="button" class="small danger" :aria-label="`Remover ${playlist.name}`" @click="remove(playlist)">✕</button>
            </li>
          </ul>

          <form class="playlist-form" @submit.prevent="add">
            <input v-model="playlistUrl" type="url" aria-label="Link da playlist" placeholder="Link da playlist do Spotify" />
            <input v-model="playlistName" maxlength="100" aria-label="Nome da playlist" placeholder="Nome (opcional)" />
            <button type="submit" :disabled="adding">{{ adding ? 'Adicionando...' : 'Acompanhar' }}</button>
          </form>
          <p v-if="playlistFeedback" class="feedback" :class="{ error: !playlistFeedback.ok }" role="status">
            {{ playlistFeedback.text }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.music-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  margin-bottom: 32px;
}

.panel-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
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

.download-form,
.playlist-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.download-form input {
  flex: 1;
  min-width: 240px;
}

.playlist-form input:first-child {
  flex: 2;
  min-width: 200px;
}

.playlist-form input:nth-child(2) {
  flex: 1;
  min-width: 120px;
}

input {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 9px 12px;
  color: #f8fafc;
  font-size: 14px;
  outline: none;
}

input:focus {
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
  padding: 5px 10px;
  font-size: 12px;
}

button.danger {
  color: #f87171;
  border-color: #7f1d1d;
}

.link-btn {
  background: none;
  border: none;
  color: #60a5fa;
  padding: 0;
  font-size: 12px;
}

.feedback {
  margin-top: 8px;
  font-size: 13px;
  color: #86efac;
}

.feedback.error,
.error-text {
  color: #f87171;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
  margin-top: 18px;
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
}

.block-title .link-btn {
  margin-left: auto;
}

.muted {
  color: #94a3b8;
  font-size: 13px;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-list {
  max-height: 260px;
  overflow-y: auto;
}

.queue-list li {
  background: #0f172a;
  border-radius: 8px;
  padding: 8px 10px;
}

.queue-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.track small {
  color: #94a3b8;
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

.queue-list li.done .bar span {
  background: #22c55e;
}

.queue-list li.error .bar span {
  background: #ef4444;
}

.playlist-list {
  margin-bottom: 12px;
}

.playlist-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f172a;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
}

.playlist-list li.failed {
  border-color: #7f1d1d;
}

.playlist-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.playlist-info a {
  color: #f8fafc;
  text-decoration: none;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-info a:hover {
  color: #60a5fa;
}

/* Celular: nome e resultado numa linha, botoes na de baixo */
@media (max-width: 640px) {
  .playlist-list li {
    flex-wrap: wrap;
  }

  .playlist-info {
    flex-basis: 100%;
  }

  .playlist-info a {
    white-space: normal;
  }
}

.switch {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
}
</style>
