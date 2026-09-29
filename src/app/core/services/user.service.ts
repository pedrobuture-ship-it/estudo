import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AppUser } from '../models/kanban.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private supabase: SupabaseService) {}

  async getUsers(): Promise<AppUser[]> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('id, name, email, is_admin')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Could not fetch public.users:', error.message);
      return [];
    }
    return data || [];
  }
}
