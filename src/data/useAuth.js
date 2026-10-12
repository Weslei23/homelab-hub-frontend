import { computed, ref } from 'vue'

const BASE = import.meta.env.VITE_API_URL || ''
const STORAGE_KEY = 'homepage.session'

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.token ? saved : null
  } catch {
    return null
  }
}

// { token, username, email, role } ou null quando ninguem esta logado
const session = ref(loadSession())

export const isAuthenticated = computed(() => !!session.value?.token)
// A role aqui serve apenas para montar a interface; quem realmente bloqueia e o backend.
export const isAdmin = computed(() => session.value?.role === 'ADMIN')

export const getToken = () => session.value?.token ?? null

function saveSession(value) {
  session.value = value
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* armazenamento indisponivel: a sessao vale ate recarregar a pagina */
  }
}

export function logout() {
  saveSession(null)
}

async function authRequest(path, body) {
  const res = await fetch(`${BASE}/api/v1/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = 'Erro ao comunicar com o servidor'
    try {
      message = (await res.json()).message || message
    } catch {
      /* corpo vazio */
    }
    throw new Error(message)
  }
  return res.json()
}

export async function login(email, password) {
  const data = await authRequest('/login', { email, password })
  saveSession({ token: data.token, username: data.username, email: data.email, role: data.role })
}

// Cadastro publico sempre cria um usuario comum (USER); depois ja entra na conta
export async function register(username, email, password) {
  await authRequest('/register', { username, email, password })
  await login(email, password)
}

export function useAuth() {
  return { session, isAuthenticated, isAdmin, login, register, logout }
}
