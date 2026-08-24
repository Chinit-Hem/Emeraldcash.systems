export const typography = {
  // Keep aligned with Tailwind defaults; we use font weights explicitly.
  heading: {
    lg: "text-xl font-semibold leading-6",
    xl: "text-2xl font-semibold leading-7",
    '2xl': "text-3xl font-bold leading-9",
  },
  body: {
    sm: "text-sm leading-5",
    base: "text-base leading-6",
    lg: "text-lg leading-7",
  },
  caption: "text-xs leading-4",
  label: "text-sm font-medium",
} as const;

