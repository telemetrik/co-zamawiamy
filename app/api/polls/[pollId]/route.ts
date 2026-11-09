import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/http";
import { PollService } from "@/lib/polls";
import { AppError, isUuid } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ pollId: string }> }) {
  try {
    const { pollId } = await context.params;
    if (!isUuid(pollId)) throw new AppError("Nie znaleźliśmy tego głosowania.", 404);
    const poll = await new PollService(getDb()).get(pollId);
    if (!poll) throw new AppError("Nie znaleźliśmy tego głosowania.", 404);
    return NextResponse.json({ poll }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
