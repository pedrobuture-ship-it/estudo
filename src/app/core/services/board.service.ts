import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Board, AppUser } from '../models/kanban.models';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  constructor(private supabase: SupabaseService) {}

  async checkUserBoardAccess(boardId: number, userId?: string | null, isAdmin?: boolean): Promise<boolean> {
    if (isAdmin) return true;
    if (!userId) return false;

    const { data, error } = await this.supabase.client
      .from('board_user')
      .select('board_id')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    return !error && !!data;
  }

  private parseBoard(row: any): Board {
    if (!row) return row;
    let icon = 'code';
    let description = row.description;

    if (row.description && typeof row.description === 'string') {
      try {
        if (row.description.startsWith('{') && row.description.includes('"icon"')) {
          const parsed = JSON.parse(row.description);
          if (parsed && typeof parsed === 'object') {
            icon = parsed.icon || 'code';
            description = parsed.text ?? null;
          }
        }
      } catch (e) {
        // Not JSON, keep raw description
      }
    }

    return {
      ...row,
      description,
      icon: row.icon || icon
    };
  }

  private serializeBoardPayload(board: Partial<Board>): any {
    const payload: any = { ...board };
    const icon = board.icon || 'code';
    const text = board.description || null;

    delete payload.icon;
    payload.description = JSON.stringify({ icon, text });
    return payload;
  }

  async getBoards(): Promise<Board[]> {
    const { data, error } = await this.supabase.client
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(row => this.parseBoard(row));
  }

  async getBoardsForUser(userId?: string | null, isAdmin?: boolean): Promise<Board[]> {
    if (isAdmin) {
      return this.getBoards();
    }
    if (!userId) return [];

    const { data: memberData, error: memberErr } = await this.supabase.client
      .from('board_user')
      .select('board_id')
      .eq('user_id', userId);

    if (memberErr) throw memberErr;
    const boardIds = (memberData || []).map(m => m.board_id);

    if (boardIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from('boards')
      .select('*')
      .in('id', boardIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => this.parseBoard(row));
  }

  async getBoardById(id: number): Promise<Board> {
    const { data, error } = await this.supabase.client
      .from('boards')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return this.parseBoard(data);
  }

  async createBoard(board: Partial<Board>): Promise<Board> {
    const payload = this.serializeBoardPayload(board);
    const { data, error } = await this.supabase.client
      .from('boards')
      .insert(payload)
      .select()
      .single();
      
    if (error) throw error;
    return this.parseBoard(data);
  }

  async updateBoard(id: number, updates: Partial<Board>): Promise<Board> {
    const payload = this.serializeBoardPayload(updates);
    const { data, error } = await this.supabase.client
      .from('boards')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return this.parseBoard(data);
  }

  async deleteBoard(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('boards')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async getBoardMembers(boardId: number): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('board_user')
      .select('user_id')
      .eq('board_id', boardId);

    if (error) throw error;
    return (data || []).map(row => String(row.user_id));
  }

  async addBoardMember(boardId: number, userId: string, role: string = 'member'): Promise<void> {
    const { error } = await this.supabase.client
      .from('board_user')
      .upsert({
        board_id: boardId,
        user_id: userId,
        role: role
      }, { onConflict: 'board_id, user_id' });

    if (error) throw error;
  }

  async removeBoardMember(boardId: number, userId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('board_user')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getUsersWithBoardAccess(boardId: number, boardOwnerId?: string | number | null): Promise<AppUser[]> {
    const { data: usersData, error: usersErr } = await this.supabase.client
      .from('users')
      .select('id, name, email, is_admin')
      .order('name', { ascending: true });

    if (usersErr) throw usersErr;
    const allUsers: AppUser[] = usersData || [];

    const memberIds = await this.getBoardMembers(boardId);

    return allUsers.filter(u => 
      u.is_admin === true || 
      (boardOwnerId && String(boardOwnerId) === String(u.id)) || 
      memberIds.includes(String(u.id))
    );
  }
}
