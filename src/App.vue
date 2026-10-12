<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Dashboard from './components/Dashboard.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="layout">
    <button class="menu-btn" @click="sidebarOpen = true" aria-label="Abrir menu">☰</button>

    <div class="sidebar-wrapper" :class="{ open: sidebarOpen }">
      <Sidebar @close="sidebarOpen = false" />
    </div>

    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <Dashboard />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.menu-btn {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 30;
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid #334155;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  font-size: 18px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .menu-btn {
    display: block;
  }

  .sidebar-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 25;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .sidebar-wrapper.open {
    transform: translateX(0);
  }

  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 20;
  }
}

@media (min-width: 901px) {
  .overlay {
    display: none;
  }
}
</style>
