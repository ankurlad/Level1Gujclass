// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPinRecord,
  hashPin,
  randomSalt,
  takeLegacyPlaintextPin,
  verifyPin,
} from '../src/lib/parentPin.js'

// jsdom implements crypto.getRandomValues but not crypto.subtle, so stand in
// Node's Web Crypto — the same SubtleCrypto interface a browser gives us in a
// secure context.
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('hashPin', () => {
  it('is the SHA-256 of "salt:pin" as lowercase hex', async () => {
    // Pinned against `sha256("abc:1234")` so a change to how the input is
    // assembled cannot pass unnoticed and silently invalidate stored digests.
    expect(await hashPin('1234', 'abc')).toBe(
      '1755a2d5b309d75bede226f2b6cf858bb14287b917e76ad3b943de0dda4683fb',
    )
  })

  it('separates the salt from the pin', async () => {
    // Without a delimiter, salt 'a' + pin '12' and salt 'a1' + pin '2' would
    // hash identically, and two installs could share a digest by accident.
    expect(await hashPin('12', 'a')).not.toBe(await hashPin('2', 'a1'))
  })

  it('gives different digests for different salts', async () => {
    expect(await hashPin('1234', 'saltone')).not.toBe(await hashPin('1234', 'salttwo'))
  })

  it('fails loudly when crypto.subtle is missing', async () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) })
    await expect(hashPin('1234', 'abc')).rejects.toThrow(/secure context/)
  })
})

describe('randomSalt', () => {
  it('is 16 random bytes as hex', () => {
    const salt = randomSalt()
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(salt).not.toBe(randomSalt())
  })
})

describe('createPinRecord / verifyPin', () => {
  it('stores a digest and a salt, never the pin', async () => {
    const record = await createPinRecord('4821')

    expect(record.algorithm).toBe('SHA-256')
    expect(record.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(record.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(record)).not.toContain('4821')
  })

  it('accepts the right pin and rejects everything else', async () => {
    const record = await createPinRecord('4821')

    expect(await verifyPin('4821', record)).toBe(true)
    expect(await verifyPin('4822', record)).toBe(false)
    expect(await verifyPin('', record)).toBe(false)
    expect(await verifyPin('4821', null)).toBe(false)
    expect(await verifyPin('4821', { salt: record.salt })).toBe(false)
  })

  it('salts per install, so the same pin hashes differently twice', async () => {
    const [a, b] = await Promise.all([createPinRecord('4821'), createPinRecord('4821')])
    expect(a.hash).not.toBe(b.hash)
    expect(await verifyPin('4821', a)).toBe(true)
    expect(await verifyPin('4821', b)).toBe(true)
  })
})

describe('takeLegacyPlaintextPin', () => {
  it('lifts the v0 cleartext pin out of storage and deletes it', () => {
    localStorage.setItem('guj_parent_pin', '4821')

    expect(takeLegacyPlaintextPin()).toBe('4821')
    expect(localStorage.getItem('guj_parent_pin')).toBeNull()
    // Second call has nothing left to find, so the migration cannot loop.
    expect(takeLegacyPlaintextPin()).toBeNull()
  })

  it('returns null on a store that never held one', () => {
    expect(takeLegacyPlaintextPin()).toBeNull()
  })

  it('re-hashes the migrated pin so the old one still opens the gate', async () => {
    localStorage.setItem('guj_parent_pin', '4821')

    const record = await createPinRecord(takeLegacyPlaintextPin())

    expect(await verifyPin('4821', record)).toBe(true)
    expect(localStorage.getItem('guj_parent_pin')).toBeNull()
  })
})
