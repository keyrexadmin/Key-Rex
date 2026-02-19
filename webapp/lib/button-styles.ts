/**
 * Shared button styling constants for Key-Rex authentication button
 * 
 * This file ensures the embed script and all preview components
 * use the exact same styling. When you update these constants,
 * all buttons (embed script, dashboard preview, landing page preview)
 * will automatically stay in sync.
 */

/**
 * Default button inline styles (matches embed script exactly)
 */
export const DEFAULT_BUTTON_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(234, 88, 12) 100%)',
  color: 'white',
  fontWeight: 700,
  fontSize: '1rem',
  padding: '1rem 1.5rem',
  borderRadius: '0.75rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)',
}

/**
 * Button hover state styles
 */
export const BUTTON_HOVER_STYLE = {
  transform: 'scale(1.02)',
  background: 'linear-gradient(135deg, rgb(251, 146, 60) 0%, rgb(249, 115, 22) 100%)',
  boxShadow: '0 4px 8px rgba(249, 115, 22, 0.3)',
}

/**
 * Button normal state styles (for resetting from hover)
 */
export const BUTTON_NORMAL_STYLE = {
  transform: 'scale(1)',
  background: 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(234, 88, 12) 100%)',
  boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)',
}

/**
 * Generates the CSS string for the embed script
 * This is used in app/embed/route.ts to set button styles
 */
export function getEmbedButtonCSS(): string {
  return `width: 100%; background: linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(234, 88, 12) 100%); color: white; font-weight: 700; font-size: 1rem; padding: 1rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);`
}

/**
 * Hover state values as strings for use in generated JavaScript
 */
export const HOVER_TRANSFORM = 'scale(1.02)'
export const HOVER_BACKGROUND = 'linear-gradient(135deg, rgb(251, 146, 60) 0%, rgb(249, 115, 22) 100%)'
export const HOVER_BOX_SHADOW = '0 4px 8px rgba(249, 115, 22, 0.3)'

/**
 * Normal state values as strings for use in generated JavaScript
 */
export const NORMAL_TRANSFORM = 'scale(1)'
export const NORMAL_BACKGROUND = 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(234, 88, 12) 100%)'
export const NORMAL_BOX_SHADOW = '0 2px 4px rgba(249, 115, 22, 0.2)'

/**
 * Applies hover styles to a button element (for embed script)
 */
export function applyHoverStyles(button: HTMLElement): void {
  button.style.transform = BUTTON_HOVER_STYLE.transform
  button.style.background = BUTTON_HOVER_STYLE.background
  button.style.boxShadow = BUTTON_HOVER_STYLE.boxShadow
}

/**
 * Applies normal styles to a button element (for embed script)
 */
export function applyNormalStyles(button: HTMLElement): void {
  button.style.transform = BUTTON_NORMAL_STYLE.transform
  button.style.background = BUTTON_NORMAL_STYLE.background
  button.style.boxShadow = BUTTON_NORMAL_STYLE.boxShadow
}

