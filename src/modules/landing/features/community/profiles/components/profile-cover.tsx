import { Camera, X } from 'lucide-react'
import { useId, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useActionRunner } from '@/hooks/use-action-runner'
import { updateProfileCover, updateProfilePhoto } from '../actions'
import './profile-cover.css'

/** LinkedIn's cover size, 4:1. */
const COVER_WIDTH = 1584
const COVER_HEIGHT = 396

/** The band on top of the profile header: the member's picture, or the ink band. */
export function CoverArt({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div
      className="profile-cover"
      data-image={imageUrl ? '' : undefined}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      aria-hidden
    />
  )
}

/** Crops the picture to the given proportion from its center and shrinks it before it goes to an action. */
async function readImage(file: File, outWidth: number, outHeight: number): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const ratio = outWidth / outHeight
  const width = Math.min(bitmap.width, bitmap.height * ratio)
  const height = width / ratio
  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight
  canvas
    .getContext('2d')
    ?.drawImage(bitmap, (bitmap.width - width) / 2, (bitmap.height - height) / 2, width, height, 0, 0, outWidth, outHeight)
  return canvas.toDataURL('image/jpeg', 0.82)
}

/**
 * The owner's cover control: a small camera on the band opens the file picker directly, and a small
 * cross takes the picture off. No menu in between.
 */
export function CoverControls({ userId, imageUrl }: { userId: string; imageUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const { run, pending, error } = useActionRunner()

  return (
    <div className="profile-cover__controls">
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) run(async () => updateProfileCover(userId, await readImage(file, COVER_WIDTH, COVER_HEIGHT)))
        }}
      />
      {imageUrl && (
        <Button
          variant="secondary"
          size="sm"
          className="profile-cover__icon"
          aria-label="Remover a imagem de capa"
          title="Remover a imagem de capa"
          disabled={pending}
          onClick={() => run(() => updateProfileCover(userId, null))}
        >
          <X size={18} aria-hidden />
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="profile-cover__icon"
        aria-label={imageUrl ? 'Trocar a imagem de capa' : 'Escolher uma imagem de capa'}
        title={imageUrl ? 'Trocar a imagem de capa' : 'Escolher uma imagem de capa'}
        loading={pending}
        onClick={() => input.current?.click()}
      >
        <Camera size={18} aria-hidden />
      </Button>
      {error && (
        <p role="alert" className="profile-cover__error">
          {error}
        </p>
      )}
    </div>
  )
}

const PHOTO_SIZE = 400

/** The owner's camera on the avatar: opens the file picker and saves the square-cropped photo. */
export function PhotoControl({ userId }: { userId: string }) {
  const input = useRef<HTMLInputElement>(null)
  const { run, pending, error } = useActionRunner()
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) run(async () => updateProfilePhoto(userId, await readImage(file, PHOTO_SIZE, PHOTO_SIZE)))
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        className="profile-cover__icon profile-cover__photo-edit"
        aria-label="Trocar a foto"
        title={error ?? 'Trocar a foto'}
        loading={pending}
        onClick={() => input.current?.click()}
      >
        <Camera size={16} aria-hidden />
      </Button>
    </>
  )
}
