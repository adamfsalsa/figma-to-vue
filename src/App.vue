<template>
  <main class="app-shell">
    <section class="case-study">
      <p class="case-study__eyebrow">AI-assisted design to code case study</p>
      <h1>Figma to Vue pipeline</h1>
      <p class="case-study__summary">
        A small production-style workflow that turns a product finder reference into
        accessible Vue 3 components with documented automation checkpoints.
      </p>
    </section>

    <RideFinder />
  </main>
</template>

<script setup lang="ts">
import RideFinder from './components/RideFinder.vue';
</script>
