import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import type { ShownAchievement } from '../lib/achievements'
import { AchievementList } from './achievement-list'

/** "Ver todas": the full grouped list in a dialog that scrolls inside the viewport. */
export function AllAchievementsDialog({
  items,
  firstName,
  ownerId,
}: {
  items: ShownAchievement[]
  firstName: string
  ownerId: string | null
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Ver todas
        </Button>
      </DialogTrigger>
      <DialogContent
        className="all-achievements-dialog"
        title={`Conquistas de ${firstName}`}
        description="Reconhecimento pelo que aconteceu no Hub. Não mede ninguém nem libera acesso."
        footer={
          <DialogClose asChild>
            <Button variant="secondary">Fechar</Button>
          </DialogClose>
        }
      >
        <AchievementList items={items} ownerId={ownerId} />
      </DialogContent>
    </Dialog>
  )
}
