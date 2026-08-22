import { CURRICULUM } from '../curriculum';
import { readStored, writeStored } from '../hooks/useLocalStorage';
import { normalizeWaypoints } from './waypoints';

// The per-letter waypoint overrides a parent records in the editor: how they
// are keyed, read back and folded into the curriculum the session runs on.

// Storage keys. The bare name below lives under the `guj:` namespace that
// src/hooks/useLocalStorage.js owns; it also knows how to adopt the
// un-namespaced `guj_*` key it replaces.
export const waypointsKey = (lessonId) => `custom_waypoints_${lessonId}`;

// Reads a saved override, bringing a v1 one (absolute canvas pixels) forward to
// the v2 path space in the same call.
//
// The rewrite happens on read rather than in a boot-time sweep, matching how
// useLocalStorage adopts v0 keys: a letter the parent never customised is never
// touched, and because the converted value is persisted immediately the
// conversion happens exactly once per letter no matter where the read came from.
// Idempotent by construction — a path-space value has nothing past 100 to
// detect, so a second pass is a no-op.
export const readWaypointOverride = (lessonId) => {
  const saved = readStored(waypointsKey(lessonId), null);
  if (!Array.isArray(saved)) return null;

  const normalized = normalizeWaypoints(saved);
  // Identity, not deep equality: normalizeWaypoints hands back the same array
  // when there was nothing to convert.
  if (normalized !== saved) writeStored(waypointsKey(lessonId), normalized);
  return normalized;
};

// Helper to load curriculum with local overrides from device storage
export const loadSavedCurriculum = () => {
  return CURRICULUM.map(item => {
    const saved = readWaypointOverride(item.id);
    return saved ? { ...item, waypoints: saved } : item;
  });
};
