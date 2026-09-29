import { 
  Component, 
  inject, 
  OnInit, 
  OnDestroy, 
  PLATFORM_ID, 
  signal, 
  ChangeDetectorRef, 
  ElementRef, 
  ViewChild, 
  effect 
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  LucideKanban, 
  LucideChartBar, 
  LucideListTodo,
  LucideCalendar, 
  LucideRefreshCw, 
  LucideAlertCircle,
  LucideCircleCheck
} from '@lucide/angular';
import { BoardService } from '../../core/services/board.service';
import { ListService } from '../../core/services/list.service';
import { CardService } from '../../core/services/card.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Board, List, Card, AppUser } from '../../core/models/kanban.models';
import { RealtimeChannel } from '@supabase/supabase-js';
import Chart from 'chart.js/auto';

export interface ColumnStat {
  id: number;
  title: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideKanban,
    LucideChartBar,
    LucideListTodo,
    LucideCalendar,
    LucideRefreshCw,
    LucideAlertCircle,
    LucideCircleCheck
  ],
  templateUrl: './charts.html',
  styleUrl: './charts.scss'
})
export class ChartsComponent implements OnInit, OnDestroy {
  private boardService = inject(BoardService);
  private listService = inject(ListService);
  private cardService = inject(CardService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private supabaseService = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  private realtimeChannel: RealtimeChannel | null = null;

  @ViewChild('canvasStatus') canvasStatus?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasAssigneeStatus') canvasAssigneeStatus?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasPriority') canvasPriority?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasAssigneePriority') canvasAssigneePriority?: ElementRef<HTMLCanvasElement>;

  readonly isLoading = signal<boolean>(true);
  readonly isAdmin = this.authService.isAdmin;
  readonly currentUser = this.authService.currentUser;
  readonly isDarkMode = this.themeService.isDarkMode;

  readonly boards = signal<Board[]>([]);
  readonly selectedBoardId = signal<number | null>(null);
  readonly selectedBoard = signal<Board | null>(null);

  readonly lists = signal<List[]>([]);
  readonly cards = signal<Card[]>([]);
  readonly users = signal<AppUser[]>([]);
  readonly boardMembers = signal<AppUser[]>([]);
  readonly boardTaskCounts = signal<{ [boardId: number]: number }>({});

  readonly columnStats = signal<ColumnStat[]>([]);
  readonly totalTasks = signal<number>(0);
  readonly fixedTasks = signal<number>(0);
  readonly archivedTasks = signal<number>(0);

  private chartStatus: Chart | null = null;
  private chartAssigneeStatus: Chart | null = null;
  private chartPriority: Chart | null = null;
  private chartAssigneePriority: Chart | null = null;

  // Paleta de cores com suporte a variações de nomes de colunas
  private readonly defaultStatusColors: { [key: string]: string } = {
    'a fazer': '#ff6384',
    'todo': '#ff6384',
    'fazendo': '#14b8a6',
    'em andamento': '#14b8a6',
    'em producao': '#3b82f6',
    'producao': '#3b82f6',
    'aguardando retorno': '#facc15',
    'espera': '#facc15',
    'bloqueado': '#f97316',
    'travado': '#f97316',
    'finalizado': '#10b981',
    'concluido': '#8b5cf6',
    'feito': '#8b5cf6',
    'em teste': '#a855f7',
    'teste': '#a855f7'
  };

  private readonly fallbackColors = [
    '#ff6384', '#14b8a6', '#3b82f6', '#10b981', '#facc15', 
    '#f97316', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4'
  ];

  private readonly priorityColors: { [key: string]: string } = {
    'baixa': '#ff6384',     // Rosa suave
    'média': '#14b8a6',     // Ciano / Teal
    'media': '#14b8a6',
    'alta': '#facc15',      // Amarelo
    'crítica': '#10b981',   // Verde esmeralda conforme imagem
    'critica': '#10b981',
    'urgente': '#10b981'
  };

  constructor() {
    // Re-renderizar gráficos quando o tema alternar
    effect(() => {
      this.isDarkMode();
      if (isPlatformBrowser(this.platformId) && !this.isLoading()) {
        setTimeout(() => this.renderAllCharts(), 50);
      }
    });
  }

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading.set(false);
      return;
    }

    await this.authService.getSession();
    await this.loadInitialData();
  }

  ngOnDestroy() {
    this.cleanupRealtime();
    this.destroyCharts();
  }

  private destroyCharts() {
    this.chartStatus?.destroy();
    this.chartStatus = null;
    this.chartAssigneeStatus?.destroy();
    this.chartAssigneeStatus = null;
    this.chartPriority?.destroy();
    this.chartPriority = null;
    this.chartAssigneePriority?.destroy();
    this.chartAssigneePriority = null;
  }

  async loadInitialData() {
    this.isLoading.set(true);
    try {
      const user = this.currentUser();
      const isAdmin = this.isAdmin();

      // Carregar quadros aos quais o usuário tem permissão
      const userBoards = await this.boardService.getBoardsForUser(user?.id, isAdmin);
      this.boards.set(userBoards);

      // Carregar lista geral de usuários
      const allUsers = await this.userService.getUsers();
      this.users.set(allUsers);

      // Pré-carregar total de tarefas de cada quadro para exibir na sidebar
      await this.loadTaskCounts(userBoards);

      // Verificar parâmetro na URL
      const queryBoardId = this.route.snapshot.queryParamMap.get('boardId');
      
      if (queryBoardId) {
        const targetId = Number(queryBoardId);
        const hasAccess = userBoards.some(b => b.id === targetId);
        if (hasAccess) {
          await this.selectBoard(targetId);
        } else if (userBoards.length > 0) {
          await this.selectBoard(userBoards[0].id);
        } else {
          this.selectNoBoards();
        }
      } else if (userBoards.length > 0) {
        await this.selectBoard(userBoards[0].id);
      } else {
        this.selectNoBoards();
      }
    } catch (error) {
      console.error('Erro ao carregar dados para os gráficos:', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private async loadTaskCounts(boardsList: Board[]) {
    try {
      const countsMap: { [boardId: number]: number } = {};
      for (const b of boardsList) {
        const lists = await this.listService.getListsByBoard(b.id);
        if (lists.length > 0) {
          const listIds = lists.map(l => l.id);
          const cards = await this.cardService.getCardsByListIds(listIds);
          countsMap[b.id] = cards.length;
        } else {
          countsMap[b.id] = 0;
        }
      }
      this.boardTaskCounts.set(countsMap);
    } catch (e) {
      console.warn('Erro ao pré-carregar contagens de tarefas:', e);
    }
  }

  getBoardCardCount(boardId: number): number {
    return this.boardTaskCounts()[boardId] ?? 0;
  }

  private selectNoBoards() {
    this.selectedBoardId.set(null);
    this.selectedBoard.set(null);
    this.lists.set([]);
    this.cards.set([]);
    this.boardMembers.set([]);
    this.columnStats.set([]);
    this.totalTasks.set(0);
    this.destroyCharts();
  }

  async selectBoard(boardId: number) {
    this.selectedBoardId.set(boardId);

    const b = this.boards().find(item => item.id === boardId) || null;
    this.selectedBoard.set(b);
    await this.loadSingleBoardData(boardId, b);

    this.computeStats();
    this.setupRealtime(boardId);
    this.cdr.markForCheck();

    // Renderizar gráficos com as colunas reais deste quadro
    setTimeout(() => {
      this.renderAllCharts();
    }, 50);
  }

  private setupRealtime(boardId: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cleanupRealtime();

    this.realtimeChannel = this.supabaseService.client
      .channel(`board-realtime-${boardId}`)
      .on('broadcast', { event: 'board_updated' }, () => {
        this.reloadSilently(boardId);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cards'
      }, () => {
        this.reloadSilently(boardId);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lists'
      }, () => {
        this.reloadSilently(boardId);
      })
      .subscribe();
  }

  private async reloadSilently(boardId: number) {
    const b = this.selectedBoard();
    await this.loadSingleBoardData(boardId, b);
    this.computeStats();
    this.cdr.markForCheck();
    this.renderAllCharts();
  }

  private cleanupRealtime() {
    if (this.realtimeChannel) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private async loadSingleBoardData(boardId: number, boardObj: Board | null) {
    try {
      const [boardLists, members] = await Promise.all([
        this.listService.getListsByBoard(boardId),
        this.boardService.getUsersWithBoardAccess(boardId, boardObj?.owner_id)
      ]);

      this.lists.set(boardLists);
      this.boardMembers.set(members);

      const listIds = boardLists.map(l => l.id);
      if (listIds.length > 0) {
        const boardCards = await this.cardService.getCardsByListIds(listIds);
        this.cards.set(boardCards);
      } else {
        this.cards.set([]);
      }
    } catch (e) {
      console.error('Erro ao carregar listas e cartões do quadro:', e);
      this.lists.set([]);
      this.cards.set([]);
      this.boardMembers.set([]);
    }
  }

  private getColumnColor(title: string, index: number): string {
    const normalized = title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (this.defaultStatusColors[normalized]) {
      return this.defaultStatusColors[normalized];
    }
    return this.fallbackColors[index % this.fallbackColors.length];
  }

  private computeStats() {
    const currentLists = this.lists();
    const currentCards = this.cards();

    // Colunas 100% reais do quadro Kanban selecionado
    const stats: ColumnStat[] = currentLists.map((list, idx) => {
      const count = currentCards.filter(c => c.list_id === list.id).length;
      return {
        id: list.id,
        title: list.title,
        count,
        color: this.getColumnColor(list.title, idx)
      };
    });

    this.columnStats.set(stats);
    this.totalTasks.set(currentCards.length);
    this.fixedTasks.set(0);
    this.archivedTasks.set(0);
  }

  getUserDisplayName(userId?: string | number | null): string {
    if (!userId) return 'Sem Responsável';
    const found = this.users().find(u => String(u.id) === String(userId));
    if (found) {
      return found.name || found.email.split('@')[0];
    }
    return `Usuário (${String(userId).substring(0, 5)})`;
  }

  // ==========================================
  // RENDERIZAÇÃO DOS GRÁFICOS (CHART.JS)
  // ==========================================

  private getDataLabelsPlugin() {
    return {
      id: 'customDataLabels',
      afterDatasetsDraw: (chart: any) => {
        const { ctx } = chart;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta.hidden) {
            meta.data.forEach((element: any, index: number) => {
              const val = dataset.data[index];
              if (val !== undefined && val !== null && val > 0) {
                if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
                  const pos = element.tooltipPosition();
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(String(val), pos.x, pos.y);
                } else {
                  // Bar Chart
                  const { x, y, base } = element;
                  const barHeight = Math.abs(base - y);
                  if (barHeight > 22) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(String(val), x, (y + base) / 2);
                  } else {
                    ctx.fillStyle = this.isDarkMode() ? '#e2e8f0' : '#1e293b';
                    ctx.fillText(String(val), x, y - 8);
                  }
                }
              }
            });
          }
        });
        ctx.restore();
      }
    };
  }

  private renderAllCharts() {
    this.destroyCharts();

    const isDark = this.isDarkMode();
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';

    this.renderStatusChart(textColor, gridColor);
    this.renderAssigneeStatusChart(textColor, gridColor);
    this.renderPriorityChart(textColor);
    this.renderAssigneePriorityChart(textColor, gridColor);
  }

  // 1. Tarefas por Status (Barra)
  private renderStatusChart(textColor: string, gridColor: string) {
    if (!this.canvasStatus?.nativeElement) return;
    const stats = this.columnStats();

    const labels = stats.map(s => s.title);
    const data = stats.map(s => s.count);
    const colors = stats.map(s => s.color);

    this.chartStatus = new Chart(this.canvasStatus.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 4,
          maxBarThickness: 45
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              maxRotation: 30,
              minRotation: 0,
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: textColor,
              font: { size: 11 }
            },
            grid: { color: gridColor }
          }
        }
      },
      plugins: [this.getDataLabelsPlugin()]
    });
  }

  // 2. Tarefas por Responsáveis / Status (Barras Agrupadas por Membro)
  private renderAssigneeStatusChart(textColor: string, gridColor: string) {
    if (!this.canvasAssigneeStatus?.nativeElement) return;
    const cards = this.cards();
    const stats = this.columnStats();
    const members = this.boardMembers();

    // Obter membros autorizados do quadro + eventuais atribuídos com cartões
    const memberIds = members.map(m => String(m.id));
    const cardAssigneeIds = cards
      .filter(c => c.assigned_to)
      .map(c => String(c.assigned_to));

    const allUserIds = Array.from(new Set([...memberIds, ...cardAssigneeIds]));
    const hasUnassigned = cards.some(c => !c.assigned_to);
    if (hasUnassigned || allUserIds.length === 0) {
      allUserIds.push('unassigned');
    }

    const labels = allUserIds.map(id => id === 'unassigned' ? 'Sem Resp.' : this.getUserDisplayName(id));

    // Criar um dataset para cada coluna real do Kanban
    const datasets = stats.map(col => {
      const colData = allUserIds.map(userId => {
        return cards.filter(c => {
          const matchUser = userId === 'unassigned' ? !c.assigned_to : String(c.assigned_to) === userId;
          return matchUser && c.list_id === col.id;
        }).length;
      });

      return {
        label: col.title,
        data: colData,
        backgroundColor: col.color,
        borderRadius: 4,
        maxBarThickness: 28
      };
    });

    this.chartAssigneeStatus = new Chart(this.canvasAssigneeStatus.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              boxWidth: 12,
              font: { size: 11 }
            }
          },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              maxRotation: 25,
              minRotation: 0,
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: textColor,
              font: { size: 11 }
            },
            grid: { color: gridColor }
          }
        }
      },
      plugins: [this.getDataLabelsPlugin()]
    });
  }

  // 3. Tarefas por Prioridade (Gráfico de Pizza / Donut)
  private renderPriorityChart(textColor: string) {
    if (!this.canvasPriority?.nativeElement) return;
    const cards = this.cards();

    const priorityBuckets = [
      { key: 'baixa', label: 'Baixa', color: this.priorityColors['baixa'] },
      { key: 'média', label: 'Média', color: this.priorityColors['média'] },
      { key: 'alta', label: 'Alta', color: this.priorityColors['alta'] },
      { key: 'crítica', label: 'Crítica', color: this.priorityColors['crítica'] }
    ];

    const counts = priorityBuckets.map(b => {
      return cards.filter(c => {
        const p = (c.priority || 'baixa').toLowerCase();
        if (b.key === 'média') return p === 'média' || p === 'media';
        if (b.key === 'crítica') return p === 'crítica' || p === 'critica' || p === 'urgente';
        return p === b.key;
      }).length;
    });

    // Filtrar apenas se tiver alguma tarefa, caso contrário exibe fatias zeradas ou placeholder
    const total = counts.reduce((acc, curr) => acc + curr, 0);
    const dataToDisplay = total === 0 ? [1, 0, 0, 0] : counts;
    const labels = priorityBuckets.map(b => b.label);
    const colors = priorityBuckets.map(b => b.color);

    this.chartPriority = new Chart(this.canvasPriority.nativeElement, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: dataToDisplay,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: this.isDarkMode() ? '#121212' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              boxWidth: 12,
              padding: 16,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                const realCount = counts[idx];
                return ` ${labels[idx]}: ${realCount} tarefas`;
              }
            }
          }
        }
      },
      plugins: [this.getDataLabelsPlugin()]
    });
  }

  // 4. Tarefas por Responsável / Prioridade (Barras Agrupadas por Prioridade)
  private renderAssigneePriorityChart(textColor: string, gridColor: string) {
    if (!this.canvasAssigneePriority?.nativeElement) return;
    const cards = this.cards();
    const members = this.boardMembers();

    const memberIds = members.map(m => String(m.id));
    const cardAssigneeIds = cards
      .filter(c => c.assigned_to)
      .map(c => String(c.assigned_to));

    const allUserIds = Array.from(new Set([...memberIds, ...cardAssigneeIds]));
    const hasUnassigned = cards.some(c => !c.assigned_to);
    if (hasUnassigned || allUserIds.length === 0) {
      allUserIds.push('unassigned');
    }

    const labels = allUserIds.map(id => id === 'unassigned' ? 'Sem Resp.' : this.getUserDisplayName(id));

    const priorityBuckets = [
      { key: 'baixa', label: 'Baixa', color: this.priorityColors['baixa'] },
      { key: 'média', label: 'Média', color: this.priorityColors['média'] },
      { key: 'alta', label: 'Alta', color: this.priorityColors['alta'] },
      { key: 'crítica', label: 'Crítica', color: this.priorityColors['crítica'] }
    ];

    const datasets = priorityBuckets.map(b => {
      const data = allUserIds.map(userId => {
        return cards.filter(c => {
          const matchUser = userId === 'unassigned' ? !c.assigned_to : String(c.assigned_to) === userId;
          const p = (c.priority || 'baixa').toLowerCase();
          let matchP = p === b.key;
          if (b.key === 'média') matchP = p === 'média' || p === 'media';
          if (b.key === 'crítica') matchP = p === 'crítica' || p === 'critica' || p === 'urgente';
          return matchUser && matchP;
        }).length;
      });

      return {
        label: b.label,
        data,
        backgroundColor: b.color,
        borderRadius: 4,
        maxBarThickness: 28
      };
    });

    this.chartAssigneePriority = new Chart(this.canvasAssigneePriority.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              boxWidth: 12,
              font: { size: 11 }
            }
          },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              maxRotation: 25,
              minRotation: 0,
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: textColor,
              font: { size: 11 }
            },
            grid: { color: gridColor }
          }
        }
      },
      plugins: [this.getDataLabelsPlugin()]
    });
  }

  refreshData() {
    if (this.selectedBoardId()) {
      this.selectBoard(this.selectedBoardId()!);
    } else {
      this.loadInitialData();
    }
  }

  goToBoard(boardId: number | 'all') {
    if (boardId === 'all') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/board', boardId]);
    }
  }
}
