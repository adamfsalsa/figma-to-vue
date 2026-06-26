import type { PagePlan, PagePlanInput } from '../types/pagePlan';

export function buildPagePlan(input: PagePlanInput): PagePlan {
  const notes = input.notes.trim();
  const densityKey = input.density.toLowerCase();

  return {
    schemaVersion: 'figma-to-vue.page-plan.v1',
    source: {
      generator: 'local-deterministic',
      intent: 'Bridge intake answers to a reviewable one-page Vue rendering plan.',
    },
    reference: {
      name: input.referenceName,
      provided: Boolean(input.referenceName),
    },
    page: {
      type: input.pageType,
      density: input.density,
      densityKey,
      tone: input.tone,
      kicker: `${input.pageType} concept`,
      title: `${input.pageType} from design reference`,
      summary: `A ${densityKey} one-page ${input.pageType.toLowerCase()} shaped around a ${input.tone.toLowerCase()} direction.`,
    },
    sections: [
      {
        id: 'design-signals',
        title: 'Design signals',
        body: input.referenceName
          ? `Use ${input.referenceName} as the visual reference for hierarchy, rhythm, and imagery.`
          : 'Use the formatting answers as the first design signal until a reference image is added.',
      },
      {
        id: 'implementation-plan',
        title: 'Implementation plan',
        body: `Build semantic Vue components with ${densityKey} spacing, CSS tokens, and a clear responsive layout.`,
      },
      {
        id: 'review-notes',
        title: 'Review notes',
        body: notes || 'No custom notes yet. Keep accessibility, readable structure, and deployment readiness as the baseline.',
      },
    ],
    accessibility: {
      landmarks: ['main', 'header', 'section'],
      notes: [
        'Use a single h1 for the generated page.',
        'Keep image alt text tied to the page purpose.',
        'Preserve visible focus styles for generated controls.',
      ],
    },
    tokens: {
      layoutDensity: densityKey,
      spacing: densityKey === 'compact' ? 'tight' : densityKey === 'editorial' ? 'generous' : 'balanced',
      accentRole: 'primary-action',
    },
  };
}

export function serializePagePlan(plan: PagePlan): string {
  return JSON.stringify(plan, null, 2);
}
