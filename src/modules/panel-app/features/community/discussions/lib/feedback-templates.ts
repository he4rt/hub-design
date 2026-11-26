/** Prototype: Markdown models that guide a feedback, from the most general to free text. */
export const FEEDBACK_TEMPLATES = [
  {
    id: 'constructive',
    label: 'Construtivo',
    description: 'O que funcionou, o que melhorar e por quê.',
    body: `## O que funcionou

Algo concreto que você viu no código ou no produto.

## O que melhorar

Um próximo passo que a pessoa consiga fazer.

## Por quê

O caminho que te levou a essa sugestão: quem pediu está aprendendo.
`,
  },
  {
    id: 'code',
    label: 'Revisão de código',
    description: 'Um trecho que você leu e como escreveria.',
    body: `## Onde olhei

\`caminho/do/arquivo\`: o trecho que você leu.

## O que encontrei

- Um ponto por item, do mais importante ao menos importante.

## Como eu escreveria

\`\`\`
// O trecho com a sua sugestão
\`\`\`
`,
  },
  {
    id: 'usage',
    label: 'Testei como usuário',
    description: 'Uma tarefa feita do começo ao fim e onde travou.',
    body: `## O que tentei fazer

A tarefa, como alguém que chega agora.

## Onde travei

1. O passo e o que aconteceu.

## O que eu esperava

O que faria sentido para você naquele momento.
`,
  },
  {
    id: 'product',
    label: 'Produto e métricas',
    description: 'Uma leitura do PRODUCT.md e das métricas.',
    body: `## O problema está claro?

Repita com suas palavras o problema e para quem ele existe.

## As métricas medem o que importa?

| Métrica | O que ela mede de fato | Sugestão |
| --- | --- | --- |
| nome | o que você entendeu | como medir melhor |

## Próximo passo

Uma coisa que você faria antes de seguir.
`,
  },
  {
    id: 'free',
    label: 'Texto livre',
    description: 'Comece do zero, do seu jeito.',
    body: '',
  },
] as const

export type FeedbackTemplate = (typeof FEEDBACK_TEMPLATES)[number]
export type FeedbackTemplateId = FeedbackTemplate['id']

export const feedbackTemplate = (id: string | null): FeedbackTemplate =>
  FEEDBACK_TEMPLATES.find((t) => t.id === id) ?? FEEDBACK_TEMPLATES[0]

/** Same words as the model, whatever Markdown marks the editor wrote them with. */
export function sameAsTemplate(body: string, template: FeedbackTemplate): boolean {
  const words = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
  return words(body) === words(template.body)
}
