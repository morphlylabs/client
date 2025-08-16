import 'server-only';

import { db } from './index';
import { chat, document, message, stream, type Message } from './schema';
import type { ArtifactKind } from '~/lib/artifacts/server';
import { ChatSDKError } from '~/lib/errors';
import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';
import { requireUser } from '~/lib/require-user';

export const getChatById = async (id: string) => {
  await requireUser();

  return await db.query.chat.findFirst({
    where: (chat, { eq }) => eq(chat.id, id),
    with: {
      messages: {
        orderBy: (message, { asc }) => asc(message.createdAt),
      },
      stream: true,
      documents: {
        orderBy: (document, { asc }) => asc(document.createdAt),
      },
    },
  });
};

export const getChatsByUserId = async (userId: string) => {
  await requireUser();

  return await db.query.chat.findMany({
    where: (chat, { eq }) => eq(chat.userId, userId),
    orderBy: (chat, { desc }) => desc(chat.createdAt),
  });
};

export const createChat = async ({
  id = v4(),
  createdAt = new Date(),
  userId,
  title,
}: {
  id?: string;
  createdAt?: Date;
  userId: string;
  title: string;
}) => {
  await requireUser();

  return await db.insert(chat).values({ id, createdAt, userId, title });
};

export const getMessagesByChatId = async (chatId: string) => {
  await requireUser();

  return await db.query.message.findMany({
    where: (message, { eq }) => eq(message.chatId, chatId),
    orderBy: (message, { asc }) => asc(message.createdAt),
  });
};

export const createMessages = async ({ messages }: { messages: Message[] }) => {
  await requireUser();

  return await db.insert(message).values(messages);
};

export const createStream = async ({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) => {
  await requireUser();

  return await db.insert(stream).values({ id: streamId, chatId });
};

export const createDocument = async ({
  id = v4(),
  chatId,
  title,
  kind,
  content,
  userId,
}: {
  id?: string;
  chatId: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) => {
  try {
    return await db
      .insert(document)
      .values({
        id,
        chatId,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
};

export const getDocumentsById = async (id: string) => {
  await requireUser();

  return await db.query.document.findMany({
    where: (document, { eq }) => eq(document.id, id),
    orderBy: (document, { asc }) => asc(document.createdAt),
  });
};

export const getDocumentById = async (id: string) => {
  await requireUser();

  return await db.query.document.findFirst({
    where: (document, { eq }) => eq(document.id, id),
  });
};

export const setDocumentUrl = async ({
  id,
  url,
}: {
  id: string;
  url: string;
}) => {
  await requireUser();

  return await db
    .update(document)
    .set({ fileUrl: url })
    .where(eq(document.id, id))
    .returning();
};
