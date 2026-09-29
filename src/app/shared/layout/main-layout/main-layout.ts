import { Component, inject, OnInit, PLATFORM_ID, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { 
  LucideHome, 
  LucideMenu, 
  LucideCode, 
  LucidePlus, 
  LucideLogOut,
  LucideX,
  LucideFolder,
  LucideKanban,
  LucideLayout,
  LucideSquareCheck,
  LucideListTodo,
  LucideBriefcase,
  LucideShoppingCart,
  LucideUsers,
  LucideStar,
  LucideZap,
  LucideCalendar,
  LucideClock,
  LucideCpu,
  LucideDatabase,
  LucideChartBar,
  LucideBox,
  LucideTag,
  LucideBookmark,
  LucideGlobe,
  LucideSun,
  LucideMoon,
  LucideBell,
  LucideExternalLink,
  LucideCircleCheck,
  LucideRefreshCw,
  LucideTrash,
  LucideEllipsis
} from '@lucide/angular';
import { BoardService } from '../../../core/services/board.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Board } from '../../../core/models/kanban.models';
import { AVAILABLE_BOARD_ICONS, BoardIconOption } from '../../../core/constants/board-icons';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    LucideHome,
    LucideMenu,
    LucideCode,
    LucidePlus,
    LucideLogOut,
    LucideX,
    LucideFolder,
    LucideKanban,
    LucideLayout,
    LucideSquareCheck,
    LucideListTodo,
    LucideBriefcase,
    LucideShoppingCart,
    LucideUsers,
    LucideStar,
    LucideZap,
    LucideCalendar,
    LucideClock,
    LucideCpu,
    LucideDatabase,
    LucideChartBar,
    LucideBox,
    LucideTag,
    LucideBookmark,
    LucideGlobe,
    LucideSun,
    LucideMoon,
    LucideBell,
    LucideExternalLink,
    LucideCircleCheck,
    LucideRefreshCw,
    LucideTrash,
    LucideEllipsis
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit {
  private boardService = inject(BoardService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  readonly isDarkMode = this.themeService.isDarkMode;
  readonly isSidebarCollapsed = signal<boolean>(false);

  readonly notifications = this.notificationService.notifications;
  readonly notificationCount = this.notificationService.count;
  readonly isNotificationLoading = this.notificationService.isLoading;
  readonly showNotificationModal = signal<boolean>(false);
  readonly showMoreModal = signal<boolean>(false);

  readonly boards = signal<Board[]>([]);
  readonly isAdmin = this.authService.isAdmin;
  readonly currentUser = this.authService.currentUser;
  readonly activeBoardId = signal<number | null>(null);
  readonly isChartsActive = signal<boolean>(false);
  readonly isHomeActive = signal<boolean>(true);
  readonly showCreateModal = signal<boolean>(false);
  readonly availableIcons = AVAILABLE_BOARD_ICONS;
  newBoardForm = {
    name: '',
    description: '',
    icon: 'code'
  };

  // Mobile Bottom Nav computed boards
  readonly primaryBoard = computed(() => {
    const list = this.boards();
    if (!list || list.length === 0) return null;
    const currentId = this.activeBoardId();
    if (currentId) {
      const current = list.find(b => b.id === currentId);
      if (current) return current;
    }
    return list[0];
  });

  readonly otherBoards = computed(() => {
    const list = this.boards();
    const primary = this.primaryBoard();
    if (!list || list.length <= 1) return [];
    if (!primary) return list;
    return list.filter(b => b.id !== primary.id);
  });

  toggleMoreModal() {
    this.showMoreModal.update(v => !v);
    this.cdr.markForCheck();
  }

  closeMoreModal() {
    this.showMoreModal.set(false);
    this.cdr.markForCheck();
  }

  openPrimaryBoard() {
    const board = this.primaryBoard();
    if (board) {
      this.openBoard(board.id);
    } else if (this.isAdmin()) {
      this.openCreateBoardModal();
    } else {
      this.navigateToHome();
    }
  }

  openOtherBoard(boardId: number) {
    this.closeMoreModal();
    this.openBoard(boardId);
  }

  openCreateBoardModalFromSheet() {
    this.closeMoreModal();
    this.openCreateBoardModal();
  }

  selectIcon(iconId: string) {
    this.newBoardForm.icon = iconId;
    this.cdr.markForCheck();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.cdr.markForCheck();
  }

  toggleSidebar() {
    const nextState = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(nextState);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('sidebar_collapsed', String(nextState));
    }
    this.cdr.markForCheck();
  }

  toggleNotificationModal() {
    const nextState = !this.showNotificationModal();
    this.showNotificationModal.set(nextState);
    if (nextState) {
      const user = this.currentUser();
      this.notificationService.loadNotificationsForUser(user?.id);
    }
    this.cdr.markForCheck();
  }

  closeNotificationModal() {
    this.showNotificationModal.set(false);
    this.cdr.markForCheck();
  }

  async refreshNotifications() {
    const user = this.currentUser();
    await this.notificationService.loadNotificationsForUser(user?.id);
    this.cdr.markForCheck();
  }

  clearAllNotifications() {
    const user = this.currentUser();
    this.notificationService.clearAllNotifications(user?.id);
    this.cdr.markForCheck();
  }

  dismissNotification(cardId: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    const user = this.currentUser();
    this.notificationService.dismissNotification(cardId, user?.id);
    this.cdr.markForCheck();
  }

  openNotificationBoard(boardId: number) {
    this.closeNotificationModal();
    this.router.navigate(['/board', boardId]);
  }

  async ngOnInit() {
    this.detectActiveRoute();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMoreModal();
      this.detectActiveRoute();
      const user = this.currentUser();
      if (user?.id) {
        this.notificationService.loadNotificationsForUser(user.id);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      const savedCollapsed = localStorage.getItem('sidebar_collapsed');
      if (savedCollapsed === 'true') {
        this.isSidebarCollapsed.set(true);
      }
      await this.authService.getSession();
      const user = this.currentUser();
      await Promise.all([
        this.loadBoards(),
        this.notificationService.loadNotificationsForUser(user?.id)
      ]);
      this.cdr.markForCheck();
    }
  }

  detectActiveRoute() {
    const url = this.router.url;
    const boardMatch = url.match(/\/board\/(\d+)/);
    const isGraficos = url.includes('/graficos') || url.includes('/charts');
    
    if (boardMatch) {
      this.activeBoardId.set(Number(boardMatch[1]));
      this.isChartsActive.set(false);
      this.isHomeActive.set(false);
    } else if (isGraficos) {
      this.activeBoardId.set(null);
      this.isChartsActive.set(true);
      this.isHomeActive.set(false);
    } else {
      this.activeBoardId.set(null);
      this.isChartsActive.set(false);
      this.isHomeActive.set(true);
    }
    this.cdr.markForCheck();
  }

  navigateToCharts() {
    this.router.navigate(['/graficos']);
  }

  async loadBoards() {
    try {
      const user = this.authService.currentUser();
      const data = await this.boardService.getBoardsForUser(user?.id, this.isAdmin());
      this.boards.set(data);
    } catch (error) {
      console.error('Error loading sidebar boards', error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  navigateToHome() {
    this.router.navigate(['/dashboard']);
  }

  openBoard(boardId: number) {
    this.router.navigate(['/board', boardId]);
  }

  openCreateBoardModal() {
    if (!this.isAdmin()) return;
    this.newBoardForm = { name: '', description: '', icon: 'code' };
    this.showCreateModal.set(true);
    this.cdr.markForCheck();
  }

  closeCreateBoardModal() {
    this.showCreateModal.set(false);
    this.cdr.markForCheck();
  }

  async submitCreateBoard() {
    if (!this.isAdmin()) return;
    const name = this.newBoardForm.name.trim();
    if (!name) return;

    try {
      const user = this.authService.currentUser();
      const payload: Partial<Board> = {
        name,
        description: this.newBoardForm.description.trim() || null,
        icon: this.newBoardForm.icon || 'code'
      };
      if (user?.id) {
        payload.owner_id = user.id;
      }

      const newBoard = await this.boardService.createBoard(payload);
      this.boards.update(prev => [newBoard, ...prev]);
      this.closeCreateBoardModal();
      this.router.navigate(['/board', newBoard.id]);
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error creating board from sidebar', error);
      alert('Erro ao criar quadro: ' + (error?.message || JSON.stringify(error)));
    }
  }

  async logout() {
    await this.authService.signOut();
  }
}
