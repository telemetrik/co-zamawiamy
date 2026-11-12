export type PollOption = { id: string; label: string; position: number; votes: number };

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
};

export type CreatePollInput = { operationId: string; question: string; options: string[] };
export type VoteInput = { operationId: string; optionId: string };
export type FieldErrors = Record<string, string>;

export type CityReach = { city: string; countryCode: string | null; sessions: number };
