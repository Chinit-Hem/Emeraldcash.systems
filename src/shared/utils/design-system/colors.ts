/**
 * Color Palette Design System
 * 
 * Centralized color management to eliminate duplication across the application.
 * Follows OOAD principles with a singleton-like pattern for color schemes.
 * 
 * @module design-system/colors
 */

export type ColorName = 'emerald' | 'blue' | 'purple' | 'orange' | 'red' | 'gray';

export interface ColorScheme {
  bg: string;
  bgSoft: string;
  text: string;
  textSoft: string;
  border: string;
  borderSoft: string;
  icon: string;
  gradient: string;
}

/**
 * ColorPalette - Centralized color management
 * 
 * Usage:
 *   const colors = ColorPalette.get('emerald');
 *   <div className={colors.bg}>Content</div>
 */
export class ColorPalette {
  private static schemes: Record<ColorName, ColorScheme> = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      bgSoft: 'bg-emerald-50/80 dark:bg-emerald-900/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      textSoft: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      borderSoft: 'border-emerald-200/70 dark:border-emerald-500/30',
      icon: 'text-emerald-600 dark:text-emerald-400',
      gradient: 'from-emerald-400 to-emerald-600',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      bgSoft: 'bg-blue-50/80 dark:bg-blue-900/10',
      text: 'text-blue-600 dark:text-blue-400',
      textSoft: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      borderSoft: 'border-blue-200/70 dark:border-blue-500/30',
      icon: 'text-blue-600 dark:text-blue-400',
      gradient: 'from-blue-400 to-blue-600',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      bgSoft: 'bg-purple-50/80 dark:bg-purple-900/10',
      text: 'text-purple-600 dark:text-purple-400',
      textSoft: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      borderSoft: 'border-purple-200/70 dark:border-purple-500/30',
      icon: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-purple-400 to-purple-600',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      bgSoft: 'bg-orange-50/80 dark:bg-orange-900/10',
      text: 'text-orange-600 dark:text-orange-400',
      textSoft: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      borderSoft: 'border-orange-200/70 dark:border-orange-500/30',
      icon: 'text-orange-600 dark:text-orange-400',
      gradient: 'from-orange-400 to-orange-600',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      bgSoft: 'bg-red-50/80 dark:bg-red-900/10',
      text: 'text-red-600 dark:text-red-400',
      textSoft: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      borderSoft: 'border-red-200/70 dark:border-red-500/30',
      icon: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-400 to-red-600',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      bgSoft: 'bg-gray-50/80 dark:bg-gray-900/10',
      text: 'text-gray-600 dark:text-gray-400',
      textSoft: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
      borderSoft: 'border-gray-200/70 dark:border-gray-500/30',
      icon: 'text-gray-600 dark:text-gray-400',
      gradient: 'from-gray-400 to-gray-600',
    },
  };

  static get(color: ColorName): ColorScheme {
    return this.schemes[color];
  }

  static getAll(): Record<ColorName, ColorScheme> {
    return { ...this.schemes };
  }
}

/**
 * Predefined color combinations for common use cases
 */
export const ColorCombos = {
  success: ColorPalette.get('emerald'),
  info: ColorPalette.get('blue'),
  warning: ColorPalette.get('orange'),
  error: ColorPalette.get('red'),
  neutral: ColorPalette.get('gray'),
  primary: ColorPalette.get('emerald'),
  secondary: ColorPalette.get('purple'),
} as const;
