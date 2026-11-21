import { ref, onMounted, onUnmounted } from 'vue'
import * as api from '@/data/catalogApi'

const POLL_MS = 30 * 1000

// Status por id de card, compartilhado entre componentes
const statuses = ref({})

async function loadStatus() {
  try {
    statuses.value = await api.fetchStatus()
  } catch {
    // Backend fora do ar: some com os indicadores em vez de mostrar tudo offline
    statuses.value = {}
  }
}

// Atualiza o status enquanto o componente estiver montado
export function useStatus() {
  let timer

  onMounted(() => {
    loadStatus()
    timer = setInterval(loadStatus, POLL_MS)
  })
  onUnmounted(() => clearInterval(timer))

  return { statuses, refreshStatus: loadStatus }
}
