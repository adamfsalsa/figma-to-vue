import type { GeneratedContent } from './pagePlan.js';
import type { ReconstructionPlan } from './reconstructionPlan.js';
import type { ReferenceAnalysis } from './referenceAnalysis.js';
import type { VisualTokens } from './visualTokens.js';

export interface FigmaDocumentImport {
  analysis: ReferenceAnalysis;
  content: GeneratedContent;
  fileName: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  previewUrl: string | null;
  reconstruction: ReconstructionPlan;
  structure: {
    autoLayout: string | null;
    componentCount: number;
    layerCount: number;
    textLayerCount: number;
  };
  visualTokens: VisualTokens;
}

export type FigmaImportResult =
  | { ok: true; document: FigmaDocumentImport }
  | { ok: false; reason: string; message: string };
