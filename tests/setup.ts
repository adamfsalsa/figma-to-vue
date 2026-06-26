import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:reference-preview'),
  writable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  configurable: true,
  writable: true,
});
