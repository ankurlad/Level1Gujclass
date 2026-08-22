// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InstallPromoCard from '../src/components/InstallPromoCard.jsx'

// PR 8 gave this card a second thing to say. The install wording, the geometry
// and the two callbacks are what the home screen has shipped since PR 7 and
// none of it was supposed to move, so it is pinned here.
function render(props) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<InstallPromoCard {...props} />))
  return {
    container,
    card: container.firstChild,
    buttons: [...container.querySelectorAll('button')],
    unmount: () => act(() => root.unmount()),
  }
}

const CARD_CLASSES =
  'mt-6 mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 max-w-sm rounded-3xl p-5 border border-indigo-400/30 shadow-lg flex flex-col gap-3 text-left text-white animate-float relative'

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
  document.body.innerHTML = ''
})

describe('InstallPromoCard', () => {
  it('defaults to the install pitch it has always shown', () => {
    const view = render({ onDismiss: () => {}, onInstall: () => {} })
    expect(view.container.querySelector('h4').textContent).toBe('Install Akshar App')
    expect(view.container.querySelector('p').textContent).toBe(
      'Practice Kakko offline anytime directly on your device screen.'
    )
    expect(view.buttons[0].getAttribute('aria-label')).toBe('Dismiss install card')
    expect(view.buttons[1].textContent).toContain('Install App Now')
    view.unmount()
  })

  it('says something different in update mode', () => {
    const view = render({ variant: 'update', onDismiss: () => {}, onInstall: () => {} })
    expect(view.container.querySelector('h4').textContent).toBe('Update Akshar App')
    expect(view.container.querySelector('p').textContent).toContain('A new version is ready')
    expect(view.buttons[0].getAttribute('aria-label')).toBe('Dismiss update card')
    expect(view.buttons[1].textContent).toContain('Reload to Update')
    view.unmount()
  })

  it('is the same card either way — only the words change', () => {
    const install = render({ onDismiss: () => {}, onInstall: () => {} })
    const installClasses = install.card.className
    const installTargets = install.buttons.map((b) => b.className)
    install.unmount()

    const update = render({ variant: 'update', onDismiss: () => {}, onInstall: () => {} })
    expect(update.card.className).toBe(installClasses)
    expect(update.card.className).toBe(CARD_CLASSES)
    expect(update.buttons.map((b) => b.className)).toEqual(installTargets)
    update.unmount()
  })

  it('falls back to the install pitch if handed a variant it does not know', () => {
    const view = render({ variant: 'nonsense', onDismiss: () => {}, onInstall: () => {} })
    expect(view.container.querySelector('h4').textContent).toBe('Install Akshar App')
    view.unmount()
  })

  it('wires both callbacks in either mode', () => {
    for (const variant of ['install', 'update']) {
      const onDismiss = vi.fn()
      const onInstall = vi.fn()
      const view = render({ variant, onDismiss, onInstall })
      act(() => view.buttons[0].click())
      act(() => view.buttons[1].click())
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onInstall).toHaveBeenCalledTimes(1)
      view.unmount()
    }
  })
})
