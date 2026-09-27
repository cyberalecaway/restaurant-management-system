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

test('normalizes user-entered email and names before storage', () => {
  assert.equal(normalizeEmail('  HARVEY@Example.COM '), 'harvey@example.com');
  assert.equal(normalizeWhitespace('  Maria   Clara  '), 'Maria Clara');
});

test('rejects malformed and overlong email input', () => {
  assert.match(validateEmail('not-an-email'), /valid email/);
  assert.match(validateEmail(`${'a'.repeat(250)}@x.co`), /valid email/);
  assert.equal(validateEmail('  HBA@Example.ph  '), '');
});

test('rejects invalid menu fields and accepts a valid item', () => {
  assert.equal(validateMenuInput({ name: ' ', category: 'Unknown', price: 'NaN', description: '', availability: 'Available' }).name, 'Name is required.');
  assert.ok(validateMenuInput({ name: 'Dish', category: 'Unknown', price: '-2', description: '', availability: 'Available' }).category);
  assert.ok(validateMenuInput({ name: 'Dish', category: 'Main Course', price: '100000.01', description: '', availability: 'Available' }).price);
  assert.deepEqual(validateMenuInput({ name: '  Chicken Adobo  ', category: 'Main Course', price: '199.50', description: 'House recipe', availability: 'Available' }), {});
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
