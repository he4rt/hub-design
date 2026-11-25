# ADR-0001: Backend em Laravel, front em React via Inertia

**Status:** Accepted
**Date:** 2026-11-25
**Deciders:** he4rt-devs

## Contexto

O He4rt Hub em produção é o [heartdevs.com](https://github.com/he4rt/heartdevs.com), em Laravel. Ele tem
duas branches vivas:

- `4.x`, encerrada em 16/11/2026: Laravel com Filament e Livewire, cerca de 26 módulos.
- `5.x`, a branch padrão, recomeçada do zero em 16/11/2026: Laravel 13 com Inertia, React 19 e
  TypeScript, nos módulos `identity`, `panel-app` e `panel-admin`.

O hub-design nasceu dois dias depois da `5.x` e copiou dela a estrutura de pastas
(`app-modules/<módulo>/resources/js`, `features/<grupo>/<feature>`), o `PRODUCT.md` e a tabela de
features. Mas nenhum documento do hub-design citava o heartdevs.com nem dizia qual seria o destino das
telas, e a API em Bun + SQLite (`server/`) podia ser lida como o backend do produto.

## Decisão

- **O backend continua em Laravel**, no heartdevs.com.
- **O front passa a ser React via Inertia**, como na `5.x`. O motivo é que React facilita a
  contribuição: mais gente da comunidade sabe React do que Filament ou Livewire.
- **O hub-design é o protótipo base para o system design.** É aqui que telas, regras e fluxos são
  fechados antes de ir para o heartdevs.com.

## Consequências

- O destino de cada tela do protótipo é a `5.x` do heartdevs.com: as telas viram páginas Inertia de
  `app-modules/panel-app` e `panel-admin`, e as regras viram Actions, Data classes e migrations do
  Laravel.
- As features da `4.x` que forem mantidas são reescritas na `5.x`, com React no lugar de Filament e
  Livewire.
- O `server/` continua exploratório e não vai para produção. Guards, sessões, e-mail, filas e
  idempotência do protótipo servem para validar as regras; a `5.x` usa os do Laravel (Fortify, filas,
  sessões).
- O `schema.sql` mostra o modelo, mas não vira migration tabela por tabela: a `5.x` usa PostgreSQL,
  UUIDv7 e times (`tenant_id`), que o protótipo não tem.
- Ficam em aberto: qual `PRODUCT.md` é a fonte (o do hub-design já diverge do da `5.x`), o que da
  `4.x` volta, e se os ADRs de squads da `4.x` (`squads/0001` e `0002`) continuam valendo.
