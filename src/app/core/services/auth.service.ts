import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly isAdmin = signal<boolean>(false);
  private platformId = inject(PLATFORM_ID);

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initAuthListener();
  }

  private initAuthListener() {
    if (isPlatformBrowser(this.platformId)) {
      this.supabase.client.auth.getSession().then(({ data: { session } }) => {
        this.currentUser.set(session?.user ?? null);
        if (session?.user?.id) {
          this.checkAdminStatus(session.user.id);
        } else {
          this.isAdmin.set(false);
        }
      });

      this.supabase.client.auth.onAuthStateChange((_event, session) => {
        this.currentUser.set(session?.user ?? null);
        if (session?.user?.id) {
          this.checkAdminStatus(session.user.id);
        } else {
          this.isAdmin.set(false);
        }
      });
    }
  }

  async checkAdminStatus(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const adminStatus = Boolean(data.is_admin);
        this.isAdmin.set(adminStatus);
        return adminStatus;
      }
    } catch (e) {
      console.warn('Could not determine is_admin status:', e);
    }
    
    // Fallback: if user metadata specifies is_admin
    const user = this.currentUser();
    const isMetaAdmin = Boolean(user?.user_metadata?.['is_admin']);
    this.isAdmin.set(isMetaAdmin);
    return isMetaAdmin;
  }

  async getSession() {
    if (!isPlatformBrowser(this.platformId)) return null;
    const { data: { session } } = await this.supabase.client.auth.getSession();
    if (session?.user) {
      this.currentUser.set(session.user);
      await this.checkAdminStatus(session.user.id);
    } else {
      this.currentUser.set(null);
      this.isAdmin.set(false);
    }
    return session;
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await this.checkAdminStatus(data.user.id);
    }
    return data;
  }

  async signUpWithEmail(email: string, password: string, name: string) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    this.isAdmin.set(false);
    this.currentUser.set(null);
    if (error) throw error;
    this.router.navigate(['/login']);
  }
}
