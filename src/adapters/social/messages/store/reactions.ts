import type { DbExecutor } from '../../../../gateways/db/reuse/db-executor.js';
import { rowToReaction } from './row-mappers.js';
import type { MessageReactionRow } from './types.js';

export async function setMessageReaction(
  db: DbExecutor,
  roomId: string,
  messageId: string,
  accountId: string,
  emoji: string,
  active: boolean,
): Promise<void> {
  if (!active) {
    await db.executeCommand({
      option: 'DELETE',
      table: 'chat_message_reactions',
      where: [
        { column: 'chatroom_id', value: roomId },
        { column: 'message_id', value: messageId },
        { column: 'account_id', value: accountId },
        { column: 'emoji', value: emoji },
      ],
    });
    return;
  }

  await db.executeCommand({
    option: 'INSERT',
    table: 'chat_message_reactions',
    values: {
      chatroom_id: roomId,
      message_id: messageId,
      account_id: accountId,
      emoji,
      created_at: new Date().toISOString(),
    },
    conflict: { action: 'ignore' },
  });
}

export async function hasMessageReaction(
  db: DbExecutor,
  roomId: string,
  messageId: string,
  accountId: string,
  emoji: string,
): Promise<boolean> {
  const result = await db.executeCommand({
    option: 'SELECT',
    table: 'chat_message_reactions',
    where: [
      { column: 'chatroom_id', value: roomId },
      { column: 'message_id', value: messageId },
      { column: 'account_id', value: accountId },
      { column: 'emoji', value: emoji },
    ],
    limit: 1,
  });
  return Boolean(result.rows?.[0]);
}

export async function listMessageReactions(
  db: DbExecutor,
  roomId: string,
): Promise<MessageReactionRow[]> {
  const result = await db.executeCommand({
    option: 'SELECT',
    table: 'chat_message_reactions',
    where: [{ column: 'chatroom_id', value: roomId }],
    orderBy: [{ column: 'created_at', direction: 'ASC' }],
  });
  return (result.rows ?? []).map((row) => rowToReaction(row));
}
