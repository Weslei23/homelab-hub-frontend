<script setup>
import { computed } from 'vue'
import { resolveIcon } from '@/data/icons'

const props = defineProps({
  service: {
    type: Object,
    required: true,
  },
  editable: {
    type: Boolean,
    default: false,
  },
  // Somente visualizacao: o card nao e um link, nao navega nem recebe foco
  locked: {
    type: Boolean,
    default: false,
  },
  // { state: 'UP' | 'DOWN' | 'UNKNOWN', latencyMs, httpStatus, checkedAt } ou null
  status: {
    type: Object,
    default: null,
  },
})

const iconSrc = computed(() => resolveIcon(props.service.icon))

// Sem link configurado nao ha o que verificar: nao mostra o indicador
const statusState = computed(() => {
  if (props.service.url === '#') return null
  return props.status?.state ?? 'PENDING'
})

const statusLabel = computed(() => {
  const s = props.status
  const checked = s?.checkedAt
    ? ` · verificado às ${new Date(s.checkedAt).toLocaleTimeString('pt-BR')}`
    : ''
  switch (statusState.value) {
    case 'UP':
      return `Online · ${s.latencyMs} ms${checked}`
    case 'DOWN':
      return `Offline${s.httpStatus ? ` (HTTP ${s.httpStatus})` : ''}${checked}`
    case 'UNKNOWN':
      return 'Status desconhecido'
    default:
      return 'Verificando…'
  }
})

const emit = defineEmits(['edit'])

// Sem link configurado: clicar no card abre o editor em vez de navegar
function onClick(event) {
  if (props.locked) return
  if (props.service.url === '#') {
    event.preventDefault()
    if (props.editable) emit('edit', props.service)
  }
}
</script>

<template>
  <component
    :is="locked ? 'div' : 'a'"
    class="card"
    :class="{ locked }"
    v-bind="locked ? {} : { href: service.url, target: '_blank', rel: 'noopener' }"
    @click="onClick"
  >
    <div class="card-icon">
      <img v-if="iconSrc" :src="iconSrc" :alt="service.name" />
      <span v-else class="initial">{{ service.name.charAt(0).toUpperCase() }}</span>
    </div>
    <div class="card-text">
      <h4>{{ service.name }}</h4>
      <p v-if="service.description">{{ service.description }}</p>
      <p v-if="service.url === '#' && editable" class="hint">Clique para definir o link</p>
    </div>
    <span
      v-if="statusState"
      class="status-dot"
      :class="[statusState.toLowerCase(), { shifted: editable }]"
      :title="statusLabel"
      role="img"
      :aria-label="statusLabel"
    />
    <button
      v-if="editable"
      type="button"
      class="edit-btn"
      aria-label="Editar link"
      title="Editar link"
      @click.prevent.stop="emit('edit', service)"
    >
      ✎
    </button>
  </component>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  text-decoration: none;
  color: #f8fafc;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.card:hover {
  border-color: #2563eb;
  background: #24304a;
  transform: translateY(-2px);
}

.card.locked {
  cursor: default;
}

.card.locked:hover {
  border-color: #334155;
  background: #1e293b;
  transform: none;
}

.card-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}

.card-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.card-text h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
}

.card-text p {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.3;
}
</style>

<style scoped>
.initial {
  font-size: 20px;
  font-weight: 700;
  color: #94a3b8;
}

.hint {
  color: #60a5fa !important;
  margin-top: 4px !important;
}

.edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #cbd5e1;
  cursor: pointer;
}

.status-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #64748b;
}

/* No modo de edicao o botao ocupa o canto: o ponto vai para o lado */
.status-dot.shifted {
  right: 44px;
  top: 18px;
}

.status-dot.up {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.status-dot.down {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
  animation: pulse 1.6s ease-in-out infinite;
}

.status-dot.pending {
  background: #475569;
}

@keyframes pulse {
  50% {
    box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot.down {
    animation: none;
  }
}

.edit-btn:hover {
  border-color: #2563eb;
  color: #fff;
}
</style>
