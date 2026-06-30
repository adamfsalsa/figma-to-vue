import {
  buildFigmaDocumentImport,
  collectFigmaAssetNodeIds,
  parseFigmaUrl,
  type FigmaNode,
} from '../src/utils/figmaDocument';

describe('Figma document intake', () => {
  it('parses file keys and normalizes frame node ids from Figma URLs', () => {
    expect(
      parseFigmaUrl('https://www.figma.com/design/AbC123/My-file?node-id=12-34&t=ignored'),
    ).toEqual({ fileKey: 'AbC123', nodeId: '12:34' });

    expect(parseFigmaUrl('https://figma.com/file/XYZ789/Legacy-file')).toEqual({
      fileKey: 'XYZ789',
      nodeId: null,
    });
  });

  it('rejects non-Figma hosts and malformed file URLs', () => {
    expect(parseFigmaUrl('https://figma.com.evil.example/design/AbC123/Test')).toBeNull();
    expect(parseFigmaUrl('https://www.figma.com/community/file/123')).toBeNull();
    expect(parseFigmaUrl('not a URL')).toBeNull();
  });

  it('derives structured content, analysis, and colors from a Figma node tree', () => {
    const root: FigmaNode = {
      id: '12:34',
      name: 'Product finder hero',
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      itemSpacing: 32,
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 720 },
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      children: [
        {
          id: '12:35',
          name: 'Hero copy',
          type: 'FRAME',
          children: [
            { id: '12:36', name: 'Kicker', type: 'TEXT', characters: 'Find your fit' },
            {
              id: '12:37',
              name: 'Title',
              type: 'TEXT',
              characters: 'Choose the right bike for every road',
              style: { fontFamily: 'Archivo', fontSize: 52, fontWeight: 700, lineHeightPx: 58 },
              fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.05 } }],
            },
            {
              id: '12:38',
              name: 'Summary',
              type: 'TEXT',
              characters: 'Answer a few questions and get a recommendation tailored to your ride.',
            },
            { id: '12:39', name: 'CTA', type: 'TEXT', characters: 'Get started' },
          ],
        },
        {
          id: '12:40',
          name: 'Hero image',
          type: 'RECTANGLE',
          absoluteBoundingBox: { x: 680, y: 80, width: 440, height: 560 },
          cornerRadius: 24,
          fills: [{ type: 'IMAGE' }],
        },
        {
          id: '12:41',
          name: 'Road bikes',
          type: 'FRAME',
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 } }],
          children: [
            { id: '12:42', name: 'Card title', type: 'TEXT', characters: 'Road bikes' },
            { id: '12:43', name: 'Card body', type: 'TEXT', characters: 'Built for fast pavement miles.' },
          ],
        },
      ],
    };

    const imported = buildFigmaDocumentImport(
      'Bike finder',
      root,
      'https://example.com/frame.png',
      { '12:40': 'https://example.com/hero.png' },
    );

    expect(imported.nodeId).toBe('12:34');
    expect(imported.analysis.layoutPattern).toBe('Product finder flow');
    expect(imported.analysis.heroComposition).toBe('Text left, media right');
    expect(imported.analysis.ctaStyle).toBe('Button-led');
    expect(imported.content.title).toBe('Choose the right bike for every road');
    expect(imported.content.sections).toContainEqual({
      title: 'Road bikes',
      body: 'Built for fast pavement miles.',
    });
    expect(imported.visualTokens.palette).toEqual(['#ffffff', '#3366cc', '#0d0d0d']);
    expect(imported.visualTokens.source).toBe('figma-document');
    expect(imported.structure.textLayerCount).toBe(6);
    expect(imported.reconstruction.schemaVersion).toBe('figma-to-vue.reconstruction-plan.v2');
    expect(imported.reconstruction.source).toMatchObject({ kind: 'figma', rootNodeId: '12:34' });
    expect(imported.reconstruction.viewport).toEqual({ width: 1200, height: 720 });

    const rootRegion = imported.reconstruction.regions[0];
    expect(rootRegion.layout).toMatchObject({ mode: 'row', gap: 32 });
    expect(rootRegion.layout?.padding).toEqual({ top: 24, right: 24, bottom: 24, left: 24 });
    expect(rootRegion.children[1]).toMatchObject({
      element: 'media',
      tag: 'img',
      style: { borderRadius: 24 },
      asset: { url: 'https://example.com/hero.png', sourceNodeId: '12:40' },
    });
    expect(rootRegion.children[0].children[1]).toMatchObject({
      tag: 'h1',
      text: 'Choose the right bike for every road',
      style: { fontFamily: 'Archivo', fontSize: 52, fontWeight: 700, lineHeight: 58 },
    });
    expect(collectFigmaAssetNodeIds(root)).toEqual(['12:40']);
  });
});
