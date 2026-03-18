import { User } from '../types';

// TEMP REVIEW-ONLY LIST: remove after internal review sign-off.
const INTERNAL_REVIEW_EMAILS = new Set(['saviosyl@gmail.com']);
const REVIEW_SESSION_EMAIL_KEY = 'metamech-review-email';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isInternalReviewEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return INTERNAL_REVIEW_EMAILS.has(normalizeEmail(email));
}

export function isInternalReviewUser(user: User | null | undefined): boolean {
  return isInternalReviewEmail(user?.email);
}

export function setInternalReviewSessionEmail(email: string | null | undefined): void {
  try {
    if (!email) {
      sessionStorage.removeItem(REVIEW_SESSION_EMAIL_KEY);
      return;
    }
    sessionStorage.setItem(REVIEW_SESSION_EMAIL_KEY, normalizeEmail(email));
  } catch {
    // ignore session storage issues
  }
}

export function isInternalReviewSession(): boolean {
  try {
    const email = sessionStorage.getItem(REVIEW_SESSION_EMAIL_KEY);
    return isInternalReviewEmail(email);
  } catch {
    return false;
  }
}

