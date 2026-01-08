import type { ResourceStack, ProspectingShip } from '../types/gameTypes';
import type { ResourceConfigEntry } from '../types/configTypes';

/**
 * 资源类型枚举
 */
export type ResourceType = '普通资源' | '能源类资源' | '特殊资源';

/**
 * 资源转换结果
 */
export interface ResourceConversionResult {
  fundsGained: number; // 获得的资金
  energyGained: number; // 获得的能源
  remainingResources: ResourceStack[]; // 剩余的特殊资源（不转换的资源）
}

/**
 * 将资源转换为资金或能源
 */
export function convertResources(
  resources: ResourceStack[],
  resourceConfigs: ResourceConfigEntry[],
  ship: ProspectingShip,
): ResourceConversionResult {
  const configMap = new Map<string, ResourceConfigEntry>();
  for (const config of resourceConfigs) {
    configMap.set(config.ID, config);
  }

  let fundsGained = 0;
  let energyGained = 0;
  const remainingResources: ResourceStack[] = [];

  for (const resource of resources) {
    const config = configMap.get(resource.resourceId);
    if (!config) {
      // 配置不存在，作为特殊资源保留
      remainingResources.push(resource);
      continue;
    }

    const resourceType = config.资源类型;
    const quantity = resource.quantity;

    if (quantity < 0) {
      // 负值产出：扣除资金或能源
      if (resourceType === '普通资源' || resourceType === '材料' || resourceType === '食物' || resourceType === '水') {
        // 扣除资金
        const conversionRate = config.资金兑换比 ?? 1;
        const fundsToDeduct = Math.abs(quantity) * conversionRate;
        fundsGained -= fundsToDeduct; // 负值表示扣除
      } else if (resourceType === '能源类资源' || resourceType === '能源') {
        // 扣除能源
        const conversionRate = config.能源转换比 ?? 1;
        const energyToDeduct = Math.abs(quantity) * conversionRate;
        energyGained -= energyToDeduct; // 负值表示扣除
      }
      // 负值的特殊资源不处理（不保留）
    } else if (quantity > 0) {
      // 正值产出：转换为资金或能源
      if (resourceType === '普通资源' || resourceType === '材料' || resourceType === '食物' || resourceType === '水') {
        // 转换为资金
        const conversionRate = config.资金兑换比 ?? 1;
        const funds = quantity * conversionRate * ship.fundsMultiplier; // 应用资金倍率
        fundsGained += funds;
      } else if (resourceType === '能源类资源' || resourceType === '能源') {
        // 转换为能源
        const conversionRate = config.能源转换比 ?? 1;
        const energy = quantity * conversionRate;
        energyGained += energy;
      } else {
        // 特殊资源（如医疗包、科技点等），保留不转换
        remainingResources.push(resource);
      }
    }
  }

  return {
    fundsGained,
    energyGained,
    remainingResources,
  };
}

/**
 * 应用资源转换结果到勘探船
 */
export function applyResourceConversion(
  ship: ProspectingShip,
  conversionResult: ResourceConversionResult,
): ProspectingShip {
  const newFunds = Math.max(0, ship.currentFunds + conversionResult.fundsGained);
  const newEnergy = ship.currentEnergy + conversionResult.energyGained;

  return {
    ...ship,
    currentFunds: newFunds,
    currentEnergy: Math.max(0, newEnergy), // 能源不能为负
  };
}
