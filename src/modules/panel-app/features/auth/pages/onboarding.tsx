import { useActionState, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { GitBranch, Info } from 'lucide-react'
import { useDebugActions } from '@/debug/use-debug-actions'
import { ORIGIN_IN } from '@/lib/member-profile'
import { updateUser, type User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import {
  AreasField,
  LanguagesField,
  ObjectiveField,
  StartingPointField,
} from '@/modules/panel-app/components/dev-profile-fields'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import type { DevProfileInput } from '@/modules/panel-app/lib/dev-profile'
import {
  answerOnboardingStep,
  firstUnansweredStep,
  hasGithub,
  needsOnboarding,
  ONBOARDING_STEPS,
  SKIPPABLE_STEPS,
  type OnboardingStep,
} from '../actions'
import { useRedirectTarget } from '../hooks/use-redirect-target'
import './onboarding.css'

/** Hub profile questions, one per screen. Opens on the first one not answered yet. */
export default function Onboarding() {
  const account = useAccount()
  if (!account) return <Navigate to="/app/login" replace />
  if (!needsOnboarding(account)) return <Navigate to="/app" replace />
  return <Questions key={account.id} account={account} />
}

const STEP_COPY: Record<OnboardingStep, { title: string; hint: string }> = {
  github: {
    title: 'Vincule o seu GitHub',
    hint: 'Obrigatório para todos: é onde os squads trabalham e de onde vem a evidência técnica do seu perfil.',
  },
  objective: { title: 'O que você quer agora?', hint: 'Dá para mudar quando quiser.' },
  areas: { title: 'Quais áreas te interessam?', hint: 'Escolha ao menos uma.' },
  startingPoint: {
    title: 'Qual é seu ponto de partida?',
    hint: 'Não aparece no perfil público. Quando você se candidata a um squad, o capitão vê para analisar a candidatura.',
  },
  languages: { title: 'Quais linguagens te interessam?', hint: 'Até 5. Pode pular e escolher depois.' },
}

type Result = { error: string; step: OnboardingStep } | null

function Questions({ account }: { account: User }) {
  const navigate = useNavigate()
  const redirectTo = useRedirectTarget()
  const [stepIndex, setStepIndex] = useState(() => firstUnansweredStep(account))
  const [answers, setAnswers] = useState<DevProfileInput>({
    objective: account.objective,
    areas: account.areas,
    startingPoint: account.startingPoint,
    languages: account.languages,
  })
  const step = ONBOARDING_STEPS[stepIndex]

  function update(patch: Partial<DevProfileInput>) {
    setAnswers((current) => ({ ...current, ...patch }))
  }

  const [result, submit, pending] = useActionState(async (_: Result, form: FormData): Promise<Result> => {
    const skip = form.get('intent') === 'skip'
    try {
      const { done } = await answerOnboardingStep(account.id, step, answers, { skip })
      if (done) navigate(redirectTo)
      else setStepIndex(stepIndex + 1)
      return null
    } catch (e) {
      return { error: errorMessage(e), step }
    }
  }, null)

  useDebugActions('Perguntas do perfil', [
    { label: 'Responder esta pergunta', run: () => update(SAMPLE_ANSWERS) },
    {
      label: 'Recomeçar as perguntas',
      description: 'Apaga as respostas salvas desta conta.',
      run: () => {
        updateUser(account.id, (u) => ({ ...u, objective: null, areas: [], startingPoint: null, languages: [] }))
        setAnswers({ objective: null, areas: [], startingPoint: null, languages: [] })
        setStepIndex(0)
      },
    },
  ])

  const error = result?.step === step ? result.error : null
  const copy = STEP_COPY[step]

  return (
    <form action={submit} className="auth-form onboarding">
      <div className="onboarding__header">
        <p className="onboarding__progress">
          Pergunta {stepIndex + 1} de {ONBOARDING_STEPS.length}
        </p>
        <ol className="onboarding__steps" aria-hidden>
          {ONBOARDING_STEPS.map((s, index) => (
            <li key={s} data-state={index <= stepIndex ? 'done' : 'todo'} />
          ))}
        </ol>
        {account.origin !== 'hub' && stepIndex === firstUnansweredStep(account) && (
          <Callout icon={<Info size={16} aria-hidden />}>
            Sua conta He4rt foi criada {ORIGIN_IN[account.origin]}. Faltam só algumas perguntas para o Hub.
          </Callout>
        )}
        <h1>{copy.title}</h1>
        <p className="auth-form__hint">{copy.hint}</p>
      </div>

      {step === 'github' && (
        <Callout icon={<GitBranch size={16} aria-hidden />}>
          {hasGithub(account) ? (
            <>
              GitHub vinculado:{' '}
              <span className="onboarding__github">
                @{account.linkedAccounts.find((a) => a.provider === 'github')?.handle}
              </span>
              .
            </>
          ) : (
            'O Hub só lê o que é público no seu GitHub. Você confirma no GitHub e volta para cá.'
          )}
        </Callout>
      )}
      {step === 'objective' && (
        <ObjectiveField value={answers.objective} onChange={(objective) => update({ objective })} />
      )}
      {step === 'areas' && (
        <AreasField value={answers.areas} onChange={(areas) => update({ areas })} invalid={error !== null} />
      )}
      {step === 'startingPoint' && (
        <StartingPointField value={answers.startingPoint} onChange={(startingPoint) => update({ startingPoint })} />
      )}
      {step === 'languages' && (
        <LanguagesField value={answers.languages} onChange={(languages) => update({ languages })} />
      )}

      <FormMessage tone="error">{error}</FormMessage>

      <div className="onboarding__actions">
        <Button
          type="button"
          variant="ghost"
          disabled={stepIndex === 0 || pending}
          onClick={() => setStepIndex(stepIndex - 1)}
        >
          Voltar
        </Button>
        <div className="onboarding__forward">
          {SKIPPABLE_STEPS.includes(step) && (
            <Button type="submit" name="intent" value="skip" variant="ghost" disabled={pending}>
              Pular
            </Button>
          )}
          <Button type="submit" name="intent" value="answer" loading={pending}>
            {step === 'github' && !hasGithub(account)
              ? 'Vincular GitHub'
              : stepIndex === ONBOARDING_STEPS.length - 1
                ? 'Concluir'
                : 'Continuar'}
          </Button>
        </div>
      </div>
    </form>
  )
}

const SAMPLE_ANSWERS: DevProfileInput = {
  objective: 'learn',
  areas: ['back-end', 'devops'],
  startingPoint: 'junior',
  languages: ['PHP', 'Go', 'SQL'],
}
