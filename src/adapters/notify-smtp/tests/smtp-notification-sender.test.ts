import test from 'node:test';
import assert from 'node:assert/strict';
import { SmtpNotificationSender, createNotificationSender } from '../smtp-notification-sender.js';

test('createNotificationSender returns null when COGNIS_SMTP_HOST is not set', () => {
  const sender = createNotificationSender({});
  assert.equal(sender, null);
});

test('createNotificationSender returns a sender when host is configured', () => {
  const sender = createNotificationSender({ COGNIS_SMTP_HOST: 'mail.example.com' });
  assert.ok(sender instanceof SmtpNotificationSender);
  assert.equal(sender.senderId, 'smtp');
});

test('createNotificationSender applies defaults for port, secure mode, and from address', () => {
  const env = { COGNIS_SMTP_HOST: 'smtp.example.com' };
  const sender = createNotificationSender(env);
  assert.ok(sender !== null);
  assert.equal(sender.senderId, 'smtp');
});

test('createNotificationSender accepts explicit port, secure mode, and credentials', () => {
  const env = {
    COGNIS_SMTP_HOST: 'smtp.example.com',
    COGNIS_SMTP_PORT: '465',
    COGNIS_SMTP_SECURE: 'tls',
    COGNIS_SMTP_FROM: 'no-reply@example.com',
    COGNIS_SMTP_USER: 'user@example.com',
    COGNIS_SMTP_PASS: 's3cret',
  };
  const sender = createNotificationSender(env);
  assert.ok(sender instanceof SmtpNotificationSender);
  assert.equal(sender.senderId, 'smtp');
});

test('SmtpNotificationSender.send rejects when recipientEmail is absent', async () => {
  const sender = new SmtpNotificationSender({
    host: 'smtp.example.com',
    port: 587,
    from: 'no-reply@example.com',
    secure: 'starttls',
  });

  await assert.rejects(
    () => sender.send({
      category: 'account_alert',
      recipientUsername: 'alice',
      subject: 'Test',
      body: 'Hello',
    }),
    /smtp_sender_requires_recipient_email/
  );
});
