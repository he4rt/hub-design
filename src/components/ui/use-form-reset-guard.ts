import { useEffect, useRef, type RefObject } from 'react'

/**
 * React resets a `<form action>` after every submit, and Radix form controls
 * answer the reset by going back to the value they mounted with. Returns a
 * check that tells when a change comes from that reset, so a controlled
 * control keeps the value its owner holds.
 */
export function useFormResetGuard(ref: RefObject<HTMLButtonElement | null>) {
  const resetting = useRef(false)

  useEffect(() => {
    const form = ref.current?.form
    if (!form) return
    // Capture runs before Radix's own reset listener on the same form.
    const onReset = () => {
      resetting.current = true
      setTimeout(() => {
        resetting.current = false
      })
    }
    form.addEventListener('reset', onReset, { capture: true })
    return () => form.removeEventListener('reset', onReset, { capture: true })
  }, [ref])

  return () => resetting.current
}
