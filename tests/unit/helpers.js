import { vi } from 'vitest'

/** Resposta falsa de fetch. body === undefined simula corpo vazio (json() falha). */
export function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: body === undefined ? () => Promise.reject(new SyntaxError('corpo vazio')) : () => Promise.resolve(body),
  }
}

/** Substitui o fetch global; devolve o mock para inspecionar as chamadas. */
export function mockFetch(...responses) {
  const fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Promessa controlada manualmente, para testar estados de "carregando". */
export function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
