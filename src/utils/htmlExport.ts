import type { GeneratedPage, GeneratedPageCta } from '../types/generatedPage';
import { generateReconstructionArtifact } from './reconstructionCodegen';

/**
 * Turns a generated page into a complete, self-styled, standalone HTML
 * document — the "Copy HTML" artifact. Unlike the Vue SFC (which is meant to be
 * dropped into a Vue project), this is a single file you can open directly in a
 * browser, so it inlines its own `<style>` and bakes the extracted palette into
 * custom properties. It renders the same hero, CTA, and sections as the live
 * preview, so the three artifacts (preview, SFC, HTML) match.
 *
 * Pure and deterministic. All interpolated content is HTML-escaped, so
 * generated text cannot inject markup.
 */
export function generatePageHtml(page: GeneratedPage): string {
  if (page.reconstruction) {
    return generateReconstructedPageHtml(page);
  }

  const paletteVars = page.palette.length
    ? `\n      :root { --token-accent: ${escapeHtml(page.palette[0])}; --token-surface-soft: ${escapeHtml(
        page.palette[1] ?? page.palette[0],
      )}; }`
    : '';

  const sectionsMarkup = page.sections
    .map(
      (section) => `
        <article>
          <h2>${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.body)}</p>
        </article>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(page.title)}</title>
    <style>${paletteVars}
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; color: #1a1a1a; }
      .page { display: grid; gap: 2rem; max-width: 70rem; margin: 0 auto; padding: 2rem; }
      .hero { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 2rem; align-items: center; padding: 2.5rem; border-radius: 12px; background: var(--token-surface-soft, #f4f6fb); }
      .hero__kicker { margin: 0 0 0.5rem; color: var(--token-accent, #4a90e2); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.85rem; }
      .hero h1 { margin: 0 0 0.75rem; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.05; }
      .hero__summary { margin: 0; max-width: 38rem; line-height: 1.6; }
      .cta { display: inline-flex; align-items: center; min-height: 44px; margin-top: 1.5rem; padding: 0 1.25rem; border: none; border-radius: 8px; background: var(--token-accent, #4a90e2); color: #fff; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; }
      .cta--link { min-height: 0; padding: 0; background: none; color: var(--token-accent, #4a90e2); }
      .cta-form { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.5rem; }
      .cta-form input { min-height: 44px; padding: 0 0.75rem; border: 1px solid #e4e7ee; border-radius: 8px; font: inherit; }
      .cta-form .cta { margin-top: 0; }
      .finder { margin-top: 1.5rem; display: grid; gap: 0.5rem; max-width: 26rem; }
      .finder > label { font-weight: 600; font-size: 0.85rem; }
      .finder-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .finder select { flex: 1 1 12rem; min-height: 44px; padding: 0 0.75rem; border: 1px solid #e4e7ee; border-radius: 8px; font: inherit; }
      .finder .cta { margin-top: 0; }
      .sections { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
      .sections article { padding: 1.25rem; border: 1px solid #e4e7ee; border-radius: 10px; }
      .sections h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
      .sections p { margin: 0; line-height: 1.5; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <div>
          <p class="hero__kicker">${escapeHtml(page.kicker)}</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p class="hero__summary">${escapeHtml(page.summary)}</p>
${buildCtaMarkup(page.cta)}${buildFinderMarkup(page)}        </div>
      </header>
      <section class="sections" aria-label="Page sections">${sectionsMarkup}
      </section>
    </main>
  </body>
</html>`;
}

function generateReconstructedPageHtml(page: GeneratedPage): string {
  const artifact = generateReconstructionArtifact(page.reconstruction!);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(page.title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; color: #1a1a1a; }
${artifact.css}
    </style>
  </head>
  <body>
${artifact.markup}
  </body>
</html>`;
}

function buildFinderMarkup(page: GeneratedPage): string {
  if (page.layoutPattern !== 'Product finder flow') {
    return '';
  }
  const options = page.sections
    .map((section) => `              <option>${escapeHtml(section.title)}</option>`)
    .join('\n');
  return `          <form class="finder">
            <label for="finder-choice">What are you looking for?</label>
            <div class="finder-row">
              <select id="finder-choice">
${options}
              </select>
              <button type="submit" class="cta">Show results</button>
            </div>
          </form>\n`;
}

function buildCtaMarkup(cta: GeneratedPageCta): string {
  const label = escapeHtml(cta.label);
  switch (cta.kind) {
    case 'button':
      return `          <button type="button" class="cta">${label}</button>\n`;
    case 'link':
      return `          <a class="cta cta--link" href="#">${label} &rarr;</a>\n`;
    case 'form':
      return `          <form class="cta-form">
            <label class="visually-hidden" for="cta-email">Email address</label>
            <input id="cta-email" type="email" placeholder="you@example.com">
            <button type="submit" class="cta">${label}</button>
          </form>\n`;
    case 'none':
    default:
      return '';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
