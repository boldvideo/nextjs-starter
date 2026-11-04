// The visitor's company, shared by every surface (homepage, /ask, episode
// chat). One localStorage key plus a change event, so adding a company in one
// place shows up everywhere on the page, and in other tabs via `storage`.
import { viewerProfile, type CompanyProfile } from "./profile";

const KEY = "asb-company-v1";
const EVENT = "asb-company-change";

export function readCompany(): CompanyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CompanyProfile) : null;
  } catch {
    return null;
  }
}

export function writeCompany(p: CompanyProfile | null) {
  try {
    if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* blocked storage: still announce it so this page view updates */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onCompanyChange(fn: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === KEY) fn();
  };
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", storage);
  };
}

/** The stored company as Bold's inline viewer_profile, read at request time. */
export function storedViewerProfile(): Record<string, string> {
  return viewerProfile(readCompany());
}
