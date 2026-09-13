import defaultLogoImg from '../assets/logo.png';

export const DEFAULT_INIP_LOGO = defaultLogoImg;

/**
 * Returns the effective URL for the INIP logo.
 * If the user has a custom logo (data URL or external URL), use it.
 * If not, or if it's the legacy '/logo.png' string, use the bundled asset.
 */
export function getEffectiveLogoUrl(customUrl?: string | null): string {
  if (!customUrl || customUrl === '/logo.png' || customUrl === 'logo.png' || customUrl.trim() === '') {
    return DEFAULT_INIP_LOGO;
  }
  return customUrl.trim();
}
