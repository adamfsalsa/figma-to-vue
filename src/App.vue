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
          <p class="copy-status" role="status">{{ briefCopyStatus }}</p>
        </section>
      </div>
    </section>

    <section class="preview-lab" aria-labelledby="preview-title">
      <div class="preview-lab__intro">
        <div>
          <p class="eyebrow">One-shot output</p>
          <h2 id="preview-title" ref="previewTitleRef" tabindex="-1">Generated page preview</h2>
          <p>
            This local generator turns the current brief into a static one-page
            composition. It is deterministic for now, which keeps the milestone
            reviewable before a real LLM/code-writing service is introduced.
          </p>
        </div>
        <div class="preview-actions">
          <button type="button" @click="generateJsonPlan">
            Generate JSON plan
          </button>
          <button class="button-primary" type="button" @click="generatePagePreview">
            Generate preview
          </button>
          <button type="button" :disabled="!pagePlan" @click="copyJsonPlan">
            Copy JSON
          </button>
          <button type="button" :disabled="!generatedPage" @click="copyPreviewHtml">
            Copy HTML
          </button>
        </div>
      </div>

      <p class="copy-status" role="status">{{ previewStatus }}</p>

      <section class="plan-layer" aria-labelledby="plan-title">
        <div class="panel__title-row">
          <h3 id="plan-title">4. JSON page plan</h3>
          <p>Typed contract between the assistant and renderer</p>
        </div>
        <pre aria-label="Generated JSON page plan">{{ generatedPlanJson }}</pre>
      </section>

      <article
        v-if="generatedPage"
        class="generated-page"
        :class="`generated-page--${generatedPage.densityKey}`"
        aria-label="Generated one-page website preview"
      >
        <header class="generated-page__hero">
          <div>
            <p class="generated-page__kicker">{{ generatedPage.kicker }}</p>
            <h3>{{ generatedPage.title }}</h3>
            <p>{{ generatedPage.summary }}</p>
            <a href="#generated-page-plan">View plan</a>
          </div>
          <figure v-if="generatedPage.referencePreview">
            <img
              :src="generatedPage.referencePreview"
              :alt="`Reference used for ${generatedPage.title}`"
            />
            <figcaption>{{ generatedPage.referenceName }}</figcaption>
          </figure>
        </header>

        <section id="generated-page-plan" class="generated-page__sections">
          <div v-for="section in generatedPage.sections" :key="section.title">
            <h4>{{ section.title }}</h4>
            <p>{{ section.body }}</p>
          </div>
        </section>
      </article>

      <div v-else class="preview-placeholder">
        <h3>No page generated yet</h3>
        <p>
          Add a reference or adjust the formatting answers, then generate a
          one-page preview from the current brief.
        </p>
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
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import type { PagePlan, VisualDensity } from './types/pagePlan';
import { buildPagePlan, serializePagePlan } from './utils/pagePlan';

interface DeliveryStep {
  index: string;
  title: string;
  description: string;
}

interface FormattingAnswers {
  pageType: string;
  density: VisualDensity;
  tone: string;
  notes: string;
}

interface GeneratedPageSection {
  title: string;
  body: string;
}

interface GeneratedPage {
  densityKey: string;
  kicker: string;
  referenceName: string;
  referencePreview: string | null;
  sections: GeneratedPageSection[];
  summary: string;
  title: string;
}

const densityOptions: VisualDensity[] = ['Comfortable', 'Compact', 'Editorial'];

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
const briefCopyStatus = ref('');
const pagePlan = ref<PagePlan | null>(null);
const generatedPage = ref<GeneratedPage | null>(null);
const previewStatus = ref('');
const previewTitleRef = ref<HTMLHeadingElement | null>(null);

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

const generatedPreviewHtml = computed(() => {
  if (!generatedPage.value) {
    return '';
  }

  const page = generatedPage.value;
  const imageMarkup = page.referencePreview
    ? `
      <figure>
        <img src="${escapeHtml(page.referencePreview)}" alt="Reference used for ${escapeHtml(page.title)}">
        <figcaption>${escapeHtml(page.referenceName)}</figcaption>
      </figure>`
    : '';
  const sectionsMarkup = page.sections
    .map(
      (section) => `
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.body)}</p>
      </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(page.title)}</title>
  </head>
  <body>
    <main>
      <header>
        <p>${escapeHtml(page.kicker)}</p>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.summary)}</p>${imageMarkup}
      </header>
      ${sectionsMarkup}
    </main>
  </body>
</html>`;
});

const generatedPlanJson = computed(() => {
  if (!pagePlan.value) {
    return JSON.stringify(
      {
        schemaVersion: 'figma-to-vue.page-plan.v1',
        status: 'No JSON plan generated yet',
      },
      null,
      2,
    );
  }

  return serializePagePlan(pagePlan.value);
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
  briefCopyStatus.value = '';

  if (!navigator.clipboard) {
    briefCopyStatus.value = 'Clipboard is unavailable in this browser.';
    return;
  }

  await navigator.clipboard.writeText(generatedBrief.value);
  briefCopyStatus.value = 'Brief copied.';
}

function generateJsonPlan() {
  pagePlan.value = buildPagePlan({
    density: formatting.density,
    notes: formatting.notes,
    pageType: formatting.pageType,
    referenceName: referencePreview.value ? referenceName.value : null,
    tone: formatting.tone,
  });

  previewStatus.value = 'Generated constrained JSON page plan.';
}

async function generatePagePreview() {
  if (!pagePlan.value) {
    generateJsonPlan();
  }

  if (!pagePlan.value) {
    return;
  }

  generatedPage.value = pagePlanToGeneratedPage(pagePlan.value);
  previewStatus.value = 'Rendered a static one-page preview from the JSON plan.';
  await nextTick();
  previewTitleRef.value?.focus();
}

async function copyJsonPlan() {
  if (!pagePlan.value) {
    previewStatus.value = 'Generate a JSON plan before copying it.';
    return;
  }

  if (!navigator.clipboard) {
    previewStatus.value = 'Clipboard is unavailable in this browser.';
    return;
  }

  await navigator.clipboard.writeText(generatedPlanJson.value);
  previewStatus.value = 'JSON page plan copied.';
}

async function copyPreviewHtml() {
  if (!generatedPage.value) {
    previewStatus.value = 'Generate a preview before copying HTML.';
    return;
  }

  if (!navigator.clipboard) {
    previewStatus.value = 'Clipboard is unavailable in this browser.';
    return;
  }

  await navigator.clipboard.writeText(generatedPreviewHtml.value);
  previewStatus.value = 'Preview HTML copied.';
}

function pagePlanToGeneratedPage(plan: PagePlan): GeneratedPage {
  return {
    densityKey: plan.page.densityKey,
    kicker: plan.page.kicker,
    referenceName: plan.reference.name ?? 'the uploaded reference placeholder',
    referencePreview: referencePreview.value,
    title: plan.page.title,
    summary: plan.page.summary,
    sections: plan.sections.map((section) => ({
      title: section.title,
      body: section.body,
    })),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

onBeforeUnmount(() => {
  if (referencePreview.value) {
    URL.revokeObjectURL(referencePreview.value);
  }
});
</script>
