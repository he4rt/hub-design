# Button

Cinco variantes, uma ação primária por tela. `primary` usa `brand` e é o único botão sólido colorido da tela. `secondary` para a alternativa (salvar rascunho, ver próxima). `ghost` para ações em texto dentro de cabeçalhos de card. `danger` para recusar e devolver: texto `danger-text` sobre `surface`, nunca fundo vermelho, porque a ação sempre exige motivo. `dark` só sobre o banner em `ink` (teste de entrada).

Altura `control-h` (44px), pequena `control-h-sm` (40px) em cabeçalhos de card. Ícone de 16px à esquerda, gap `space-2`. Raio `radius-md`. Hover simples, sem linha: `secondary`, `ghost` e `danger` ganham fundo `surface-2`, `primary` escurece para `brand-hover`, em `dur-fast`. Foco: anel 2px `focus` com offset 2px.
