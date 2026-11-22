import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function sanitizeHttpsOrigin(raw?: string): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

function sanitizeFeedbackUrl(raw?: string): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw.trim());
    if (parsed.username || parsed.password) return '';
    if (parsed.protocol === 'https:') {
      return parsed.hostname ? parsed.href : '';
    }
    if (parsed.protocol === 'mailto:') {
      return parsed.pathname.trim() ? parsed.href : '';
    }
    return '';
  } catch {
    return '';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resolvedOrigin = sanitizeHttpsOrigin(
    process.env.VITE_SITE_ORIGIN ||
      process.env.FINPATH_PRODUCTION_ORIGIN ||
      env.VITE_SITE_ORIGIN ||
      env.FINPATH_PRODUCTION_ORIGIN
  );
  const resolvedFeedbackUrl = sanitizeFeedbackUrl(
    process.env.VITE_FEEDBACK_URL || env.VITE_FEEDBACK_URL
  );

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(resolvedOrigin),
      'import.meta.env.VITE_FEEDBACK_URL': JSON.stringify(resolvedFeedbackUrl)
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'workers/**/*.test.ts']
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // Long-lived vendor and catalog chunks cache independently of app releases (B38).
          manualChunks(id: string) {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
            if (/src\/lib\/(seoCalculators|calculatorContent|routeMetadata)\.ts$/.test(id)) return 'calculator-catalog';
            return undefined;
          }
        }
      }
    }
  };
});
