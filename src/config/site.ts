/**
 * site.ts — Configuración centralizada de Vecnova Informática.
 * Fuente única para metadatos de marca, titular, contacto y rutas.
 *
 * Los valores de contacto y titular se leen desde variables de entorno PUBLIC_*,
 * usando un marcador TODO_* por defecto si no están definidos.
 */

export interface SiteConfig {
  name: string;
  shortName: string;
  owner: string;
  idNumber: string;
  address: string;
  email: string;
  phone: string;
  url: string;
  logoPath: string;
  logoDarkPath: string;
  isLaunch: boolean;
  showLegalOwnerData: boolean;
}

function resolveLogoPaths(raw: string | undefined): { logoPath: string; logoDarkPath: string } {
  const defaultPath = '/brand/logo.png';
  let path = (raw || '').trim();

  // Descartar valores vacíos o marcadores TODO_
  if (!path || path.includes('TODO_')) {
    path = defaultPath;
  }

  // Quitar prefijo /public/ o public/
  path = path.replace(/^\/?public\//, '/');

  // Asegurar que empieza por /
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  // Derivar la variante oscura añadiendo -dark antes de la extensión (.png, .svg, etc.)
  const lastDotIndex = path.lastIndexOf('.');
  const darkPath = lastDotIndex !== -1
    ? `${path.substring(0, lastDotIndex)}-dark${path.substring(lastDotIndex)}`
    : `${path}-dark`;

  return { logoPath: path, logoDarkPath: darkPath };
}

const { logoPath, logoDarkPath } = resolveLogoPaths(import.meta.env.PUBLIC_SITE_LOGO_PATH);

export const siteConfig: SiteConfig = {
  name: 'Vecnova Informática',
  shortName: 'Vecnova',
  owner: import.meta.env.PUBLIC_SITE_OWNER || 'TODO_SITE_OWNER',
  idNumber: import.meta.env.PUBLIC_SITE_NIE || 'TODO_SITE_NIE',
  address: import.meta.env.PUBLIC_SITE_ADDRESS || 'TODO_SITE_ADDRESS',
  email: import.meta.env.PUBLIC_SITE_EMAIL || 'TODO_SITE_EMAIL',
  phone: import.meta.env.PUBLIC_SITE_PHONE || '',
  url: import.meta.env.PUBLIC_SITE_URL || 'https://TODO_SITE_URL',
  logoPath,
  logoDarkPath,
  isLaunch: import.meta.env.PUBLIC_LAUNCH === 'true',
  showLegalOwnerData: import.meta.env.PUBLIC_SHOW_LEGAL_OWNER_DATA === 'true',
};

export const showLegalOwnerData: boolean = siteConfig.showLegalOwnerData;

/**
 * Comprueba si un valor es un dato real y no un marcador TODO_ ni una cadena vacía.
 */
export function isRealValue(val: string | undefined | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !trimmed.includes('TODO_');
}

/**
 * Comprueba si una URL es sintácticamente válida (http/https) y no contiene marcadores TODO_.
 */
export function isValidSiteUrl(val: string | undefined | null): boolean {
  if (!isRealValue(val)) return false;
  try {
    const parsed = new URL(val!);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !val!.includes('TODO_');
  } catch {
    return false;
  }
}

export const hasRealEmail = isRealValue(siteConfig.email);
export const hasRealPhone = isRealValue(siteConfig.phone);
export const hasRealLogo = isRealValue(siteConfig.logoPath);
export const hasRealUrl = isRealValue(siteConfig.url);
export const hasValidSiteUrl = isValidSiteUrl(siteConfig.url);

/**
 * Genera el enlace tel: limpio solo si el canal es real.
 */
export function getTelUrl(): string {
  if (!isRealValue(siteConfig.phone)) return '';
  const cleanNumber = siteConfig.phone.replace(/[^0-9+]/g, '');
  return `tel:${cleanNumber}`;
}

/**
 * Genera el enlace wa.me limpio (solo dígitos) solo si el canal telefónico es real.
 */
export function getWhatsAppUrl(): string {
  if (!isRealValue(siteConfig.phone)) return '';
  const digits = siteConfig.phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

/**
 * Auxiliar para anteponer import.meta.env.BASE_URL a enlaces internos y recursos públicos.
 * Permite servir la aplicación bajo un subpath sin romper rutas relativas al sitio.
 * Con base '/' el resultado es idéntico a una ruta absoluta.
 */
export function withBase(path: string): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:') ||
    path.startsWith('javascript:')
  ) {
    return path;
  }
  if (path.startsWith('#')) {
    return path;
  }
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
