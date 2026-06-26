<template>
  <article
    class="generated-page"
    :class="`generated-page--${page.densityKey}`"
    :style="paletteStyle"
    aria-label="Generated one-page website preview"
  >
    <header class="generated-page__hero">
      <div>
        <p class="generated-page__kicker">{{ page.kicker }}</p>
        <h3>{{ page.title }}</h3>
        <p>{{ page.summary }}</p>

        <button
          v-if="page.cta.kind === 'button'"
          type="button"
          class="generated-page__cta"
        >
          {{ page.cta.label }}
        </button>

        <a
          v-else-if="page.cta.kind === 'link'"
          class="generated-page__cta generated-page__cta--link"
          href="#"
          @click.prevent
        >
          {{ page.cta.label }} →
        </a>

        <form
          v-else-if="page.cta.kind === 'form'"
          class="generated-page__cta-form"
          @submit.prevent
        >
          <label class="visually-hidden" :for="emailFieldId">Email address</label>
          <input :id="emailFieldId" type="email" placeholder="you@example.com" />
          <button type="submit" class="generated-page__cta">{{ page.cta.label }}</button>
        </form>
      </div>

      <figure v-if="page.referencePreview">
        <img :src="page.referencePreview" :alt="`Reference used for ${page.title}`" />
        <figcaption>{{ page.referenceName }}</figcaption>
      </figure>
    </header>

    <section class="generated-page__sections" aria-label="Page sections">
      <div v-for="section in page.sections" :key="section.title">
        <h4>{{ section.title }}</h4>
        <p>{{ section.body }}</p>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GeneratedPage } from '../types/generatedPage';

const props = defineProps<{ page: GeneratedPage }>();

// Unique per instance so the form label/input id pair stays valid even when
// this component is rendered twice (inline preview + live-preview overlay).
const emailFieldId = `generated-page-email-${nextPreviewId()}`;

const paletteStyle = computed(() => {
  const palette = props.page.palette;
  if (palette.length === 0) {
    return {};
  }

  return {
    '--token-accent': palette[0],
    '--token-surface-soft': palette[1] ?? palette[0],
  };
});
</script>

<script lang="ts">
let previewIdCounter = 0;
function nextPreviewId(): number {
  previewIdCounter += 1;
  return previewIdCounter;
}
</script>
