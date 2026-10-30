#!/usr/bin/env node
/**
 * check-launch.mjs — Validador de preparación para el lanzamiento a producción.
 *
 * Comprueba:
 * 1. Ausencia de marcadores TODO_ en variables de configuración críticas (owner, nie, domicilio, contacto, url).
 *    Nota: 'logoPath' se excluye deliberadamente ya que el logotipo aún no existe.
 * 2. Ausencia de marcadores TODO_ o del comentario de borrador legal en los archivos fuente legales.
 * 3. Ausencia de marcadores TODO_ o del comentario de borrador legal en los archivos generados en dist/.
 *
 * Si detecta algún marcador o borrador legal, sale con código de error 1.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDistAssets } from './check-assets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar variables de entorno locales si existen (.env y .env.local)
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (_) {}
}
if (fs.existsSync(envLocalPath)) {
  try {
    process.loadEnvFile(envLocalPath);
  } catch (_) {}
}

const errors = [];

// 1. Validar configuración central en src/config/site.ts
console.log('🔍 [1/3] Verificando variables de configuración central...');
const configPath = path.join(rootDir, 'src', 'config', 'site.ts');
if (fs.existsSync(configPath)) {
  // Claves obligatorias a comprobar con sus variables de entorno correspondientes
  const mandatoryKeys = [
    { key: 'PUBLIC_SITE_OWNER', label: 'titular (owner)' },
    { key: 'PUBLIC_SITE_NIE', label: 'NIE (idNumber)' },
    { key: 'PUBLIC_SITE_ADDRESS', label: 'domicilio (address)' },
    { key: 'PUBLIC_SITE_EMAIL', label: 'correo (email)' },
    { key: 'PUBLIC_SITE_URL', label: 'URL del sitio (url)' },
  ];

  for (const item of mandatoryKeys) {
    const envVal = process.env[item.key];
    if (!envVal || envVal.includes('TODO_')) {
      errors.push(`Configuración: Falta definir valor real para ${item.label} (${item.key}).`);
    }
  }

  // Canal opcional: teléfono (si está definido no debe contener marcador TODO_)
  const phoneVal = process.env.PUBLIC_SITE_PHONE;
  if (phoneVal && phoneVal.includes('TODO_')) {
    errors.push(`Configuración: El canal opcional de teléfono contiene un marcador sin resolver (${phoneVal}).`);
  }
} else {
  errors.push(`No se encuentra el archivo de configuración central: ${configPath}`);
}

// 2. Validar páginas legales en src/pages/
console.log('🔍 [2/3] Verificando páginas legales en src/pages/...');
const legalPages = [
  path.join(rootDir, 'src', 'pages', 'aviso-legal.astro'),
  path.join(rootDir, 'src', 'pages', 'privacidad.astro'),
];

const draftMarker = 'BORRADOR: revisar con un profesional antes de publicar';

for (const legalFile of legalPages) {
  if (fs.existsSync(legalFile)) {
    const content = fs.readFileSync(legalFile, 'utf-8');
    const relPath = path.relative(rootDir, legalFile);

    if (content.includes(draftMarker)) {
      errors.push(`Páginas legales: El archivo '${relPath}' aún contiene el marcador de borrador ('${draftMarker}').`);
    }

    const todoMatches = content.match(/TODO_[A-Z0-9_]+/g);
    if (todoMatches) {
      const filtered = todoMatches.filter((m) => !m.includes('LOGO'));
      if (filtered.length > 0) {
        errors.push(`Páginas legales: El archivo '${relPath}' contiene marcadores sin resolver: ${filtered.join(', ')}`);
      }
    }
  }
}

// 3. Validar salida compilada en dist/
console.log('🔍 [3/4] Verificando salida en dist/...');
const distDir = path.join(rootDir, 'dist');

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (item.isFile() && /\.(html|js|txt|xml|json)$/i.test(item.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

let distFiles = [];
if (fs.existsSync(distDir)) {
  distFiles = scanDirectory(distDir);
  for (const file of distFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(rootDir, file);

    if (content.includes(draftMarker)) {
      errors.push(`Build dist/: '${relPath}' incluye el marcador de borrador legal.`);
    }

    const todoMatches = content.match(/TODO_[A-Z0-9_]+/g);
    if (todoMatches) {
      const filtered = todoMatches.filter((m) => !m.includes('LOGO'));
      if (filtered.length > 0) {
        errors.push(`Build dist/: '${relPath}' contiene marcadores pendientes: ${[...new Set(filtered)].join(', ')}`);
      }
    }
  }
} else {
  console.log('ℹ️  Nota: dist/ no existe actualmente. Se validaron los fuentes.');
}

// 4. Validar existencia física de imágenes e iconos referenciados en dist/**/*.html
console.log('🔍 [4/4] Verificando existencia de recursos de imágenes e iconos en dist/**/*.html...');
if (fs.existsSync(distDir)) {
  const assetErrors = validateDistAssets(distDir, rootDir);
  errors.push(...assetErrors);
}

// Reporte de resultados
console.log('--------------------------------------------------');
if (errors.length > 0) {
  console.error(`❌ check:launch FALLIDO (${errors.length} problemas encontrados):\n`);
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  console.error('\nPara pasar el chequeo de lanzamiento, define las variables en .env.local y retira el marcador de borrador legal tras revisión profesional.');
  process.exit(1);
} else {
  console.log('✅ check:launch SUPERADO: No quedan marcadores TODO_ críticos ni borradores legales pendientes.');
  process.exit(0);
}
