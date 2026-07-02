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
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  static getString(key: string, fallback = "") {
    if (typeof window === "undefined") return fallback;
    return window.localStorage.getItem(key) ?? fallback;
  }

  static setString(key: string, value: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  }

  static remove(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }

  static bytes(key: string) {
    if (typeof window === "undefined") return 0;
    return new Blob([window.localStorage.getItem(key) ?? ""]).size;
  }
}
