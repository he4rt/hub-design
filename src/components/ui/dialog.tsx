import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Dialog as DialogPrimitive } from 'radix-ui'
import './dialog.css'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  title: ReactNode
  description?: ReactNode
  /** Actions pinned under the scrolling body. */
  footer?: ReactNode
}

/** Modal limited to the viewport: the body scrolls, the header and footer stay put. A confirmation can omit the body. */
export function DialogContent({ title, description, footer, className, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-dialog__overlay" />
      <DialogPrimitive.Content className={cn('ui-dialog', className)} {...(description ? {} : { 'aria-describedby': undefined })} {...props}>
        <header className="ui-dialog__header">
          <DialogPrimitive.Title className="ui-dialog__title">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="ui-dialog__description">{description}</DialogPrimitive.Description>}
        </header>
        {children && <div className="ui-dialog__body">{children}</div>}
        {footer && <footer className="ui-dialog__footer">{footer}</footer>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
