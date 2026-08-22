// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '../src/components/ErrorBoundary.jsx'

// PR 12, the containment half. React unmounts to the root when nothing catches
// a render error, so before the boundary a single throw inside one screen left
// a child looking at a blank page.

// Flipped by the test rather than passed as a prop: the point of Try again is
// that it remounts the subtree, so the second render has to be able to succeed
// where the first one threw, without the boundary being re-rendered by its
// parent with new props.
let willThrow = true

function Boom() {
  if (willThrow) throw new Error('a waypoint had no x')
  return <p>the tracing screen</p>
}

let container = null
let root = null

function mount(node) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(node))
}

function button(label) {
  return [...container.querySelectorAll('button')].find(
    (element) => element.textContent.trim().toLowerCase() === label.toLowerCase()
  )
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  willThrow = true
  // React reports a caught error on the console itself, on top of the
  // boundary's own line. Neither is the assertion; the spy keeps the run
  // readable and lets the last test check what was logged.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  vi.restoreAllMocks()
  act(() => root?.unmount())
  document.body.innerHTML = ''
  root = null
  container = null
})

describe('a screen that throws while rendering', () => {
  it('shows the card, and Try again brings the screen back', () => {
    mount(
      <ErrorBoundary label="tracing">
        <Boom />
      </ErrorBoundary>
    )

    expect(container.textContent).toContain('Something went wrong loading this screen')
    expect(container.textContent).not.toContain('the tracing screen')
    // The card is what a screen reader is told about, immediately.
    expect(container.querySelector('[role="alert"]')).not.toBeNull()

    const retry = button('Try again')
    expect(retry).not.toBeNull()

    // Whatever made it throw is gone — a reload of the letter, a passcode that
    // now exists, a key that has since been corrected.
    willThrow = false
    act(() => retry.click())

    expect(container.textContent).toContain('the tracing screen')
    expect(container.textContent).not.toContain('Something went wrong')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('shows the card again if it throws a second time, rather than crashing out', () => {
    mount(
      <ErrorBoundary label="tracing">
        <Boom />
      </ErrorBoundary>
    )

    act(() => button('Try again').click())

    expect(container.textContent).toContain('Something went wrong loading this screen')
    expect(button('Try again')).not.toBeNull()
  })

  it('costs only its own subtree — a sibling screen and the nav are untouched', () => {
    mount(
      <div>
        <nav>Home Letters Games</nav>
        <ErrorBoundary label="tracing">
          <Boom />
        </ErrorBoundary>
        <ErrorBoundary label="sticker shop">
          <p>the sticker shop</p>
        </ErrorBoundary>
      </div>
    )

    expect(container.textContent).toContain('Something went wrong loading this screen')
    expect(container.textContent).toContain('Home Letters Games')
    expect(container.textContent).toContain('the sticker shop')
  })

  it('renders its children untouched when nothing throws', () => {
    willThrow = false
    mount(
      <ErrorBoundary label="tracing">
        <Boom />
      </ErrorBoundary>
    )

    expect(container.textContent).toBe('the tracing screen')
  })

  it('logs the error, with the name of the screen it happened on', () => {
    mount(
      <ErrorBoundary label="tracing">
        <Boom />
      </ErrorBoundary>
    )

    const logged = console.error.mock.calls.flat()
    expect(logged.some((entry) => String(entry).includes('The tracing screen could not be drawn'))).toBe(true)
    expect(logged.some((entry) => entry instanceof Error && entry.message === 'a waypoint had no x')).toBe(true)
  })
})
