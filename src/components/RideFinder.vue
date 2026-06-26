<template>
  <section class="finder" aria-labelledby="finder-title">
    <div class="finder__topline">
      <p id="finder-title" class="finder__label">Ride finder prototype</p>
      <ProgressBar :step="currentStepNumber" :total="totalSteps" />
    </div>

    <div class="finder__stage">
      <button
        v-if="currentStepIndex > 0"
        class="finder__icon-button"
        type="button"
        @click="stepBack"
      >
        <span aria-hidden="true">←</span>
        <span>Step Back</span>
      </button>

      <button
        v-if="hasAnswers"
        class="finder__icon-button"
        type="button"
        @click="restart"
      >
        <span aria-hidden="true">↻</span>
        <span>Start again</span>
      </button>

      <h2 :id="headingId" ref="headingRef" tabindex="-1">{{ currentStep.question }}</h2>

      <div
        class="finder__options"
        role="radiogroup"
        :aria-labelledby="headingId"
      >
        <OptionCard
          v-for="option in currentStep.options"
          :id="option.id"
          :key="option.id"
          v-model="selectedValue"
          :title="option.title"
          :caption="option.caption"
          :image="option.image"
          :value="option.id"
          :name="radioGroupName"
        />
      </div>

      <p v-if="isComplete" class="finder__result" role="status">
        Pipeline checkpoint complete. The selected path is ready for the next
        recommendation step.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import OptionCard from './OptionCard.vue';
import ProgressBar from './ProgressBar.vue';
import { finderSteps } from '../data/finderSteps';

const currentStepIndex = ref(0);
const answers = ref<Record<string, string>>({});
const headingRef = ref<HTMLHeadingElement | null>(null);

const totalSteps = finderSteps.length;
const currentStep = computed(() => finderSteps[currentStepIndex.value]);
const currentStepNumber = computed(() => currentStepIndex.value + 1);
const headingId = computed(() => `${currentStep.value.id}-heading`);
const radioGroupName = computed(() => `${currentStep.value.id}-options`);
const hasAnswers = computed(() => Object.keys(answers.value).length > 0);
const isComplete = computed(() => Object.keys(answers.value).length === totalSteps);

const selectedValue = computed({
  get: () => answers.value[currentStep.value.id] ?? null,
  set: (optionId: string) => {
    select(optionId);
  },
});

async function select(optionId: string) {
  answers.value = {
    ...answers.value,
    [currentStep.value.id]: optionId,
  };

  if (currentStepIndex.value < totalSteps - 1) {
    currentStepIndex.value += 1;
    await focusHeading();
  }
}

async function stepBack() {
  if (currentStepIndex.value === 0) {
    return;
  }

  currentStepIndex.value -= 1;
  await focusHeading();
}

async function restart() {
  answers.value = {};
  currentStepIndex.value = 0;
  await focusHeading();
}

async function focusHeading() {
  await nextTick();
  headingRef.value?.focus();
}
</script>
