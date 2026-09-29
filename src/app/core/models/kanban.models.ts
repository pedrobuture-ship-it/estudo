export interface Board {
  id: number;
  name: string;
  description: string | null;
  icon?: string | null;
  owner_id: string | number | null;
  created_at: string;
}

export interface List {
  id: number;
  board_id: number;
  title: string;
  position: number;
  created_at: string;
}

export interface Card {
  id: number;
  list_id: number;
  title: string;
  description: string | null;
  position: number;
  priority?: string | null;
  created_by: string | number | null;
  assigned_to: string | number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  is_admin?: boolean;
}

export interface AssignedCardNotification {
  id: number;
  title: string;
  description: string | null;
  priority: string | null;
  due_date: string | null;
  list_id: number;
  column_title: string;
  board_id: number;
  board_name: string;
}
