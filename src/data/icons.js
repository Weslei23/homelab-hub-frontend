// Todos os icones de src/components/icons ficam disponiveis pela chave (nome do arquivo sem extensao).
// Para ter um novo icone na lista, basta colocar o arquivo svg/png nessa pasta.
const modules = import.meta.glob('@/components/icons/*.{svg,png}', { eager: true, import: 'default' })

export const iconMap = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.split('/').pop().replace(/\.(svg|png)$/, ''), url])
)

export const iconKeys = Object.keys(iconMap).sort()

/** Aceita uma chave de icone embutido ou uma URL/caminho; devolve null se nao houver icone. */
export function resolveIcon(icon) {
  if (!icon) return null
  return iconMap[icon] ?? icon
}
