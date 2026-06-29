import type { GeneratedContent } from './pagePlan';
import type { ReferenceAnalysis } from './referenceAnalysis';
import type { VisualTokens } from './visualTokens';

export interface FigmaDocumentImport {
  analysis: ReferenceAnalysis;
  content: GeneratedContent;
  fileName: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  previewUrl: string | null;
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
