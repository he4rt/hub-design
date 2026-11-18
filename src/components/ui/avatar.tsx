import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import './avatar.css'

/** Photo with the first letter of the name as fallback. */
export function Avatar({
  src,
  name,
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root> & { src: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <AvatarPrimitive.Root data-size={size} className={cn('ui-avatar', className)} {...props}>
      {src && <AvatarPrimitive.Image className="ui-avatar__image" src={src} alt="" />}
      <AvatarPrimitive.Fallback className="ui-avatar__fallback">{name.charAt(0).toUpperCase()}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
