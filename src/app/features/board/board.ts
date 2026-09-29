import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { 
  LucideArrowLeft, 
  LucidePlus, 
  LucidePencil, 
  LucideTrash2, 
  LucideUser, 
  LucideX,
  LucideCheck
} from '@lucide/angular';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BoardService } from '../../core/services/board.service';
import { ListService } from '../../core/services/list.service';
import { CardService } from '../../core/services/card.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Board, List, Card, AppUser } from '../../core/models/kanban.models';

interface BoardList extends List {
  cards: Card[];
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule,
    LucideArrowLeft,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideUser,
    LucideX,
    LucideCheck
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class BoardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private boardService = inject(BoardService);
  private listService = inject(ListService);
  private cardService = inject(CardService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  private realtimeChannel: RealtimeChannel | null = null;
  private focusListener: (() => void) | null = null;

  readonly board = signal<Board | null>(null);
  readonly lists = signal<BoardList[]>([]);
  readonly users = signal<AppUser[]>([]); // Apenas usuários com permissão de acesso ao quadro
  readonly allUsers = signal<AppUser[]>([]); // Todos os usuários para exibição de rótulos
  readonly isLoading = signal<boolean>(true);
  readonly isAdmin = this.authService.isAdmin;

  // Column (List) Modal State
  readonly showColumnModal = signal<boolean>(false);
  readonly editingList = signal<BoardList | null>(null);
  columnTitle = '';

  // Create Card Modal State
  readonly showCreateCardModal = signal<boolean>(false);
  readonly targetListForNewCard = signal<BoardList | null>(null);
  newCardForm = {
    title: '',
    description: '',
    priority: 'Baixa',
    assigned_to: '',
    due_date: ''
  };

  // Edit Card Modal State
  readonly editingCard = signal<Card | null>(null);
  editForm = {
    title: '',
    description: '',
    priority: 'Baixa',
    assigned_to: '',
    due_date: ''
  };

  readonly dragStartDelay = { touch: 250, mouse: 0 };

  ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      const boardId = Number(params.get('id'));
      if (!boardId) {
        if (isPlatformBrowser(this.platformId)) {
          this.router.navigate(['/dashboard']);
        }
        return;
      }

      if (isPlatformBrowser(this.platformId)) {
        await this.authService.getSession();

        const hasAccess = await this.boardService.checkUserBoardAccess(
          boardId, 
          this.authService.currentUser()?.id, 
          this.isAdmin()
        );

        if (!hasAccess) {
          alert('Você não tem permissão para acessar este quadro.');
          this.router.navigate(['/dashboard']);
          return;
        }

        await this.loadBoardData(boardId);
        await this.loadUsers(boardId, this.board()?.owner_id);
        this.setupRealtime(boardId);
        this.setupFocusSync(boardId);
        this.cdr.markForCheck();
      } else {
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.cleanupRealtime();
    if (this.focusListener && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('focus', this.focusListener);
    }
  }

  async loadUsers(boardId: number, ownerId?: string | number | null) {
    try {
      const [allList, allowedList] = await Promise.all([
        this.userService.getUsers(),
        this.boardService.getUsersWithBoardAccess(boardId, ownerId)
      ]);
      this.allUsers.set(allList);
      this.users.set(allowedList);
    } catch (e) {
      console.warn('Error loading users for board access', e);
    }
  }

  async loadBoardData(boardId: number, silent: boolean = false) {
    if (!silent) this.isLoading.set(true);
    try {
      const boardData = await this.boardService.getBoardById(boardId);
      this.board.set(boardData);
      
      const rawLists = await this.listService.getListsByBoard(boardId);
      const listIds = rawLists.map((l: List) => l.id);
      
      const allCards = await this.cardService.getCardsByListIds(listIds);

      const mappedLists = rawLists.map((list: List) => ({
        ...list,
        cards: allCards.filter((c: Card) => c.list_id === list.id).sort((a: Card, b: Card) => a.position - b.position)
      }));
      this.lists.set(mappedLists);
    } catch (error) {
      console.error('Error loading board', error);
      if (!silent) {
        alert('Erro ao carregar quadro.');
        this.router.navigate(['/dashboard']);
      }
    } finally {
      if (!silent) this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async reloadCardsSilently(boardId: number) {
    try {
      const currentLists = this.lists();
      if (currentLists.length === 0) {
        await this.loadBoardData(boardId, true);
        return;
      }

      const listIds = currentLists.map(l => l.id);
      const allCards = await this.cardService.getCardsByListIds(listIds);

      const updatedLists = currentLists.map(list => ({
        ...list,
        cards: allCards
          .filter(c => c.list_id === list.id)
          .sort((a, b) => a.position - b.position)
      }));
      this.lists.set(updatedLists);
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('Erro ao atualizar cartões silenciosamente via Realtime:', e);
    }
  }

  setupRealtime(boardId: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cleanupRealtime();

    this.realtimeChannel = this.supabaseService.client
      .channel(`board-realtime-${boardId}`)
      // 1. Ouvir Broadcasts enviados instantaneamente por outros usuários
      .on('broadcast', { event: 'board_updated' }, () => {
        this.reloadCardsSilently(boardId);
      })
      // 2. Ouvir mudanças diretas do Postgres em cards (INSERT, UPDATE, DELETE)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cards'
      }, () => {
        this.reloadCardsSilently(boardId);
      })
      // 3. Ouvir mudanças em listas / colunas
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lists'
      }, () => {
        this.loadBoardData(boardId, true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Conectado e ouvindo alterações do quadro #${boardId}`);
        }
      });
  }

  broadcastBoardUpdate() {
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'board_updated',
        payload: { timestamp: Date.now() }
      });
    }
  }

  cleanupRealtime() {
    if (this.realtimeChannel) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  setupFocusSync(boardId: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.focusListener) {
      window.removeEventListener('focus', this.focusListener);
    }
    this.focusListener = () => {
      this.reloadCardsSilently(boardId);
    };
    window.addEventListener('focus', this.focusListener);
  }

  // Column (List) Modals
  openCreateListModal() {
    if (!this.isAdmin()) return;
    this.editingList.set(null);
    this.columnTitle = '';
    this.showColumnModal.set(true);
    this.cdr.markForCheck();
  }

  openEditListModal(list: BoardList, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (!this.isAdmin()) return;
    this.editingList.set(list);
    this.columnTitle = list.title;
    this.showColumnModal.set(true);
    this.cdr.markForCheck();
  }

  closeListModal() {
    this.showColumnModal.set(false);
    this.editingList.set(null);
    this.cdr.markForCheck();
  }

  async saveList() {
    if (!this.isAdmin()) return;
    const title = this.columnTitle.trim();
    if (!title) return;

    const currentBoard = this.board();
    if (!currentBoard) return;

    const listToEdit = this.editingList();

    try {
      if (listToEdit) {
        // Edit existing list
        const updated = await this.listService.updateList(listToEdit.id, { title });
        listToEdit.title = updated.title;
        this.lists.update(prev => [...prev]);
      } else {
        // Create new list
        const position = this.lists().length;
        const newList = await this.listService.createList({
          board_id: currentBoard.id,
          title,
          position
        });
        this.lists.update(prev => [...prev, { ...newList, cards: [] }]);
      }
      this.closeListModal();
      this.broadcastBoardUpdate();
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error saving column', error);
      alert('Erro ao salvar coluna: ' + (error?.message || 'Erro desconhecido'));
    }
  }

  async deleteList(listId: number, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    if (!confirm('Tem certeza que deseja excluir esta coluna e todos os seus cartões?')) {
      return;
    }

    try {
      await this.listService.deleteList(listId);
      this.lists.update(prev => prev.filter(l => l.id !== listId));
      this.broadcastBoardUpdate();
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error deleting list', error);
      alert('Erro ao excluir coluna: ' + (error?.message || 'Erro desconhecido'));
    }
  }

  // Create Card Modal
  openCreateCardModal(list?: BoardList) {
    const firstList = this.lists()[0];
    const target = list || firstList;
    if (!target) return;

    if (firstList && target.id !== firstList.id) {
      alert('Tarefas só podem ser criadas na primeira coluna do quadro.');
      return;
    }

    this.targetListForNewCard.set(target);
    this.newCardForm = {
      title: '',
      description: '',
      priority: 'Baixa',
      assigned_to: '',
      due_date: ''
    };
    this.showCreateCardModal.set(true);
    this.cdr.markForCheck();
  }

  closeCreateCardModal() {
    this.showCreateCardModal.set(false);
    this.targetListForNewCard.set(null);
    this.cdr.markForCheck();
  }

  async saveNewCard() {
    const firstList = this.lists()[0];
    const list = this.targetListForNewCard();
    if (!list || (firstList && list.id !== firstList.id)) {
      alert('Tarefas só podem ser criadas na primeira coluna do quadro.');
      return;
    }

    const title = this.newCardForm.title.trim();
    if (!title) return;

    const assignedUserId = this.newCardForm.assigned_to;
    if (assignedUserId) {
      const isAllowed = this.users().some(u => u.id === String(assignedUserId));
      if (!isAllowed) {
        alert('O usuário selecionado não possui permissão para acessar este quadro e não pode ser atribuído.');
        return;
      }
    }

    try {
      const position = list.cards.length;
      const newCard = await this.cardService.createCard({
        list_id: list.id,
        title,
        description: this.newCardForm.description.trim() || null,
        priority: this.newCardForm.priority,
        assigned_to: this.newCardForm.assigned_to || null,
        due_date: this.newCardForm.due_date || null,
        position
      });
      list.cards.push(newCard);
      this.lists.update(prev => [...prev]);
      this.closeCreateCardModal();
      this.broadcastBoardUpdate();
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error creating card', error);
      alert('Erro ao criar cartão: ' + (error?.message || 'Erro desconhecido'));
    }
  }

  openEditCardModal(card: Card, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.editingCard.set(card);
    this.editForm = {
      title: card.title,
      description: card.description || '',
      priority: card.priority || 'Baixa',
      assigned_to: card.assigned_to ? String(card.assigned_to) : '',
      due_date: card.due_date || ''
    };
    this.cdr.markForCheck();
  }

  closeEditModal() {
    this.editingCard.set(null);
    this.cdr.markForCheck();
  }

  async saveCardChanges() {
    const card = this.editingCard();
    if (!card) return;

    const assignedUserId = this.editForm.assigned_to;
    if (assignedUserId) {
      const isAllowed = this.users().some(u => u.id === String(assignedUserId));
      if (!isAllowed) {
        alert('O usuário selecionado não possui permissão para acessar este quadro e não pode ser atribuído.');
        return;
      }
    }

    const updates: Partial<Card> = {
      title: this.editForm.title,
      description: this.editForm.description || null,
      priority: this.editForm.priority,
      assigned_to: this.editForm.assigned_to || null,
      due_date: this.editForm.due_date || null
    };

    try {
      await this.cardService.updateCard(card.id, updates);
      
      // Update local item
      Object.assign(card, updates);
      this.lists.update(prev => [...prev]);
      this.closeEditModal();
      this.broadcastBoardUpdate();
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error updating card', error);
      alert('Erro ao salvar alterações do cartão: ' + (error?.message || 'Erro desconhecido'));
    }
  }

  async deleteCard(cardId: number, list: BoardList, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isAdmin()) return;
    if (!confirm('Deseja excluir este cartão?')) return;

    try {
      await this.cardService.deleteCard(cardId);
      list.cards = list.cards.filter(c => c.id !== cardId);
      this.lists.update(prev => [...prev]);
      this.broadcastBoardUpdate();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error deleting card', error);
      alert('Erro ao excluir cartão.');
    }
  }

  onCardDragStarted() {
    if (isPlatformBrowser(this.platformId) && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch (e) {
        // Silencioso se dispositivo não suportar vibração
      }
    }
  }

  async dropCard(event: CdkDragDrop<Card[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      
      const cards = event.container.data;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (card.position !== i) {
          card.position = i;
          this.cardService.updateCard(card.id, { position: i });
        }
      }
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const targetListId = Number(event.container.id);
      const targetCards = event.container.data;
      const movedCard = targetCards[event.currentIndex];
      movedCard.list_id = targetListId;

      await this.cardService.updateCard(movedCard.id, { 
        list_id: targetListId, 
        position: event.currentIndex 
      });

      for (let i = 0; i < targetCards.length; i++) {
        const card = targetCards[i];
        if (card.position !== i || card.id === movedCard.id) {
          card.position = i;
          if (card.id !== movedCard.id) {
             this.cardService.updateCard(card.id, { position: i });
          }
        }
      }
    }
    this.lists.update(prev => [...prev]);
    this.broadcastBoardUpdate();
    this.cdr.markForCheck();
  }

  getUserName(userId: string | number | null): string {
    if (!userId) return '';
    const found = this.allUsers().find(u => u.id === String(userId)) || this.users().find(u => u.id === String(userId));
    return found ? (found.name || found.email) : 'Atribuído';
  }

  getPriorityClass(priority?: string | null): string {
    switch ((priority || '').toLowerCase()) {
      case 'urgente': return 'priority-urgente';
      case 'alta': return 'priority-alta';
      case 'média':
      case 'media': return 'priority-media';
      default: return 'priority-baixa';
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
