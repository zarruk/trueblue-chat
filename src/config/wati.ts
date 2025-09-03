/**
 * WATI Configuration
 * 
 * This file handles WATI authentication tokens in a secure way.
 * Tokens are loaded from environment variables and should never be hardcoded.
 */

interface WatiConfig {
  devToken: string | null;
  prodToken: string | null;
  isConfigured: boolean;
}

/**
 * Get WATI configuration from environment variables
 */
export function getWatiConfig(): WatiConfig {
  const devToken = import.meta.env.VITE_WATI_DEV_TOKEN || null;
  const prodToken = import.meta.env.VITE_WATI_PROD_TOKEN || null;
  
  return {
    devToken,
    prodToken,
    isConfigured: !!(devToken && prodToken)
  };
}

/**
 * Get the appropriate WATI token based on environment
 */
export function getWatiToken(): string | null {
  const config = getWatiConfig();
  
  if (!config.isConfigured) {
    console.warn('[WATI] Tokens no configurados. Configure VITE_WATI_DEV_TOKEN y VITE_WATI_PROD_TOKEN');
    return null;
  }
  
  // Use dev token for development, prod token for production/staging
  const isDev = import.meta.env.MODE === 'development';
  return isDev ? config.devToken : config.prodToken;
}

/**
 * Check if WATI is properly configured
 */
export function isWatiConfigured(): boolean {
  return getWatiConfig().isConfigured;
}

/**
 * Get WATI token for API requests
 * Returns null if not configured
 */
export function getWatiAuthHeader(): string | null {
  const token = getWatiToken();
  return token ? `Bearer ${token}` : null;
}
