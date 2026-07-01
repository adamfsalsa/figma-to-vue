import {
  buildFigmaDocumentImport,
  collectFigmaAssetNodeIds,
  parseFigmaUrl,
  selectFigmaRenderableRoot,
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

    expect(
      parseFigmaUrl('https://www.figma.com/site/uR6QQDjtV44qPmeoANOcrT/Brand-Guidelines?node-id=0-3&t=ignored'),
    ).toEqual({
      fileKey: 'uR6QQDjtV44qPmeoANOcrT',
      nodeId: '0:3',
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
      asset: {
        url: 'https://example.com/hero.png',
        sourceNodeId: '12:40',
        delivery: 'remote',
      },
    });
    expect(imported.reconstruction.confidence.reviewRequired).toContain('12:40');
    expect(rootRegion.children[0].children[1]).toMatchObject({
      tag: 'h1',
      text: 'Choose the right bike for every road',
      style: { fontFamily: 'Archivo', fontSize: 52, fontWeight: 700, lineHeight: 58 },
    });
    expect(collectFigmaAssetNodeIds(root)).toEqual(['12:40']);
  });

  it('selects the largest renderable frame from a broad Site canvas link', () => {
    const canvas: FigmaNode = {
      id: '0:3',
      name: 'Site canvas',
      type: 'CANVAS',
      children: [
        { id: '1:1', name: 'Small draft', type: 'FRAME', absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 480 } },
        { id: '1:2', name: 'Published page', type: 'SECTION', absoluteBoundingBox: { x: 400, y: 0, width: 1440, height: 2400 } },
      ],
    };

    expect(selectFigmaRenderableRoot(canvas).id).toBe('1:2');
    expect(selectFigmaRenderableRoot(canvas.children![0]).id).toBe('1:1');
  });

  it('preserves grid, constraints, effects, component metadata, and native control intent', () => {
    const root: FigmaNode = {
      id: '20:1',
      name: 'Account settings grid',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 960, height: 640 },
      clipsContent: true,
      rectangleCornerRadii: [8, 16, 24, 32],
      strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.82, b: 0.86 } }],
      strokeWeight: 2,
      effects: [
        {
          type: 'DROP_SHADOW',
          offset: { x: 0, y: 8 },
          radius: 24,
          spread: 0,
          color: { r: 0, g: 0, b: 0, a: 0.18 },
        },
        { type: 'LAYER_BLUR', radius: 3 },
      ],
      children: [
        makeControlNode('20:2', 'Email input', 0, 0, 'Email address'),
        makeControlNode('20:3', 'Search field', 480, 0, 'Search products'),
        {
          id: '20:4',
          name: 'Learn more link',
          type: 'INSTANCE',
          componentId: 'component:link',
          componentProperties: {
            Size: { type: 'VARIANT', value: 'Large' },
            Disabled: { type: 'BOOLEAN', value: false },
          },
          absoluteBoundingBox: { x: 0, y: 320, width: 440, height: 120 },
          children: [{ id: '20:5', name: 'Link label', type: 'TEXT', characters: 'Learn more' }],
        },
        {
          id: '20:6',
          name: 'Save button',
          type: 'COMPONENT',
          absoluteBoundingBox: { x: 480, y: 320, width: 440, height: 120 },
          children: [{ id: '20:7', name: 'Button label', type: 'TEXT', characters: 'Save changes' }],
        },
      ],
    };

    const imported = buildFigmaDocumentImport('Settings', root, null);
    const page = imported.reconstruction.regions[0];

    expect(page.layout).toMatchObject({ mode: 'grid', columns: 2 });
    expect(page.style).toMatchObject({
      borderColor: '#ccd1db',
      borderWidth: 2,
      overflow: 'hidden',
      blur: 3,
      borderRadii: { topLeft: 8, topRight: 16, bottomRight: 24, bottomLeft: 32 },
    });
    expect(page.style?.boxShadow).toBe('0px 8px 24px 0px rgba(0, 0, 0, 0.18)');

    expect(page.children[0]).toMatchObject({
      element: 'input',
      tag: 'input',
      control: { type: 'email', label: 'Email input', placeholder: 'Email address' },
      layout: {
        sizing: { horizontal: 'fill', vertical: 'hug' },
        constraints: { horizontal: 'stretch', vertical: 'start' },
        sizeLimits: { minWidth: 240, maxWidth: 640 },
      },
    });
    expect(page.children[2]).toMatchObject({
      element: 'link',
      tag: 'a',
      control: { type: 'link', label: 'Learn more' },
      metadata: {
        sourceType: 'INSTANCE',
        componentId: 'component:link',
        componentProperties: { Size: 'Large', Disabled: 'false' },
      },
    });
    expect(page.children[3]).toMatchObject({
      element: 'button',
      tag: 'button',
      control: { type: 'button', label: 'Save changes' },
    });
  });

  it('preserves children inside image-filled frames and infers spacing from free-layout geometry', () => {
    const root: FigmaNode = {
      id: '30:1',
      name: 'Site page',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 680, height: 400 },
      children: [
        {
          id: '30:2',
          name: 'Image-backed hero card',
          type: 'FRAME',
          absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 400 },
          fills: [{ type: 'IMAGE' }],
          children: [{
            id: '30:3',
            name: 'Hero title',
            type: 'TEXT',
            characters: 'Structure must survive',
            absoluteBoundingBox: { x: 24, y: 24, width: 252, height: 60 },
          }],
        },
        {
          id: '30:4',
          name: 'Content card',
          type: 'FRAME',
          absoluteBoundingBox: { x: 340, y: 0, width: 300, height: 400 },
          children: [{
            id: '30:5',
            name: 'Card title',
            type: 'TEXT',
            characters: 'Second column',
            absoluteBoundingBox: { x: 364, y: 24, width: 252, height: 60 },
          }],
        },
      ],
    };

    const page = buildFigmaDocumentImport('Site fixture', root, null).reconstruction.regions[0];

    expect(page.layout).toMatchObject({ mode: 'row', gap: 40 });
    expect(page.children[0].element).not.toBe('media');
    expect(page.children[0].children[0]).toMatchObject({
      element: 'text',
      text: 'Structure must survive',
    });
  });
});

function makeControlNode(
  id: string,
  name: string,
  x: number,
  y: number,
  placeholder: string,
): FigmaNode {
  return {
    id,
    name,
    type: 'FRAME',
    absoluteBoundingBox: { x, y, width: 440, height: 120 },
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    constraints: { horizontal: 'STRETCH', vertical: 'MIN' },
    minWidth: 240,
    maxWidth: 640,
    children: [{ id: `${id}-text`, name: 'Placeholder', type: 'TEXT', characters: placeholder }],
  };
}
