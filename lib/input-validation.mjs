export const MAX_NAME_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_MENU_PRICE = 100000;
export const MAX_ORDER_LINES = 30;
export const MAX_ITEM_QUANTITY = 99;

const MENU_AVAILABILITY = new Set(['Available', 'Sold Out']);

export function normalizeWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return 'Email is required.';
  if (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return '';
}

export function validateMenuInput(input) {
  const errors = {};
  const name = normalizeWhitespace(input.name);
  const category = normalizeWhitespace(input.category);
  const description = String(input.description ?? '').trim();
  const priceText = String(input.price ?? '').trim();
  const price = Number(priceText);
  const stockText = String(input.stockQuantity ?? '').trim();

  if (!name) errors.name = 'Name is required.';
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  if (!category) errors.category = 'Category is required.';
  else if (category.length > 60) errors.category = 'Category must be 60 characters or fewer.';
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(priceText) || !Number.isFinite(price) || price <= 0 || price > MAX_MENU_PRICE) {
    errors.price = `Enter a price from 0.01 to ${MAX_MENU_PRICE.toLocaleString('en-PH')}.`;
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  if (input.stockQuantity !== undefined && (!/^(?:0|[1-9]\d*)$/.test(stockText) || !Number.isSafeInteger(Number(stockText)) || Number(stockText) > 1000000)) {
    errors.stockQuantity = 'Enter a whole number of servings from 0 to 1,000,000.';
  }
  if (!MENU_AVAILABILITY.has(input.availability)) errors.availability = 'Choose a valid availability.';
  return errors;
}

export function validateRegistrationInput(input) {
  const errors = {};
  const name = normalizeWhitespace(input.fullName);
  const mobile = String(input.mobile ?? '').replace(/[\s()-]/g, '');
  const emailError = validateEmail(input.email);

  if (!name) errors.fullName = 'Full name is required.';
  else if (name.length > MAX_NAME_LENGTH) errors.fullName = `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  if (emailError) errors.email = emailError;
  if (!mobile) errors.mobile = 'Mobile number is required.';
  else if (!/^(09|\+639)\d{9}$/.test(mobile)) errors.mobile = 'Enter a valid PH mobile number.';
  if (typeof input.password !== 'string' || input.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (input.password.length > 128) errors.password = 'Password must be 128 characters or fewer.';
  if (!input.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (input.password !== input.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export function validateLoginInput(email, password) {
  const errors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (typeof password !== 'string' || !password) errors.password = 'Password is required.';
  else if (password.length > 128) errors.password = 'Password must be 128 characters or fewer.';
  return errors;
}

export function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'Add at least one item to your order.';
  if (items.length > MAX_ORDER_LINES) return `An order can contain at most ${MAX_ORDER_LINES} different items.`;
  const seen = new Set();
  let totalQuantity = 0;
  for (const item of items) {
    if (!item || typeof item.menu_item_id !== 'string' || !item.menu_item_id.trim()) return 'One or more menu items are invalid.';
    if (seen.has(item.menu_item_id)) return 'The same menu item appears more than once. Please review your bag.';
    seen.add(item.menu_item_id);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) {
      return `Each item quantity must be between 1 and ${MAX_ITEM_QUANTITY}.`;
    }
    totalQuantity += item.quantity;
  }
  if (totalQuantity > 999) return 'An order can contain at most 999 items.';
  return '';
}
