<template>
  <main class="app-shell">
    <section class="hero" aria-labelledby="page-title">
      <p class="eyebrow">AI-assisted design to code case study</p>
      <h1 id="page-title">Figma to Vue pipeline</h1>
      <p class="hero__summary">
        Drop in a design reference, answer a few formatting questions, and turn
        the result into a reviewable frontend brief that can move through Git
        and on to deployment.
      </p>
    </section>

    <section class="pipeline-board" aria-labelledby="pipeline-title">
      <div class="pipeline-board__header">
        <div>
          <p class="eyebrow">Working prototype</p>
          <h2 id="pipeline-title">Reference intake</h2>
        </div>
        <p class="pipeline-board__note">
          Local-only demo. Files are previewed in the browser and not uploaded.
        </p>
      </div>

      <div class="workspace-grid">
        <section class="panel" aria-labelledby="upload-title">
          <h3 id="upload-title">1. Add a reference</h3>
          <label
            class="drop-zone"
            :class="{ 'drop-zone--active': isDragging }"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input
              class="visually-hidden"
              type="file"
              aria-label="Upload reference image"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              @change="handleFileInput"
            />
            <span class="drop-zone__icon" aria-hidden="true">+</span>
            <span class="drop-zone__title">Drop a reference image here</span>
            <span class="drop-zone__hint">PNG, JPG, WebP, or SVG</span>
          </label>

          <figure v-if="referencePreview" class="reference-preview">
            <img :src="referencePreview" :alt="`Preview of ${referenceName}`" />
            <figcaption>{{ referenceName }}</figcaption>
          </figure>
          <p v-else class="empty-state">
            Start with a screenshot, exported Figma frame, or product reference.
          </p>
        </section>

        <section class="panel" aria-labelledby="assistant-title">
          <h3 id="assistant-title">2. Formatting assistant</h3>
          <p class="panel__intro">
            This intentionally keeps LLM support basic: it gathers formatting
            preferences and turns them into a structured implementation brief.
          </p>

          <div class="field-group">
            <label for="pageType">What are we building?</label>
            <select id="pageType" v-model="formatting.pageType">
              <option>Landing page</option>
              <option>Product finder</option>
              <option>Dashboard view</option>
              <option>Marketing section</option>
            </select>
          </div>

          <fieldset class="choice-group">
            <legend>Preferred visual density</legend>
            <label v-for="density in densityOptions" :key="density">
              <input v-model="formatting.density" type="radio" name="density" :value="density" />
              <span>{{ density }}</span>
            </label>
          </fieldset>

          <div class="field-group">
            <label for="tone">UI tone</label>
            <input id="tone" v-model="formatting.tone" type="text" />
          </div>

          <div class="field-group">
            <label for="notes">Formatting notes</label>
            <textarea
              id="notes"
              v-model="formatting.notes"
              rows="4"
              placeholder="Example: keep the hero compact, preserve card spacing, use accessible controls."
            ></textarea>
          </div>
        </section>

        <section class="panel panel--brief" aria-labelledby="brief-title">
          <div class="panel__title-row">
            <h3 id="brief-title">3. Pipeline brief</h3>
            <button type="button" @click="copyBrief">Copy brief</button>
          </div>
          <pre aria-label="Generated implementation brief">{{ generatedBrief }}</pre>
          <p class="copy-status" role="status">{{ copyStatus }}</p>
        </section>
      </div>
    </section>

    <section class="delivery-lane" aria-labelledby="delivery-title">
      <div>
        <p class="eyebrow">Delivery path</p>
        <h2 id="delivery-title">UI to Git to deployed page</h2>
      </div>

      <ol class="delivery-steps">
        <li v-for="step in deliverySteps" :key="step.title">
          <span class="delivery-steps__index">{{ step.index }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

interface DeliveryStep {
  index: string;
  title: string;
  description: string;
}

interface FormattingAnswers {
  pageType: string;
  density: string;
  tone: string;
  notes: string;
}

const densityOptions = ['Comfortable', 'Compact', 'Editorial'];

const formatting = reactive<FormattingAnswers>({
  pageType: 'Product finder',
  density: 'Comfortable',
  tone: 'Calm, simple, portfolio-ready',
  notes: '',
});

const deliverySteps: DeliveryStep[] = [
  {
    index: '01',
    title: 'Frontend UI',
    description: 'Collects the reference, basic formatting answers, and a generated implementation brief.',
  },
  {
    index: '02',
    title: 'Git program',
    description: 'Commits the reviewed Vue code, docs, tests, and pipeline notes to the repository.',
  },
  {
    index: '03',
    title: 'Deployment',
    description: 'Publishes a single-page final product through Vercel or a similar static host.',
  },
];

const isDragging = ref(false);
const referenceName = ref('No reference selected');
const referencePreview = ref<string | null>(null);
const copyStatus = ref('');

const generatedBrief = computed(() => {
  const referenceLine = referencePreview.value
    ? `Reference: ${referenceName.value}`
    : 'Reference: Awaiting uploaded image or screenshot';
  const notes = formatting.notes.trim() || 'No extra formatting notes yet.';

  return [
    'Figma to Vue implementation brief',
    '',
    referenceLine,
    `Page type: ${formatting.pageType}`,
    `Visual density: ${formatting.density}`,
    `UI tone: ${formatting.tone}`,
    '',
    'Formatting notes:',
    notes,
    '',
    'Pipeline gates:',
    '- Build semantic Vue 3 + TypeScript components.',
    '- Store extracted decisions as CSS custom properties.',
    '- Keep accessibility checks in the test suite.',
    '- Commit reviewed changes to Git.',
    '- Deploy the final one-page build to Vercel or equivalent.',
  ].join('\n');
});

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    setReference(file);
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) {
    setReference(file);
  }
}

function setReference(file: File) {
  referenceName.value = file.name;
  if (referencePreview.value) {
    URL.revokeObjectURL(referencePreview.value);
  }
  referencePreview.value = URL.createObjectURL(file);
}

async function copyBrief() {
  copyStatus.value = '';

  if (!navigator.clipboard) {
    copyStatus.value = 'Clipboard is unavailable in this browser.';
    return;
  }

  await navigator.clipboard.writeText(generatedBrief.value);
  copyStatus.value = 'Brief copied.';
}
</script>
