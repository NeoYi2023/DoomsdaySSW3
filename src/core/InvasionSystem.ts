import type {
  ExplorationPointConfigEntry,
  MonsterConfigEntry,
  ShipConfigEntry,
} from '../types/configTypes';
import type { Monster, ProspectingShip } from '../types/gameTypes';
import { parseSpawnEntries, type SpawnEntry } from './ExplorationSystem';

/**
 * 检查震动值是否达到最大值，触发怪物入侵
 */
export function checkInvasionTrigger(
  vibrationValue: number,
  maxVibration: number,
): boolean {
  return vibrationValue >= maxVibration;
}

/**
 * 根据探索点配置生成入侵怪物
 */
export function spawnInvasionMonsters(
  pointConfig: ExplorationPointConfigEntry,
  monsterConfigs: MonsterConfigEntry[],
  shipConfig: ShipConfigEntry,
): Map<string, Monster> {
  const invasionMonsters = new Map<string, Monster>();

  // 解析入侵怪物配置列表
  const invasionSpawnEntries = parseSpawnEntries(pointConfig.入侵怪物配置列表 || []);
  const monsterEntries = invasionSpawnEntries.filter((s) => s.kind === 'Monster');

  if (monsterEntries.length === 0) {
    return invasionMonsters;
  }

  // 创建怪物配置映射
  const monsterMap = new Map<string, MonsterConfigEntry>();
  for (const m of monsterConfigs) {
    monsterMap.set(m.ID, m);
  }

  // 根据权重生成入侵怪物
  let monsterCounter = 0;
  const totalCells = 6 * 4; // 探索棋盘大小
  const spawnCount = Math.min(monsterEntries.length, totalCells); // 最多生成棋盘大小的怪物数量

  for (let i = 0; i < spawnCount; i++) {
    // 简单实现：按权重随机选择怪物类型
    const selectedEntry = chooseWeightedMonster(monsterEntries);
    if (!selectedEntry) continue;

    const monsterConfig = monsterMap.get(selectedEntry.id);
    if (!monsterConfig) continue;

    // 生成唯一ID
    const uniqueId = `invader_${selectedEntry.id}_${monsterCounter++}`;

    // 随机位置（后续会在移动逻辑中处理）
    const randomX = Math.floor(Math.random() * 6);
    const randomY = Math.floor(Math.random() * 4);

    // 判断怪物类型（根据配置或默认）
    // 这里简化处理，可以根据怪物配置添加类型字段
    // 如果配置中有怪物类型字段，使用配置；否则随机分配
    const monsterType: 'melee' | 'ranged' = 
      (monsterConfig as any).怪物类型 === '远程' ? 'ranged' : 
      (monsterConfig as any).怪物类型 === '近战' ? 'melee' :
      Math.random() > 0.5 ? 'melee' : 'ranged';

    const monster: Monster = {
      id: uniqueId,
      config: monsterConfig,
      currentHp: monsterConfig.血量,
      isInvader: true,
      monsterType,
      targetType: 'ship', // 默认攻击船体
      currentPosition: { x: randomX, y: randomY },
      targetPosition: null,
    };

    invasionMonsters.set(uniqueId, monster);
  }

  return invasionMonsters;
}

/**
 * 根据权重选择怪物
 */
function chooseWeightedMonster(entries: SpawnEntry[]): SpawnEntry | null {
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
  if (total <= 0) return entries[0];

  const r = Math.random() * total;
  let acc = 0;
  for (const it of entries) {
    acc += Math.max(0, it.weight);
    if (r <= acc) return it;
  }
  return entries[entries.length - 1];
}

/**
 * 处理入侵怪物移动到边缘的逻辑
 * 近战怪物移动到最近的边缘位置，远程怪物可以停留在棋盘内
 */
export function processInvasionMonsterMovement(
  monsters: Map<string, Monster>,
): Map<string, Monster> {
  const updatedMonsters = new Map<string, Monster>();

  for (const [id, monster] of monsters.entries()) {
    if (!monster.isInvader || !monster.currentPosition) {
      updatedMonsters.set(id, monster);
      continue;
    }

    const updatedMonster = { ...monster };

    if (monster.monsterType === 'melee') {
      // 近战怪物：移动到最近的边缘位置
      const edgePosition = findNearestEdgePosition(monster.currentPosition);
      updatedMonster.currentPosition = edgePosition;
    } else {
      // 远程怪物：可以停留在当前位置，或移动到更有利的位置
      // 这里简化处理，保持当前位置
      updatedMonster.currentPosition = monster.currentPosition;
    }

    updatedMonsters.set(id, updatedMonster);
  }

  return updatedMonsters;
}

/**
 * 找到最近的边缘位置
 * 探索棋盘为6×4，边缘位置定义：
 * - 上边缘：y = -1, x = 0-5
 * - 下边缘：y = 4, x = 0-5
 * - 左边缘：x = -1, y = 0-3
 * - 右边缘：x = 6, y = 0-3
 */
function findNearestEdgePosition(
  currentPos: { x: number; y: number },
): { x: number; y: number } {
  const boardWidth = 6;
  const boardHeight = 4;

  // 计算到各边缘的距离
  const distances = [
    {
      pos: { x: currentPos.x, y: -1 },
      dist: currentPos.y + 1, // 到上边缘
    },
    {
      pos: { x: currentPos.x, y: boardHeight },
      dist: boardHeight - currentPos.y, // 到下边缘
    },
    {
      pos: { x: -1, y: currentPos.y },
      dist: currentPos.x + 1, // 到左边缘
    },
    {
      pos: { x: boardWidth, y: currentPos.y },
      dist: boardWidth - currentPos.x, // 到右边缘
    },
  ];

  // 找到最近的距离
  const nearest = distances.reduce((min, curr) =>
    curr.dist < min.dist ? curr : min,
  );

  return nearest.pos;
}

/**
 * 计算震动值增加
 */
export function calculateVibrationIncrease(
  baseVibrationPerRound: number,
  itemVibrationIncrease?: number,
): number {
  return baseVibrationPerRound + (itemVibrationIncrease || 0);
}

/**
 * 检查道具是否增加震动值
 * 当道具被使用时调用此函数
 */
export function getItemVibrationIncrease(
  itemId: string,
  itemConfigs: Array<{ ID: string; 增加震动值?: number }>,
): number {
  const itemConfig = itemConfigs.find((config) => config.ID === itemId);
  return itemConfig?.增加震动值 ?? 0;
}

