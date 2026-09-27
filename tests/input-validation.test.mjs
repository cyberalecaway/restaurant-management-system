import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  normalizeWhitespace,
  validateEmail,
  validateLoginInput,
  validateMenuInput,
  validateOrderItems,
  validateRegistrationInput,
} from '../lib/input-validation.mjs';
import { safeNextPath } from '../lib/safe-next-path.mjs';
import { getRoleRedirect, isAdminOnlyRoute, isCustomerOnlyRoute, isRmsRoute } from '../lib/role-routing.mjs';
import { getInventoryStatus } from '../lib/inventory-health.mjs';
import { validateContactInput } from '../lib/contact-validation.mjs';
import { createMenuImageObjectPath, MAX_MENU_IMAGE_BYTES, validateMenuImageFile } from '../lib/menu-image-upload.mjs';

test('normalizes user-entered email and names before storage', () => {
  assert.equal(normalizeEmail('  HARVEY@Example.COM '), 'harvey@example.com');
  assert.equal(normalizeWhitespace('  Maria   Clara  '), 'Maria Clara');
});

test('rejects malformed and overlong email input', () => {
  assert.match(validateEmail('not-an-email'), /valid email/);
  assert.match(validateEmail(`${'a'.repeat(250)}@x.co`), /valid email/);
  assert.equal(validateEmail('  HBA@Example.ph  '), '');
});

test('contact form requires all fields and validates the email address', () => {
  assert.deepEqual(validateContactInput({}), {
    name: 'Enter your name.',
    email: 'Email is required.',
    subject: 'Enter a subject.',
    message: 'Enter your message.',
  });
  assert.equal(validateContactInput({ name: 'Maria Clara', email: 'not-an-email', subject: 'Order question', message: 'Hello' }).email, 'Enter a valid email address.');
  assert.deepEqual(validateContactInput({ name: 'Maria Clara', email: 'maria@example.ph', subject: 'Order question', message: 'Hello' }), {});
});

test('validates menu data from database-defined categories', () => {
  assert.equal(validateMenuInput({ name: ' ', category: '', price: 'NaN', description: '', availability: 'Available' }).name, 'Name is required.');
  assert.ok(validateMenuInput({ name: 'Dish', category: '', price: '-2', description: '', availability: 'Available' }).category);
  assert.ok(validateMenuInput({ name: 'Dish', category: 'Main Course', price: '100000.01', description: '', availability: 'Available' }).price);
  assert.deepEqual(validateMenuInput({ name: '  Chicken Adobo  ', category: 'Main Course', price: '199.50', description: 'House recipe', availability: 'Available' }), {});
  assert.deepEqual(validateMenuInput({ name: '  Pork Sisig ', category: 'Pork', price: '225', description: '', availability: 'Available' }), {});
});

test('registration rejects invalid phone numbers and oversized passwords', () => {
  const base = { fullName: 'Maria Clara', email: 'maria@example.ph', mobile: '123', password: 'secret123', confirmPassword: 'secret123' };
  assert.ok(validateRegistrationInput(base).mobile);
  assert.ok(validateRegistrationInput({ ...base, mobile: '09171234567', password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) }).password);
  assert.deepEqual(validateRegistrationInput({ ...base, mobile: '09171234567' }), {});
});

test('login guards empty and oversized values', () => {
  assert.ok(validateLoginInput('', '').email);
  assert.ok(validateLoginInput('a@b.ph', 'x'.repeat(129)).password);
  assert.deepEqual(validateLoginInput('a@b.ph', 'password'), {});
});

test('order validation rejects duplicates, bad quantities, and excessive input', () => {
  assert.match(validateOrderItems([]), /at least one/);
  assert.match(validateOrderItems([{ menu_item_id: 'dish-1', quantity: 1 }, { menu_item_id: 'dish-1', quantity: 2 }]), /more than once/);
  assert.match(validateOrderItems([{ menu_item_id: 'dish-1', quantity: 100 }]), /between 1 and 99/);
  assert.match(validateOrderItems(Array.from({ length: 31 }, (_, i) => ({ menu_item_id: `dish-${i}`, quantity: 1 }))), /at most 30/);
  assert.equal(validateOrderItems([{ menu_item_id: 'dish-1', quantity: 2 }]), '');
});

test('redirect targets stay on this site', () => {
  assert.equal(safeNextPath('/orders?view=open', 'https://hba.example'), '/orders?view=open');
  assert.equal(safeNextPath('//evil.example/login', 'https://hba.example'), '/');
  assert.equal(safeNextPath('/\\evil.example/login', 'https://hba.example'), '/');
  assert.equal(safeNextPath('https://evil.example/login', 'https://hba.example'), '/');
});

test('role routing sends only active admins to the RMS and blocks customer or staff routes', () => {
  assert.equal(getRoleRedirect('CUSTOMER', 'ACTIVE', null), '/');
  assert.equal(getRoleRedirect('CUSTOMER', 'ACTIVE', '/dashboard'), '/');
  assert.equal(getRoleRedirect('CUSTOMER', 'ACTIVE', '/user-management'), '/');
  assert.equal(getRoleRedirect('STAFF', 'ACTIVE', '/orders'), '/orders');
  assert.equal(getRoleRedirect('STAFF', 'ACTIVE', null), '/dashboard');
  assert.equal(getRoleRedirect('STAFF', 'ACTIVE', '/settings'), '/dashboard');
  assert.equal(getRoleRedirect('CUSTOMER', 'ACTIVE', '/my-orders'), '/my-orders');
  assert.equal(getRoleRedirect('ADMIN', 'ACTIVE', null), '/dashboard');
  assert.equal(getRoleRedirect('ADMIN', 'ACTIVE', '/reports?range=week'), '/reports?range=week');
  assert.equal(getRoleRedirect('ADMIN', 'INACTIVE', null), null);
  assert.equal(isAdminOnlyRoute('/users'), true);
  assert.equal(isAdminOnlyRoute('/menu'), false);
  assert.equal(isAdminOnlyRoute('/settings'), true);
  assert.equal(isRmsRoute('/inventory'), true);
  assert.equal(isCustomerOnlyRoute('/my-orders'), true);
  assert.equal(isAdminOnlyRoute('/'), false);
});

test('inventory status is calculated from live quantity and thresholds', () => {
  assert.equal(getInventoryStatus({ quantityOnHand: 0, minimumLevel: 2, reorderLevel: 5 }).key, 'out');
  assert.equal(getInventoryStatus({ quantityOnHand: 2, minimumLevel: 2, reorderLevel: 5 }).key, 'critical');
  assert.equal(getInventoryStatus({ quantityOnHand: 4, minimumLevel: 2, reorderLevel: 5 }).key, 'low');
  assert.equal(getInventoryStatus({ quantityOnHand: 6, minimumLevel: 2, reorderLevel: 5 }).key, 'ok');
  assert.equal(getInventoryStatus({ quantityOnHand: -1, minimumLevel: 2, reorderLevel: 5 }).key, 'unknown');
});

test('menu photos enforce supported formats and the 5 MB limit', () => {
  assert.equal(validateMenuImageFile({ name: 'chicken-adobo.jpg', type: 'image/jpeg', size: MAX_MENU_IMAGE_BYTES }), '');
  assert.equal(validateMenuImageFile({ name: 'dish.webp', type: 'image/webp', size: 1 }), '');
  assert.equal(validateMenuImageFile({ name: 'dish.svg', type: 'image/svg+xml', size: 1 }), 'Please upload a JPG, PNG, or WEBP image.');
  assert.equal(validateMenuImageFile({ name: 'dish.jpg', type: 'image/png', size: 1 }), 'Please upload a JPG, PNG, or WEBP image.');
  assert.equal(validateMenuImageFile({ name: 'large.png', type: 'image/png', size: MAX_MENU_IMAGE_BYTES + 1 }), 'Image must be 5 MB or smaller.');
});

test('menu photo paths are unique and do not include user filenames', () => {
  const itemId = '4f9b8ae2-0035-4a53-9109-a425e20ef183';
  const file = { name: '../../chicken-adobo.jpeg', type: 'image/jpeg', size: 1 };
  const firstPath = createMenuImageObjectPath(itemId, file);
  const secondPath = createMenuImageObjectPath(itemId, file);
  assert.match(firstPath, new RegExp(`^${itemId}/[0-9a-f-]{36}\\.jpeg$`));
  assert.notEqual(firstPath, secondPath);
  assert.throws(() => createMenuImageObjectPath('../other', file), /valid menu item ID/);
});
