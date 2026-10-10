export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

export class ServerCache {
  private store = new Map<string, CacheEntry<any>>();
  private idempotencyStore = new Map<string, { value: any; expiresAt: number; createdAt: number }>();
  private maxEntries: number;
  private defaultTTLMs: number;

  private stats = {
    hits: 0,
    misses: 0,
    idempotentHits: 0,
    evictions: 0,
    totalRequests: 0,
  };

  constructor(maxEntries = 500, defaultTTLSeconds = 900) {
    this.maxEntries = maxEntries;
    this.defaultTTLMs = defaultTTLSeconds * 1000;
  }

  public get<T>(key: string): T | null {
    this.stats.totalRequests++;
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTLMs;

    // LRU eviction if full
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  public getIdempotent(idempotencyKey: string): any | null {
    const entry = this.idempotencyStore.get(idempotencyKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.idempotencyStore.delete(idempotencyKey);
      return null;
    }

    this.stats.idempotentHits++;
    return entry.value;
  }

  public setIdempotent(idempotencyKey: string, value: any, ttlSeconds = 600): void {
    if (this.idempotencyStore.size >= 1000) {
      const oldestKey = this.idempotencyStore.keys().next().value;
      if (oldestKey) this.idempotencyStore.delete(oldestKey);
    }

    this.idempotencyStore.set(idempotencyKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now(),
    });
  }

  public getStats() {
    // Purge expired lazily
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAt) this.store.delete(k);
    }
    for (const [k, v] of this.idempotencyStore.entries()) {
      if (now > v.expiresAt) this.idempotencyStore.delete(k);
    }

    const hitRate = this.stats.totalRequests > 0
      ? ((this.stats.hits + this.stats.idempotentHits) / this.stats.totalRequests) * 100
      : 0;

    return {
      entries: this.store.size,
      idempotencyEntries: this.idempotencyStore.size,
      maxCapacity: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      idempotentHits: this.stats.idempotentHits,
      evictions: this.stats.evictions,
      totalRequests: this.stats.totalRequests,
      hitRatePercentage: Number(hitRate.toFixed(1)),
      uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    };
  }

  public clear(): void {
    this.store.clear();
    this.idempotencyStore.clear();
  }
}

export const serverCache = new ServerCache();
