<template>
  <div
    class="progress"
    role="progressbar"
    :aria-valuenow="step"
    aria-valuemin="1"
    :aria-valuemax="total"
    :aria-label="`Step ${step} of ${total}`"
  >
    <div class="progress__fill" :style="{ width: percent }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  step: number;
  total: number;
}>();

const percent = computed(() => `${(props.step / props.total) * 100}%`);
</script>
