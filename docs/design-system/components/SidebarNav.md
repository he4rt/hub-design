# SidebarNav

A sidebar em `ink`, 272px, com o wordmark (coração da He4rt em `brand` e nome em Geist; só o admin leva a linha "Administração" em `on-ink-label`), grupos com rótulo `group-label` em caixa normal e itens de 40px com ícone 18px.

Estados do item: repouso `on-ink-text`; hover `ink-2`; ativo `nav-active` com `on-ink` e `aria-current="page"`; bloqueado `on-ink-label` com cadeado à direita (Vagas antes do membro ter squad ou validação). Contagens em pílula `brand-bright`.

Grupos contextuais (Capitão · *nome do squad*, Validador) só aparecem para quem tem o papel. Sem borda esquerda no item ativo e sem gradiente: o fundo sólido já marca.

Item em texto `on-ink-muted` que escurece no hover, sem fundo; o ativo é `nav-active`. No rodapé, o @ do GitHub em `mono` e dois ícones sem caixa, configurações e tema. A troca de tema faz um cross-fade em `dur-slow` (View Transition) e o ícone gira ao entrar. O card acima da conta é `surface` com borda.
