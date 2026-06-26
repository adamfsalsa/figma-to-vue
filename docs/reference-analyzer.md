# Reference Analyzer

The reference analyzer is the legitimate bridge between an uploaded image and Vue output.

## What It Does

The analyzer displays the uploaded screenshot or exported frame and asks the user to record visible design observations:

- hero composition
- media emphasis
- layout pattern
- expected content sections
- CTA style
- visual translation notes

Those observations become a typed `ReferenceAnalysis` object. The page-plan builder then uses that object to produce the JSON plan that the Vue renderer consumes.

## What It Does Not Do

It does not claim to inspect pixels automatically. The browser previews the image, but the design interpretation is human-guided. This keeps the pipeline honest, reviewable, and accessible for a portfolio case study.

## Translation Path

```text
Reference image
  -> ReferenceAnalyzer observations
  -> ReferenceAnalysis object
  -> PagePlan JSON
  -> Vue-rendered preview
```

This creates a clean future upgrade path: computer vision or Figma API data could later prefill the same analyzer fields without changing the renderer.
