import type { PagePlan, PagePlanInput } from '../types/pagePlan';
import { createDefaultVisualTokens } from '../types/visualTokens';

export function buildPagePlan(input: PagePlanInput): PagePlan {
  const notes = input.notes.trim();
  const densityKey = input.density.toLowerCase();
  const visualTokens = input.visualTokens ?? createDefaultVisualTokens();

  return {
    schemaVersion: 'figma-to-vue.page-plan.v1',
    source: {
      generator: 'local-deterministic',
      intent: 'Bridge intake answers to a reviewable one-page Vue rendering plan.',
    },
    reference: {
      analysis: input.analysis,
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
          ? `Use ${input.referenceName} as a ${input.analysis.mediaEmphasis.toLowerCase()} reference with a ${input.analysis.heroComposition.toLowerCase()} composition.`
          : `Use the analyzer observations as the first design signal: ${input.analysis.heroComposition.toLowerCase()}, ${input.analysis.mediaEmphasis.toLowerCase()} media.`,
      },
      {
        id: 'implementation-plan',
        title: 'Implementation plan',
        body: `Build a ${input.analysis.layoutPattern.toLowerCase()} with ${densityKey} spacing, ${input.analysis.sectionCount} content sections, CSS tokens, and semantic Vue components.`,
      },
      {
        id: 'review-notes',
        title: `${input.analysis.ctaStyle} review notes`,
        body: input.analysis.visualNotes || notes || 'No custom notes yet. Keep accessibility, readable structure, and deployment readiness as the baseline.',
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
      accentRole: input.analysis.ctaStyle === 'None visible' ? 'supporting-action' : 'primary-action',
      layoutDensity: densityKey,
      spacing: densityKey === 'compact' ? 'tight' : densityKey === 'editorial' ? 'generous' : 'balanced',
      palette: visualTokens.palette,
      paletteSource: visualTokens.source,
    },
  };
}

export function serializePagePlan(plan: PagePlan): string {
  return JSON.stringify(plan, null, 2);
}
