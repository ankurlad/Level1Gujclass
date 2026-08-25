// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storageKey } from '../src/hooks/useLocalStorage.js'
import { TREND_WINDOW } from '../src/lib/mastery.js'
import ParentDashboard from '../src/views/ParentDashboard.jsx'
import { AppStoreProvider } from '../src/store/appStore.js'

// The parents' room read of the accuracy record: what a child with Challenge
// scores sees, what a child without them sees, and what the adult register
// covers.

// Read off the project root, not off import.meta.url: this file runs in jsdom,
// where import.meta.url is an http:// URL that node:fs will not open.
const source = (relative) => readFileSync(resolve(process.cwd(), relative), 'utf8')
const css = source('src/index.css')
const waypointEditor = source('src/views/WaypointEditor.jsx')

let container

// Puts one child on the device with whatever they have earned so far, then
// renders the dashboard for them.
function render({ accuracy, progress } = {}) {
  localStorage.setItem(storageKey('children'), JSON.stringify([{ id: 'c1', name: 'Asha' }]))
  localStorage.setItem(storageKey('active_child'), '"c1"')
  if (accuracy) localStorage.setItem(storageKey('child:c1:accuracy'), JSON.stringify(accuracy))
  if (progress) localStorage.setItem(storageKey('child:c1:progress'), JSON.stringify(progress))

  container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<AppStoreProvider><ParentDashboard /></AppStoreProvider>))
  return {
    text: () => container.textContent || '',
    root: container.firstElementChild,
    unmount: () => act(() => root.unmount()),
  }
}

// A record for ka: three Challenge sessions rising to 92, and one Guided one.
const KA_RECORD = {
  letters: {
    ka: {
      challenge: { best: 92, attempts: 3, history: [60, 70, 92] },
      guided: { best: 80, attempts: 1, history: [80] },
    },
    kha: { guided: { best: 55, attempts: 2, history: [50, 55] } },
  },
  streak: { current: 2, longest: 4 },
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('a child with Challenge records', () => {
  it('prints the best, the window average and the delta for each letter traced', () => {
    const view = render({ accuracy: KA_RECORD })
    const text = view.text()

    expect(text).toContain('Tracing Accuracy')
    expect(text).toContain('92%') // best
    expect(text).toContain('74%') // mean of 60, 70, 92
    expect(text).toContain('▲ 27') // 92 against the mean of 60 and 70
  })

  it('says how many letters are mastered and where the streak stands', () => {
    const text = render({ accuracy: KA_RECORD }).text()
    expect(text).toMatch(/1 \/ \d+ mastered/)
    expect(text).toContain('streak 2 (best 4)')
    expect(text).toContain('mastered')
  })

  it('explains the window and the bar it is quoting', () => {
    const text = render({ accuracy: KA_RECORD }).text()
    expect(text).toContain(`Avg ${TREND_WINDOW}`)
    expect(text).toContain('85% or better')
  })
})

describe('a child with no Challenge records', () => {
  it('draws an em dash for a letter traced only in Guided, rather than a zero', () => {
    const view = render({
      accuracy: { letters: { ka: { guided: { best: 80, attempts: 1, history: [80] } } }, streak: { current: 0, longest: 0 } },
    })
    const text = view.text()

    // The row is there — the letter has been worked on — but the Challenge
    // columns have nothing to report.
    expect(text).toContain('Tracing Accuracy')
    expect(text).toContain('—')
    expect(text).not.toContain('80%')
    expect(text).toMatch(/0 \/ \d+ mastered/)
  })

  it('draws the same dashes for a letter completed before accuracy was ever recorded', () => {
    const text = render({ progress: { tracedCount: 4, quizScore: 0, completedLessons: ['ka'] } }).text()
    expect(text).toContain('—')
    expect(text).toContain('Ka')
  })

  it('says so plainly when the child has traced nothing at all', () => {
    const text = render().text()
    expect(text).toContain('No traces recorded yet')
    expect(text).toMatch(/0 \/ \d+ mastered/)
    expect(text).toContain('streak 0 (best 0)')
  })

  it('survives a hostile accuracy key instead of taking the page down', () => {
    const view = render({ accuracy: { letters: { not_a_letter: 'junk' }, streak: 'junk' } })
    expect(view.text()).toContain('Tracing Accuracy')
    expect(view.text()).toContain('No traces recorded yet')
  })
})

describe('the adult register', () => {
  it('is worn by the dashboard and by the waypoint editor, and by nothing else', () => {
    expect(render().root.className).toContain('surface-adult')
    expect(waypointEditor).toContain('surface-adult')
  })

  it('is defined outside a cascade layer, or Tailwind utilities would outrank it', () => {
    const declaration = css.slice(css.indexOf('.surface-adult {'))
    expect(declaration).toContain('font-variant-numeric: tabular-nums')
    // Everything after the components layer closes is unlayered.
    expect(css.indexOf('.surface-adult {')).toBeGreaterThan(css.lastIndexOf('@layer components'))
  })

  it('tightens the radii to 0.5rem without touching rounded-full', () => {
    const rule = css.slice(css.indexOf(".surface-adult:is([class~='rounded-xl'"))
    expect(rule.slice(0, 300)).toContain('border-radius: 0.5rem')
    expect(css).not.toContain("[class~='rounded-full']")
  })

  it('flattens gradients rather than recolouring them', () => {
    expect(css).toContain("surface-adult [class*='bg-gradient-']")
    expect(css.slice(css.indexOf("surface-adult [class*='bg-gradient-']"), css.indexOf("surface-adult [class*='bg-gradient-']") + 220))
      .toContain('background-image: none')
  })

  it('keeps no decorative emoji in the parent-facing copy it owns', () => {
    // The child avatar and the earned stickers stay: those are data a parent is
    // reading, not chrome. What went is the decoration around them.
    expect(waypointEditor).not.toContain('🔧')
    expect(source('src/views/ParentDashboard.jsx')).not.toContain('🔄')
  })
})
