declare module "react/jsx-runtime" {
  export function jsx(type: unknown, props: unknown, key?: string): unknown;
  export function jsxs(type: unknown, props: unknown, key?: string): unknown;
  export const Fragment: unknown;
}
