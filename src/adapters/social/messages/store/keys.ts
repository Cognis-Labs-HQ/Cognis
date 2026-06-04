import { randomBytes } from 'node:crypto';
import type { DbExecutor } from '../../../../gateways/db/reuse/db-executor.js';
import {
  decryptPayload,
  deriveScopedKey,
  encryptPayload,
  getDataEncryptionKey,
} from '../../../../api/reuse/crypto.js';

export async function storeWrappedRoomKey(
  db: DbExecutor,
  roomId: string,
  plaintextKeyHex: string,
): Promise<void> {
  const secret = getDataEncryptionKey();
  const wrapper = await deriveScopedKey(
    `social:messages:room:${roomId}`,
    secret,
  );
  const { iv, ciphertext } = await encryptPayload(wrapper, plaintextKeyHex);
  await db.executeCommand({
    option: 'INSERT',
    table: 'chatroom_keys',
    values: {
      chatroom_id: roomId,
      wrapped_key: ciphertext,
      key_iv: iv,
    },
    conflict: { action: 'update', target: ['chatroom_id'] },
  });
}

export async function getUnwrappedRoomKey(
  db: DbExecutor,
  roomId: string,
): Promise<string | null> {
  const result = await db.executeCommand({
    option: 'SELECT',
    table: 'chatroom_keys',
    columns: ['wrapped_key', 'key_iv'],
    where: [{ column: 'chatroom_id', value: roomId }],
  });
  const row = result.rows?.[0];
  if (!row) {
    return null;
  }

  const secret = getDataEncryptionKey();
  const wrapper = await deriveScopedKey(
    `social:messages:room:${roomId}`,
    secret,
  );
  return decryptPayload(
    wrapper,
    String(row.key_iv),
    String(row.wrapped_key),
  );
}

export async function generateAndStoreRoomKey(
  db: DbExecutor,
  roomId: string,
): Promise<string> {
  const plaintextHex = randomBytes(32).toString('hex');
  await storeWrappedRoomKey(db, roomId, plaintextHex);
  return plaintextHex;
}
