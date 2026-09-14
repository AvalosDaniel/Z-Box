import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  dataService = inject(DataService);

  @ViewChild('stretchWrapper') stretchWrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('sheetRef') sheetRef!: ElementRef<HTMLElement>;

  searchQuery = signal<string>('');

  // Modal State
  isSheetActive = signal<boolean>(false);
  sheetTitle = signal<string>('Detalle');
  sheetBody = signal<string>('Contenido del panel.');

  // Pull-To-Refresh State
  isRefreshing = signal<boolean>(false);
  private readonly REFRESH_THRESHOLD = 60; // Distancia en px para activar recarga

  private unlisteners: (() => void)[] = [];

  // Gesto elástico
  private startY = 0;
  private currentDistance = 0;
  private isPulling = false;

  // Gesto Modal
  private sheetStartY = 0;
  private sheetCurrentY = 0;
  private isDraggingSheet = false;

  filteredCards = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.dataService.cards();
    return this.dataService.cards().filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q)
    );
  });

  filteredList = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.dataService.listItems();
    return this.dataService.listItems().filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  });

  hasResults = computed(() => this.filteredCards().length > 0 || this.filteredList().length > 0);

  ngAfterViewInit() {
    this.initGlobalStretchGesture();
    this.initSheetDragGesture();
  }

  ngOnDestroy() {
    this.unlisteners.forEach(unlistener => unlistener());
  }

  /* ----------------------------------------------------
     GESTO UNIVERSAL DE ESTIRAMIENTO + PULL TO REFRESH
     ---------------------------------------------------- */
  private initGlobalStretchGesture() {
    const getClientY = (e: MouseEvent | TouchEvent): number => {
      return 'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as MouseEvent).clientY;
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      if (this.isSheetActive() || this.isRefreshing()) return;
      const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

      if (scrollPos <= 0) {
        this.startY = getClientY(e);
        this.isPulling = true;
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isPulling || this.isSheetActive() || this.isRefreshing()) return;

      const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      const currentY = getClientY(e);
      const deltaY = currentY - this.startY;

      if (deltaY > 0 && scrollPos <= 0) {
        if (e.cancelable) e.preventDefault();

        // Formula elástica
        this.currentDistance = Math.pow(deltaY, 0.7) * 0.5;

        if (this.stretchWrapperRef) {
          const el = this.stretchWrapperRef.nativeElement;
          el.style.transition = 'none';
          el.style.transform = `translateY(${this.currentDistance}px)`;
        }
      } else {
        this.resetStretchPosition();
      }
    };

    const onEnd = () => {
      if (!this.isPulling) return;
      this.isPulling = false;

      // Si superó el umbral de recarga, ejecutamos el refresh
      if (this.currentDistance >= this.REFRESH_THRESHOLD) {
        this.triggerRefresh();
      } else {
        this.resetStretchPosition();
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    window.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.unlisteners.push(
      () => window.removeEventListener('touchstart', onStart),
      () => window.removeEventListener('touchmove', onMove),
      () => window.removeEventListener('touchend', onEnd),
      () => window.removeEventListener('mousedown', onStart),
      () => window.removeEventListener('mousemove', onMove),
      () => window.removeEventListener('mouseup', onEnd)
    );
  }

  private triggerRefresh() {
    this.dataService.triggerHaptic();
    this.isRefreshing.set(true);

    // Mantener la pantalla ligeramente abajo mientras carga
    if (this.stretchWrapperRef) {
      const el = this.stretchWrapperRef.nativeElement;
      el.style.transition = 'transform 0.3s ease';
      el.style.transform = 'translateY(55px)';
    }

    // Simulación de petición API a backend (1.5 segundos)
    setTimeout(() => {
      this.refreshData();
    }, 1500);
  }

  private refreshData() {
    // Aquí puedes invocar a un método de tu servicio que vuelva a consultar la API
    this.dataService.triggerHaptic();
    this.isRefreshing.set(false);
    this.resetStretchPosition();
  }

  private resetStretchPosition() {
    this.isPulling = false;
    if (this.stretchWrapperRef) {
      const el = this.stretchWrapperRef.nativeElement;
      el.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      el.style.transform = 'translateY(0)';
    }
    this.currentDistance = 0;
  }

  /* ----------------------------------------------------
     GESTO DEL MODAL (BOTTOM SHEET)
     ---------------------------------------------------- */
  private initSheetDragGesture() {
    if (!this.sheetRef) return;
    const sheetEl = this.sheetRef.nativeElement;

    const onTouchStart = (e: TouchEvent) => {
      this.sheetStartY = e.touches[0].clientY;
      this.isDraggingSheet = true;
      sheetEl.classList.add('dragging');
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.isDraggingSheet) return;
      this.sheetCurrentY = e.touches[0].clientY;
      const deltaY = this.sheetCurrentY - this.sheetStartY;

      if (e.cancelable) e.preventDefault();

      if (deltaY > 0) {
        sheetEl.style.transform = `translateY(${deltaY}px)`;
      } else {
        const elasticY = -Math.pow(Math.abs(deltaY), 0.65) * 0.35;
        sheetEl.style.transform = `translateY(${elasticY}px)`;
      }
    };

    const onTouchEnd = () => {
      if (!this.isDraggingSheet) return;
      this.isDraggingSheet = false;
      sheetEl.classList.remove('dragging');

      const deltaY = this.sheetCurrentY - this.sheetStartY;

      if (deltaY > 100) {
        this.closeSheet();
      } else {
        this.dataService.triggerHaptic();
        sheetEl.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        sheetEl.style.transform = 'translateY(0)';
      }
      this.sheetStartY = 0;
      this.sheetCurrentY = 0;
    };

    sheetEl.addEventListener('touchstart', onTouchStart, { passive: true });
    sheetEl.addEventListener('touchmove', onTouchMove, { passive: false });
    sheetEl.addEventListener('touchend', onTouchEnd);

    this.unlisteners.push(
      () => sheetEl.removeEventListener('touchstart', onTouchStart),
      () => sheetEl.removeEventListener('touchmove', onTouchMove),
      () => sheetEl.removeEventListener('touchend', onTouchEnd)
    );
  }

  openSheet(title: string, detail: string) {
    this.dataService.triggerHaptic();
    this.sheetTitle.set(title);
    this.sheetBody.set(detail);
    this.isSheetActive.set(true);

    if (this.sheetRef) {
      this.sheetRef.nativeElement.style.transform = '';
    }
  }

  closeSheet() {
    this.dataService.triggerHaptic();
    this.isSheetActive.set(false);

    if (this.sheetRef) {
      this.sheetRef.nativeElement.style.transform = '';
    }
  }

  clearSearch() {
    this.dataService.triggerHaptic();
    this.searchQuery.set('');
  }
}
