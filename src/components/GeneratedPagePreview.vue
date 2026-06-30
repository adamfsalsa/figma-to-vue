<template>
  <article
    class="generated-page"
    :class="`generated-page--${page.densityKey}`"
    :style="paletteStyle"
    aria-label="Generated one-page website preview"
  >
    <div v-if="page.reconstruction" class="generated-page__reconstruction">
      <ReconstructionRegion
        v-for="region in page.reconstruction.regions"
        :key="region.id"
        :region="region"
        :parent-width="page.reconstruction.viewport.width ?? undefined"
      />
    </div>

    <template v-else>
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

        <form
          v-if="showFinder"
          class="generated-page__finder"
          @submit.prevent="finderSubmitted = true"
        >
          <label :for="finderFieldId">What are you looking for?</label>
          <div class="generated-page__finder-row">
            <select :id="finderFieldId" v-model="finderChoice">
              <option v-for="option in finderOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            <button type="submit" class="generated-page__cta">Show results</button>
          </div>
          <p v-if="finderSubmitted" class="generated-page__finder-result" role="status">
            Showing: {{ finderChoice }}
          </p>
        </form>
      </div>

    </header>

    <section class="generated-page__sections" aria-label="Page sections">
      <div v-for="section in page.sections" :key="section.title">
        <h4>{{ section.title }}</h4>
        <p>{{ section.body }}</p>
      </div>
    </section>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ReconstructionRegion from './ReconstructionRegion.vue';
import type { GeneratedPage } from '../types/generatedPage';

const props = defineProps<{ page: GeneratedPage }>();

// Unique per instance so field/label id pairs stay valid even when this
// component is rendered twice (inline preview + live-preview overlay).
const instanceId = nextPreviewId();
const emailFieldId = `generated-page-email-${instanceId}`;
const finderFieldId = `generated-page-finder-${instanceId}`;

// A "Product finder flow" page gets a real interactive selector (dropdown +
// button) so the preview behaves like the finished page, not a static mock.
const showFinder = computed(() => props.page.layoutPattern === 'Product finder flow');
const finderOptions = computed(() => props.page.sections.map((section) => section.title));
const finderChoice = ref(props.page.sections[0]?.title ?? '');
const finderSubmitted = ref(false);

// The parent reuses this component when a new page is generated. Reset local
// interaction state so a choice/result from the previous page cannot leak into
// the new preview.
watch(
  () => props.page,
  (page) => {
    finderChoice.value = page.sections[0]?.title ?? '';
    finderSubmitted.value = false;
  },
);

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
