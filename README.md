# Sistema de Gerenciamento Kanban (Estudo Angular)

Aplicativo web completo de gestão visual de tarefas e projetos no formato Kanban, desenvolvido com Angular moderno e Supabase para persistência de dados em tempo real e controle de acesso.

---

## Sumario
1. Visao Geral
2. Principais Funcionalidades
3. Niveis de Acesso e Permissoes
4. Estrutura do Layout e Interface
5. Bibliotecas e Dependencias
6. Estrutura de Pastas do Projeto
7. Configuracao e Instalacao
8. Comandos Disponiveis
9. Historico de Evolucao do Software

---

## 1. Visao Geral

O software foi concebido para oferecer uma solucao rapida, organizada e intuitiva de organizacao de trabalho por meio de quadros Kanban. Permite o gerenciamento de multiplos quadros, colunas de status e cartoes com dados detalhados (responsaveis, prazos, prioridades e descricoes).

---

## 2. Principais Funcionalidades

- **Autenticacao Completa**: Sistema de login e cadastro integrado ao Supabase Auth, com controle de sessao persistente.
- **Quadros Dinamicos**: Criacao, renomeacao e exclusao de quadros de trabalho.
- **Icones Personalizados**: O administrador pode escolher um icone visual especifico da biblioteca de icones para cada quadro, exibido na barra lateral e na visao geral.
- **Controle de Acesso por Quadro**: O administrador pode definir individualmente quais membros tem permissao de acesso a cada quadro criado.
- **Colunas Organizacionais**: Criacao, edicao de titulos e exclusao de colunas (listas) dentro de cada quadro.
- **Cartoes de Tarefas**:
  - Titulo e descricao detalhada.
  - Niveis de prioridade (Baixa, Media, Alta e Urgente) com marcadores visuais.
  - Atribuicao de responsavel restrita exclusivamente aos usuarios com permissao de acesso ao respectivo quadro.
  - Data limite de conclusao (prazo).
  - Movimentacao entre colunas e reordenacao dentro da mesma coluna por arrastar e soltar (Drag and Drop).
- **Modais Amigaveis**: Formularios integrados na interface em substituicao aos dialogos padrao do navegador, proporcionando conforto visual e validacao em tempo real.
- **Modo Escuro (Dark Mode)**: Suporte a tema escuro de alto contraste e transicoes suaves, com botao de alternancia direta (icone de sol e lua) na barra lateral e persistencia automatica da preferencia do usuario.
- **Menu Lateral Retratil**: Possibilidade de encolher a barra lateral ao clicar no cabecalho "Menu", mantendo apenas os icones visiveis e ampliando o espaco util dos quadros de trabalho, com persistencia de estado no navegador.
- **Central de Notificacoes de Tarefas Atribuidas**: Icone de sino com indicador numerico de alerta (badge) na barra lateral, informando tanto administradores quanto membros sobre cartoes atribuidos a eles, com modal detalhado contendo prioridade, quadro de origem, coluna, data limite, atalho de acesso direto e botao para limpar todas as notificacoes ou dispensar itens individualmente.

---

## 3. Niveis de Acesso e Permissoes

O sistema adota um modelo de permissao baseado no perfil do usuario autenticado:

### Administrador (Admin)
- Criar, editar, renomear e excluir quadros.
- Definir e alterar o icone de cada quadro.
- Gerenciar quais usuarios tem acesso a cada quadro.
- Criar, renomear e excluir colunas em qualquer quadro.
- Criar, editar e excluir cartoes.

### Membro Comum
- Acessar exclusivamente os quadros aos quais recebeu permissao do administrador.
- Criar novos cartoes dentro das colunas existentes.
- Editar informacoes dos cartoes existentes (titulo, descricao, responsavel, prazo, prioridade).
- Mover cartoes entre as colunas via arrastar e soltar.
- Nao possui permissao para criar, renomear ou excluir colunas ou quadros, nem para excluir cartoes.

### Restricao de Atribuicao de Responsaveis
- A lista de selecao de responsavel exibe unicamente os usuarios que possuem permissao para acessar o quadro (administradores, proprietario ou membros autorizados).
- Bloqueio preventivo na interface e validacao programatica na gravacao para impedir que colaboradores sem acesso sejam vinculados a tarefas do quadro.

---

## 4. Estrutura do Layout e Interface

- **Barra Lateral Esquerda (Sidebar)**:
  - Painel vertical fixo em azul escuro com contraste acessivel.
  - Cabecalho de navegacao e atalho para a pagina inicial (Dashboard).
  - Lista de quadros disponiveis para o usuario, exibindo o nome e o respectivo icone configurado.
  - Atalho rapido para administradores criarem um novo quadro.
  - Rodape da barra lateral com avatar, identificacao do usuario logado, indicador do perfil (Admin ou Membro) e botao de encerramento de sessao (Logout).
- **Area de Conteudo Principal**:
  - Painel direito com rolagem independente, exibindo a Dashboard com cards dos quadros ou a tela do quadro Kanban com suas respectivas colunas horizontais.

---

## 5. Bibliotecas e Dependencias

O projeto foi construido sobre o ecossistema Angular versao 22:

- **@angular/core**, **@angular/common**, **@angular/router**, **@angular/forms**: Base da aplicacao com componentes standalone, sistema de reatividade baseado em Signals e navegacao sem recarregamento.
- **@angular/ssr** e **express**: Renderizacao no servidor (Server-Side Rendering) e hidratacao no cliente para melhor desempenho inicial.
- **@angular/cdk/drag-drop**: Modulo oficial do Angular CDK responsavel pela interacao suave e robusta de arrastar e soltar cartoes entre colunas.
- **@supabase/supabase-js**: Cliente oficial do Supabase para consultas a banco de dados relacional (PostgreSQL) e autenticacao de usuarios.
- **@lucide/angular**: Biblioteca de icones vetoriais SVG leves e modernos, utilizada em toda a aplicacao (botoes de acao, navegacao, modais e icones tematicos dos quadros).
- **typescript**: Linguagem utilizada com tipagem estatica rigorosa.
- **vitest**: Framework de execucao de testes unitarios.

---

## 6. Estrutura de Pastas do Projeto

```text
src/
|-- app/
|   |-- core/
|   |   |-- constants/
|   |   |   `-- board-icons.ts          # Catalogo de icones disponiveis para selecao de quadros
|   |   |-- guards/
|   |   |   `-- auth.guard.ts           # Protecao de rotas contra acessos nao autenticados
|   |   |-- models/
|   |   |   `-- kanban.models.ts        # Interfaces TypeScript (Board, List, Card, AppUser)
|   |   `-- services/
|   |       |-- auth.service.ts         # Gerenciamento de login, cadastro e papel do usuario
|   |       |-- board.service.ts        # Operacoes de quadros, icones e acesso de membros
|   |       |-- card.service.ts         # Operacoes de cartoes (criacao, edicao, exclusao)
|   |       |-- list.service.ts         # Operacoes de colunas
|   |       |-- supabase.service.ts     # Instancia e conexao com a API do Supabase
|   |       `-- user.service.ts         # Listagem de usuarios para atribuicao e permissoes
|   |-- features/
|   |   |-- auth/
|   |   |   |-- login/                  # Tela de autenticacao e registro de contas
|   |   |-- board/                      # Visualizacao e gestao do quadro Kanban (colunas e cartoes)
|   |   `-- dashboard/                  # Visao geral dos quadros do usuario e gerenciamento
|   |-- shared/
|   |   `-- layout/
|   |       `-- main-layout/            # Layout padrao com a barra lateral esquerda fixa
|   |-- app.config.ts                   # Provedores globais, rotas e hidratacao SSR
|   |-- app.routes.ts                   # Mapeamento de rotas da aplicacao
|   `-- environments/
|       `-- environment.ts              # Chaves publicas e URL de conexao do Supabase
```

---

## 7. Configuracao e Instalacao

### Pre-requisitos
- Node.js versao 20 ou superior.
- Gerenciador de pacotes npm instalado.

### Passos de Instalacao

1. Clone ou acesse o diretorio do projeto:
   ```bash
   cd estudo
   ```

2. Instale as dependencias:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Verifique as credenciais do Supabase em `src/environments/environment.ts`:
   - URL do projeto Supabase.
   - Chave publica anonima (`anon key`).

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```
   Acesse a aplicacao em seu navegador pelo endereco `http://localhost:4200`.

---

## 8. Comandos Disponiveis

- `npm start` ou `ng serve`: Executa o servidor de desenvolvimento local com recarregamento automatico.
- `npm run build` ou `ng build`: Realiza a compilacao de producao gerando os artefatos otimizados no diretorio `dist/`.
- `npm test`: Executa os testes automatizados com o Vitest.
- `npm run serve:ssr:estudo`: Inicia o servidor Node.js com a aplicacao compilada em modo SSR.

---

## 9. Historico de Evolucao do Software

Abaixo estao descritas as principais etapas de desenvolvimento implementadas ao longo do projeto:

1. **Criacao da Base do Projeto**: Inicializacao do projeto em Angular 22 com configuracao de rotas, modularizacao standalone e conexao com o Supabase.
2. **Sistema de Autenticacao e Perfil**: Criacao do fluxo de login e cadastro com diferenciacao automatica entre perfis de Administrador e Membro.
3. **Persistencia e Arrastar e Soltar (CDK Drag and Drop)**: Integracao do Angular CDK para movimentacao livre de cartoes entre diferentes colunas com atualizacao automatica da posicao no banco de dados.
4. **Hierarquia de Permissoes por Funcionalidade**:
   - Bloqueio de manipulacao estrutural de colunas e quadros para usuarios sem perfil de administrador.
   - Liberacao para membros criarem cartoes e editarem campos internos, mantendo a integridade da organizacao definida pela lideranca.
5. **Acesso Segmentado por Quadro**: Implementacao de tabela de associacao e tela de gerenciamento de membros para que administradores escolham quais colaboradores tem visibilidade de cada quadro.
6. **Reformulacao do Layout para Barra Lateral Esquerda**:
   - Reposicionamento da navegacao para uma barra lateral moderna em tom azul escuro com listagem direta dos quadros disponiveis.
   - Resolucao de navegacao dinamica para permitir alternar entre quadros sem necessidade de recarregar a pagina.
7. **Padronizacao Visual com Icones Lucide**:
   - Integracao da biblioteca oficial de icones vetoriais SVG Lucide.
   - Substituicao integral de emojis e caracteres especiais por icones uniformes e profissionais.
8. **Substituicao de Prompts por Modais Amigaveis**:
   - Eliminacao de caixas de entrada de texto nativas do navegador.
   - Criacao de caixas de dialogo modernas integradas ao tema, com foco no primeiro campo, validacao e botoes de confirmacao e cancelamento.
9. **Catalogo de Icones para Quadros**:
   - Criacao de seletor visual com 20 opcoes de icones tematicos no cadastro e na edicao de quadros.
   - Renderizacao dinamica do icone de cada quadro tanto na barra lateral quanto nos cards informativos da dashboard.
10. **Implementacao do Modo Escuro (Dark Mode)**:
    - Criacao do servico centralizado de temas (`ThemeService`) com Angular Signals e deteccao de ambiente (SSR seguro).
    - Persistencia do estado no armazenamento local (`localStorage`) e deteccao da preferencia do sistema operacional (`prefers-color-scheme`).
    - Botao com icones dinamicos de sol e lua (`LucideSun` e `LucideMoon`) localizado na base da barra lateral para rapida alternancia.
    - Estilizacao completa e harmoniosa de todas as telas, modais, cartoes e listas para o tema escuro.
11. **Barra Lateral Retratil (Encolher/Expandir)**:
    - Implementacao de acao de clique no cabecalho "Menu" para recolher a barra lateral preservando apenas os icones.
    - Otimizacao do espaco visual de navegacao mantendo os icones tematicos dos quadros, botao Home, criador de quadros e controles do rodape.
    - Tooltips descritivos em todos os itens para facilitar o reconhecimento visual em modo recolhido.
    - Persistencia da escolha (recolhido ou expandido) no `localStorage` sob a chave `sidebar_collapsed`.
12. **Central de Notificacoes de Tarefas Atribuidas**:
    - Criacao do `NotificationService` para buscar em tempo real os cartoes vinculados ao usuario autenticado (`assigned_to = userId`), atendendo tanto administradores quanto membros.
    - Icone vetorial de sino (`LucideBell`) com contador em badge de destaque tanto na lista principal de navegacao quanto no rodape da barra lateral.
    - Modal interativo listando todas as atribuicoes com detalhes completos: titulo da tarefa, nivel de prioridade colorido, nome do quadro, nome da coluna, data de entrega e botao de redirecionamento direto para o quadro correspondente.
    - Total suporte visual aos temas claro e escuro.
13. **Restricao de Atribuicao de Cartoes por Permissao de Quadro**:
    - Implementacao do metodo `getUsersWithBoardAccess` no `BoardService`, filtrando usuarios autorizados a nivel de banco de dados e regras de negocio.
    - Exclusao automatica de usuarios nao autorizados das opcoes de selecao de responsavel nos formularios de criacao e edicao de cartoes.
    - Validacao rigorosa no frontend impedindo a persistencia de cartoes atribuidos a colaboradores que nao possuam acesso ao quadro.
    - Extracao completa de quaisquer emojis remanescentes nas opcoes de prioridade.
14. **Limpeza e Descarte de Notificacoes**:
    - Implementacao de botao "Limpar Notificacoes" com icone vetorial `LucideTrash` no rodape do modal de tarefas atribuidas.
    - Suporte a descarte individual de itens por meio de botao dedicado em cada cartao.
    - Persistencia do historico de notificacoes dispensadas no `localStorage` por usuario (`dismissed_notif_cards_[userId]`), zerando o badge e garantindo que novos cartoes continuem gerando alertas normalmente.
