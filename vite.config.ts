/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Each prototype is its own page, served at /prototypes/<name>/.
      input: {
        main: path.resolve(dirname, 'index.html'),
        'shopping-list': path.resolve(dirname, 'prototypes/shopping-list/index.html'),
        'pantry-app': path.resolve(dirname, 'prototypes/pantry-app/index.html'),
        'claude-connection': path.resolve(dirname, 'prototypes/claude-connection/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`
    }
  },
  test: {
    projects: [{
      // The Claude connection's server: plain Node, no browser.
      extends: true,
      test: {
        name: 'claude-connection',
        include: ['prototypes/claude-connection/test/**/*.test.ts'],
        environment: 'node',
      },
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});