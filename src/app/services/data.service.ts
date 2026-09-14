import { Injectable, signal } from '@angular/core';
import { CardItem, ListItem } from '../models/app-data.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  cards = signal<CardItem[]>([
    {
      id: 1,
      tag: 'UX Tokens',
      title: 'Design System',
      description: 'Uso de variables CSS centralizadas para temas oscuros.',
      detail: 'Física elástica activa con variables CSS centralizadas en Angular.'
    },
    {
      id: 2,
      tag: 'PWA Ready',
      tagColor: 'var(--accent-orange)',
      tagBg: 'rgba(255,159,10,0.15)',
      title: 'Experiencia Nativa',
      description: 'Interfaz oscura fluida estilo Android / iOS.',
      detail: 'Optimizada para responder a gestos multitáctiles y PWA.'
    }
  ]);

  listItems = signal<ListItem[]>([
    {
      id: 1,
      icon: '☁️',
      title: 'Servidor Cloud',
      date: 'Hoy, 14:32',
      badgeText: '-$12.00',
      badgeClass: 'badge-success',
      detail: 'Pago procesado correctamente mediante suscripción mensual.'
    },
    {
      id: 2,
      icon: '💳',
      title: 'Pago de Cliente',
      date: 'Ayer, 09:15',
      badgeText: '+$450.00',
      badgeClass: 'badge-success',
      detail: 'Depósito realizado por el cliente mediante transferencia.'
    },
    {
      id: 3,
      icon: '🔑',
      title: 'Licencia IDE',
      date: '10 Sep 2026',
      badgeText: 'Pendiente',
      badgeClass: 'badge-pending',
      detail: 'Procesando validación del sistema de pago.'
    }
  ]);

  triggerHaptic() {
    if ('vibrate' in navigator) navigator.vibrate(8);
  }
}
