import { StorageService } from "./storage-service";

export const HELP_ENABLED_KEY = "reinahub_help_enabled";
export const HELP_SETTINGS_EVENT = "reinahub:help-settings-change";

export class HelpSettingsService {
  static isEnabled() {
    return StorageService.get<boolean>(HELP_ENABLED_KEY, true);
  }

  static setEnabled(enabled: boolean) {
    StorageService.set(HELP_ENABLED_KEY, enabled);
    window.dispatchEvent(new CustomEvent(HELP_SETTINGS_EVENT, { detail: { enabled } }));
  }

  static toggle() {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  }
}
