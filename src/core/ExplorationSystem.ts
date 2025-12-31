import type {
  ExplorationBoardCell,
  ExplorationBoardLayer,
  ExplorationPointConfigEntry,
  Explorer,
  Monster,
  GarbageUnitRuntime,
  MonsterConfigEntry,
  GarbageConfigEntry,
} from '../types/gameTypes';

export interface SpawnEntry {
  kind: 'Monster' | 'Garbage' | string;
  id: string;
  weight: number;
}

export interface ExplorationBoardGenerationInput {
  pointConfig: ExplorationPointConfigEntry;
  explorers: Explorer[]; // 当前仍存活并进入该探索点的角色
  monsterConfigs: MonsterConfigEntry[];
  garbageConfigs: GarbageConfigEntry[];
  layerIndex: number; // 当前层数（从1开始）
  oreChoices?: Array<{
    affectedOreIds: string[]; // 影响的矿石ID列表
    weightMultiplier?: number; // 权重倍数（默认1.0）
    maxCount?: number; // 数量上限（默认无限制）
  }>; // 矿石选择影响列表（可选，累积生效）
}

export interface ExplorationBoardGenerationResult {
  layer: ExplorationBoardLayer;
}

/** 解析 `棋盘出现内容` 字段为内部结构。支持字符串和数组两种格式。 */
export function parseSpawnEntries(raw: string | string[]): SpawnEntry[] {
  if (!raw) return [];
  
  
  // 如果是数组，直接处理；如果是字符串，先按 | 分割
  const entries: string[] = Array.isArray(raw) ? raw : raw.split('|');
  
  
  return entries.map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    
    
    const parts = trimmed.split('_');
    if (parts.length < 3) return null; // 至少需要 kind_id_weight 三部分
    
    // 格式：Kind_id_part1_part2_..._weight
    // kind = parts[0]
    // id = parts[1] 到 parts[length-2] 的组合（用下划线连接）
    // weight = parts[length-1]（最后一部分）
    const kind = parts[0];
    const weightStr = parts[parts.length - 1];
    const idParts = parts.slice(1, -1); // 从第2部分到倒数第2部分
    const id = idParts.join('_'); // 用下划线连接
    
    
    if (!kind || !id) return null;
    
    const result = {
      kind: kind as SpawnEntry['kind'],
      id,
      weight: Number(weightStr ?? '1') || 1,
    };
    
    
    return result;
  }).filter((entry): entry is SpawnEntry => entry !== null);
}

function chooseWeighted<T extends { weight: number }>(items: T[]): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
  if (total <= 0) return items[0];
  const r = Math.random() * total;
  let acc = 0;
  for (const it of items) {
    acc += Math.max(0, it.weight);
    if (r <= acc) return it;
  }
  return items[items.length - 1];
}

/**
 * 根据探索点配置生成一层 4x6 的探索棋盘：
 * 1. 先放置角色（随机不重复格子）；
 * 2. 再根据 `棋盘出现内容` 的权重规则放置怪物和垃圾。
 */
export function generateExplorationBoardLayer(
  input: ExplorationBoardGenerationInput,
): ExplorationBoardGenerationResult {
  const { pointConfig, explorers, monsterConfigs, garbageConfigs, layerIndex, oreChoices } = input;


  const totalCells = 4 * 6;
  const cells: ExplorationBoardCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push({ index: i });
  }

  // 1. 随机放置角色
  const availableIndices: number[] = Array.from({ length: totalCells }, (_, i) => i);
  const rngPickIndex = () => {
    if (availableIndices.length === 0) return -1;
    const idx = Math.floor(Math.random() * availableIndices.length);
    const cellIndex = availableIndices[idx];
    availableIndices.splice(idx, 1);
    return cellIndex;
  };

  const explorerPositions: number[] = [];
  for (const explorer of explorers) {
    const cellIndex = rngPickIndex();
    if (cellIndex === -1) break; // 棋盘已满
    const cell = cells[cellIndex];
    cell.explorerId = explorer.id;
    explorerPositions.push(cellIndex);
  }
  

  // 2. 放置怪物和垃圾
  const spawnEntries = parseSpawnEntries(pointConfig.棋盘出现内容);

  const monsterMap = new Map<string, MonsterConfigEntry>();
  for (const m of monsterConfigs) {
    monsterMap.set(m.ID, m);
  }

  const garbageMap = new Map<string, GarbageConfigEntry>();
  for (const g of garbageConfigs) {
    garbageMap.set(g.ID, g);
  }
  

  // 预先过滤出 Monster / Garbage 的 spawn 条目，方便按类型选择
  const monsterEntries = spawnEntries.filter((s) => s.kind === 'Monster');
  let garbageEntries = spawnEntries.filter((s) => s.kind === 'Garbage');

  // 如果存在矿石选择列表，计算每个矿石的累积权重和最小数量上限
  const oreWeightMap = new Map<string, number>(); // 矿石ID -> 累积权重倍数
  const oreMaxCountMap = new Map<string, number>(); // 矿石ID -> 最小数量上限

  if (oreChoices && oreChoices.length > 0) {
    // 遍历所有选项，收集每个矿石ID的所有影响
    for (const choice of oreChoices) {
      if (!choice.affectedOreIds || choice.affectedOreIds.length === 0) continue;

      for (const oreId of choice.affectedOreIds) {
        // 累加权重：基础权重是1.0，每个选项的权重倍数是相对于1.0的增加量
        // 例如：如果选项1的权重倍数是2.0，选项2的权重倍数是1.5
        // 那么累加后的权重 = 1.0 + (2.0 - 1.0) + (1.5 - 1.0) = 1.0 + 1.0 + 0.5 = 2.5
        const weightIncrease = (choice.weightMultiplier ?? 1.0) - 1.0;
        oreWeightMap.set(oreId, (oreWeightMap.get(oreId) ?? 1.0) + weightIncrease);

        // 取最小数量上限
        if (choice.maxCount !== undefined) {
          const current = oreMaxCountMap.get(oreId);
          if (current === undefined || choice.maxCount < current) {
            oreMaxCountMap.set(oreId, choice.maxCount);
          }
        }
      }
    }

    // 应用权重调整：受影响的矿石权重增加，其他矿石权重降低
    garbageEntries = garbageEntries.map((entry) => {
      const weightMultiplier = oreWeightMap.get(entry.id);
      if (weightMultiplier !== undefined) {
        // 受影响的矿石：应用累积权重倍数
        return {
          ...entry,
          weight: entry.weight * weightMultiplier,
        };
      } else {
        // 未受影响的矿石：权重减半
        return {
          ...entry,
          weight: entry.weight * 0.5,
        };
      }
    });
  }

  // 简单规则：剩余空格子中，尝试轮流按权重选怪物/垃圾放置，直到没有可放或格子用完
  let placedCount = 0;
  const monsterPositions: number[] = [];
  const garbagePositions: number[] = [];
  const garbageCountMap = new Map<string, number>(); // 记录每种垃圾已放置的数量

  while (availableIndices.length > 0) {
    const cellIndex = rngPickIndex();
    if (cellIndex === -1) break;
    const cell = cells[cellIndex];

    // 先尝试放怪物
    const monsterEntry = chooseWeighted(monsterEntries);
    if (monsterEntry && monsterMap.has(monsterEntry.id)) {
      cell.monsterId = monsterEntry.id;
      monsterPositions.push(cellIndex);
      placedCount++;
      continue;
    }

    // 再尝试放垃圾
    const garbageEntry = chooseWeighted(garbageEntries);
    if (garbageEntry) {
      // 检查数量上限（使用最小数量上限）
      const maxCount = oreMaxCountMap.get(garbageEntry.id);
      if (maxCount !== undefined) {
        const currentCount = garbageCountMap.get(garbageEntry.id) ?? 0;
        // 如果达到上限，跳过
        if (currentCount >= maxCount) {
          // 移除已达到上限的条目，避免重复选择
          garbageEntries = garbageEntries.filter((e) => e.id !== garbageEntry.id);
          continue;
        }
      }
      
      if (garbageMap.has(garbageEntry.id)) {
        cell.garbageId = garbageEntry.id;
        garbagePositions.push(cellIndex);
        placedCount++;
        // 更新计数
        garbageCountMap.set(garbageEntry.id, (garbageCountMap.get(garbageEntry.id) ?? 0) + 1);
        continue;
      }
    }

    // 如果都没有可用条目，则该格子保持为空
  }
  

  const layer: ExplorationBoardLayer = {
    layerIndex: input.layerIndex,
    cells,
  };

  return { layer };
}
