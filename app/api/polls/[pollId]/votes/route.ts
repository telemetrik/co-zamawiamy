import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { errorResponse, readJson } from "@/lib/http";
import { PollService } from "@/lib/polls";
import { logVoteRecorded } from "@/lib/posthog-logs";
import { AppError, isUuid, validateVote } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ pollId: string }> }) {
  try {
    const { pollId } = await context.params;
    if (!isUuid(pollId)) throw new AppError("Nie znaleźliśmy tego głosowania.", 404);
    const input = validateVote(await readJson(request));
    const service = new PollService(getDb());
    await service.vote(pollId, input);
    logVoteRecorded();
    return NextResponse.json({ poll: await service.get(pollId), optionId: input.optionId });
  } catch (error) { return errorResponse(error); }
}
