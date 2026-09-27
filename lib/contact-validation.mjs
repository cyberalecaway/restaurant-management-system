import { validateEmail } from './input-validation.mjs';

export function validateContactInput(input) {
  const errors = {};
  const name = String(input?.name ?? '').trim();
  const email = String(input?.email ?? '');
  const subject = String(input?.subject ?? '').trim();
  const message = String(input?.message ?? '').trim();

  if (!name) errors.name = 'Enter your name.';
  else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.';
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!subject) errors.subject = 'Enter a subject.';
  else if (subject.length > 160) errors.subject = 'Subject must be 160 characters or fewer.';
  if (!message) errors.message = 'Enter your message.';
  else if (message.length > 5000) errors.message = 'Message must be 5,000 characters or fewer.';
  return errors;
}
