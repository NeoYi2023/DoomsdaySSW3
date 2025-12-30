import type {
  DefenseFacilityConfigEntry,
  ResourceConfigEntry,
} from '../types/configTypes';
import type { DefenseFacility, ItemStack } from '../types/gameTypes';

/**
 * 解析资源消耗字符串
 */
function parseResourceCost(costStr?: string): Array<{ resourceId: string; quantity: number }> {
  if (!costStr) return [];
  const costs: Array<{ resourceId: string; quantity: number }> = [];
  const entries = costStr.split('|');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('_');
    if (parts.length >= 2) {
      const resourceId = parts.slice(0, -1).join('_');
      const quantity = Number(parts[parts.length - 1]);
      if (!isNaN(quantity)) {
        costs.push({ resourceId, quantity });
      }
    }
  }
  return costs;
}

/**
 * 检查是否有足够的资源建造设施
 */
export function canBuildFacility(
  facilityConfig: DefenseFacilityConfigEntry,
  warehouse: ItemStack[],
): boolean {
  const costs = parseResourceCost(facilityConfig.建造消耗资源列表);
  for (const cost of costs) {
    const warehouseItem = warehouse.find((item) => item.itemId === cost.resourceId);
    if (!warehouseItem || warehouseItem.quantity < cost.quantity) {
      return false;
    }
  }
  return true;
}

/**
 * 建造防御设施
 */
export function buildFacility(
  facilityConfig: DefenseFacilityConfigEntry,
  position: { x: number; y: number },
  warehouse: ItemStack[],
): { facility: DefenseFacility | null; updatedWarehouse: ItemStack[] } {
  if (!canBuildFacility(facilityConfig, warehouse)) {
    return { facility: null, updatedWarehouse: warehouse };
  }

  // 扣除资源
  const costs = parseResourceCost(facilityConfig.建造消耗资源列表);
  const updatedWarehouse = [...warehouse];
  for (const cost of costs) {
    const itemIndex = updatedWarehouse.findIndex((item) => item.itemId === cost.resourceId);
    if (itemIndex >= 0) {
      updatedWarehouse[itemIndex] = {
        ...updatedWarehouse[itemIndex],
        quantity: updatedWarehouse[itemIndex].quantity - cost.quantity,
      };
      if (updatedWarehouse[itemIndex].quantity <= 0) {
        updatedWarehouse.splice(itemIndex, 1);
      }
    }
  }

  // 创建设施
  const facility: DefenseFacility = {
    id: `facility_${facilityConfig.ID}_${Date.now()}`,
    config: facilityConfig,
    currentHp: facilityConfig.初始血量,
    level: 1,
    position,
    lastAttackTime: 0,
  };

  return { facility, updatedWarehouse };
}

/**
 * 检查是否可以升级设施
 */
export function canUpgradeFacility(
  facility: DefenseFacility,
  warehouse: ItemStack[],
): boolean {
  const costs = parseResourceCost(facility.config.升级消耗资源列表);
  for (const cost of costs) {
    const warehouseItem = warehouse.find((item) => item.itemId === cost.resourceId);
    if (!warehouseItem || warehouseItem.quantity < cost.quantity) {
      return false;
    }
  }
  return true;
}

/**
 * 升级防御设施
 */
export function upgradeFacility(
  facility: DefenseFacility,
  warehouse: ItemStack[],
): { updatedFacility: DefenseFacility | null; updatedWarehouse: ItemStack[] } {
  if (!canUpgradeFacility(facility, warehouse)) {
    return { updatedFacility: null, updatedWarehouse: warehouse };
  }

  // 扣除资源
  const costs = parseResourceCost(facility.config.升级消耗资源列表);
  const updatedWarehouse = [...warehouse];
  for (const cost of costs) {
    const itemIndex = updatedWarehouse.findIndex((item) => item.itemId === cost.resourceId);
    if (itemIndex >= 0) {
      updatedWarehouse[itemIndex] = {
        ...updatedWarehouse[itemIndex],
        quantity: updatedWarehouse[itemIndex].quantity - cost.quantity,
      };
      if (updatedWarehouse[itemIndex].quantity <= 0) {
        updatedWarehouse.splice(itemIndex, 1);
      }
    }
  }

  // 升级设施
  const updatedFacility: DefenseFacility = {
    ...facility,
    level: facility.level + 1,
    currentHp: Math.min(
      facility.currentHp + facility.config.初始血量 * 0.2, // 升级增加20%血量
      facility.config.最大血量,
    ),
  };

  return { updatedFacility, updatedWarehouse };
}

/**
 * 获取攻击范围内的设施
 */
export function getFacilitiesInRange(
  facility: DefenseFacility,
  allFacilities: Map<string, DefenseFacility>,
): DefenseFacility[] {
  const inRange: DefenseFacility[] = [];
  const range = facility.config.攻击范围;

  for (const otherFacility of allFacilities.values()) {
    if (otherFacility.id === facility.id) continue;
    const distance = Math.sqrt(
      Math.pow(facility.position.x - otherFacility.position.x, 2) +
        Math.pow(facility.position.y - otherFacility.position.y, 2),
    );
    if (distance <= range) {
      inRange.push(otherFacility);
    }
  }

  return inRange;
}

/**
 * 计算设施到怪物的距离
 */
export function getDistanceToMonster(
  facility: DefenseFacility,
  monsterPosition: { x: number; y: number },
): number {
  return Math.sqrt(
    Math.pow(facility.position.x - monsterPosition.x, 2) +
      Math.pow(facility.position.y - monsterPosition.y, 2),
  );
}

/**
 * 获取设施攻击范围内的怪物
 */
export function getMonstersInFacilityRange(
  facility: DefenseFacility,
  monsters: Map<string, import('../types/gameTypes').Monster>,
): Array<{ monster: import('../types/gameTypes').Monster; distance: number }> {
  const inRange: Array<{ monster: import('../types/gameTypes').Monster; distance: number }> = [];
  const range = facility.config.攻击范围;

  for (const monster of monsters.values()) {
    if (!monster.isInvader || !monster.currentPosition) continue;
    const distance = getDistanceToMonster(facility, monster.currentPosition);
    if (distance <= range) {
      inRange.push({ monster, distance });
    }
  }

  return inRange;
}

/**
 * 处理设施自动攻击
 */
export function processFacilityAttack(
  facility: DefenseFacility,
  monsters: Map<string, import('../types/gameTypes').Monster>,
  currentTime: number,
): {
  updatedFacility: DefenseFacility;
  updatedMonsters: Map<string, import('../types/gameTypes').Monster>;
  damageDealt: number;
} {
  const updatedMonsters = new Map(monsters);
  let damageDealt = 0;

  // 检查攻击冷却
  const attackInterval = 1000 / facility.config.攻击速度; // 转换为毫秒
  if (currentTime - facility.lastAttackTime < attackInterval) {
    return {
      updatedFacility: facility,
      updatedMonsters,
      damageDealt: 0,
    };
  }

  // 获取攻击范围内的怪物
  const targets = getMonstersInFacilityRange(facility, monsters);

  if (targets.length === 0) {
    return {
      updatedFacility: facility,
      updatedMonsters,
      damageDealt: 0,
    };
  }

  // 选择最近的怪物作为目标
  const target = targets.reduce((nearest, curr) =>
    curr.distance < nearest.distance ? curr : nearest,
  );

  // 计算伤害（根据设施等级提升）
  const baseDamage = facility.config.攻击力;
  const levelMultiplier = 1 + (facility.level - 1) * 0.1; // 每级增加10%伤害
  const damage = Math.floor(baseDamage * levelMultiplier);

  // 应用伤害
  const monster = target.monster;
  const updatedMonster = {
    ...monster,
    currentHp: Math.max(0, monster.currentHp - damage),
  };

  damageDealt = damage;
  updatedMonsters.set(monster.id, updatedMonster);

  // 更新设施攻击时间
  const updatedFacility: DefenseFacility = {
    ...facility,
    lastAttackTime: currentTime,
  };

  return {
    updatedFacility,
    updatedMonsters,
    damageDealt,
  };
}

