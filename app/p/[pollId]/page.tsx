import { notFound } from "next/navigation";
import { PollScreen } from "@/components/poll-screen";
import { getDb } from "@/db";
import { PollService } from "@/lib/polls";
import { isUuid } from "@/lib/validation";
import { RetryPanel } from "@/components/retry-panel";
import type { Poll } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PollPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params;
  if (!isUuid(pollId)) notFound();
  let poll: Poll | null;
  try { poll = await new PollService(getDb()).get(pollId); }
  catch { console.error("POLL_LOAD_FAILED"); return <RetryPanel />; }
  if (!poll) notFound();
  return <PollScreen initialPoll={poll} />;
}
