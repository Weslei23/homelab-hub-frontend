<script setup>
import { ref, watch, nextTick } from 'vue'

// target: { mode: 'create' } | { mode: 'edit', category } | null
const props = defineProps({
  target: { type: Object, default: null },
  onSubmit: { type: Function, required: true },
})
const emit = defineEmits(['close'])

const label = ref('')
const error = ref('')
const busy = ref(false)
const input = ref(null)

watch(
  () => props.target,
  async (target) => {
    if (!target) return
    label.value = target.category?.label ?? ''
    error.value = ''
    await nextTick()
    input.value?.focus()
  }
)

async function submit() {
  const value = label.value.trim()
  if (!value) return (error.value = 'Informe o nome da categoria')
  busy.value = true
  error.value = ''
  try {
    await props.onSubmit(value)
    emit('close')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="target" class="backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <form class="modal" @submit.prevent="submit">
      <h3>{{ target.mode === 'edit' ? 'Renomear categoria' : 'Nova categoria' }}</h3>
      <label for="cat-label">Nome</label>
      <input id="cat-label" ref="input" v-model="label" maxlength="100" placeholder="Ex.: Jogos" />
      <p v-if="error" class="error">{{ error }}</p>
      <div class="actions">
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
  max-width: 400px;
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
}

input {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 12px;
  color: #f8fafc;
  font-size: 14px;
  outline: none;
}

input:focus {
  border-color: #2563eb;
}

.error {
  color: #f87171;
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
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
</style>
