import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { MainLayout } from './shared/layout/main-layout/main-layout';

export const routes: Routes = [
  { 
    path: 'login', 
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'board/:id',
        loadComponent: () => import('./features/board/board').then(m => m.BoardComponent)
      },
      {
        path: 'graficos',
        loadComponent: () => import('./features/charts/charts').then(m => m.ChartsComponent)
      },
      {
        path: 'charts',
        redirectTo: 'graficos',
        pathMatch: 'full'
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
