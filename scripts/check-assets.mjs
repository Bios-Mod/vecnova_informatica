#!/usr/bin/env node
/**
 * check-assets.mjs — Validador de existencia de recursos físicos en dist/
 *
 * Comprueba que cada 'src' en etiquetas <img> y cada 'href' en etiquetas
 * <link rel="icon"> o <link rel="apple-touch-icon"> dentro de los HTML
 * compilados en dist/ apunten a archivos existentes físicamente.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, '..');

export function scanHtmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      scanHtmlFiles(fullPath, fileList);
    } else if (item.isFile() && item.name.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function validateDistAssets(distDir, rootDir = defaultRootDir) {
  const errors = [];
  if (!fs.existsSync(distDir)) {
    errors.push(`El directorio dist/ no existe en '${distDir}'. Ejecuta primero 'npm run build'.`);
    return errors;
  }

  const htmlFiles = scanHtmlFiles(distDir);
  if (htmlFiles.length === 0) {
    errors.push(`No se encontraron archivos HTML en '${distDir}'.`);
    return errors;
  }

  function checkAsset(assetUrl, typeLabel, relHtmlPath, htmlFile) {
    if (/^(https?:|\/\/|data:)/i.test(assetUrl)) {
      return;
    }
    const cleanUrl = assetUrl.split('?')[0].split('#')[0];
    if (!cleanUrl) return;

    let resolvedPath;
    if (cleanUrl.startsWith('/')) {
      resolvedPath = path.join(distDir, cleanUrl);
    } else {
      resolvedPath = path.resolve(path.dirname(htmlFile), cleanUrl);
    }

    if (!fs.existsSync(resolvedPath)) {
      errors.push(
        `Recurso no encontrado: En '${relHtmlPath}', el ${typeLabel} '${assetUrl}' apunta a '${path.relative(rootDir, resolvedPath)}' que no existe.`
      );
    }
  }

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf-8');
    const relHtmlPath = path.relative(rootDir, htmlFile);

    // Comprobar src de etiquetas <img>
    const imgMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const match of imgMatches) {
      checkAsset(match[1], 'src de <img>', relHtmlPath, htmlFile);
    }

    // Comprobar href de <link rel="icon"> o <link rel="apple-touch-icon">
    const linkMatches = content.matchAll(
      /<link[^>]+(?:rel=["'](?:[^"']*\s)?(?:icon|apple-touch-icon)(?:\s[^"']*)?["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["'](?:[^"']*\s)?(?:icon|apple-touch-icon)(?:\s[^"']*)?["'])/gi
    );
    for (const match of linkMatches) {
      const assetUrl = match[1] || match[2];
      if (assetUrl) {
        checkAsset(assetUrl, 'href de icono', relHtmlPath, htmlFile);
      }
    }
  }

  return errors;
}

// Ejecución directa desde CLI
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const distDir = path.join(defaultRootDir, 'dist');
  console.log('🔍 Verificando existencia de imágenes e iconos en dist/**/*.html...');
  const errors = validateDistAssets(distDir, defaultRootDir);

  if (errors.length > 0) {
    console.error(`❌ check:assets FALLIDO (${errors.length} recursos no encontrados):\n`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    process.exit(1);
  } else {
    console.log('✅ check:assets SUPERADO: Todos los recursos referenciados existen físicamente en dist/.');
    process.exit(0);
  }
}
