<script setup>
import { computed, ref } from 'vue'
import { login, register } from '@/data/useAuth'
import servidorIcon from '@/components/icons/servidor.svg'

const mode = ref('login') // 'login' | 'register'
const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

const isRegister = computed(() => mode.value === 'register')

function switchMode() {
  mode.value = isRegister.value ? 'login' : 'register'
  error.value = ''
}

async function submit() {
  if (isRegister.value && !username.value.trim()) return (error.value = 'Informe o nome de usuário')
  if (!email.value.trim()) return (error.value = 'Informe o e-mail')
  if (!password.value) return (error.value = 'Informe a senha')

  busy.value = true
  error.value = ''
  try {
    if (isRegister.value) await register(username.value.trim(), email.value.trim(), password.value)
    else await login(email.value.trim(), password.value)
    // Ao entrar, o App troca esta tela pelo dashboard
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="brand">
        <img :src="servidorIcon" alt="" />
        <h1>Homelab</h1>
      </div>
      <p class="lead">{{ isRegister ? 'Criar conta' : 'Entre para acessar o dashboard' }}</p>

      <label v-if="isRegister">
        Usuário
        <input v-model="username" type="text" autocomplete="username" />
      </label>

      <label>
        E-mail
        <input v-model="email" type="email" autocomplete="email" />
      </label>

      <label>
        Senha
        <input v-model="password" type="password" :autocomplete="isRegister ? 'new-password' : 'current-password'" />
      </label>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button type="submit" class="primary" :disabled="busy">
        {{ busy ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar' }}
      </button>

      <button type="button" class="link" @click="switchMode">
        {{ isRegister ? 'Já tenho conta' : 'Criar conta' }}
      </button>
      <p v-if="isRegister" class="note">Novas contas têm acesso somente de visualização.</p>
    </form>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #0f172a;
  color: #f8fafc;
}

.login-card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand img {
  width: 34px;
  height: 34px;
}

.brand h1 {
  margin: 0;
  font-size: 22px;
}

.lead {
  margin: 0 0 4px 0;
  color: #94a3b8;
  font-size: 14px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #cbd5e1;
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

.primary {
  background: #2563eb;
  border: none;
  color: #fff;
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 14px;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.link {
  background: none;
  border: none;
  color: #60a5fa;
  font-size: 13px;
  cursor: pointer;
}

.error {
  margin: 0;
  background: #3b1d1d;
  border: 1px solid #7f1d1d;
  color: #fca5a5;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}

.note {
  margin: 0;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}
</style>
