import handler, { isAllowedFigmaAssetHost, materializeFigmaAssets } from '../api/figma';

function createResponseRecorder() {
  let statusCode = 0;
  let body: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(payload: unknown) {
      body = payload;
    },
  };
  return {
    response,
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
}

describe('Figma server endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.FIGMA_ACCESS_TOKEN;
  });

  it('rejects invalid URLs before making a provider request', async () => {
    process.env.FIGMA_ACCESS_TOKEN = 'test-token';
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const recorder = createResponseRecorder();

    await handler(
      { method: 'POST', body: { url: 'https://example.com/not-figma' } },
      recorder.response,
    );

    expect(recorder.statusCode).toBe(400);
    expect(recorder.body).toMatchObject({ ok: false, reason: 'invalid_url' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only allows Figma-owned HTTPS hosts for server-side asset materialization', () => {
    expect(isAllowedFigmaAssetHost('https://s3-alpha-sig.figma.com/image.png')).toBe(true);
    expect(isAllowedFigmaAssetHost('https://figma.com/image.png')).toBe(true);
    expect(isAllowedFigmaAssetHost('http://figma.com/image.png')).toBe(false);
    expect(isAllowedFigmaAssetHost('https://figma.com.evil.example/image.png')).toBe(false);
    expect(isAllowedFigmaAssetHost('not a url')).toBe(false);
  });

  it('leaves oversized and non-Figma assets remote instead of embedding them', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('oversized', {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Length': '700000' },
    }));

    const result = await materializeFigmaAssets({
      oversized: 'https://s3-alpha-sig.figma.com/oversized.png',
      untrusted: 'https://evil.example/image.png',
    });

    expect(result).toEqual({
      oversized: 'https://s3-alpha-sig.figma.com/oversized.png',
      untrusted: 'https://evil.example/image.png',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads a selected node and rendered preview with the server-only token', async () => {
    process.env.FIGMA_ACCESS_TOKEN = 'server-secret';
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Storefront',
        nodes: {
          '1:2': {
            document: {
              id: '1:2',
              name: 'Hero frame',
              type: 'FRAME',
              children: [
                { id: '1:3', name: 'Title', type: 'TEXT', characters: 'A better storefront experience' },
                { id: '1:4', name: 'Product image', type: 'RECTANGLE', fills: [{ type: 'IMAGE' }] },
              ],
            },
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        images: {
          '1:2': 'https://figma.example/render.png',
          '1:4': 'https://s3-alpha-sig.figma.com/product.png',
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'Content-Type': 'image/png', 'Content-Length': '4' },
      }));
    const recorder = createResponseRecorder();

    await handler(
      {
        method: 'POST',
        body: { url: 'https://www.figma.com/design/ABC123/Storefront?node-id=1-2' },
      },
      recorder.response,
    );

    expect(recorder.statusCode).toBe(200);
    expect(recorder.body).toMatchObject({
      ok: true,
      document: {
        fileName: 'Storefront',
        nodeId: '1:2',
        previewUrl: 'https://figma.example/render.png',
        reconstruction: {
          schemaVersion: 'figma-to-vue.reconstruction-plan.v2',
          regions: [
            {
              children: [
                {},
                {
                  asset: {
                    sourceNodeId: '1:4',
                    url: 'data:image/png;base64,iVBORw==',
                    delivery: 'embedded',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          ],
        },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v1/files/ABC123/nodes');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('depth=10');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { 'X-Figma-Token': 'server-secret' },
    });
    expect(fetchMock.mock.calls[1]?.[0]).toContain(encodeURIComponent('1:2,1:4'));
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://s3-alpha-sig.figma.com/product.png');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ redirect: 'error' });
  });
});
