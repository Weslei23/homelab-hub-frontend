<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { iconKeys, iconMap } from '@/data/icons'

// target: { mode: 'create', categoryId } | { mode: 'edit', card } | null
const props = defineProps({
  target: { type: Object, default: null },
  onSubmit: { type: Function, required: true },
  onDelete: { type: Function, required: true },
})
const emit = defineEmits(['close'])

const CUSTOM = '__custom'

const name = ref('')
const url = ref('')
const description = ref('')
const iconChoice = ref('')
const iconUrl = ref('')
const error = ref('')
const busy = ref(false)
const nameInput = ref(null)
const urlInput = ref(null)

const isEdit = computed(() => props.target?.mode === 'edit')

watch(
  () => props.target,
  async (target) => {
    if (!target) return
    const card = target.mode === 'edit' ? target.card : null
    name.value = card?.name ?? ''
    url.value = card && card.url !== '#' ? card.url : ''
    description.value = card?.description ?? ''
    const icon = card?.icon ?? ''
    // card padrao (offline) pode ter o caminho do asset em vez da chave
    if (!icon || iconMap[icon]) {
      iconChoice.value = icon
      iconUrl.value = ''
    } else {
      iconChoice.value = CUSTOM
      iconUrl.value = icon
    }
    error.value = ''
    await nextTick()
    // cards ainda sem link vao direto para o campo de URL
    ;(isEdit.value && !url.value ? urlInput : nameInput).value?.focus()
  }
)

async function run(action) {
  busy.value = true
  error.value = ''
  try {
    await action()
    emit('close')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function submit() {
  const trimmedUrl = url.value.trim()
  if (!name.value.trim()) return (error.value = 'Informe o nome do card')
  if (!/^https?:\/\/\S+$/i.test(trimmedUrl)) return (error.value = 'Use uma URL começando com http:// ou https://')
  const icon = iconChoice.value === CUSTOM ? iconUrl.value.trim() : iconChoice.value
  if (iconChoice.value === CUSTOM && !/^https?:\/\/\S+$/i.test(icon)) {
    return (error.value = 'O ícone personalizado deve ser uma URL http:// ou https://')
  }
  run(() =>
    props.onSubmit({
      name: name.value.trim(),
      url: trimmedUrl,
      description: description.value.trim() || null,
      icon: icon || null,
    })
  )
}

function remove() {
  if (confirm(`Excluir o card "${props.target.card.name}"?`)) run(props.onDelete)
}
</script>

<template>
  <div v-if="target" class="backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <form class="modal" @submit.prevent="submit">
      <h3>{{ isEdit ? `Editar ${target.card.name}` : 'Novo card' }}</h3>

      <label for="card-name">Nome</label>
      <input id="card-name" ref="nameInput" v-model="name" maxlength="100" placeholder="Ex.: Proxmox" />

      <label for="card-url">URL</label>
      <input id="card-url" ref="urlInput" v-model="url" type="url" placeholder="http://192.168.0.10:8080" />

      <label for="card-desc">Descrição (opcional)</label>
      <input id="card-desc" v-model="description" maxlength="255" />

      <label for="card-icon">Ícone</label>
      <select id="card-icon" v-model="iconChoice">
        <option value="">Automático (inicial do nome)</option>
        <option v-for="key in iconKeys" :key="key" :value="key">{{ key }}</option>
        <option :value="CUSTOM">URL personalizada...</option>
      </select>
      <input v-if="iconChoice === CUSTOM" v-model="iconUrl" type="url" placeholder="https://exemplo.com/icone.png" />

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button v-if="isEdit" type="button" class="danger" :disabled="busy" @click="remove">Excluir</button>
        <span class="spacer"></span>
        <button type="button" class="ghost" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button type="submit" class="primary" :disabled="busy">{{ busy ? 'Salvando...' : 'Salvar' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 440px;
  max-height: 100%;
  overflow-y: auto;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

h3 {
  font-size: 18px;
  margin-bottom: 6px;
}

label {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
}

input,
select {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 12px;
  color: #f8fafc;
  font-size: 14px;
  outline: none;
}

input:focus,
select:focus {
  border-color: #2563eb;
}

.error {
  color: #f87171;
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.spacer {
  flex: 1;
}

button {
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #334155;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

.ghost {
  background: transparent;
  color: #cbd5e1;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.danger {
  background: transparent;
  border-color: #7f1d1d;
  color: #f87171;
}
</style>
