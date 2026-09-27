export const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024;

const EXTENSION_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function validateMenuImageFile(file) {
  if (file.size > MAX_MENU_IMAGE_BYTES) return 'Image must be 5 MB or smaller.';
  const extension = file.name.toLowerCase().split('.').pop();
  const expectedMimeType = EXTENSION_MIME_TYPES[extension];
  if (!expectedMimeType || (file.type && file.type !== expectedMimeType)) {
    return 'Please upload a JPG, PNG, or WEBP image.';
  }
  return '';
}

export function getMenuImageContentType(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  return EXTENSION_MIME_TYPES[extension];
}

export function createMenuImageObjectPath(menuItemId, file) {
  const validationError = validateMenuImageFile(file);
  if (validationError) throw new Error(validationError);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(menuItemId)) {
    throw new Error('A valid menu item ID is required for the image path.');
  }
  const extension = file.name.toLowerCase().split('.').pop();
  return `${menuItemId}/${globalThis.crypto.randomUUID()}.${extension}`;
}