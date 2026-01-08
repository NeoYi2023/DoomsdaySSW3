import type { ProspectingShip } from '../types/gameTypes';

/**
 * 检查是否达到能源阈值，触发三选一升级
 */
export function checkEnergyThreshold(ship: ProspectingShip): boolean {
  return ship.currentEnergy >= ship.nextEnergyThreshold;
}

/**
 * 计算下次能源阈值（可以根据升级次数递增）
 */
export function calculateNextEnergyThreshold(
  currentThreshold: number,
  upgradeCount: number,
  baseIncrement: number = 10, // 基础递增值
  incrementMultiplier: number = 1.2, // 递增倍数
): number {
  // 简单的递增算法：每次升级后，下次阈值 = 当前阈值 + 基础递增值 * (1.2 ^ 升级次数)
  return Math.floor(currentThreshold + baseIncrement * Math.pow(incrementMultiplier, upgradeCount));
}

/**
 * 应用三选一升级效果（消耗能源，更新阈值）
 */
export function applyUpgrade(
  ship: ProspectingShip,
  energyCost: number,
): ProspectingShip {
  const newEnergy = Math.max(0, ship.currentEnergy - energyCost);
  const newUpgradeCount = ship.upgradeCount + 1;
  const newThreshold = calculateNextEnergyThreshold(ship.nextEnergyThreshold, newUpgradeCount);

  return {
    ...ship,
    currentEnergy: newEnergy,
    upgradeCount: newUpgradeCount,
    nextEnergyThreshold: newThreshold,
  };
}

/**
 * 初始化能源系统（首次创建勘探船时调用）
 */
export function initializeEnergySystem(
  ship: ProspectingShip,
  initialThreshold: number = 10, // 首次触发所需的能源值
): ProspectingShip {
  return {
    ...ship,
    currentEnergy: ship.currentEnergy ?? 0,
    nextEnergyThreshold: ship.nextEnergyThreshold ?? initialThreshold,
    upgradeCount: ship.upgradeCount ?? 0,
  };
}
