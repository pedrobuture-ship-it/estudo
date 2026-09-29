import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { List } from '../models/kanban.models';

@Injectable({
  providedIn: 'root'
})
export class ListService {
  constructor(private supabase: SupabaseService) {}

  async getListsByBoard(boardId: number): Promise<List[]> {
    const { data, error } = await this.supabase.client
      .from('lists')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true });
      
    if (error) throw error;
    return data || [];
  }

  async createList(list: Partial<List>): Promise<List> {
    const { data, error } = await this.supabase.client
      .from('lists')
      .insert(list)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateList(id: number, updates: Partial<List>): Promise<List> {
    const { data, error } = await this.supabase.client
      .from('lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteList(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('lists')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
}
