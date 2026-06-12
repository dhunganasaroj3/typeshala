// @vitest-environment jsdom
import { describe, expect, it, beforeAll } from 'vitest'
import { act, render } from '@testing-library/react'
import { useRef, useState } from 'react'
import TypingCore, { type CompletedRun } from './TypingCore'

// jsdom lacks AudioContext; sounds module creates one lazily — stub it.
beforeAll(() => {
  // @ts-expect-error test stub
  globalThis.AudioContext = class {
    state = 'running'
    currentTime = 0
    destination = {}
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }
    }
    createOscillator() {
      return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(8) }
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {} }
    }
    createBiquadFilter() {
      return { type: '', frequency: { value: 0 }, connect() {} }
    }
    resume() {}
  }
})

function dispatchKey(input: HTMLInputElement, key: string) {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('TypingCore', () => {
  it('reports a correct result when the full text is typed', () => {
    let result: CompletedRun | null = null
    const { container } = render(
      <TypingCore text="ab" lang="en" onComplete={(r) => (result = r)} />,
    )
    const input = container.querySelector('input') as HTMLInputElement
    act(() => {
      dispatchKey(input, 'a')
      dispatchKey(input, 'b')
    })
    expect(result).not.toBeNull()
    const r = result as unknown as CompletedRun
    expect(r.finished).toBe(true)
    expect(r.correctChars).toBe(2)
    expect(r.incorrect).toBe(0)
    expect(r.maxCombo).toBe(2)
  })

  it('counts an error and breaks the combo', () => {
    let result: CompletedRun | null = null
    const { container } = render(
      <TypingCore text="abc" lang="en" onComplete={(r) => (result = r)} />,
    )
    const input = container.querySelector('input') as HTMLInputElement
    act(() => {
      dispatchKey(input, 'a')
      dispatchKey(input, 'x') // wrong (expected b)
      dispatchKey(input, 'c')
    })
    const r = result as unknown as CompletedRun
    expect(r.correctChars).toBe(2)
    expect(r.incorrect).toBe(1)
    expect(r.maxCombo).toBe(1) // combo reset by the error
  })

  it('force-finishes via finishSignal with whatever was typed (time-up path)', () => {
    // wrapper that bumps finishSignal on demand
    let bump: () => void = () => {}
    let result: CompletedRun | null = null
    function Wrapper() {
      const [sig, setSig] = useState(0)
      const ref = useRef(false)
      if (!ref.current) {
        bump = () => setSig((n) => n + 1)
        ref.current = true
      }
      return (
        <TypingCore
          text="abcdefghij"
          lang="en"
          finishSignal={sig}
          onComplete={(r) => (result = r)}
        />
      )
    }
    const { container } = render(<Wrapper />)
    const input = container.querySelector('input') as HTMLInputElement
    act(() => {
      dispatchKey(input, 'a')
      dispatchKey(input, 'b')
      dispatchKey(input, 'c')
    })
    expect(result).toBeNull() // not done yet (10 chars target)
    act(() => bump()) // "time's up"
    const r = result as unknown as CompletedRun
    expect(r).not.toBeNull()
    expect(r.finished).toBe(false)
    expect(r.correctChars).toBe(3)
  })
})
