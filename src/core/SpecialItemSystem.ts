import type { ProspectingShip } from '../types/gameTypes';

/**
 * 应用特殊道具效果到勘探船
 */
export function applySpecialItemEffect(
  ship: ProspectingShip,
  effectType: string,
  effectParams: Record<string, number>,
): ProspectingShip {
  const updatedShip = { ...ship };

  switch (effectType) {
    case 'ReduceVibrationRate':
      // 降低每回合震动值增加值
      const amount = effectParams.amount ?? 0;
      updatedShip.vibrationReduction = (updatedShip.vibrationReduction ?? 0) + amount;
      break;

    case 'IncreaseShipAttack':
      // 提升勘探船攻击力
      const attackAmount = effectParams.amount ?? 0;
      updatedShip.extraAttack = (updatedShip.extraAttack ?? 0) + attackAmount;
      break;

    case 'IncreaseFundsRate':
      // 提升资金获取倍率
      const multiplier = effectParams.multiplier ?? 1.0;
      updatedShip.fundsMultiplier = (updatedShip.fundsMultiplier ?? 1.0) * multiplier;
      break;

    default:
      // 未知效果类型，忽略
      console.warn(`Unknown effect type: ${effectType}`);
      break;
  }

  return updatedShip;
}

/**
 * 获取实际震动值增加值（考虑减少量）
 */
export function getActualVibrationIncrease(ship: ProspectingShip): number {
  const base = ship.baseVibrationPerRound ?? 0;
  const reduction = ship.vibrationReduction ?? 0;
  return Math.max(0, base - reduction);
}
