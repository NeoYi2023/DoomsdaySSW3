import type { Monster, DefenseFacility, ProspectingShip } from '../types/gameTypes';
import { processFacilityAttack } from './DefenseFacilitySystem';

export interface InvasionBattleState {
  ship: ProspectingShip;
  monsters: Map<string, Monster>;
  facilities: Map<string, DefenseFacility>;
  isActive: boolean;
  startTime: number;
}

export interface InvasionBattleResult {
  updatedState: InvasionBattleState;
  shipDestroyed: boolean;
  allMonstersDefeated: boolean;
}

/**
 * 处理怪物攻击船体或设施
 */
function processMonsterAttack(
  monster: Monster,
  ship: ProspectingShip,
  facilities: Map<string, DefenseFacility>,
): {
  updatedShip: ProspectingShip;
  updatedFacilities: Map<string, DefenseFacility>;
  targetDestroyed: boolean;
} {
  let updatedShip = { ...ship };
  const updatedFacilities = new Map(facilities);
  let targetDestroyed = false;

  if (monster.monsterType === 'melee') {
    // 近战怪物：攻击相邻的设施或船体
    if (monster.targetType === 'facility' && monster.targetPosition) {
      // 攻击设施
      const facilityId = Array.from(facilities.keys()).find((id) => {
        const facility = facilities.get(id);
        return (
          facility &&
          facility.position.x === monster.targetPosition!.x &&
          facility.position.y === monster.targetPosition!.y
        );
      });

      if (facilityId) {
        const facility = facilities.get(facilityId)!;
        const damage = monster.config.攻击力;
        const updatedFacility: DefenseFacility = {
          ...facility,
          currentHp: Math.max(0, facility.currentHp - damage),
        };

        if (updatedFacility.currentHp <= 0) {
          targetDestroyed = true;
          updatedFacilities.delete(facilityId);
        } else {
          updatedFacilities.set(facilityId, updatedFacility);
        }
      }
    } else {
      // 攻击船体
      const damage = monster.config.攻击力;
      updatedShip = {
        ...updatedShip,
        currentHp: Math.max(0, ship.currentHp - damage),
      };
      if (updatedShip.currentHp <= 0) {
        targetDestroyed = true;
      }
    }
  } else {
    // 远程怪物：可以在棋盘内攻击外围目标
    const damage = monster.config.攻击力;
    updatedShip = {
      ...updatedShip,
      currentHp: Math.max(0, ship.currentHp - damage),
    };
    if (updatedShip.currentHp <= 0) {
      targetDestroyed = true;
    }
  }

  return {
    updatedShip,
    updatedFacilities,
    targetDestroyed,
  };
}

/**
 * 更新怪物目标
 */
function updateMonsterTargets(
  monsters: Map<string, Monster>,
  facilities: Map<string, DefenseFacility>,
): Map<string, Monster> {
  const updatedMonsters = new Map<string, Monster>();

  for (const [id, monster] of monsters.entries()) {
    if (!monster.isInvader || !monster.currentPosition) {
      updatedMonsters.set(id, monster);
      continue;
    }

    const updatedMonster = { ...monster };

    // 优先攻击设施，如果没有设施则攻击船体
    if (facilities.size > 0) {
      // 找到最近的设施
      let nearestFacility: DefenseFacility | null = null;
      let minDistance = Infinity;

      for (const facility of facilities.values()) {
        const distance = Math.sqrt(
          Math.pow(monster.currentPosition!.x - facility.position.x, 2) +
            Math.pow(monster.currentPosition!.y - facility.position.y, 2),
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestFacility = facility;
        }
      }

      if (nearestFacility) {
        updatedMonster.targetType = 'facility';
        updatedMonster.targetPosition = nearestFacility.position;
      } else {
        updatedMonster.targetType = 'ship';
        updatedMonster.targetPosition = null;
      }
    } else {
      updatedMonster.targetType = 'ship';
      updatedMonster.targetPosition = null;
    }

    updatedMonsters.set(id, updatedMonster);
  }

  return updatedMonsters;
}

/**
 * 执行一次即时制战斗循环
 */
export function processInvasionBattleTurn(
  state: InvasionBattleState,
  currentTime: number,
): InvasionBattleResult {
  let updatedState = { ...state };
  let shipDestroyed = false;
  let allMonstersDefeated = false;

  // 1. 更新怪物目标
  updatedState.monsters = updateMonsterTargets(updatedState.monsters, updatedState.facilities);

  // 2. 处理防御设施攻击
  const updatedFacilities = new Map<string, DefenseFacility>();
  for (const [facilityId, facility] of updatedState.facilities.entries()) {
    const attackResult = processFacilityAttack(
      facility,
      updatedState.monsters,
      currentTime,
    );
    updatedFacilities.set(facilityId, attackResult.updatedFacility);
    updatedState.monsters = attackResult.updatedMonsters;
  }
  updatedState.facilities = updatedFacilities;

  // 3. 移除死亡的怪物
  const aliveMonsters = new Map<string, Monster>();
  for (const [id, monster] of updatedState.monsters.entries()) {
    if (monster.currentHp > 0) {
      aliveMonsters.set(id, monster);
    }
  }
  updatedState.monsters = aliveMonsters;

  // 4. 处理怪物攻击
  for (const [id, monster] of updatedState.monsters.entries()) {
    if (!monster.isInvader || monster.currentHp <= 0) continue;

    const attackResult = processMonsterAttack(
      monster,
      updatedState.ship,
      updatedState.facilities,
    );
    updatedState.ship = attackResult.updatedShip;
    updatedState.facilities = attackResult.updatedFacilities;

    if (attackResult.targetDestroyed && attackResult.updatedShip.currentHp <= 0) {
      shipDestroyed = true;
      break;
    }
  }

  // 5. 检查胜利条件
  if (updatedState.monsters.size === 0) {
    allMonstersDefeated = true;
  }

  // 6. 检查失败条件
  if (updatedState.ship.currentHp <= 0) {
    shipDestroyed = true;
  }

  return {
    updatedState,
    shipDestroyed,
    allMonstersDefeated,
  };
}

/**
 * 创建入侵战斗状态
 */
export function createInvasionBattleState(
  ship: ProspectingShip,
  monsters: Map<string, Monster>,
  facilities: Map<string, DefenseFacility>,
): InvasionBattleState {
  return {
    ship,
    monsters,
    facilities,
    isActive: true,
    startTime: Date.now(),
  };
}

