export interface VisualTokens {
  palette: string[];
  averageLuminance: number;
  isDark: boolean;
  source: 'extracted-from-reference' | 'placeholder';
}

export function createDefaultVisualTokens(): VisualTokens {
  return {
    palette: [],
    averageLuminance: 0.5,
    isDark: false,
    source: 'placeholder',
  };
}
