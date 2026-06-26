<template>
  <section class="reference-analyzer" aria-labelledby="reference-analyzer-title">
    <div class="reference-analyzer__header">
      <div>
        <p class="eyebrow">Human-guided translation</p>
        <h2 id="reference-analyzer-title">Reference analyzer</h2>
      </div>
      <p>
        The app does not pretend to understand pixels. You inspect the reference
        and capture design observations that become structured data.
      </p>
    </div>

    <div class="reference-analyzer__grid">
      <figure v-if="referencePreview" class="reference-analyzer__preview">
        <img :src="referencePreview" :alt="`Reference image being analyzed: ${referenceName}`" />
        <figcaption>{{ referenceName }}</figcaption>
      </figure>

      <div v-else class="reference-analyzer__empty">
        <h3>No reference loaded</h3>
        <p>Upload a screenshot or exported frame first, then record what you see here.</p>
      </div>

      <div class="reference-analyzer__controls">
        <div class="field-group">
          <label for="heroComposition">Hero composition</label>
          <select id="heroComposition" :value="modelValue.heroComposition" @change="updateFromEvent('heroComposition', $event)">
            <option v-for="option in heroCompositionOptions" :key="option">{{ option }}</option>
          </select>
        </div>

        <div class="field-group">
          <label for="mediaEmphasis">Media emphasis</label>
          <select id="mediaEmphasis" :value="modelValue.mediaEmphasis" @change="updateFromEvent('mediaEmphasis', $event)">
            <option v-for="option in mediaEmphasisOptions" :key="option">{{ option }}</option>
          </select>
        </div>

        <div class="field-group">
          <label for="layoutPattern">Layout pattern</label>
          <select id="layoutPattern" :value="modelValue.layoutPattern" @change="updateFromEvent('layoutPattern', $event)">
            <option v-for="option in layoutPatternOptions" :key="option">{{ option }}</option>
          </select>
        </div>

        <div class="field-group">
          <label for="sectionCount">Expected content sections</label>
          <input
            id="sectionCount"
            type="number"
            min="1"
            max="6"
            :value="modelValue.sectionCount"
            @input="updateSectionCount"
          />
        </div>

        <div class="field-group">
          <label for="ctaStyle">CTA style</label>
          <select id="ctaStyle" :value="modelValue.ctaStyle" @change="updateFromEvent('ctaStyle', $event)">
            <option v-for="option in ctaStyleOptions" :key="option">{{ option }}</option>
          </select>
        </div>

        <div class="field-group field-group--wide">
          <label for="visualNotes">Visual translation notes</label>
          <textarea
            id="visualNotes"
            rows="4"
            :value="modelValue.visualNotes"
            placeholder="Example: preserve the large image, keep CTAs simple, use three cards below the hero."
            @input="updateFromEvent('visualNotes', $event)"
          ></textarea>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  CtaStyle,
  HeroComposition,
  LayoutPattern,
  MediaEmphasis,
  ReferenceAnalysis,
} from '../types/referenceAnalysis';

const props = defineProps<{
  modelValue: ReferenceAnalysis;
  referenceName: string | null;
  referencePreview: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ReferenceAnalysis];
}>();

const ctaStyleOptions: CtaStyle[] = ['Button-led', 'Text-link', 'Form-first', 'None visible'];
const heroCompositionOptions: HeroComposition[] = [
  'Text left, media right',
  'Media left, text right',
  'Centered hero',
  'Full-bleed media',
];
const layoutPatternOptions: LayoutPattern[] = [
  'Single hero',
  'Hero plus feature cards',
  'Dashboard grid',
  'Product finder flow',
];
const mediaEmphasisOptions: MediaEmphasis[] = ['Decorative', 'Supporting', 'Primary', 'Immersive'];

function update<Key extends keyof ReferenceAnalysis>(key: Key, value: ReferenceAnalysis[Key]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}

function updateFromEvent<Key extends keyof ReferenceAnalysis>(key: Key, event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  update(key, target.value as ReferenceAnalysis[Key]);
}

function updateSectionCount(event: Event) {
  const target = event.target as HTMLInputElement;
  update('sectionCount', Number(target.value));
}
</script>
