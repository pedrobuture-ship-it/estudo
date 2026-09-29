export interface BoardIconOption {
  id: string;
  name: string;
}

export const AVAILABLE_BOARD_ICONS: BoardIconOption[] = [
  { id: 'code', name: 'Código' },
  { id: 'folder', name: 'Pasta' },
  { id: 'kanban', name: 'Kanban' },
  { id: 'layout', name: 'Layout' },
  { id: 'check-square', name: 'Tarefas' },
  { id: 'list-todo', name: 'Lista' },
  { id: 'briefcase', name: 'Negócios' },
  { id: 'shopping-cart', name: 'Vendas' },
  { id: 'users', name: 'Equipe' },
  { id: 'star', name: 'Estrela' },
  { id: 'zap', name: 'Agilidade' },
  { id: 'calendar', name: 'Calendário' },
  { id: 'clock', name: 'Tempo' },
  { id: 'cpu', name: 'Tecnologia' },
  { id: 'database', name: 'Dados' },
  { id: 'chart-bar', name: 'Gráfico' },
  { id: 'box', name: 'Caixa' },
  { id: 'tag', name: 'Etiqueta' },
  { id: 'bookmark', name: 'Marcador' },
  { id: 'globe', name: 'Global' }
];
