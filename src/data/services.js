import truenasIcon from '@/components/icons/truenas.svg'
import zimaosIcon from '@/components/icons/zimaos.svg'
import jenkinsIcon from '@/components/icons/jenkins.svg'
import cubecodersIcon from '@/components/icons/cubecoders-amp.png'
import portainerIcon from '@/components/icons/portainer-dark.svg'
import proxmoxIcon from '@/components/icons/proxmox.svg'
import dockerIcon from '@/components/icons/docker.svg'
import nginxProxyManagerIcon from '@/components/icons/nginx-proxy-manager.svg'
import grafanaIcon from '@/components/icons/grafana.svg'
import prometheusIcon from '@/components/icons/prometheus.svg'
import uptimeKumaIcon from '@/components/icons/uptime-kuma.svg'
import piholeIcon from '@/components/icons/pihole.svg'
import wireguardIcon from '@/components/icons/wireguard.svg'
import vaultwardenIcon from '@/components/icons/vaultwarden.svg'
import homeAssistantIcon from '@/components/icons/home-assistant.svg'
import nextcloudIcon from '@/components/icons/nextcloud.svg'
import jellyfinIcon from '@/components/icons/jellyfin.svg'
import navidromeIcon from '@/components/icons/navidrome.svg'
import immichIcon from '@/components/icons/immich.svg'
import adguardHomeIcon from '@/components/icons/adguard-home.svg'
import downtifyIcon from '@/components/icons/downtify.svg'
import meTubeIcon from '@/components/icons/metube.svg'
import stirlingIcon from '@/components/icons/stirling-pdf.svg'
import excalidrawIcon from '@/components/icons/excalidraw.svg'
import tailscaleIcon from '@/components/icons/tailscale-light.svg'
import speedTestIcon from '@/components/icons/openspeedtest.svg'

/**
 * Catalogo central de servicos do homelab.
 * Para adicionar um novo servico, basta incluir um novo objeto no array
 * da categoria correspondente (ou criar uma nova categoria).
 *
 * campos:
 *  - name: nome exibido
 *  - url: endereco do servico (editar para o IP/dominio real)
 *  - icon: import do icone (svg/png)
 *  - description: usada no card do dashboard
 */
export const categories = [
  {
    id: 'infraestrutura',
    label: 'Infraestrutura',
    services: [
      { name: 'TrueNAS', url: '#', icon: truenasIcon, description: 'Armazenamento e gerenciamento de discos' },
      { name: 'ZimaOS', url: 'https://192.168.3.146/#/', icon: zimaosIcon, description: 'Sistema operacional do ZimaBoard' },
      { name: 'Proxmox', url: '#', icon: proxmoxIcon, description: 'Virtualizacao (VMs e LXC)' },
      { name: 'Docker', url: '#', icon: dockerIcon, description: 'Motor de containers' },
    ],
  },
  {
    id: 'deploy',
    label: 'Contêineres & Deploy',
    services: [
      { name: 'Portainer', url: 'http://192.168.3.146:9000/#!/auth', icon: portainerIcon, description: 'Gerenciamento visual de containers' },
      { name: 'Jenkins', url: '#', icon: jenkinsIcon, description: 'Automação de builds e pipelines' },
      { name: 'CubeCoders AMP', url: '#', icon: cubecodersIcon, description: 'Gerenciamento de servidores de jogos' },
      { name: 'Nginx Proxy Manager', url: '#', icon: nginxProxyManagerIcon, description: 'Proxy reverso e certificados SSL' },
    ],
  },
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    services: [
      { name: 'Grafana', url: '#', icon: grafanaIcon, description: 'Dashboards e métricas' },
      { name: 'Prometheus', url: '#', icon: prometheusIcon, description: 'Coleta de métricas' },
      { name: 'Uptime Kuma', url: '#', icon: uptimeKumaIcon, description: 'Monitor de disponibilidade' },
    ],
  },
  {
    id: 'rede',
    label: 'Rede & Segurança',
    services: [
      { name: 'Pi-hole', url: '#', icon: piholeIcon, description: 'Bloqueio de anúncios via DNS' },
      { name: 'WireGuard', url: '#', icon: wireguardIcon, description: 'VPN' },
      { name: 'Vaultwarden', url: '#', icon: vaultwardenIcon, description: 'Cofre de senhas self-hosted' },
      { name: 'AdGuard Home', url: 'http://192.168.3.146:3001/', icon: adguardHomeIcon, description: 'Bloqueio de anúncios via DNS' },
      { name: 'Tailscale', url: 'http://192.168.3.146:5252/', icon: tailscaleIcon, description: 'VPN' },
      { name: 'OpenSpeedTest', url: 'http://192.168.3.146:3004/', icon: speedTestIcon, description: 'Teste velocidade internet' },

    ],
  },
  {
    id: 'automacao',
    label: 'Automação & Nuvem',
    services: [
      { name: 'Home Assistant', url: 'http://192.168.3.146:8123/home/overview', icon: homeAssistantIcon, description: 'Automação residencial' },
      { name: 'Nextcloud', url: 'http://192.168.3.146:10081/login', icon: nextcloudIcon, description: 'Nuvem pessoal de arquivos' },
    ],
  },
  {
    id: 'entretenimento',
    label: 'Entretenimento & Mídia',
    services: [
      { name: 'Jellyfin', url: 'http://192.168.3.146:8097/web/#/home', icon: jellyfinIcon, description: 'Player de filmes e séries' },
      { name: 'Navidrome', url: 'http://192.168.3.146:4533/app/#/login', icon: navidromeIcon, description: 'Player de musicas' },
      { name: 'Immich', url: 'http://192.168.3.146:2283/auth/login', icon: immichIcon, description: 'Fotos e videos' },
    ],
  },
   {
    id: 'utilitarios',
    label: 'Utilitários',
    services: [
      { name: 'Downtify', url: 'http://192.168.3.146:8582/', icon: downtifyIcon, description: 'Download de músicas do Spotify' },
      { name: 'MeTube', url: 'http://192.168.3.146:8081/', icon: meTubeIcon, description: 'Download de videos do Youtube' },
      { name: 'Stirling-PDF', url: 'http://192.168.3.146:8080/login', icon: stirlingIcon, description: 'Editor de PDFs' },
      { name: 'Excalidraw', url: 'http://192.168.3.146:17638/', icon: excalidrawIcon, description: 'Quadro branco' },
    ],
  },
]

// Lista plana de todos os servicos, util para busca
export const allServices = categories.flatMap((category) =>
  category.services.map((service) => ({ ...service, category: category.label }))
)
