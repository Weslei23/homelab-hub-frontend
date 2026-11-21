import { describe, expect, it } from 'vitest'
import { iconKeys, iconMap, resolveIcon } from '@/data/icons'

describe('icons', () => {
  it('lista todos os icones da pasta pela chave, em ordem alfabetica', () => {
    expect(iconKeys).toContain('proxmox')
    expect(iconKeys).toContain('cubecoders-amp')
    expect(iconKeys).toEqual([...iconKeys].sort())
  })

  it('chaves nao tem extensao', () => {
    expect(iconKeys.every((key) => !/\.(svg|png)$/.test(key))).toBe(true)
  })

  it('aceita svg e png', () => {
    // O Vite pode devolver um caminho de arquivo ou um data: URI (assets pequenos sao embutidos)
    expect(iconMap.proxmox).toMatch(/proxmox.*\.svg|^data:image\/svg\+xml/)
    expect(iconMap['cubecoders-amp']).toMatch(/cubecoders-amp.*\.png|^data:image\/png/)
  })

  it.each([null, undefined, ''])('sem icone (%s) devolve null', (icon) => {
    expect(resolveIcon(icon)).toBeNull()
  })

  it('chave conhecida vira o caminho do asset', () => {
    expect(resolveIcon('proxmox')).toBe(iconMap.proxmox)
  })

  it('URL ou caminho desconhecido e devolvido como esta', () => {
    expect(resolveIcon('https://cdn.exemplo.com/icone.png')).toBe('https://cdn.exemplo.com/icone.png')
    expect(resolveIcon('/assets/truenas-abc.svg')).toBe('/assets/truenas-abc.svg')
  })
})
