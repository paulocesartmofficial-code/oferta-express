/**
 * History & Duplicate Detection Repository
 * Manages persisted history items, favorites, and duplicate warning detection.
 */
import { HistoryItem } from '../../src/types';

export class HistoryRepository {
  private items: HistoryItem[] = [];

  constructor() {
    // Start with empty history - only real user-generated offers are stored
    this.items = [];
  }

  public getAll(filter?: { range?: 'today' | '7days' | '30days' | 'all'; favoritesOnly?: boolean; search?: string }): HistoryItem[] {
    let result = [...this.items];

    if (filter?.favoritesOnly) {
      result = result.filter(item => item.isFavorite);
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(item => item.title.toLowerCase().includes(q) || item.canonicalUrl.toLowerCase().includes(q));
    }

    if (filter?.range && filter.range !== 'all') {
      const now = Date.now();
      const cutoff = {
        today: now - 24 * 60 * 60 * 1000,
        '7days': now - 7 * 24 * 60 * 60 * 1000,
        '30days': now - 30 * 24 * 60 * 60 * 1000,
      }[filter.range];

      if (cutoff) {
        result = result.filter(item => new Date(item.lastProcessedAt).getTime() >= cutoff);
      }
    }

    // Sort newest first
    return result.sort((a, b) => new Date(b.lastProcessedAt).getTime() - new Date(a.lastProcessedAt).getTime());
  }

  public findDuplicate(productId?: string, canonicalUrl?: string): HistoryItem | undefined {
    if (!productId && !canonicalUrl) return undefined;

    const normalizedTargetUrl = canonicalUrl ? this.normalizeForDuplicateCheck(canonicalUrl) : '';

    return this.items.find(item => {
      if (productId && item.productId && item.productId === productId) {
        return true;
      }
      if (normalizedTargetUrl && item.canonicalUrl) {
        const itemNormalized = this.normalizeForDuplicateCheck(item.canonicalUrl);
        if (itemNormalized === normalizedTargetUrl) return true;
      }
      return false;
    });
  }

  public save(item: Omit<HistoryItem, 'id' | 'createdAt' | 'lastProcessedAt'> & { id?: string }): HistoryItem {
    const existingIndex = item.id ? this.items.findIndex(i => i.id === item.id) : -1;
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const updated: HistoryItem = {
        ...this.items[existingIndex],
        ...item,
        lastProcessedAt: now,
      };
      this.items[existingIndex] = updated;
      return updated;
    }

    const newItem: HistoryItem = {
      ...item,
      id: item.id || `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      lastProcessedAt: now,
    };
    this.items.unshift(newItem);
    return newItem;
  }

  public toggleFavorite(id: string): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) return false;
    item.isFavorite = !item.isFavorite;
    return item.isFavorite;
  }

  public delete(id: string): boolean {
    const index = this.items.findIndex(i => i.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.items = [];
  }

  private normalizeForDuplicateCheck(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      // Remove query string and trailing slashes for canonical path comparison
      return `${parsed.hostname}${parsed.pathname.replace(/\/+$/, '')}`.toLowerCase();
    } catch {
      return urlStr.toLowerCase();
    }
  }
}
