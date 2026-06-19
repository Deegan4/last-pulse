// Pure economy logic. Everything is derived from absolute timestamps and the
// current `now`, so progress (production + build timers) is correct even after
// the app has been closed for a while.

import { BUILDER_COUNT, BUILDINGS, TROOPS } from './config';
import { Building, BuildingLevel, GameState, ResourceType, TrainItem, TroopType } from './types';

let trainItemSeq = 0;

export function getDef(b: Building) {
  return BUILDINGS[b.type];
}

export function getLevelStat(b: Building): BuildingLevel {
  return BUILDINGS[b.type].levels[b.level - 1];
}

export function isMaxLevel(b: Building): boolean {
  return b.level >= BUILDINGS[b.type].levels.length;
}

export function isUpgrading(b: Building, now: number): boolean {
  return b.upgradeFinishAt != null && b.upgradeFinishAt > now;
}

export function buildersInUse(state: GameState, now: number): number {
  return state.buildings.filter((b) => isUpgrading(b, now)).length;
}

export function builderAvailable(state: GameState, now: number): boolean {
  return buildersInUse(state, now) < BUILDER_COUNT;
}

export function townHallLevel(state: GameState): number {
  const th = state.buildings.find((b) => b.type === 'townHall');
  return th ? th.level : 1;
}

/** Total capacity of a resource pool: town hall base + matching storages. */
export function resourceCapacity(state: GameState, resource: ResourceType): number {
  let cap = 0;
  for (const b of state.buildings) {
    const stat = getLevelStat(b);
    if (b.type === 'townHall' && stat.baseCapacity) cap += stat.baseCapacity;
    if (resource === 'gold' && b.type === 'goldStorage' && stat.storageCapacity) cap += stat.storageCapacity;
    if (resource === 'elixir' && b.type === 'elixirStorage' && stat.storageCapacity) cap += stat.storageCapacity;
  }
  return cap;
}

/** Uncollected resource sitting in a producer's buffer (clamped to its cap). */
export function collectorBuffer(b: Building, now: number): number {
  const def = BUILDINGS[b.type];
  const stat = getLevelStat(b);
  if (!def.produces || !stat.ratePerHour) return 0;
  const since = b.lastCollectAt ?? now;
  const hours = Math.max(0, now - since) / 3_600_000;
  const produced = stat.ratePerHour * hours;
  return Math.min(stat.bufferCapacity ?? 0, produced);
}

export function canAfford(state: GameState, cost?: Partial<Record<ResourceType, number>>): boolean {
  if (!cost) return false;
  return (cost.gold ?? 0) <= state.gold && (cost.elixir ?? 0) <= state.elixir;
}

export interface UpgradeCheck {
  ok: boolean;
  reason?: string;
}

/** Whether `b` can start an upgrade right now, and if not, why. */
export function checkUpgrade(state: GameState, b: Building, now: number): UpgradeCheck {
  if (isUpgrading(b, now)) return { ok: false, reason: 'Upgrading…' };
  if (isMaxLevel(b)) return { ok: false, reason: 'Max level' };
  // Buildings can be at most one level above the Town Hall (classic gating).
  if (b.type !== 'townHall' && b.level > townHallLevel(state)) {
    return { ok: false, reason: 'Upgrade Town Hall first' };
  }
  if (!builderAvailable(state, now)) return { ok: false, reason: 'Builder busy' };
  if (!canAfford(state, getLevelStat(b).upgradeCost)) return { ok: false, reason: 'Not enough resources' };
  return { ok: true };
}

function addResource(state: GameState, resource: ResourceType, amount: number): GameState {
  const cap = resourceCapacity(state, resource);
  const next = Math.min(cap, state[resource] + amount);
  return { ...state, [resource]: next };
}

/** Move a producer's buffer into the resource pool (clamped to capacity). */
export function collect(state: GameState, id: string, now: number): GameState {
  const b = state.buildings.find((x) => x.id === id);
  if (!b) return state;
  const def = BUILDINGS[b.type];
  if (!def.produces) return state;

  const amount = Math.floor(collectorBuffer(b, now));
  const cap = resourceCapacity(state, def.produces);
  // Storage full → keep the buffer rather than discarding it.
  if (amount <= 0 || cap - state[def.produces] <= 0) return state;

  const withResource = addResource(state, def.produces, amount);
  return {
    ...withResource,
    buildings: withResource.buildings.map((x) => (x.id === id ? { ...x, lastCollectAt: now } : x)),
  };
}

/** Pay the cost and begin an upgrade timer (no-op if not allowed). */
export function startUpgrade(state: GameState, id: string, now: number): GameState {
  const b = state.buildings.find((x) => x.id === id);
  if (!b) return state;
  if (!checkUpgrade(state, b, now).ok) return state;

  const stat = getLevelStat(b);
  const cost = stat.upgradeCost ?? {};
  const finishAt = now + (stat.upgradeTimeSec ?? 0) * 1000;
  return {
    ...state,
    gold: state.gold - (cost.gold ?? 0),
    elixir: state.elixir - (cost.elixir ?? 0),
    buildings: state.buildings.map((x) => (x.id === id ? { ...x, upgradeFinishAt: finishAt } : x)),
  };
}

/**
 * Complete any upgrades whose timer has elapsed. Producers auto-collect their
 * buffer (at the old rate) before leveling up, then reset their accrual clock.
 * Returns the same reference when nothing changed.
 */
function reconcileBuildings(state: GameState, now: number): GameState {
  const finished = state.buildings.filter((b) => b.upgradeFinishAt != null && b.upgradeFinishAt <= now);
  if (finished.length === 0) return state;

  let s = state;
  for (const b of finished) {
    const def = BUILDINGS[b.type];
    if (def.produces) s = collect(s, b.id, now); // banks buffer at the old level's rate
    s = {
      ...s,
      buildings: s.buildings.map((x) =>
        x.id === b.id
          ? {
              ...x,
              level: x.level + 1,
              upgradeFinishAt: undefined,
              lastCollectAt: def.produces ? now : x.lastCollectAt,
            }
          : x,
      ),
    };
  }
  return s;
}

// ── Army / training ─────────────────────────────────────────────────────────

export function barracksLevel(state: GameState): number {
  const b = state.buildings.find((x) => x.type === 'barracks');
  return b ? b.level : 0;
}

/** Total troop housing across all army camps. */
export function armyCapacity(state: GameState): number {
  let cap = 0;
  for (const b of state.buildings) {
    if (b.type === 'armyCamp') cap += getLevelStat(b).housing ?? 0;
  }
  return cap;
}

/** Housing occupied by trained troops + everything still in the queue. */
export function housingUsed(state: GameState): number {
  let used = 0;
  for (const t of Object.keys(state.army) as TroopType[]) {
    used += (state.army[t] ?? 0) * TROOPS[t].housing;
  }
  for (const item of state.queue) {
    used += TROOPS[item.type].housing;
  }
  return used;
}

export function troopUnlocked(state: GameState, type: TroopType): boolean {
  return barracksLevel(state) >= TROOPS[type].requiresBarracksLevel;
}

export function checkTrain(state: GameState, type: TroopType): UpgradeCheck {
  const def = TROOPS[type];
  if (!troopUnlocked(state, type)) return { ok: false, reason: `Needs Barracks Lv ${def.requiresBarracksLevel}` };
  if (housingUsed(state) + def.housing > armyCapacity(state)) return { ok: false, reason: 'Army camp full' };
  if (!canAfford(state, def.cost)) return { ok: false, reason: 'Not enough resources' };
  return { ok: true };
}

/** Queue a troop for training (pays its cost up front). No-op if not allowed. */
export function trainTroop(state: GameState, type: TroopType, now: number): GameState {
  if (!checkTrain(state, type).ok) return state;
  const cost = TROOPS[type].cost;
  const item: TrainItem = { id: `t${now}-${trainItemSeq++}`, type };
  return {
    ...state,
    gold: state.gold - (cost.gold ?? 0),
    elixir: state.elixir - (cost.elixir ?? 0),
    queue: [...state.queue, item],
    trainStartAt: state.queue.length === 0 ? now : state.trainStartAt,
  };
}

/** Seconds remaining on the unit currently training, or null if idle. */
export function trainingRemaining(state: GameState, now: number): number | null {
  if (state.queue.length === 0 || state.trainStartAt == null) return null;
  const finishAt = state.trainStartAt + TROOPS[state.queue[0].type].trainTimeSec * 1000;
  return Math.max(0, (finishAt - now) / 1000);
}

/** Move finished units from the queue into the army (chains across offline time). */
function reconcileTraining(state: GameState, now: number): GameState {
  if (state.queue.length === 0 || state.trainStartAt == null) return state;

  let start = state.trainStartAt;
  let queue = state.queue;
  const army = { ...state.army };
  let changed = false;

  while (queue.length > 0) {
    const head = queue[0];
    const finishAt = start + TROOPS[head.type].trainTimeSec * 1000;
    if (now < finishAt) break;
    army[head.type] = (army[head.type] ?? 0) + 1;
    queue = queue.slice(1);
    start = finishAt; // next unit starts the moment this one finishes
    changed = true;
  }

  if (!changed) return state;
  return { ...state, army, queue, trainStartAt: queue.length > 0 ? start : undefined };
}

/**
 * Advance all time-based progress to `now`: finish building upgrades and train
 * queued troops. Returns the same reference when nothing changed.
 */
export function reconcile(state: GameState, now: number): GameState {
  return reconcileTraining(reconcileBuildings(state, now), now);
}
