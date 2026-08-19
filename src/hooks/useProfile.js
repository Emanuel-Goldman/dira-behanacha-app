import { useEffect, useState } from 'react';
import { DEFAULT_PROFILE, SERVICE_OPTIONS } from '../utils/winProbability.js';

const STORAGE_KEY = 'dira-behanacha:profile';

/** True only for a profile shape this version of the app still understands. */
function isValidProfile(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (typeof value.local !== 'boolean') {
    return false;
  }
  return SERVICE_OPTIONS.some((option) => option.id === value.service);
}

/**
 * Read the saved profile, falling back to the default on anything unexpected.
 *
 * Storage is outside the program, so its contents are validated rather than
 * trusted: an older build, a hand-edited value, or a browser that throws on
 * localStorage (Safari private mode) all have to land on the default instead of
 * rendering NaN bars.
 */
function readStoredProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return isValidProfile(parsed) ? parsed : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

/** The visitor's lottery profile, kept across pages and reloads. */
export default function useProfile() {
  const [profile, setProfile] = useState(readStoredProfile);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // A full or blocked storage must not break the page — the profile still
      // works for this session, it just will not survive a reload.
    }
  }, [profile]);

  return [profile, setProfile];
}
