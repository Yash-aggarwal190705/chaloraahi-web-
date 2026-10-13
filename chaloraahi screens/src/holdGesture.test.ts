import test from 'node:test'
import assert from 'node:assert/strict'
import { HOLD_MS, holdInterrupt, holdProgress, holdStart, holdTick, idleHold, type HoldState, type Interrupt } from './holdGesture.ts'

const begin = (): HoldState => holdStart(idleHold(), 1000, 1).state

test('completes exactly once at the threshold', () => {
  let s = begin()
  assert.equal(holdTick(s, 1000 + HOLD_MS - 1).fired, undefined)
  const a = holdTick(s, 1000 + HOLD_MS)
  assert.equal(a.fired, true)
  s = a.state
  assert.equal(holdTick(s, 1000 + HOLD_MS + 50).fired, undefined)
  assert.equal(holdInterrupt(s, 'release', 1000 + HOLD_MS + 60).fired, undefined)
})

test('every interruption before the threshold resets without firing', () => {
  const kinds: Interrupt[] = ['release', 'cancel', 'leave', 'lost-capture', 'blur', 'hidden', 'dismiss']
  for (const k of kinds) {
    const o = holdInterrupt(begin(), k, 1000 + 1500, 1)
    assert.equal(o.fired, undefined, k)
    assert.equal(o.interrupted, k)
    assert.equal(o.state.phase, 'idle')
  }
})

test('backgrounding past the threshold never completes the hold', () => {
  for (const k of ['hidden', 'blur', 'cancel', 'lost-capture', 'leave', 'dismiss'] as Interrupt[]) {
    const o = holdInterrupt(begin(), k, 1000 + HOLD_MS * 5, 1)
    assert.equal(o.fired, undefined, k)
    assert.equal(o.state.phase, 'idle')
  }
})

test('a second pointer cannot start or interrupt an active hold', () => {
  const s = begin()
  assert.equal(holdStart(s, 1500, 2).state, s)
  assert.equal(holdInterrupt(s, 'cancel', 1600, 2).state, s)
})

test('progress derives from elapsed time, not frames', () => {
  const s = begin()
  assert.equal(holdProgress(s, 1000), 0)
  assert.equal(holdProgress(s, 1000 + HOLD_MS / 2), 0.5)
  assert.equal(holdProgress(s, 1000 + HOLD_MS * 9), 1)
  assert.equal(holdProgress(idleHold(), 5000), 0)
})

test('restart after an interruption needs a fresh press', () => {
  const o = holdInterrupt(begin(), 'cancel', 1200, 1)
  assert.equal(holdTick(o.state, 1000 + HOLD_MS * 2).fired, undefined)
  assert.equal(holdStart(o.state, 9000, 1).state.phase, 'holding')
})
