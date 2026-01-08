import type { MiningFacility, ExplorationBoardLayer, ExplorationBoardCell } from '../types/gameTypes';
import type { MiningFacilityConfigEntry } from '../types/configTypes';

/**
 * 根据自动插入规则，为开采设施选择插入位置
 */
export function selectInsertPosition(
  rule: string,
  board: ExplorationBoardLayer,
  existingFacilities: Map<string, MiningFacility>,
): number | null {
  const occupiedIndices = new Set<number>();
  for (const facility of existingFacilities.values()) {
    occupiedIndices.add(facility.cellIndex);
  }

  // 找出所有空位（没有怪物、没有角色、没有其他设施、可以有矿物）
  const availableCells = board.cells.filter(
    (cell) =>
      !cell.explorerId &&
      !cell.monsterId &&
      !cell.miningFacilityId &&
      !occupiedIndices.has(cell.index),
  );

  if (availableCells.length === 0) {
    return null; // 没有可用位置
  }

  switch (rule) {
    case 'random':
      // 随机选择一个空位
      const randomIndex = Math.floor(Math.random() * availableCells.length);
      return availableCells[randomIndex].index;

    case 'edge':
      // 选择边缘位置（优先选择第一行、最后一行、第一列、最后一列）
      const edgeCells = availableCells.filter((cell) => {
        const row = Math.floor(cell.index / 4); // 4列
        const col = cell.index % 4;
        return row === 0 || row === 5 || col === 0 || col === 3; // 4x6棋盘
      });
      if (edgeCells.length > 0) {
        const randomEdgeIndex = Math.floor(Math.random() * edgeCells.length);
        return edgeCells[randomEdgeIndex].index;
      }
      // 如果没有边缘位置，随机选择
      const randomIndex2 = Math.floor(Math.random() * availableCells.length);
      return availableCells[randomIndex2].index;

    case 'center':
      // 选择中心位置（优先选择中间区域）
      const centerCells = availableCells.filter((cell) => {
        const row = Math.floor(cell.index / 4);
        const col = cell.index % 4;
        return row >= 2 && row <= 3 && col >= 1 && col <= 2; // 4x6棋盘的中心区域
      });
      if (centerCells.length > 0) {
        const randomCenterIndex = Math.floor(Math.random() * centerCells.length);
        return centerCells[randomCenterIndex].index;
      }
      // 如果没有中心位置，随机选择
      const randomIndex3 = Math.floor(Math.random() * availableCells.length);
      return availableCells[randomIndex3].index;

    default:
      // 默认随机选择
      const randomIndex4 = Math.floor(Math.random() * availableCells.length);
      return availableCells[randomIndex4].index;
  }
}

/**
 * 自动插入开采设施到探索棋盘
 */
export function autoInsertMiningFacilities(
  board: ExplorationBoardLayer,
  facilityConfigs: MiningFacilityConfigEntry[],
  existingFacilities: Map<string, MiningFacility>,
): {
  updatedBoard: ExplorationBoardLayer;
  newFacilities: Map<string, MiningFacility>;
} {
  const newFacilities = new Map<string, MiningFacility>();
  const updatedCells = board.cells.map((cell) => ({ ...cell }));

  // 按优先级排序设施配置
  const sortedConfigs = [...facilityConfigs].sort((a, b) => {
    const priorityA = a.插入优先级 ?? 0;
    const priorityB = b.插入优先级 ?? 0;
    return priorityA - priorityB;
  });

  for (const config of sortedConfigs) {
    // 检查解锁条件（如果有）
    if (config.解锁条件) {
      // TODO: 实现解锁条件检查
      // 暂时跳过有解锁条件的设施
      continue;
    }

    // 选择插入位置
    const insertIndex = selectInsertPosition(config.自动插入规则, board, existingFacilities);
    if (insertIndex === null) {
      continue; // 没有可用位置，跳过
    }

    // 检查该位置是否已被其他设施占用
    if (updatedCells[insertIndex].miningFacilityId) {
      continue; // 已被占用，跳过
    }

    // 创建设施实例
    const facilityId = `mining_facility_${config.ID}_${Date.now()}_${Math.random()}`;
    const facility: MiningFacility = {
      id: facilityId,
      configId: config.ID,
      cellIndex: insertIndex,
      lastProcessTime: 0,
    };

    // 更新棋盘格子
    updatedCells[insertIndex].miningFacilityId = facilityId;

    // 添加到设施列表
    newFacilities.set(facilityId, facility);
  }

  return {
    updatedBoard: {
      ...board,
      cells: updatedCells,
    },
    newFacilities,
  };
}

/**
 * 处理开采设施对矿物的攻击
 */
export function processMiningFacilityAttack(
  board: ExplorationBoardLayer,
  facilities: Map<string, MiningFacility>,
  facilityConfigs: MiningFacilityConfigEntry[],
  garbageConfigs: Array<{ ID: string; 最大血量?: number }>,
): {
  updatedBoard: ExplorationBoardLayer;
  destroyedGarbageIds: string[]; // 被摧毁的矿物ID列表
} {
  const updatedCells = board.cells.map((cell) => ({ ...cell }));
  const destroyedGarbageIds: string[] = [];
  const configMap = new Map<string, MiningFacilityConfigEntry>();
  for (const config of facilityConfigs) {
    configMap.set(config.ID, config);
  }
  const garbageConfigMap = new Map<string, { ID: string; 最大血量?: number }>();
  for (const config of garbageConfigs) {
    garbageConfigMap.set(config.ID, config);
  }

  // 遍历所有有开采设施的格子
  for (let i = 0; i < updatedCells.length; i++) {
    const cell = updatedCells[i];
    if (!cell.miningFacilityId) continue;

    const facility = facilities.get(cell.miningFacilityId);
    if (!facility) continue;

    const config = configMap.get(facility.configId);
    if (!config) continue;

    // 确定攻击目标
    const attackTargets: number[] = [];
    if (config.攻击范围 === 0) {
      // 只能攻击所在格子
      if (cell.garbageId) {
        attackTargets.push(i);
      }
    } else {
      // 攻击范围内的所有格子
      const row = Math.floor(i / 4); // 4列
      const col = i % 4;
      for (let r = Math.max(0, row - config.攻击范围); r <= Math.min(5, row + config.攻击范围); r++) {
        for (let c = Math.max(0, col - config.攻击范围); c <= Math.min(3, col + config.攻击范围); c++) {
          const targetIndex = r * 4 + c;
          if (targetIndex !== i && updatedCells[targetIndex].garbageId) {
            attackTargets.push(targetIndex);
          }
        }
      }
    }

    // 对每个目标进行攻击
    for (const targetIndex of attackTargets) {
      const targetCell = updatedCells[targetIndex];
      if (!targetCell.garbageId) continue;

      // 初始化血量（如果还没有）
      if (targetCell.garbageCurrentHp === undefined) {
        const garbageConfig = garbageConfigMap.get(targetCell.garbageId);
        const maxHp = garbageConfig?.最大血量 ?? 1;
        targetCell.garbageCurrentHp = maxHp;
        targetCell.garbageMaxHp = maxHp;
      }

      // 造成伤害
      if (targetCell.garbageCurrentHp !== undefined) {
        targetCell.garbageCurrentHp = Math.max(0, targetCell.garbageCurrentHp - config.攻击力);

        // 如果血量归零，标记为摧毁
        if (targetCell.garbageCurrentHp <= 0) {
          destroyedGarbageIds.push(targetCell.garbageId!);
          // 清除格子上的矿物
          targetCell.garbageId = undefined;
          targetCell.garbageCurrentHp = undefined;
          targetCell.garbageMaxHp = undefined;
        }
      }
    }
  }

  return {
    updatedBoard: {
      ...board,
      cells: updatedCells,
    },
    destroyedGarbageIds,
  };
}
