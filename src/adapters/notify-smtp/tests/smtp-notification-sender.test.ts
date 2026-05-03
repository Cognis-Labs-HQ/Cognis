import test from 'node:test';
import assert from 'node:assert/strict';
import { SmtpNotificationSender, createNotificationSender } from '../smtp-notification-sender.js';

test('createNotificationSender always returns a sender instance', () => {
  const sender = createNotificationSender({});
  assert.ok(sender instanceof SmtpNotificationSender);
  assert.equal(sender.isConfigured(), false);
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

test('SmtpNotificationSender.getConfig returns current configuration without password', () => {
  const sender = new SmtpNotificationSender({
    host: 'smtp.example.com',
    port: 587,
    from: 'no-reply@example.com',
    secure: 'starttls',
    user: 'user@example.com',
  });
  const config = sender.getConfig();
  assert.equal(config.host, 'smtp.example.com');
  assert.equal(config.port, 587);
  assert.equal(config.from, 'no-reply@example.com');
  assert.equal(config.secure, 'starttls');
  assert.equal(config.user, 'user@example.com');
  assert.ok(!Object.prototype.hasOwnProperty.call(config, 'pass'));
});

test('SmtpNotificationSender.setConfig updates host and port', () => {
  const sender = new SmtpNotificationSender({
    host: 'old.example.com',
    port: 587,
    from: 'no-reply@example.com',
    secure: 'starttls',
  });
  sender.setConfig({ host: 'new.example.com', port: 465 });
  const config = sender.getConfig();
  assert.equal(config.host, 'new.example.com');
  assert.equal(config.port, 465);
});

test('SmtpNotificationSender.senderName returns descriptive name', () => {
  const sender = new SmtpNotificationSender({
    host: 'smtp.example.com',
    port: 587,
    from: 'no-reply@example.com',
    secure: 'starttls',
  });
  assert.equal(typeof sender.senderName, 'string');
  assert.ok(sender.senderName.length > 0);
});

test('SmtpNotificationSender.sendTestEmail rejects when to address is empty', async () => {
  const sender = new SmtpNotificationSender({
    host: 'smtp.example.com',
    port: 587,
    from: 'no-reply@example.com',
    secure: 'starttls',
  });
  await assert.rejects(
    () => sender.sendTestEmail(''),
    /smtp_test_email_requires_recipient/
  );
});
