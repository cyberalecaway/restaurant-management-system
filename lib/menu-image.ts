const BUCKET = 'menu-images';
const STORAGE_MARKER = `/storage/v1/object/public/${BUCKET}/`;

function projectOrigin() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

function validObjectPath(path: string) {
  return path.length > 0 && path.split('/').every(part => part.length > 0 && part !== '.' && part !== '..' && /^[a-zA-Z0-9._ -]+$/.test(part));
}

export function normalizeMenuImagePath(value: string) {
  let path = value.trim();
  if (!path) return '';
  const origin = projectOrigin();

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      if (!origin || url.origin !== origin || !url.pathname.includes(STORAGE_MARKER)) throw new Error();
      path = decodeURIComponent(url.pathname.slice(url.pathname.indexOf(STORAGE_MARKER) + STORAGE_MARKER.length));
    } catch {
      throw new Error('Use an object path from the Supabase menu-images bucket, such as chicken-adobo.jpg.');
    }
  }

  path = path.replace(/^\/+/, '').replace(new RegExp(`^${BUCKET}/`), '');
  if (!validObjectPath(path)) throw new Error('Enter a valid path for an image uploaded to the menu-images bucket.');
  return path;
}

export function resolveMenuImage(value: string | null | undefined) {
  if (!value) return null;
  try {
    const path = normalizeMenuImagePath(value);
    const origin = projectOrigin();
    return path && origin ? `${origin}${STORAGE_MARKER}${path.split('/').map(encodeURIComponent).join('/')}` : null;
  } catch {
    return null;
  }
}
