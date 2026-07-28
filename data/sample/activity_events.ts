import {
  ACTION_TYPES,
  CHANNELS,
  STATUSES,
  MONETARY_ACTIONS,
  type ActionType,
  type Channel,
  type Status,
} from "../../src/query/schema";

/**
 * Synthetic, internally consistent operational events.
 *
 * Deterministic: a fixed seed produces the same dataset every run, so the
 * verify script can assert exact answers. The generator also injects a few
 * anchor events (a clear "largest transfer this month", a larger transfer LAST
 * month so the month filter actually matters, and a dual-control violation for
 * the hybrid demo) and then ASSERTS its own internal consistency before
 * returning. If an assertion fails, the data is wrong and load must not proceed.
 *
 * All values are synthetic. Amounts are in MINOR UNITS (cents).
 */

export interface ActivityEvent {
  _id: string;
  userId: string;
  userName: string;
  action: ActionType;
  amount: number;
  channel: Channel;
  status: Status;
  timestamp: Date;
}

const USERS = [
  { userId: "user_01", userName: "Priya Nair" },
  { userId: "user_02", userName: "Marcus Feld" },
  { userId: "user_03", userName: "Sofia Reyes" },
  { userId: "user_04", userName: "Daniel Okoro" },
  { userId: "user_05", userName: "Hana Kim" },
] as const;

const SEED = 424242;
const FILLER_COUNT = 55;
const DAY_MS = 86_400_000;

/** The anchor "largest transfer this month" amount (25,000.00). Unique max. */
const LARGEST_THIS_MONTH = 2_500_000;
/** A larger transfer dated last month, to prove the "this month" filter works. */
const LARGER_LAST_MONTH = 3_000_000;
/** Filler monetary amounts stay well below the anchor so it stays the max. */
const FILLER_MONETARY_MAX = 900_000;

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pick from empty array");
  return item;
}

function startOfMonthUTC(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

/**
 * Build the full event set. Not yet id-assigned; ids are assigned after sorting
 * by timestamp so ids read chronologically.
 */
function buildEvents(now: Date): ActivityEvent[] {
  const rng = mulberry32(SEED);
  const startOfMonth = startOfMonthUTC(now);
  const events: Array<Omit<ActivityEvent, "_id">> = [];

  // Filler events across the last 45 days.
  for (let i = 0; i < FILLER_COUNT; i++) {
    const user = pick(rng, USERS);
    const action = pick(rng, ACTION_TYPES);
    const isMoney = MONETARY_ACTIONS.has(action);
    const amount = isMoney ? Math.floor(rng() * FILLER_MONETARY_MAX) : 0;
    const timestamp = new Date(now.getTime() - Math.floor(rng() * 45) * DAY_MS - Math.floor(rng() * DAY_MS));
    events.push({
      userId: user.userId,
      userName: user.userName,
      action,
      amount,
      channel: pick(rng, CHANNELS),
      status: pick(rng, STATUSES),
      timestamp,
    });
  }

  // Anchor 1: the largest transfer THIS month (successful). Dated within this
  // month and no later than now. Clamped so it stays inside the month window.
  const thisMonthTs = new Date(Math.max(startOfMonth + 3600_000, now.getTime() - 2 * DAY_MS));
  const priya = USERS[0];
  events.push({
    userId: priya.userId,
    userName: priya.userName,
    action: "TRANSFER_APPROVED",
    amount: LARGEST_THIS_MONTH,
    channel: "BRANCH",
    status: "SUCCESS",
    timestamp: thisMonthTs,
  });

  // Anchor 2: a larger transfer dated LAST month (so "this month" filtering matters).
  const lastMonthTs = new Date(startOfMonth - 5 * DAY_MS);
  const marcus = USERS[1];
  events.push({
    userId: marcus.userId,
    userName: marcus.userName,
    action: "TRANSFER_APPROVED",
    amount: LARGER_LAST_MONTH,
    channel: "BRANCH",
    status: "SUCCESS",
    timestamp: lastMonthTs,
  });

  // Anchor 3: a dual-control VIOLATION for the hybrid demo. Sofia both initiates
  // and approves the same high-value transfer (>= 1,000,000 minor units).
  const sofia = USERS[2];
  const violationAmount = 1_800_000;
  const violationInitTs = new Date(Math.max(startOfMonth + 3600_000, now.getTime() - 6 * DAY_MS));
  events.push({
    userId: sofia.userId,
    userName: sofia.userName,
    action: "TRANSFER_INITIATED",
    amount: violationAmount,
    channel: "API",
    status: "SUCCESS",
    timestamp: violationInitTs,
  });
  events.push({
    userId: sofia.userId,
    userName: sofia.userName,
    action: "TRANSFER_APPROVED",
    amount: violationAmount,
    channel: "API",
    status: "SUCCESS",
    timestamp: new Date(violationInitTs.getTime() + 60_000),
  });

  // Sort chronologically and assign stable ids.
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return events.map((e, i) => ({ _id: `evt_${String(i + 1).padStart(4, "0")}`, ...e }));
}

export interface Expectations {
  totalEvents: number;
  largestTransferThisMonth: { _id: string; amount: number; userId: string; userName: string };
  focusUser: { userId: string; userName: string; totalSuccessfulTransferMinorUnits: number };
  dualControlViolation: { initiatedId: string; approvedId: string; userId: string };
}

/** Sum of successful monetary transfers for a user across all data. */
function successfulTransferTotal(events: ActivityEvent[], userId: string): number {
  return events
    .filter((e) => e.userId === userId && e.status === "SUCCESS" && MONETARY_ACTIONS.has(e.action))
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Derive the verifiable facts from a generated event set. */
export function computeExpectations(events: ActivityEvent[], now: Date = new Date()): Expectations {
  const startOfMonth = startOfMonthUTC(now);

  const thisMonthTransfers = events.filter(
    (e) => MONETARY_ACTIONS.has(e.action) && e.timestamp.getTime() >= startOfMonth,
  );
  let largest = thisMonthTransfers[0];
  for (const e of thisMonthTransfers) {
    if (!largest || e.amount > largest.amount) largest = e;
  }
  if (!largest) throw new Error("No transfers this month; generator invariant broken.");

  const focus = USERS[0];
  const init = events.find((e) => e.action === "TRANSFER_INITIATED" && e.amount === 1_800_000);
  const appr = events.find((e) => e.action === "TRANSFER_APPROVED" && e.amount === 1_800_000);
  if (!init || !appr) throw new Error("Dual-control violation anchor missing; generator broken.");

  return {
    totalEvents: events.length,
    largestTransferThisMonth: {
      _id: largest._id,
      amount: largest.amount,
      userId: largest.userId,
      userName: largest.userName,
    },
    focusUser: {
      userId: focus.userId,
      userName: focus.userName,
      totalSuccessfulTransferMinorUnits: successfulTransferTotal(events, focus.userId),
    },
    dualControlViolation: { initiatedId: init._id, approvedId: appr._id, userId: init.userId },
  };
}

/**
 * Generate the synthetic events and assert internal consistency. Throws if the
 * data is not self-consistent, so callers never load bad data.
 */
export function generateActivityEvents(now: Date = new Date()): ActivityEvent[] {
  const events = buildEvents(now);
  const exp = computeExpectations(events, now);

  // Invariant 1: the anchor really is the largest transfer this month.
  if (exp.largestTransferThisMonth.amount !== LARGEST_THIS_MONTH) {
    throw new Error(
      `Largest transfer this month is ${exp.largestTransferThisMonth.amount}, expected ${LARGEST_THIS_MONTH}.`,
    );
  }

  // Invariant 2: per-user totals sum to the global successful-transfer total.
  const perUser = USERS.reduce((sum, u) => sum + successfulTransferTotal(events, u.userId), 0);
  const global = events
    .filter((e) => e.status === "SUCCESS" && MONETARY_ACTIONS.has(e.action))
    .reduce((s, e) => s + e.amount, 0);
  if (perUser !== global) {
    throw new Error(`Per-user totals (${perUser}) do not sum to global total (${global}).`);
  }

  // Invariant 3: enums are respected (defensive; buildEvents only uses valid values).
  for (const e of events) {
    if (!ACTION_TYPES.includes(e.action)) throw new Error(`Bad action ${e.action}`);
    if (!CHANNELS.includes(e.channel)) throw new Error(`Bad channel ${e.channel}`);
    if (!STATUSES.includes(e.status)) throw new Error(`Bad status ${e.status}`);
  }

  return events;
}
