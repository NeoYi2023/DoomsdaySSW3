import type {
  ExplorationBoardLayer,
  ExplorationBoardCell,
  Explorer,
  Monster,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
  ResourceStack,
  EquipmentConfigEntry,
} from '../types/gameTypes';
import { resolveGarbageOutput, type ResolvedGarbageOutput } from './EffectSystem';
import { distributeLootToExplorers } from './InventorySystem';

import type { ItemStack } from '../types/gameTypes';

export interface GarbageProcessResult {
  explorers: Map<string, Explorer>;
  processedCount: number;
  lootAnimations: Array<{
    cellIndex: number;           // 垃圾格子索引
    loot: ResourceStack[];        // 产出内容
    isAdvanced: boolean;          // 是否进阶产出
    relatedCellIndices: number[]; // 相关角色格子索引（进阶产出时）
  }>;
  remainingItems: ItemStack[]; // 未能放入角色背包的剩余物品（需要放入临时背包）
}

export interface BattleTurnResult {
  explorers: Map<string, Explorer>;
  monsters: Map<string, Monster>;
  board: ExplorationBoardLayer;
}

function getCoordsFromIndex(index: number): { x: number; y: number } {
  const width = 6;
  const x = index % width;
  const y = Math.floor(index / width);
  return { x, y };
}

function isAdjacentOrSame(a: number, b: number): boolean {
  const ca = getCoordsFromIndex(a);
  const cb = getCoordsFromIndex(b);
  const dx = Math.abs(ca.x - cb.x);
  const dy = Math.abs(ca.y - cb.y);
  // 8 邻格：dx <= 1 且 dy <= 1，排除自身
  return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
}

function findTargetsInRange(
  board: ExplorationBoardLayer,
  attackerCellIndex: number,
  isExplorerAttacker: boolean,
): number[] {
  const result: number[] = [];
  for (const cell of board.cells) {
    if (isExplorerAttacker) {
      if (!cell.monsterId) continue;
    } else {
      if (!cell.explorerId) continue;
    }
    if (isAdjacentOrSame(attackerCellIndex, cell.index)) {
      result.push(cell.index);
    }
  }
  // 按格子编号从小到大排序
  result.sort((a, b) => a - b);
  return result;
}

/**
 * 根据当前棋盘与角色/怪物状态，结算一整轮战斗：
 * - 先按格子编号从小到大遍历角色格子：每个有敌人在 8 邻格内，则对范围内所有敌人攻击一次；
 * - 再按格子编号从小到大遍历怪物格子，执行同样逻辑；
 * - 攻击力直接来自各自的 config.攻击力。
 */
export function resolveBattleTurn(
  board: ExplorationBoardLayer,
  explorersInput: Map<string, Explorer>,
  monstersInput: Map<string, Monster>,
): BattleTurnResult {
  // 为避免引用问题，复制一份可变状态
  const explorers = new Map<string, Explorer>();
  explorersInput.forEach((ex, id) => {
    explorers.set(id, { ...ex });
  });
  const monsters = new Map<string, Monster>();
  monstersInput.forEach((m, id) => {
    monsters.set(id, { ...m });
  });

  const cells: ExplorationBoardCell[] = board.cells.map((c) => ({ ...c }));

  // 1. 我方行动
  const explorerCells = cells
    .filter((c) => c.explorerId)
    .sort((a, b) => a.index - b.index);

  for (const cell of explorerCells) {
    const explorerId = cell.explorerId!;
    const explorer = explorers.get(explorerId);
    if (!explorer) continue;
    if (explorer.currentHp <= 0) continue;

    const targets = findTargetsInRange({ ...board, cells }, cell.index, true);
    if (targets.length === 0) continue;

    const atk = explorer.config.攻击力 ?? 0;
    if (atk <= 0) continue;

    for (const targetIndex of targets) {
      const targetCell = cells.find((c) => c.index === targetIndex)!;
      const monsterId = targetCell.monsterId!;
      const monster = monsters.get(monsterId);
      if (!monster) continue;
      if (monster.currentHp <= 0) continue;

      monster.currentHp -= atk;
      if (monster.currentHp <= 0) {
        monster.currentHp = 0;
        // 怪物死亡，从棋盘上移除
        targetCell.monsterId = undefined;
      }
    }
  }

  // 2. 怪物行动
  const monsterCells = cells
    .filter((c) => c.monsterId)
    .sort((a, b) => a.index - b.index);

  for (const cell of monsterCells) {
    const monsterId = cell.monsterId!;
    const monster = monsters.get(monsterId);
    if (!monster) continue;
    if (monster.currentHp <= 0) continue;

    const targets = findTargetsInRange({ ...board, cells }, cell.index, false);
    if (targets.length === 0) continue;

    const atk = monster.config.攻击力 ?? 0;
    if (atk <= 0) continue;

    for (const targetIndex of targets) {
      const targetCell = cells.find((c) => c.index === targetIndex)!;
      const explorerId = targetCell.explorerId!;
      const explorer = explorers.get(explorerId);
      if (!explorer) continue;
      if (explorer.currentHp <= 0) continue;

      explorer.currentHp -= atk;
      if (explorer.currentHp <= 0) {
        explorer.currentHp = 0;
        // 角色死亡，从棋盘上移除（掉落逻辑由更高层处理）
        targetCell.explorerId = undefined;
      }
    }
  }

  const resultBoard: ExplorationBoardLayer = {
    ...board,
    cells,
  };

  return {
    explorers,
    monsters,
    board: resultBoard,
  };
}

/**
 * 战斗后自动处理垃圾产出：
 * - 按棋盘编号从小到大遍历所有有垃圾的格子
 * - 对每个垃圾：先尝试触发"进阶产出机制"，如果未触发则使用"默认搜索产出"
 * - 自动将产出应用到探险队背包（支持负值减少）
 * - 返回详细的产出信息用于视觉反馈
 */
export function processGarbageAfterBattle(
  board: ExplorationBoardLayer,
  explorersInput: Map<string, Explorer>,
  garbageConfigs: GarbageConfigEntry[],
  advancedConditions: AdvancedOutputConditionConfigEntry[],
  getMaxStack: (itemId: string) => number,
  equipmentConfigs?: EquipmentConfigEntry[],
): GarbageProcessResult {
  const explorers = new Map<string, Explorer>();
  explorersInput.forEach((ex, id) => {
    explorers.set(id, { ...ex, inventory: [...ex.inventory] });
  });

  const garbageMap = new Map<string, GarbageConfigEntry>();
  for (const g of garbageConfigs) {
    garbageMap.set(g.ID, g);
  }

  // 按编号从小到大排序所有有垃圾的格子
  const garbageCells = board.cells
    .filter((c) => c.garbageId)
    .sort((a, b) => a.index - b.index);

  let processedCount = 0;
  const allLoot: ResourceStack[] = [];
  const lootAnimations: GarbageProcessResult['lootAnimations'] = [];

  // 创建角色ID到格子索引的映射
  const explorerIdToCellIndex = new Map<string, number>();
  for (const cell of board.cells) {
    if (cell.explorerId) {
      explorerIdToCellIndex.set(cell.explorerId, cell.index);
    }
  }

  for (const cell of garbageCells) {
    const garbageId = cell.garbageId!;
    const garbageConfig = garbageMap.get(garbageId);
    if (!garbageConfig) continue;

    // 构建上下文（包含棋盘和所有垃圾配置，用于 Advanced_10002 等需要检查整个棋盘的触发条件）
    const explorersArray = Array.from(explorers.values());
    const ctx = {
      explorers: explorersArray,
      garbageConfig,
      board,
      allGarbageConfigs: garbageConfigs,
      allEquipmentConfigs: equipmentConfigs,
    };

    // 解析产出（先尝试进阶机制，否则使用默认产出）
    const resolved: ResolvedGarbageOutput = resolveGarbageOutput(garbageConfig, advancedConditions, ctx);
    allLoot.push(...resolved.loot);
    
    // 找到相关角色所在的格子索引
    const relatedCellIndices: number[] = [];
    for (const explorerId of resolved.relatedExplorerIds) {
      const cellIndex = explorerIdToCellIndex.get(explorerId);
      if (cellIndex !== undefined) {
        relatedCellIndices.push(cellIndex);
      }
    }

    // 记录动画信息
    lootAnimations.push({
      cellIndex: cell.index,
      loot: resolved.loot,
      isAdvanced: resolved.isAdvanced,
      relatedCellIndices,
    });

    processedCount++;
  }

  // 将所有产出应用到探险队背包（支持负值）
  let remainingItems: ItemStack[] = [];
  if (allLoot.length > 0) {
    const explorersArray = Array.from(explorers.values());
    remainingItems = distributeLootToExplorers(
      explorersArray,
      allLoot.map((r) => ({ itemId: r.resourceId, quantity: r.quantity })),
      { getMaxStack },
    );

    // 更新 explorers Map
    for (const explorer of explorersArray) {
      explorers.set(explorer.id, explorer);
    }
  }

  return { explorers, processedCount, lootAnimations, remainingItems };
}
