const authChangeEvent = 'hba:auth-change';

export function setLocalAuthIndicator(authenticated: boolean) {
  if (typeof window === 'undefined') return;
  if (authenticated) window.localStorage.setItem('hba-authenticated', 'true');
  else {
    window.localStorage.removeItem('hba-authenticated');
    window.sessionStorage.removeItem('hba-authenticated');
    window.localStorage.removeItem('hba-remember-device');
  }
  window.dispatchEvent(new Event(authChangeEvent));
}

export async function signOutSupabase() {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  setLocalAuthIndicator(false);
}

export function getAuthSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('hba-authenticated') === 'true' || window.sessionStorage.getItem('hba-authenticated') === 'true';
}

export function subscribeToAuth(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(authChangeEvent, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(authChangeEvent, callback);
    window.removeEventListener('storage', callback);
  };
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event(authChangeEvent));
}
