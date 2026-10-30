// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// Cargar variables de entorno locales con loadEnv de Vite
const mode = process.env.NODE_ENV || (process.argv.includes('dev') ? 'development' : 'production');
const env = loadEnv(mode, process.cwd(), '');

// Prioridad para variables exportadas en el shell sobre las cargadas desde archivos .env
const rawSiteUrl = process.env.PUBLIC_SITE_URL || env.PUBLIC_SITE_URL || '';
const rawBasePath = process.env.PUBLIC_BASE_PATH || env.PUBLIC_BASE_PATH || '/';

function getValidSiteUrl(val) {
  if (!val || typeof val !== 'string' || val.trim() === '' || val.includes('TODO_')) {
    return undefined;
  }
  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return val.replace(/\/+$/, '');
    }
  } catch (_) {}
  return undefined;
}

const siteUrl = getValidSiteUrl(rawSiteUrl);

const licenseNotice = `/*!
 * Scroll Reveal Effect
 * Based on: "Reveal animations based on scroll direction"
 * Author: GSAP
 * URL: https://codepen.io/GreenSock/pen/pojzxwZ
 * License: MIT
 *
 * Copyright (c) 2026 by GSAP (https://codepen.io/GreenSock/pen/pojzxwZ)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */`;

function preserveLicenseNotice() {
  return {
    name: 'preserve-license-notice',
    enforce: /** @type {const} */ ('post'),
    generateBundle(options, bundle) {
      for (const [fileName, file] of Object.entries(bundle)) {
        if (fileName.endsWith('.js') && file.type === 'chunk') {
          const hasScrollReveal =
            (file.modules && Object.keys(file.modules).some((m) => m.includes('scroll-reveal'))) ||
            file.code.includes('gs_reveal');
          if (hasScrollReveal) {
            file.code = `${licenseNotice}\n${file.code}`;
          }
        }
      }
    },
  };
}

// https://astro.build/config
export default defineConfig({
  ...(siteUrl ? { site: siteUrl } : {}),
  base: rawBasePath,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss(), preserveLicenseNotice()],
  },
});
