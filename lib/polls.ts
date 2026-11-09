import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import { polls, options, votes } from "../db/schema";
import type { CreatePollInput, Poll, VoteInput } from "./types";
import { AppError, optionKey } from "./validation";

export class PollService {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async create(input: CreatePollInput): Promise<string> {
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ question: input.question, options: input.options })).digest("hex");
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(polls).values({
        creationToken: input.operationId, requestHash, question: input.question,
      }).onConflictDoNothing({ target: polls.creationToken }).returning({ id: polls.id });
      if (!created) {
        const [existing] = await tx.select().from(polls).where(eq(polls.creationToken, input.operationId));
        if (!existing || existing.requestHash !== requestHash) {
          throw new AppError("Ta operacja dotyczyła innych danych. Odśwież stronę, aby zacząć nowe głosowanie.", 409);
        }
        return existing.id;
      }
      await tx.insert(options).values(input.options.map((label, position) => ({
        pollId: created.id, label, labelKey: optionKey(label), position,
      })));
      return created.id;
    });
  }

  async get(pollId: string): Promise<Poll | null> {
    // Jeden SELECT daje spójny obraz wyników nawet przy równoczesnych głosach.
    const rows = await this.db.select({
      id: polls.id,
      question: polls.question,
      optionId: options.id,
      label: options.label,
      position: options.position,
      votes: sql<number>`count(${votes.id})::integer`,
    }).from(polls)
      .innerJoin(options, eq(options.pollId, polls.id))
      .leftJoin(votes, eq(votes.optionId, options.id))
      .where(eq(polls.id, pollId))
      .groupBy(polls.id, options.id)
      .orderBy(asc(options.position));
    if (!rows.length) return null;
    return {
      id: rows[0].id,
      question: rows[0].question,
      options: rows.map((row) => ({ id: row.optionId, label: row.label, position: row.position, votes: row.votes })),
      totalVotes: rows.reduce((total, row) => total + row.votes, 0),
    };
  }

  async vote(pollId: string, input: VoteInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [option] = await tx.select({ id: options.id }).from(options)
        .where(and(eq(options.id, input.optionId), eq(options.pollId, pollId)));
      if (!option) throw new AppError("Nie znaleźliśmy tej propozycji w głosowaniu. Odśwież stronę.", 404);
      const [saved] = await tx.insert(votes).values({ id: input.operationId, optionId: input.optionId })
        .onConflictDoNothing({ target: votes.id }).returning({ id: votes.id });
      if (!saved) {
        const [existing] = await tx.select().from(votes).where(eq(votes.id, input.operationId));
        if (!existing || existing.optionId !== input.optionId) {
          throw new AppError("Ta operacja zapisała już inny głos. Odśwież stronę.", 409);
        }
      }
    });
  }
}
