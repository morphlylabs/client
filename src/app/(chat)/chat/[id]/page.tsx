import { Chat } from "../../../../components/chat";
import { DataStreamHandler } from "../../../../components/data-stream-handler";
import { convertToUIMessages } from "../../../../lib/utils";
import { getChat } from "../../actions";
import { auth } from "../../../../lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDocumentById } from "../../../../server/db/queries";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const chat = await getChat(id);

  const uiMessages = convertToUIMessages(chat.messages);

  let latestDocumentId: string | undefined = undefined;

  for (const message of uiMessages) {
    for (const part of message?.parts ?? []) {
      if (part.type === "tool-createDocument") {
        if (part.state === "output-available") {
          latestDocumentId = part.output.id;
        }
      }
    }
  }

  const latestDocument = latestDocumentId
    ? await getDocumentById(latestDocumentId)
    : undefined;

  const stlAsset = latestDocument?.assets.find(
    (asset) => asset.format === "stl",
  );

  const code = latestDocument?.content ?? undefined;

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={uiMessages}
        initialAsset={stlAsset}
        code={code}
        autoResume={true}
      />
      <DataStreamHandler />
    </>
  );
}
