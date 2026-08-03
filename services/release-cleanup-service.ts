import { StorageService } from "@/services/storage-service";

const CLEANUP_MARKER = "reinahub_release_cleanup_2026_08_03";
const LEGACY_HISTORY_KEYS = ["vot_quote_history", "rc_history", "ma_history"];

export function cleanupLegacyHistoriesOnce() {
  if (StorageService.getString(CLEANUP_MARKER, "")) return;
  LEGACY_HISTORY_KEYS.forEach((key) => StorageService.remove(key));
  StorageService.setString(CLEANUP_MARKER, "done");
}
