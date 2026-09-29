import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { AssignedCardNotification } from '../models/kanban.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private supabase = inject(SupabaseService);
  private platformId = inject(PLATFORM_ID);

  readonly notifications = signal<AssignedCardNotification[]>([]);
  readonly count = computed(() => this.notifications().length);
  readonly isLoading = signal<boolean>(false);

  private getDismissedKey(userId: string): string {
    return `dismissed_notif_cards_${userId}`;
  }

  private getDismissedCardIds(userId: string): number[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const stored = localStorage.getItem(this.getDismissedKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveDismissedCardIds(userId: string, ids: number[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.getDismissedKey(userId), JSON.stringify(ids));
    } catch (e) {
      console.warn('Could not persist dismissed notification ids', e);
    }
  }

  async loadNotificationsForUser(userId?: string | null): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!userId) {
      this.notifications.set([]);
      return;
    }

    try {
      this.isLoading.set(true);
      const { data, error } = await this.supabase.client
        .from('cards')
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          list_id,
          lists:list_id (
            id,
            title,
            board_id,
            boards:board_id (
              id,
              name
            )
          )
        `)
        .eq('assigned_to', userId)
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const dismissedIds = this.getDismissedCardIds(userId);

      const formatted: AssignedCardNotification[] = (data || []).map((item: any) => {
        const listData = item.lists;
        const boardData = listData?.boards;

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority || 'Média',
          due_date: item.due_date,
          list_id: item.list_id,
          column_title: listData?.title || 'Coluna sem título',
          board_id: boardData?.id || 0,
          board_name: boardData?.name || 'Quadro sem título'
        };
      });

      // Exclude dismissed notifications
      const activeNotifications = formatted.filter(card => !dismissedIds.includes(card.id));
      this.notifications.set(activeNotifications);
    } catch (err) {
      console.error('Failed to load assigned card notifications', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  clearAllNotifications(userId?: string | null): void {
    if (!userId) {
      this.notifications.set([]);
      return;
    }

    const currentIds = this.notifications().map(n => n.id);
    const existingDismissed = this.getDismissedCardIds(userId);
    const newDismissed = Array.from(new Set([...existingDismissed, ...currentIds]));

    this.saveDismissedCardIds(userId, newDismissed);
    this.notifications.set([]);
  }

  dismissNotification(cardId: number, userId?: string | null): void {
    if (userId) {
      const existingDismissed = this.getDismissedCardIds(userId);
      if (!existingDismissed.includes(cardId)) {
        this.saveDismissedCardIds(userId, [...existingDismissed, cardId]);
      }
    }
    this.notifications.update(prev => prev.filter(n => n.id !== cardId));
  }

  async resetDismissedNotifications(userId?: string | null): Promise<void> {
    if (userId && isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.getDismissedKey(userId));
    }
    await this.loadNotificationsForUser(userId);
  }
}
