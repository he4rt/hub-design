import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import './avatar.css'

/** GitHub photo, or the initials in Space Grotesk; always a circle. On the ink sidebar use `tone="ink"`. */
export function Avatar({
  src,
  name,
  size = 'md',
  tone = 'default',
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root> & {
  src: string | null
  name: string
  /** xs 24, sm 32, md 36, lg 48, xl 72 (profile header). */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'default' | 'ink'
}) {
  return (
    <AvatarPrimitive.Root data-size={size} data-tone={tone} className={cn('ui-avatar', className)} {...props}>
      {src && <AvatarPrimitive.Image className="ui-avatar__image" src={src} alt="" />}
      <AvatarPrimitive.Fallback className="ui-avatar__fallback">{initials(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

/** First letters of the first and last names: "Ana Souza" is AS. */
function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}
