import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BUILDINGS, GRID_COLS, GRID_ROWS, SAVE_KEY, STATE_VERSION, TROOPS, createInitialState } from './src/config';
import {
  armyCapacity,
  builderAvailable,
  checkTrain,
  checkUpgrade,
  collect,
  collectorBuffer,
  getLevelStat,
  housingUsed,
  isMaxLevel,
  isUpgrading,
  reconcile,
  resourceCapacity,
  startUpgrade,
  trainTroop,
  trainingRemaining,
  troopUnlocked,
} from './src/economy';
import { Building, GameState, ResourceType, TroopType } from './src/types';

const COLORS = {
  bg: '#11151c',
  panel: '#1b2230',
  panelAlt: '#232c3d',
  tile: '#2a3447',
  tileSel: '#3a4a66',
  grid: '#161b25',
  gold: '#f4c542',
  elixir: '#c061f4',
  text: '#eef2f8',
  dim: '#8c98ab',
  good: '#46c46e',
  bad: '#e2574c',
  border: '#2e3a4f',
};

function fmt(n: number): string {
  const v = Math.floor(n);
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}:${String(r).padStart(2, '0')}`;
}

const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 16;
const BOARD = Math.min(SCREEN_W - GRID_PAD * 2, 420);
const TILE = Math.floor(BOARD / GRID_COLS);

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load saved game (or start fresh), reconciling offline progress on open.
  useEffect(() => {
    (async () => {
      let loaded: GameState | null = null;
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as GameState;
          if (parsed && parsed.version === STATE_VERSION) loaded = parsed;
        }
      } catch {
        // ignore corrupt saves
      }
      const t = Date.now();
      setState(reconcile(loaded ?? createInitialState(t), t));
      setNow(t);
    })();
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (state) AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  // Tick once a second + reconcile finished build timers. Also catch up on
  // foreground, since JS timers are throttled while backgrounded.
  useEffect(() => {
    const advance = () => {
      const t = Date.now();
      setNow(t);
      setState((prev) => (prev ? reconcile(prev, t) : prev));
    };
    const interval = setInterval(advance, 1000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && advance());
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  const selected = useMemo(
    () => state?.buildings.find((b) => b.id === selectedId) ?? null,
    [state, selectedId],
  );

  if (!state) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.loading}>Forge Kingdom…</Text>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  const goldCap = resourceCapacity(state, 'gold');
  const elixirCap = resourceCapacity(state, 'elixir');
  const builderFree = builderAvailable(state, now);

  const onTapBuilding = (b: Building) => {
    setSelectedId(b.id);
    if (BUILDINGS[b.type].produces && Math.floor(collectorBuffer(b, Date.now())) > 0) {
      setState((prev) => (prev ? collect(prev, b.id, Date.now()) : prev));
    }
  };

  const onUpgrade = (b: Building) => {
    setState((prev) => (prev ? startUpgrade(prev, b.id, Date.now()) : prev));
  };

  const onTrain = (type: TroopType) => {
    setState((prev) => (prev ? trainTroop(prev, type, Date.now()) : prev));
  };

  const housing = housingUsed(state);
  const housingCap = armyCapacity(state);
  const trainRemain = trainingRemaining(state, now);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      {/* Resource bars */}
      <View style={styles.topBar}>
        <ResourceChip color={COLORS.gold} icon="🪙" value={state.gold} cap={goldCap} />
        <ResourceChip color={COLORS.elixir} icon="⚗️" value={state.elixir} cap={elixirCap} />
        <View style={styles.builderChip}>
          <Text style={styles.builderIcon}>🔨</Text>
          <Text style={[styles.builderText, { color: builderFree ? COLORS.good : COLORS.dim }]}>
            {builderFree ? 'Idle' : 'Busy'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>Forge Kingdom</Text>

      {/* Base grid */}
      <View style={styles.boardWrap}>
        <View style={[styles.board, { width: BOARD, height: TILE * GRID_ROWS }]}>
          {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => (
            <View
              key={`cell-${i}`}
              style={[
                styles.cell,
                {
                  width: TILE,
                  height: TILE,
                  left: (i % GRID_COLS) * TILE,
                  top: Math.floor(i / GRID_COLS) * TILE,
                },
              ]}
            />
          ))}

          {state.buildings.map((b) => {
            const def = BUILDINGS[b.type];
            const buffer = Math.floor(collectorBuffer(b, now));
            const upgrading = isUpgrading(b, now);
            return (
              <Pressable
                key={b.id}
                onPress={() => onTapBuilding(b)}
                style={[
                  styles.building,
                  {
                    width: TILE - 6,
                    height: TILE - 6,
                    left: b.col * TILE + 3,
                    top: b.row * TILE + 3,
                    borderColor: selectedId === b.id ? COLORS.tileSel : COLORS.border,
                    backgroundColor: selectedId === b.id ? COLORS.tileSel : COLORS.tile,
                  },
                ]}
              >
                <Text style={styles.buildingIcon}>{def.icon}</Text>
                <Text style={styles.buildingLevel}>Lv {b.level}</Text>

                {def.produces && buffer > 0 && !upgrading ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: def.produces === 'gold' ? COLORS.gold : COLORS.elixir },
                    ]}
                  >
                    <Text style={styles.badgeText}>{fmt(buffer)}</Text>
                  </View>
                ) : null}

                {upgrading ? (
                  <View style={styles.upgradeTag}>
                    <Text style={styles.upgradeTagText}>
                      {fmtTime((b.upgradeFinishAt! - now) / 1000)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Army / training status */}
      <View style={styles.armyBar}>
        <Text style={styles.armyText}>
          🪖 {housing}/{housingCap}
        </Text>
        <Text style={styles.armyDivider}>·</Text>
        {trainRemain != null ? (
          <Text style={styles.armyText}>
            {TROOPS[state.queue[0].type].icon} {fmtTime(trainRemain)}
            {state.queue.length > 1 ? `  +${state.queue.length - 1}` : ''}
          </Text>
        ) : (
          <Text style={styles.armyDim}>Barracks idle</Text>
        )}
      </View>

      {/* Action / info panel */}
      <View style={styles.panel}>
        {selected ? (
          <BuildingPanel
            state={state}
            building={selected}
            now={now}
            onUpgrade={onUpgrade}
            onTrain={onTrain}
          />
        ) : (
          <Text style={styles.hint}>
            Tap a producer to collect resources. Tap a building to upgrade it. Tap the Barracks
            to train troops.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function ResourceChip({
  color,
  icon,
  value,
  cap,
}: {
  color: string;
  icon: string;
  value: number;
  cap: number;
}) {
  const pct = cap > 0 ? Math.min(1, value / cap) : 0;
  return (
    <View style={styles.resChip}>
      <Text style={styles.resIcon}>{icon}</Text>
      <View style={styles.resBody}>
        <Text style={styles.resValue}>
          {fmt(value)} <Text style={styles.resCap}>/ {fmt(cap)}</Text>
        </Text>
        <View style={styles.resTrack}>
          <View style={[styles.resFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function BuildingPanel({
  state,
  building,
  now,
  onUpgrade,
  onTrain,
}: {
  state: GameState;
  building: Building;
  now: number;
  onUpgrade: (b: Building) => void;
  onTrain: (type: TroopType) => void;
}) {
  const def = BUILDINGS[building.type];
  const stat = getLevelStat(building);
  const upgrading = isUpgrading(building, now);
  const maxed = isMaxLevel(building);
  const check = checkUpgrade(state, building, now);
  const cost = stat.upgradeCost ?? {};

  return (
    <View>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>
          {def.icon} {def.name}
        </Text>
        <Text style={styles.panelLevel}>Level {building.level}</Text>
      </View>

      <View style={styles.statRow}>
        {def.produces ? (
          <Text style={styles.statText}>
            Produces {def.produces} · {fmt(stat.ratePerHour ?? 0)}/h · holds {fmt(stat.bufferCapacity ?? 0)}
          </Text>
        ) : null}
        {stat.storageCapacity ? (
          <Text style={styles.statText}>+{fmt(stat.storageCapacity)} storage capacity</Text>
        ) : null}
        {stat.baseCapacity ? (
          <Text style={styles.statText}>+{fmt(stat.baseCapacity)} base capacity (each resource)</Text>
        ) : null}
        {building.type === 'armyCamp' ? (
          <Text style={styles.statText}>Houses {fmt(stat.housing ?? 0)} troop space</Text>
        ) : null}
      </View>

      {building.type === 'barracks' ? <TrainSection state={state} onTrain={onTrain} /> : null}
      {building.type === 'armyCamp' ? <ArmySection state={state} /> : null}

      {upgrading ? (
        <View style={[styles.upgradeBtn, styles.upgradeBtnBusy]}>
          <Text style={styles.upgradeBtnText}>
            Upgrading… {fmtTime((building.upgradeFinishAt! - now) / 1000)}
          </Text>
        </View>
      ) : maxed ? (
        <View style={[styles.upgradeBtn, styles.upgradeBtnBusy]}>
          <Text style={styles.upgradeBtnText}>Max level</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => onUpgrade(building)}
          disabled={!check.ok}
          style={[styles.upgradeBtn, !check.ok && styles.upgradeBtnDisabled]}
        >
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
          <View style={styles.costRow}>
            {(['gold', 'elixir'] as ResourceType[]).map((r) =>
              cost[r] ? (
                <Text key={r} style={styles.costText}>
                  {r === 'gold' ? '🪙' : '⚗️'} {fmt(cost[r] as number)}
                </Text>
              ) : null,
            )}
            <Text style={styles.costText}>⏱ {fmtTime(stat.upgradeTimeSec ?? 0)}</Text>
          </View>
        </Pressable>
      )}

      {!check.ok && !upgrading && !maxed ? (
        <Text style={styles.reason}>{check.reason}</Text>
      ) : null}
    </View>
  );
}

function TrainSection({
  state,
  onTrain,
}: {
  state: GameState;
  onTrain: (type: TroopType) => void;
}) {
  return (
    <View style={styles.trainList}>
      {(Object.keys(TROOPS) as TroopType[]).map((type) => {
        const t = TROOPS[type];
        const unlocked = troopUnlocked(state, type);
        const check = checkTrain(state, type);
        return (
          <Pressable
            key={type}
            onPress={() => onTrain(type)}
            disabled={!check.ok}
            style={[styles.troopRow, !check.ok && styles.troopRowDisabled]}
          >
            <Text style={styles.troopIcon}>{t.icon}</Text>
            <View style={styles.troopInfo}>
              <Text style={styles.troopName}>{t.name}</Text>
              <Text style={styles.troopMeta}>
                {unlocked
                  ? `⚗️ ${fmt(t.cost.elixir ?? 0)} · ⏱ ${fmtTime(t.trainTimeSec)} · ${t.housing} space`
                  : `Unlocks at Barracks Lv ${t.requiresBarracksLevel}`}
              </Text>
            </View>
            <Text style={[styles.troopTrain, !check.ok && styles.troopTrainOff]}>
              {check.ok ? 'Train' : unlocked ? check.reason : '🔒'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ArmySection({ state }: { state: GameState }) {
  const trained = (Object.keys(TROOPS) as TroopType[]).filter((t) => (state.army[t] ?? 0) > 0);
  return (
    <View style={styles.armySection}>
      {trained.length === 0 ? (
        <Text style={styles.statText}>No troops trained yet — visit the Barracks.</Text>
      ) : (
        <View style={styles.armyComp}>
          {trained.map((t) => (
            <Text key={t} style={styles.armyCompItem}>
              {TROOPS[t].icon} {state.army[t]}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  loading: { color: COLORS.dim, fontSize: 18 },

  topBar: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PAD,
    paddingTop: 8,
    gap: 8,
    alignItems: 'stretch',
  },
  resChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  resIcon: { fontSize: 20 },
  resBody: { flex: 1 },
  resValue: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  resCap: { color: COLORS.dim, fontWeight: '500', fontSize: 12 },
  resTrack: {
    height: 5,
    backgroundColor: COLORS.grid,
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  resFill: { height: 5, borderRadius: 3 },
  builderChip: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderIcon: { fontSize: 18 },
  builderText: { fontSize: 11, fontWeight: '700' },

  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 10,
  },

  boardWrap: { alignItems: 'center', marginTop: 10 },
  board: { position: 'relative' },
  cell: {
    position: 'absolute',
    backgroundColor: COLORS.grid,
    borderWidth: 1,
    borderColor: '#10141c',
  },
  building: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingIcon: { fontSize: TILE * 0.36 },
  buildingLevel: { color: COLORS.dim, fontSize: 10, fontWeight: '700', marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: { color: '#1a1205', fontSize: 10, fontWeight: '800' },
  upgradeTag: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#000a',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  upgradeTagText: { color: COLORS.text, fontSize: 9, fontWeight: '700' },

  armyBar: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  armyText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  armyDim: { color: COLORS.dim, fontSize: 13, fontWeight: '600' },
  armyDivider: { color: COLORS.dim, fontSize: 13 },

  panel: {
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 28,
    minHeight: 150,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  hint: { color: COLORS.dim, fontSize: 14, textAlign: 'center', marginTop: 20, lineHeight: 20 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  panelTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  panelLevel: { color: COLORS.dim, fontSize: 13, fontWeight: '600' },
  statRow: { marginTop: 8, gap: 3 },
  statText: { color: COLORS.dim, fontSize: 13 },

  upgradeBtn: {
    marginTop: 14,
    backgroundColor: COLORS.good,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeBtnDisabled: { backgroundColor: COLORS.panelAlt },
  upgradeBtnBusy: { backgroundColor: COLORS.panelAlt },
  upgradeBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  costRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
  costText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  reason: { color: COLORS.bad, fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },

  trainList: { marginTop: 12, gap: 8 },
  troopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.panelAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  troopRowDisabled: { opacity: 0.55 },
  troopIcon: { fontSize: 24 },
  troopInfo: { flex: 1 },
  troopName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  troopMeta: { color: COLORS.dim, fontSize: 12, marginTop: 2 },
  troopTrain: { color: COLORS.good, fontSize: 14, fontWeight: '800' },
  troopTrainOff: { color: COLORS.dim, fontSize: 11, fontWeight: '700' },

  armySection: { marginTop: 10 },
  armyComp: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  armyCompItem: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
