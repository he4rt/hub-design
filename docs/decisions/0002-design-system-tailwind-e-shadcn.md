# ADR-0002: Design system em Tailwind e shadcn

**Status:** Accepted
**Date:** 2026-11-25
**Deciders:** he4rt-devs
**Relates to:** [ADR-0001](0001-laravel-com-react-via-inertia.md)

## Contexto

O protótipo construiu o He4rt Hub Design System (`docs/design-system/`) sobre primitivos do Radix,
com CSS puro por componente e tokens em `src/styles/tokens.css`. A `5.x` do heartdevs.com, destino das
telas ([ADR-0001](0001-laravel-com-react-via-inertia.md)), usa Tailwind v4 e shadcn. Com as duas bases
diferentes, portar uma tela "sem redesenho" exigiria reescrever cada componente.

## Decisão

- **O design system passa a ser feito em Tailwind e shadcn**, por ser mais fácil de trabalhar e por ser
  a base da `5.x`.
- **daisyUI** ([componentes](https://daisyui.com/components/)) fica como possibilidade em aberto, ainda
  não avaliada.

## Consequências

- O que o design system define continua valendo: princípios, cores, tipografia, layout, estados,
  vocabulário e a lista "O que o Hub não faz" de `docs/design-system/`. Muda a implementação, não o
  visual.
- Os componentes de `src/components/ui` ainda são Radix com CSS puro. Até a migração, componente novo
  segue o padrão atual do `AGENTS.md`; a migração para Tailwind e shadcn é um trabalho à parte, com os
  tokens de `tokens.css` levados para o tema do Tailwind.
- Se daisyUI for adotado, ele entra por um ADR novo que diz como convive com o shadcn ou o substitui.
