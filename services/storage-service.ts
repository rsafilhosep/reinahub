export class StorageService {
  static get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  static set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local storage may be unavailable or full; callers keep their in-memory state.
    }
  }

  static getString(key: string, fallback = "") {
    if (typeof window === "undefined") return fallback;
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  static setString(key: string, value: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Local storage may be unavailable or full; callers keep their in-memory state.
    }
  }

  static remove(key: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage removal failures.
    }
  }

  static bytes(key: string) {
    if (typeof window === "undefined") return 0;
    try {
      return new Blob([window.localStorage.getItem(key) ?? ""]).size;
    } catch {
      return 0;
    }
  }
}
