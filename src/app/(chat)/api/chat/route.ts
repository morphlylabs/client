import { groq } from '@ai-sdk/groq';
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  streamText,
} from 'ai';
import { after } from 'next/server';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { ChatSDKError } from '~/lib/errors';
import type { ChatMessage } from '~/lib/types';
import { auth } from '~/lib/auth';
import {
  createMessages,
  createStream,
  createChat,
  getChatById,
  getMessagesByChatId,
} from '~/server/db/queries';
import { v4 } from 'uuid';
import { convertToUIMessages } from '../../../../lib/utils';
import { createDocument } from '../../../../lib/ai/tools/create-document';
import { updateDocument } from '../../../../lib/ai/tools/update-document';
import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    requestBody = postRequestBodySchema.parse(await request.json());
  } catch {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message: userMessage,
    }: {
      id: string;
      message: ChatMessage;
    } = requestBody;

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const chat = await getChatById(id);

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await createChat({
        id,
        userId: session.user.id,
        title,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    await createMessages({
      messages: [
        {
          id: userMessage.id,
          chatId: id,
          parts: userMessage.parts,
          role: 'user',
          createdAt: new Date(),
        },
      ],
    });

    const messagesFromDb = await getMessagesByChatId(id);
    const uiMessages = [...convertToUIMessages(messagesFromDb), userMessage];

    const streamId = v4();

    await createStream({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
          messages: convertToModelMessages(uiMessages),
          experimental_activeTools: ['createDocument'],
          tools: {
            createDocument: createDocument({
              session,
              dataStream,
              chatId: id,
            }),
            updateDocument: updateDocument({ session, dataStream }),
          },
        });

        void result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: v4,
      onFinish: async ({ messages }) => {
        await createMessages({
          messages: messages.map(message => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            chatId: id,
          })),
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error(error);
  }
}
