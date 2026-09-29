import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Card } from '../models/kanban.models';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  constructor(private supabase: SupabaseService) {}

  async getCardsByListIds(listIds: number[]): Promise<Card[]> {
    if (listIds.length === 0) return [];
    
    const { data, error } = await this.supabase.client
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .order('position', { ascending: true });
      
    if (error) throw error;
    return data || [];
  }

  async createCard(card: Partial<Card>): Promise<Card> {
    const { data, error } = await this.supabase.client
      .from('cards')
      .insert(card)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateCard(id: number, updates: Partial<Card>): Promise<Card> {
    const { data, error } = await this.supabase.client
      .from('cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteCard(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('cards')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
}
