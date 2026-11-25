# ADR-0003: Projeto de squad criado pela staff ou pelo capitão

**Status:** Accepted
**Date:** 2026-11-25
**Deciders:** he4rt-devs

## Contexto

O `PRODUCT.md` e o `docs/squads.md` dizem que só a staff cria projetos de squad, e o protótipo só
oferece a criação no admin (`/admin`, `panel-admin.squads.projects.store`). Mas há pessoas querendo
abrir novas frentes e puxá-las, e exigir a staff no meio para cada projeto trava essa iniciativa.

## Decisão

**O projeto de um squad pode ser criado tanto pela staff quanto pelo capitão do squad.** O capitão cria
projetos só no próprio squad.

## Consequências

- O `PRODUCT.md` (papéis: "a staff … cria squads e projetos") e o `docs/squads.md` ainda dizem que só
  a staff cria, e precisam ser atualizados.
- O protótipo precisa de uma tela de criação de projeto para o capitão no `/app`, com as mesmas
  regras de hoje (objetivo, critérios de aceite e de avaliação, um projeto aberto por squad).
- Ainda não está decidido se o projeto criado pelo capitão passa por conferência da staff antes de
  abrir candidaturas.
