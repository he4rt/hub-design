# Decisões do projeto

As decisões que definem a direção do He4rt Hub ficam aqui, uma por arquivo, para que quem chegar ao
repositório entenda em que pé o projeto está e por quê.

O formato segue os ADRs do [heartdevs.com](https://github.com/he4rt/heartdevs.com) (`4.x`, em
`app-modules/<módulo>/docs/adr/`): arquivo `NNNN-titulo-em-kebab-case.md`, cabeçalho com status, data e
quem decidiu, e as seções Contexto, Decisão e Consequências. Como o hub-design não tem módulos de
backend, todas as decisões ficam nesta pasta.

## Como registrar

- Copie o cabeçalho de um ADR existente e use o próximo número.
- Status: `Proposed`, `Accepted`, `Superseded`, `Deprecated` ou `Rejected`.
- Uma decisão aceita não é reescrita. Quando ela muda, crie um ADR novo e marque o antigo como
  `Superseded by NNNN`.
- Quando a decisão muda uma regra do `PRODUCT.md`, do `AGENTS.md` ou de uma spec em `docs/`, diga em
  Consequências o que precisa ser atualizado.

## Índice

| ADR | Decisão | Status | Data |
| --- | --- | --- | --- |
| [0001](0001-laravel-com-react-via-inertia.md) | Backend em Laravel, front em React via Inertia | Accepted | 25/11/2026 |
| [0002](0002-design-system-tailwind-e-shadcn.md) | Design system em Tailwind e shadcn | Accepted | 25/11/2026 |
| [0003](0003-projeto-de-squad-criado-por-staff-ou-capitao.md) | Projeto de squad criado pela staff ou pelo capitão | Accepted | 25/11/2026 |
| [0004](0004-projeto-interno-sem-contribuicoes-externas.md) | Projeto interno, sem contribuições externas | Accepted | 25/11/2026 |
