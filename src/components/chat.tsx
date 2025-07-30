"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { createContext, useEffect, useState, useContext } from "react";
import { Messages } from "~/components/messages";
import { useSearchParams } from "next/navigation";
import { ChatSDKError } from "~/lib/errors";
import type { ChatMessage } from "~/lib/types";
import { useDataStream } from "~/components/data-stream-provider";
import { v4 } from "uuid";
import { useAutoResume } from "~/hooks/use-auto-resume";
import { toast } from "sonner";
import { ChatInput } from "./chat-input";
import { Artifact } from "./artifact";
import type { Asset } from "~/server/db/schema";
import Model from "./model";
import { Button } from "~/components/ui/button";
import { Box, Code, Footprints } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { useCopyToClipboard } from "usehooks-ts";

// Create context for asset selection
const AssetSelectionContext = createContext<{
  setSelectedAsset: (asset: Asset | undefined) => void;
  selectedAsset: Asset | undefined;
} | null>(null);

// Hook to use the asset selection context
export const useAssetSelection = () => {
  const context = useContext(AssetSelectionContext);
  if (!context) {
    throw new Error(
      "useAssetSelection must be used within AssetSelectionProvider",
    );
  }
  return context;
};

export function Chat({
  id,
  initialMessages,
  initialAsset,
  code,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialAsset?: Asset;
  code?: string;
  autoResume: boolean;
}) {
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(
    initialAsset,
  );
  const [, copy] = useCopyToClipboard();

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: v4,
    transport: new DefaultChatTransport({
      api: "/api/chat",
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
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      void sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const copyCode = async () => {
    if (code) {
      await copy(code);
      toast.success("Code copied to clipboard");
    }
  };

  return (
    <AssetSelectionContext.Provider value={{ setSelectedAsset, selectedAsset }}>
      <div
        className={`grid h-[calc(100vh-4rem)] ${selectedAsset ? "grid-cols-4" : "grid-cols-1"}`}
      >
        {selectedAsset && (
          <div className="bg-accent relative col-span-3 h-full">
            <Model src={selectedAsset.fileUrl} />
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
                  <Button variant="ghost" size="icon" className="bg-background">
                    <Box className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Download STL</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="bg-background">
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
        <div className="bg-background col-span-1 flex h-[calc(100vh-4rem)] min-w-0 flex-col border-l">
          <Messages
            chatId={id}
            status={status}
            messages={messages}
            setMessages={setMessages}
            regenerate={regenerate}
          />

          <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
            <ChatInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
            />
          </form>
        </div>

        <Artifact
          chatId={id}
          input={input}
          setInput={setInput}
          status={status}
          stop={stop}
          sendMessage={sendMessage}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
        />
      </div>
    </AssetSelectionContext.Provider>
  );
}
