// Colours live in one place: the `@theme` block in src/index.css, where each
// token is both a CSS custom property and a Tailwind utility. JSX styling reads
// them as classes or as var(); this is the door for the code that cannot, a 2D
// canvas context, which only takes a resolved colour string.
//
// Resolved once per token and cached — getComputedStyle inside the draw loop
// would force a style recalculation on every pointer move. There is no hex
// fallback on purpose: a fallback list would be the second palette PR 2 exists
// to delete. The stylesheet is a render-blocking <link>, so it is always
// applied before this module runs.
// (A plain object, not a Map — lucide-react's `Map` icon shadows the global.)
const themeColorCache = Object.create(null);
export const themeColor = (token) => {
  if (token in themeColorCache) return themeColorCache[token];
  const root = typeof document === 'undefined' ? null : document.documentElement;
  const value = root ? getComputedStyle(root).getPropertyValue(token).trim() : '';
  themeColorCache[token] = value;
  return value;
};

// The brush palette, offered in both the tracing toolbar and the sandbox.
export const BRUSH_TOKENS = [
  { token: '--color-primary', label: 'Indigo' },
  { token: '--color-danger', label: 'Rose' },
  { token: '--color-success', label: 'Emerald' },
  { token: '--color-reward', label: 'Amber' },
  { token: '--color-accent', label: 'Purple' }
];
