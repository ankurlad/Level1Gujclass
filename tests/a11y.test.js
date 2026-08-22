import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

// WCAG 2.2 AA target size. The floor lives in one base-layer rule in index.css
// rather than on every control, so the two guards below are: the rule exists,
// and nothing in App.jsx undercuts it with a smaller arbitrary min-* utility
// (min-width/min-height beat width/height, but a smaller min-* wins outright).
const TARGET_PX = 44

describe('viewport meta (WCAG 1.4.4 Resize Text)', () => {
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/)?.[1]

  it('is present', () => {
    expect(viewport).toBeTypeOf('string')
  })

  it('does not block browser zoom', () => {
    expect(viewport).not.toMatch(/maximum-scale/)
    expect(viewport).not.toMatch(/user-scalable/)
  })

  it('still sizes to the device and keeps the safe-area opt-in', () => {
    expect(viewport).toMatch(/width=device-width/)
    expect(viewport).toMatch(/initial-scale=1(\.0)?\b/)
    // env(safe-area-inset-*) in index.css only resolves with viewport-fit=cover.
    expect(viewport).toMatch(/viewport-fit=cover/)
  })
})

describe('touch targets (WCAG 2.2 AA target size)', () => {
  it('index.css sets the 44px floor on every interactive element', () => {
    const base = css.match(/button,\s*select,\s*textarea,\s*a,[\s\S]*?\}/)?.[0]
    expect(base).toMatch(new RegExp(`min-width:\\s*${TARGET_PX}px`))
    expect(base).toMatch(new RegExp(`min-height:\\s*${TARGET_PX}px`))
    expect(css).toMatch(new RegExp(`input\\s*\\{[\\s\\S]*?min-height:\\s*${TARGET_PX}px`))
  })

  it('App.jsx never overrides that floor downwards', () => {
    const undersized = [...app.matchAll(/min-[wh]-\[(\d+)px\]/g)].filter(
      (m) => Number(m[1]) < TARGET_PX,
    )
    expect(undersized.map((m) => m[0])).toEqual([])
  })
})
