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

          <div v-if="visualTokens.palette.length > 0" class="palette-preview">
            <p class="palette-preview__label" id="palette-preview-label">Extracted palette (local, no AI)</p>
            <ul class="palette-preview__swatches" aria-labelledby="palette-preview-label">
              <li
                v-for="color in visualTokens.palette"
                :key="color"
                class="palette-preview__swatch"
                :style="{ backgroundColor: color }"
                :title="color"
              ></li>
            </ul>
            <p class="visually-hidden">
              Dominant colors detected in the reference image: {{ visualTokens.palette.join(', ') }}.
            </p>
          </div>

          <div v-if="referencePreview" class="ai-enhance">
            <button type="button" :disabled="aiAnalysisPending" @click="enhanceWithAi">
              {{ aiAnalysisPending ? 'Asking AI…' : 'Enhance with AI (optional)' }}
            </button>
            <p class="copy-status" role="status">{{ aiAnalysisStatus }}</p>
          </div>
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

    <ReferenceAnalyzer
      v-model="referenceAnalysis"
      :reference-name="referencePreview ? referenceName : null"
      :reference-preview="referencePreview"
    />

    <section class="preview-lab" aria-labelledby="preview-title">
      <div class="preview-lab__intro">
        <div>
          <p class="eyebrow">One-shot output</p>
          <h2 id="preview-title" ref="previewTitleRef" tabindex="-1">Generated page preview</h2>
          <p>
            This local generator turns the current brief into a static one-page
            composition, a copyable HTML export, and a real Vue 3 single-file
            component. It is deterministic, which keeps the output reviewable
            and diffable.
          </p>
        </div>
        <div class="preview-actions">
          <button type="button" @click="generateJsonPlan">
            Generate JSON plan
          </button>
          <button class="button-primary" type="button" @click="generatePagePreview">
            Generate preview
          </button>
          <button class="button-primary" type="button" @click="openLivePreview">
            ▶ Preview page
          </button>
          <button type="button" :disabled="!pagePlan" @click="copyJsonPlan">
            Copy JSON
          </button>
          <button type="button" :disabled="!generatedPage" @click="copyPreviewHtml">
            Copy HTML
          </button>
          <button type="button" :disabled="!pagePlan" @click="copyVueComponent">
            Copy Vue component
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

      <section class="plan-layer" aria-labelledby="sfc-title">
        <div class="panel__title-row">
          <h3 id="sfc-title">5. Vue component (.vue)</h3>
          <p>One-shot Vue 3 SFC generated from the plan</p>
        </div>
        <pre aria-label="Generated Vue single-file component">{{ generatedVueSfc }}</pre>
      </section>

      <GeneratedPagePreview v-if="generatedPage" :page="generatedPage" />

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

    <div
      v-if="isPreviewOpen && generatedPage"
      class="live-preview"
      role="dialog"
      aria-modal="true"
      aria-label="Live preview of the generated page"
    >
      <div class="live-preview__bar">
        <p class="live-preview__hint">Live preview — scroll and interact like a real page.</p>
        <button ref="previewCloseRef" type="button" class="live-preview__close" @click="closeLivePreview">
          Close preview
        </button>
      </div>
      <div class="live-preview__stage">
        <GeneratedPagePreview :page="generatedPage" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import ReferenceAnalyzer from './components/ReferenceAnalyzer.vue';
import GeneratedPagePreview from './components/GeneratedPagePreview.vue';
import type { PagePlan, VisualDensity } from './types/pagePlan';
import type { GeneratedPage } from './types/generatedPage';
import type { ReferenceAnalysis } from './types/referenceAnalysis';
import { createDefaultReferenceAnalysis } from './types/referenceAnalysis';
import type { VisualTokens } from './types/visualTokens';
import { createDefaultVisualTokens } from './types/visualTokens';
import { fileToDownscaledDataUrl, requestAiAnalysis } from './utils/aiAnalysis';
import { deriveCta } from './utils/cta';
import { extractVisualTokensFromImage } from './utils/colorExtraction';
import { buildPagePlan, serializePagePlan } from './utils/pagePlan';
import { generateVueSfc } from './utils/vueCodegen';

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
const referenceFile = ref<File | null>(null);
const referencePreview = ref<string | null>(null);
const referenceAnalysis = ref<ReferenceAnalysis>(createDefaultReferenceAnalysis());
const visualTokens = ref<VisualTokens>(createDefaultVisualTokens());
const aiAnalysisStatus = ref('');
const aiAnalysisPending = ref(false);
const briefCopyStatus = ref('');
const pagePlan = ref<PagePlan | null>(null);
const generatedPage = ref<GeneratedPage | null>(null);
const previewStatus = ref('');
const previewTitleRef = ref<HTMLHeadingElement | null>(null);
const isPreviewOpen = ref(false);
const previewCloseRef = ref<HTMLButtonElement | null>(null);
let previewTrigger: HTMLElement | null = null;

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
    'Reference analysis:',
    `- Hero composition: ${referenceAnalysis.value.heroComposition}`,
    `- Media emphasis: ${referenceAnalysis.value.mediaEmphasis}`,
    `- Layout pattern: ${referenceAnalysis.value.layoutPattern}`,
    `- Content sections: ${referenceAnalysis.value.sectionCount}`,
    `- CTA style: ${referenceAnalysis.value.ctaStyle}`,
    `- Visual notes: ${referenceAnalysis.value.visualNotes.trim() || 'None yet.'}`,
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

const generatedVueSfc = computed(() => {
  if (!pagePlan.value) {
    return '// Generate a JSON plan to produce a Vue component.';
  }

  return generateVueSfc(pagePlan.value);
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
  referenceFile.value = file;
  if (referencePreview.value) {
    URL.revokeObjectURL(referencePreview.value);
  }
  referencePreview.value = URL.createObjectURL(file);
  visualTokens.value = createDefaultVisualTokens();
  aiAnalysisStatus.value = '';

  void extractVisualTokensFromImage(file).then((tokens) => {
    visualTokens.value = tokens;
  });
}

/**
 * Optional second tier on top of the always-available local analyzer above.
 * Calls the /api/analyze proxy (api/analyze.ts) — currently stubbed, so this
 * normally resolves to a graceful "not configured" status and leaves the
 * analyzer fields exactly as the user set them. Once a provider is wired up
 * server-side, a successful response merges into referenceAnalysis without
 * any change needed here.
 */
async function enhanceWithAi() {
  if (!referenceFile.value || aiAnalysisPending.value) {
    return;
  }

  aiAnalysisPending.value = true;
  aiAnalysisStatus.value = 'Asking the AI analyzer…';

  try {
    const imageDataUrl = await fileToDownscaledDataUrl(referenceFile.value);
    const result = await requestAiAnalysis(imageDataUrl);

    if (result.ok) {
      referenceAnalysis.value = { ...referenceAnalysis.value, ...result.analysis };
      aiAnalysisStatus.value = 'AI analysis applied. Review the fields below before continuing.';
    } else {
      aiAnalysisStatus.value = result.message;
    }
  } catch {
    aiAnalysisStatus.value = 'AI analysis is unavailable right now. Using local analysis instead.';
  } finally {
    aiAnalysisPending.value = false;
  }
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
    analysis: referenceAnalysis.value,
    density: formatting.density,
    notes: formatting.notes,
    pageType: formatting.pageType,
    referenceName: referencePreview.value ? referenceName.value : null,
    tone: formatting.tone,
    visualTokens: visualTokens.value,
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

/**
 * Opens the full-screen live preview — the one-click, non-coder-facing view of
 * the generated page. Generates the page first if needed, moves focus into the
 * dialog, and remembers the trigger so focus can be restored on close.
 */
async function openLivePreview() {
  // Capture the trigger first — generatePagePreview() below moves focus to the
  // preview heading, so reading activeElement after it would restore focus to
  // the wrong element on close.
  previewTrigger = (document.activeElement as HTMLElement) ?? null;

  if (!generatedPage.value) {
    await generatePagePreview();
  }

  if (!generatedPage.value) {
    return;
  }

  isPreviewOpen.value = true;
  document.addEventListener('keydown', handlePreviewKeydown);
  await nextTick();
  previewCloseRef.value?.focus();
}

function closeLivePreview() {
  isPreviewOpen.value = false;
  document.removeEventListener('keydown', handlePreviewKeydown);
  previewTrigger?.focus();
  previewTrigger = null;
}

function handlePreviewKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeLivePreview();
  }
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

async function copyVueComponent() {
  if (!pagePlan.value) {
    previewStatus.value = 'Generate a JSON plan before copying the Vue component.';
    return;
  }

  if (!navigator.clipboard) {
    previewStatus.value = 'Clipboard is unavailable in this browser.';
    return;
  }

  await navigator.clipboard.writeText(generatedVueSfc.value);
  previewStatus.value = 'Vue component copied.';
}

function pagePlanToGeneratedPage(plan: PagePlan): GeneratedPage {
  return {
    densityKey: plan.page.densityKey,
    kicker: plan.page.kicker,
    palette: plan.tokens.palette,
    referenceName: plan.reference.name ?? 'the uploaded reference placeholder',
    referencePreview: referencePreview.value,
    title: plan.page.title,
    summary: plan.page.summary,
    sections: plan.sections.map((section) => ({
      title: section.title,
      body: section.body,
    })),
    cta: deriveCta(plan.reference.analysis.ctaStyle),
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
  document.removeEventListener('keydown', handlePreviewKeydown);
});
</script>
