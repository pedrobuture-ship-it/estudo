import { Component, inject, OnInit, PLATFORM_ID, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  LucidePlus, 
  LucideUsers, 
  LucidePencil, 
  LucideTrash2, 
  LucideX, 
  LucideCheck,
  LucideCode,
  LucideFolder,
  LucideKanban,
  LucideLayout,
  LucideSquareCheck,
  LucideListTodo,
  LucideBriefcase,
  LucideShoppingCart,
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
  LucideGlobe
} from '@lucide/angular';
import { BoardService } from '../../core/services/board.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Board, AppUser } from '../../core/models/kanban.models';
import { AVAILABLE_BOARD_ICONS, BoardIconOption } from '../../core/constants/board-icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucidePlus,
    LucideUsers,
    LucidePencil,
    LucideTrash2,
    LucideX,
    LucideCheck,
    LucideCode,
    LucideFolder,
    LucideKanban,
    LucideLayout,
    LucideSquareCheck,
    LucideListTodo,
    LucideBriefcase,
    LucideShoppingCart,
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
    LucideGlobe
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private boardService = inject(BoardService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  readonly boards = signal<Board[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isAdmin = this.authService.isAdmin;

  // Board Create / Edit Modal State
  readonly showBoardModal = signal<boolean>(false);
  readonly editingBoard = signal<Board | null>(null);
  readonly availableIcons = AVAILABLE_BOARD_ICONS;
  boardForm = {
    name: '',
    description: '',
    icon: 'code'
  };

  selectIcon(iconId: string) {
    this.boardForm.icon = iconId;
    this.cdr.markForCheck();
  }

  // Member Management State
  readonly managingBoard = signal<Board | null>(null);
  readonly users = signal<AppUser[]>([]);
  readonly boardMemberIds = signal<string[]>([]);
  readonly isSavingMembers = signal<boolean>(false);

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.authService.getSession();
      await Promise.all([
        this.loadBoards(),
        this.loadUsers()
      ]);
      this.cdr.markForCheck();
    } else {
      this.isLoading.set(false);
    }
  }

  async loadUsers() {
    try {
      const list = await this.userService.getUsers();
      this.users.set(list);
    } catch (e) {
      console.warn('Error loading users', e);
    }
  }

  async loadBoards() {
    this.isLoading.set(true);
    try {
      const user = this.authService.currentUser();
      const data = await this.boardService.getBoardsForUser(user?.id, this.isAdmin());
      this.boards.set(data);
    } catch (error) {
      console.error('Error loading boards', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  openCreateBoardModal() {
    if (!this.isAdmin()) return;
    this.editingBoard.set(null);
    this.boardForm = { name: '', description: '', icon: 'code' };
    this.showBoardModal.set(true);
    this.cdr.markForCheck();
  }

  openEditBoardModal(board: Board, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    this.editingBoard.set(board);
    this.boardForm = {
      name: board.name,
      description: board.description || '',
      icon: board.icon || 'code'
    };
    this.showBoardModal.set(true);
    this.cdr.markForCheck();
  }

  closeBoardModal() {
    this.showBoardModal.set(false);
    this.editingBoard.set(null);
    this.cdr.markForCheck();
  }

  async saveBoard() {
    if (!this.isAdmin()) return;
    const name = this.boardForm.name.trim();
    if (!name) return;

    const desc = this.boardForm.description.trim() || null;
    const icon = this.boardForm.icon || 'code';
    const current = this.editingBoard();

    try {
      if (current) {
        // Edit existing board
        const updated = await this.boardService.updateBoard(current.id, {
          name,
          description: desc,
          icon
        });
        this.boards.update(prev => prev.map(b => b.id === current.id ? updated : b));
      } else {
        // Create new board
        const user = this.authService.currentUser();
        const payload: Partial<Board> = {
          name,
          description: desc,
          icon
        };
        if (user?.id) {
          payload.owner_id = user.id;
        }
        const newBoard = await this.boardService.createBoard(payload);
        this.boards.update(prev => [newBoard, ...prev]);
      }
      this.closeBoardModal();
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error saving board', error);
      alert('Erro ao salvar quadro: ' + (error?.message || JSON.stringify(error)));
    }
  }

  async deleteBoard(boardId: number, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    if (!confirm('Tem certeza que deseja excluir este quadro? Todas as listas e cartões dele serão excluídos.')) {
      return;
    }

    try {
      await this.boardService.deleteBoard(boardId);
      this.boards.update(prev => prev.filter(b => b.id !== boardId));
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error deleting board', error);
      alert('Erro ao excluir quadro: ' + (error?.message || 'Erro desconhecido'));
    }
  }

  // Members Management
  async openMembersModal(board: Board, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    this.managingBoard.set(board);
    this.isSavingMembers.set(true);

    try {
      const members = await this.boardService.getBoardMembers(board.id);
      this.boardMemberIds.set(members);
    } catch (e) {
      console.error('Error fetching board members', e);
      this.boardMemberIds.set([]);
    } finally {
      this.isSavingMembers.set(false);
      this.cdr.markForCheck();
    }
  }

  closeMembersModal() {
    this.managingBoard.set(null);
    this.cdr.markForCheck();
  }

  isMember(userId: string): boolean {
    return this.boardMemberIds().includes(userId);
  }

  isOwner(userId: string): boolean {
    const board = this.managingBoard();
    return board ? String(board.owner_id) === String(userId) : false;
  }

  async toggleMember(user: AppUser) {
    const board = this.managingBoard();
    if (!board || !this.isAdmin()) return;

    // Do not remove the board owner
    if (this.isOwner(user.id)) {
      alert('O criador do quadro não pode ter seu acesso removido.');
      return;
    }

    const currentlyMember = this.isMember(user.id);

    try {
      if (currentlyMember) {
        await this.boardService.removeBoardMember(board.id, user.id);
        this.boardMemberIds.update(prev => prev.filter(id => id !== user.id));
      } else {
        await this.boardService.addBoardMember(board.id, user.id);
        this.boardMemberIds.update(prev => [...prev, user.id]);
      }
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error toggling member', error);
      alert('Erro ao alterar permissão de acesso: ' + (error?.message || 'Erro desconhecido'));
    }
  }

  openBoard(boardId: number) {
    this.router.navigate(['/board', boardId]);
  }

  async logout() {
    await this.authService.signOut();
  }
}
