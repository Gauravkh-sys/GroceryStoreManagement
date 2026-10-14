import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly currentTheme = signal<ColorTheme>('light');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setTheme(this.readSavedTheme());
    } else {
      this.document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  private setTheme(theme: ColorTheme): void {
    this.currentTheme.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem('freshly-theme', theme);
    } catch (error) {
      console.warn('Unable to save the theme preference.', error);
    }
  }

  private readSavedTheme(): ColorTheme {
    try {
      return this.document.defaultView?.localStorage.getItem('freshly-theme') ===
        'dark'
        ? 'dark'
        : 'light';
    } catch (error) {
      console.warn('Unable to read the saved theme preference.', error);
      return 'light';
    }
  }
}
