import 'server-only';

import { codeDocumentHandler } from '~/artifacts/code/server';
import type { Document } from '~/server/db/schema';
import { createDocument } from '~/server/db/queries';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '~/lib/types';
import type { Session } from '~/lib/auth';
import { executeDocumentCodeAndPopulateUrl } from '../../app/(chat)/actions';
import { v4 } from 'uuid';

export type ArtifactKind = 'code';

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  chatId: string;
  title: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<Document>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<Document>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        chatId: args.chatId,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.user.id) {
        await createDocument({
          id: args.id,
          chatId: args.chatId,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return await executeDocumentCodeAndPopulateUrl(args.id);
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
      });

      const id = v4();

      if (args.session?.user.id) {
        await createDocument({
          id,
          chatId: args.document.chatId,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return await executeDocumentCodeAndPopulateUrl(id);
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  codeDocumentHandler,
];

export const artifactKinds = ['code'] as const;
