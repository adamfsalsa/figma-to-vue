<template>
  <label class="option-card">
    <input
      class="visually-hidden option-card__input"
      type="radio"
      :name="name"
      :value="value"
      :checked="modelValue === value"
      @change="emit('update:modelValue', value)"
    />
    <span class="option-card__visual">
      <span class="option-card__image-wrap">
        <img class="option-card__image" :src="image" alt="" />
      </span>
      <span class="option-card__copy">
        <h3>{{ title }}</h3>
        <span>{{ caption }}</span>
      </span>
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  id: string;
  title: string;
  caption: string;
  image: string;
  value: string;
  name: string;
  modelValue: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
