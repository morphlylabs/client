'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { ChatSDKError } from '~/lib/errors';
import type { ChatMessage } from '~/lib/types';
import { useDataStream } from '~/stores/chat.store';
import { v4 } from 'uuid';
import { useAutoResume } from '~/hooks/use-auto-resume';
import { toast } from 'sonner';
import Model from './model';
import { Button } from '~/components/ui/button';
import { Box, Code, Footprints, MicIcon, X } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '~/components/ui/tooltip';
import { useCopyToClipboard } from 'usehooks-ts';
import { downloadFileFromUrl } from '~/lib/utils';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputSubmit,
} from './ai-elements/prompt-input';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './ai-elements/conversation';
import { MessageContent, Message, MessageAvatar } from './ai-elements/message';
import { DocumentToolResult } from './document';
import { Suggestion, Suggestions } from './ai-elements/suggestion';
import { Separator } from '~/components/ui/separator';
import { useChatStore, useSelectedDocument } from '~/stores/chat.store';
import type { Document } from '~/server/db/schema';

const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus' },
];

const suggestions = [
  'Create a lamp that has a base and a shade',
  'Design a comfortable chair with armrests and cushions',
  'Create a decorative vase with intricate patterns and textures',
  'Build a simple house with walls, roof, windows, and a door',
];

export function Chat({
  id,
  initialMessages,
  initialDocuments,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialDocuments: Document[];
  autoResume: boolean;
}) {
  const { processDataStreamUpdate } = useDataStream();
  const { setChatId, setDocuments } = useChatStore();

  // Set initial documents when component loads
  useEffect(() => {
    setChatId(id);
    setDocuments(initialDocuments ?? []);
  }, [id, initialDocuments, setChatId, setDocuments]);

  const [text, setText] = useState<string>('');
  const [model, setModel] = useState<string>(models[0]!.id);
  const selectedDocument = useSelectedDocument();
  const [, copy] = useCopyToClipboard();

  const { messages, setMessages, sendMessage, status, resumeStream } =
    useChat<ChatMessage>({
      id,
      messages: initialMessages,
      experimental_throttle: 100,
      generateId: v4,
      transport: new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest({ messages, id, body }) {
          return {
            body: {
              id,
              message: messages.at(-1),
              ...body,
            },
          };
        },
      }),
      onData: dataPart => {
        processDataStreamUpdate(dataPart);
      },
      onError: error => {
        if (error instanceof ChatSDKError) {
          toast.error(error.message);
        } else {
          console.error('Chat error:', error);
          toast.error('An error occurred during chat');
        }
      },
    });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendMessage({ text: text });
    setText('');
    window.history.replaceState({}, '', `/chat/${id}`);
  };

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage({ text: suggestion });
    setText('');
    window.history.replaceState({}, '', `/chat/${id}`);
  };

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const copyCode = async () => {
    if (selectedDocument?.content) {
      try {
        await copy(selectedDocument.content);
        toast.success('Code copied to clipboard');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to copy code';
        console.error('Failed to copy code:', errorMessage);
        toast.error('Failed to copy code to clipboard');
      }
    }
  };

  const downloadSTL = async () => {
    if (selectedDocument?.fileUrl) {
      try {
        const filename = `model.stl`;
        await downloadFileFromUrl(selectedDocument.fileUrl, filename);
        toast.success(`STL file downloaded successfully`);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to download STL file`;
        console.error(`Failed to download STL file:`, errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const downloadSTP = async () => {
    // TODO: Implement STP download when STP files are available
    toast.info('STP download not yet implemented');
  };

  return (
    <div
      className={
        selectedDocument?.fileUrl
          ? 'grid h-[calc(100vh-4rem)] grid-cols-4'
          : 'flex h-[calc(100vh-4rem)] justify-center'
      }
    >
      {selectedDocument?.fileUrl && (
        <div className="bg-accent relative col-span-3 h-full border-r">
          <Model src={selectedDocument.fileUrl} />
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background"
                  onClick={copyCode}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Copy code</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background"
                  onClick={downloadSTL}
                >
                  <Box className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Download STL</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background"
                  onClick={downloadSTP}
                >
                  <Footprints className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Download STP</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
      <div
        className={`bg-background flex h-[calc(100vh-4rem)] max-w-3xl min-w-0 flex-col ${selectedDocument?.fileUrl ? 'col-span-1' : ''}`}
      >
        <Conversation>
          <ConversationContent>
            {messages.map(message => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map(part => {
                    switch (part.type) {
                      case 'text':
                        return <p key={part.text}>{part.text}</p>;
                      case 'tool-createDocument':
                        if (part.state === 'input-available') {
                          return (
                            <p key={part.toolCallId}>Generating asset...</p>
                          );
                        } else if (part.state === 'output-available') {
                          return (
                            <DocumentToolResult
                              key={part.toolCallId}
                              result={part.output}
                            />
                          );
                        } else if (part.state === 'output-error') {
                          return (
                            <div key={part.toolCallId}>
                              <X className="mr-1 inline h-4 w-4 text-red-500" />
                              An error occurred. Please try again.
                            </div>
                          );
                        }
                        return null;
                      case 'tool-updateDocument':
                        if (part.state === 'input-available') {
                          return <p key={part.toolCallId}>Updating asset...</p>;
                        } else if (
                          part.state === 'output-available' &&
                          part.output.id
                        ) {
                          return (
                            <DocumentToolResult
                              key={part.toolCallId}
                              result={part.output}
                            />
                          );
                        } else if (part.state === 'output-error') {
                          return (
                            <div key={part.toolCallId}>
                              <X className="mr-1 inline h-4 w-4 text-red-500" />
                              An error occurred. Please try again.
                            </div>
                          );
                        }
                        return null;
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
                <MessageAvatar
                  src={
                    message.role === 'user'
                      ? 'https://github.com/shadcn.png'
                      : ''
                  }
                  name="AI"
                />
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="p-2">
          {!selectedDocument?.fileUrl && (
            <Suggestions className="mb-2">
              {suggestions.map(suggestion => (
                <Suggestion
                  key={suggestion}
                  onClick={handleSuggestionClick}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          )}

          <PromptInput onSubmit={handleSubmit} className="max-w-3xl">
            <PromptInputTextarea
              onChange={e => setText(e.target.value)}
              value={text}
            />
            <Separator />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton>
                  <MicIcon size={16} />
                </PromptInputButton>

                <PromptInputModelSelect
                  onValueChange={value => {
                    setModel(value);
                  }}
                  value={model}
                >
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {models.map(model => (
                      <PromptInputModelSelectItem
                        key={model.id}
                        value={model.id}
                      >
                        {model.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>
              </PromptInputTools>
              <PromptInputSubmit disabled={!text} status={status} />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
