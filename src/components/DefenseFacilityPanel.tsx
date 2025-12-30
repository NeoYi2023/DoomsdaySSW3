import React, { useState } from 'react';
import type { DefenseFacility, ItemStack } from '../types/gameTypes';
import type { DefenseFacilityConfigEntry } from '../types/configTypes';
import { getText } from '../core/LanguageManager';
import { canBuildFacility, buildFacility, canUpgradeFacility, upgradeFacility } from '../core/DefenseFacilitySystem';

export interface DefenseFacilityPanelProps {
  visible: boolean;
  facilities: Map<string, DefenseFacility>;
  facilityConfigs: DefenseFacilityConfigEntry[];
  warehouse: ItemStack[];
  onClose: () => void;
  onBuild: (facility: DefenseFacility, updatedWarehouse: ItemStack[]) => void;
  onUpgrade: (facilityId: string, updatedFacility: DefenseFacility, updatedWarehouse: ItemStack[]) => void;
}

// 探索棋盘外围位置（6×4棋盘）
const EDGE_POSITIONS = [
  // 上边缘
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 2, y: -1 }, { x: 3, y: -1 }, { x: 4, y: -1 }, { x: 5, y: -1 },
  // 下边缘
  { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
  // 左边缘
  { x: -1, y: 0 }, { x: -1, y: 1 }, { x: -1, y: 2 }, { x: -1, y: 3 },
  // 右边缘
  { x: 6, y: 0 }, { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 },
];

export const DefenseFacilityPanel: React.FC<DefenseFacilityPanelProps> = ({
  visible,
  facilities,
  facilityConfigs,
  warehouse,
  onClose,
  onBuild,
  onUpgrade,
}) => {
  const [selectedFacilityConfig, setSelectedFacilityConfig] = useState<DefenseFacilityConfigEntry | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);

  if (!visible) return null;

  // 获取已占用的位置
  const occupiedPositions = new Set<string>();
  for (const facility of facilities.values()) {
    occupiedPositions.add(`${facility.position.x},${facility.position.y}`);
  }

  // 获取可用位置
  const availablePositions = EDGE_POSITIONS.filter(
    (pos) => !occupiedPositions.has(`${pos.x},${pos.y}`)
  );

  const handleBuild = () => {
    if (!selectedFacilityConfig || !selectedPosition) {
      alert('请选择设施和位置');
      return;
    }

    if (!canBuildFacility(selectedFacilityConfig, warehouse)) {
      alert('资源不足，无法建造');
      return;
    }

    const result = buildFacility(selectedFacilityConfig, selectedPosition, warehouse);
    if (result.facility) {
      onBuild(result.facility, result.updatedWarehouse);
      setSelectedFacilityConfig(null);
      setSelectedPosition(null);
      alert('建造成功！');
    } else {
      alert('建造失败');
    }
  };

  const handleUpgrade = (facilityId: string) => {
    const facility = facilities.get(facilityId);
    if (!facility) return;

    if (!canUpgradeFacility(facility, warehouse)) {
      alert('资源不足，无法升级');
      return;
    }

    const result = upgradeFacility(facility, warehouse);
    if (result.updatedFacility) {
      onUpgrade(facilityId, result.updatedFacility, result.updatedWarehouse);
      alert('升级成功！');
    } else {
      alert('升级失败');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#222',
        border: '2px solid #555',
        borderRadius: 8,
        padding: 24,
        minWidth: 600,
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 2000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#fff' }}>防御设施管理</h2>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: '#555',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          关闭
        </button>
      </div>

      {/* 现有设施列表 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#fff', marginBottom: 12 }}>现有设施</h3>
        {facilities.size === 0 ? (
          <div style={{ color: '#aaa', padding: 16, textAlign: 'center' }}>暂无防御设施</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from(facilities.values()).map((facility) => (
              <div
                key={facility.id}
                style={{
                  padding: 12,
                  background: '#333',
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>
                    {getText(facility.config.名称Key)} (Lv.{facility.level})
                  </div>
                  <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                    位置: ({facility.position.x}, {facility.position.y}) | 
                    血量: {facility.currentHp} / {facility.config.最大血量} | 
                    攻击力: {facility.config.攻击力} | 
                    攻击范围: {facility.config.攻击范围}
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade(facility.id)}
                  disabled={!canUpgradeFacility(facility, warehouse)}
                  style={{
                    padding: '6px 12px',
                    background: canUpgradeFacility(facility, warehouse) ? '#4af' : '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: canUpgradeFacility(facility, warehouse) ? 'pointer' : 'not-allowed',
                  }}
                >
                  升级
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 建造新设施 */}
      <div>
        <h3 style={{ color: '#fff', marginBottom: 12 }}>建造新设施</h3>
        
        {/* 选择设施类型 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#aaa', marginBottom: 8 }}>选择设施类型:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {facilityConfigs.map((config) => (
              <button
                key={config.ID}
                onClick={() => setSelectedFacilityConfig(config)}
                style={{
                  padding: '8px 16px',
                  background: selectedFacilityConfig?.ID === config.ID ? '#4af' : '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {getText(config.名称Key)}
              </button>
            ))}
          </div>
        </div>

        {/* 选择位置 */}
        {selectedFacilityConfig && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#aaa', marginBottom: 8 }}>选择建造位置:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxWidth: 400 }}>
              {EDGE_POSITIONS.map((pos, index) => {
                const isOccupied = occupiedPositions.has(`${pos.x},${pos.y}`);
                const isSelected = selectedPosition?.x === pos.x && selectedPosition?.y === pos.y;
                return (
                  <button
                    key={index}
                    onClick={() => !isOccupied && setSelectedPosition(pos)}
                    disabled={isOccupied}
                    style={{
                      padding: '8px',
                      background: isOccupied ? '#333' : isSelected ? '#4af' : '#444',
                      color: isOccupied ? '#666' : '#fff',
                      border: '1px solid #555',
                      borderRadius: 4,
                      cursor: isOccupied ? 'not-allowed' : 'pointer',
                      fontSize: 10,
                    }}
                    title={`(${pos.x}, ${pos.y})`}
                  >
                    {isOccupied ? '×' : `${pos.x},${pos.y}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 建造按钮 */}
        {selectedFacilityConfig && selectedPosition && (
          <button
            onClick={handleBuild}
            disabled={!canBuildFacility(selectedFacilityConfig, warehouse)}
            style={{
              padding: '12px 24px',
              background: canBuildFacility(selectedFacilityConfig, warehouse) ? '#4f4' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: canBuildFacility(selectedFacilityConfig, warehouse) ? 'pointer' : 'not-allowed',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            建造 {getText(selectedFacilityConfig.名称Key)}
          </button>
        )}
      </div>
    </div>
  );
};

