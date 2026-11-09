import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { errorResponse, readJson } from "@/lib/http";
import { PollService } from "@/lib/polls";
import { validateCreatePoll } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = validateCreatePoll(await readJson(request));
    const pollId = await new PollService(getDb()).create(input);
    return NextResponse.json({ pollId }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
