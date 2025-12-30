import React from 'react';
import type { InvasionState, ProspectingShip, DefenseFacility } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface InvasionBattlePanelProps {
  invasionState: InvasionState | null;
  ship: ProspectingShip | null;
  facilities: Map<string, DefenseFacility>;
  vibrationValue: number;
  maxVibration: number;
}

export const InvasionBattlePanel: React.FC<InvasionBattlePanelProps> = ({
  invasionState,
  ship,
  facilities,
  vibrationValue,
  maxVibration,
}) => {
  if (!ship) return null;

  const vibrationPercentage = maxVibration > 0 ? (vibrationValue / maxVibration) * 100 : 0;
  const isInvasionActive = invasionState?.isActive ?? false;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        background: '#222',
        border: '2px solid #555',
        borderRadius: 8,
        padding: 16,
        minWidth: 300,
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>勘探船状态</h3>
      
      {/* 船体血量 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#aaa' }}>船体血量:</span>
          <span style={{ color: ship.currentHp <= 0 ? '#f44' : '#4f4' }}>
            {ship.currentHp} / {ship.maxHp}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 20,
            background: '#333',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(ship.currentHp / ship.maxHp) * 100}%`,
              height: '100%',
              background: ship.currentHp <= ship.maxHp * 0.3 ? '#f44' : ship.currentHp <= ship.maxHp * 0.6 ? '#fa4' : '#4f4',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* 震动值 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#aaa' }}>震动值:</span>
          <span style={{ color: vibrationPercentage >= 100 ? '#f44' : vibrationPercentage >= 80 ? '#fa4' : '#fff' }}>
            {vibrationValue} / {maxVibration}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 20,
            background: '#333',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${vibrationPercentage}%`,
              height: '100%',
              background: vibrationPercentage >= 100 ? '#f44' : vibrationPercentage >= 80 ? '#fa4' : '#4af',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* 入侵状态 */}
      {isInvasionActive && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: '#f44',
            borderRadius: 4,
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          怪物入侵中！
          <div style={{ fontSize: 12, marginTop: 4 }}>
            入侵怪物: {invasionState?.invasionMonsters.size ?? 0}
          </div>
          <div style={{ fontSize: 12 }}>
            防御设施: {facilities.size}
          </div>
        </div>
      )}

      {/* 防御设施列表 */}
      {facilities.size > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#aaa', marginBottom: 8 }}>防御设施:</div>
          {Array.from(facilities.values()).map((facility) => (
            <div
              key={facility.id}
              style={{
                marginBottom: 4,
                padding: 4,
                background: '#333',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#fff' }}>
                  {getText(facility.config.名称Key)} (Lv.{facility.level})
                </span>
                <span style={{ color: facility.currentHp <= 0 ? '#f44' : '#4f4' }}>
                  {facility.currentHp} / {facility.config.最大血量}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

