// Local oxlint plugin: one rule, `theme/no-raw-hex`.
//
// The palette lives in the `@theme` block in src/index.css, where every token
// is at once a CSS custom property and a Tailwind utility. A hex literal in a
// component is a second, silent palette that drifts from the first — that is
// exactly what this repo had before PR 2 (three parallel colour systems that
// only agreed because --primary happened to equal indigo-600).
//
// Reach for a token instead:
//   className="bg-primary"                       utility
//   style={{ borderColor: 'var(--color-primary)' }}   inline style
//   themeColor('--color-primary')                canvas 2D, which needs a
//                                                resolved colour string
//
// The two `#f8fafc` fills in App.jsx are the documented exception and carry an
// oxlint-disable-next-line: they are snap calibration constants, not colours.
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

const noRawHex = {
  meta: {
    type: 'problem',
    docs: { description: 'Use a --color-* theme token instead of a raw hex colour.' },
  },
  create(context) {
    const report = (node, raw) => {
      context.report({
        node,
        message:
          `Raw hex colour ${raw}. Use a --color-* token from the @theme block in ` +
          `src/index.css (a utility class, var(--color-x), or themeColor('--color-x')).`,
      })
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string' && HEX.test(node.value)) report(node, node.value)
      },
      TemplateElement(node) {
        const raw = node.value?.raw
        if (typeof raw === 'string' && /#[0-9a-fA-F]{3,8}\b/.test(raw)) {
          report(node, raw.match(/#[0-9a-fA-F]{3,8}/)[0])
        }
      },
    }
  },
}

export default {
  meta: { name: 'theme' },
  rules: { 'no-raw-hex': noRawHex },
}
