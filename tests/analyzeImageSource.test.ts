import { isAllowedFigmaPreviewHost } from '../api/analyze';

describe('isAllowedFigmaPreviewHost', () => {
  it('allows figma.com and its subdomains over https', () => {
    expect(isAllowedFigmaPreviewHost('https://figma.com/some/preview.png')).toBe(true);
    expect(isAllowedFigmaPreviewHost('https://s3-alpha-sig.figma.com/img/abc/preview.png')).toBe(true);
    expect(isAllowedFigmaPreviewHost('https://api.figma.com/v1/images/x')).toBe(true);
  });

  it('rejects non-Figma hosts (SSRF guard)', () => {
    expect(isAllowedFigmaPreviewHost('https://evil.example.com/figma.com')).toBe(false);
    expect(isAllowedFigmaPreviewHost('https://notfigma.com/preview.png')).toBe(false);
    expect(isAllowedFigmaPreviewHost('https://figma.com.evil.com/preview.png')).toBe(false);
    expect(isAllowedFigmaPreviewHost('https://internal-metadata-service/secret')).toBe(false);
  });

  it('rejects non-https protocols even on an allowed host', () => {
    expect(isAllowedFigmaPreviewHost('http://figma.com/preview.png')).toBe(false);
    expect(isAllowedFigmaPreviewHost('file:///etc/passwd')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isAllowedFigmaPreviewHost('not a url')).toBe(false);
    expect(isAllowedFigmaPreviewHost('')).toBe(false);
  });
});
