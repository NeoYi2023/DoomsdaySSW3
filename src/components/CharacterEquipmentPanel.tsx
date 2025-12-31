import { useState } from 'react';
import type { Explorer, ItemStack, EquipmentConfigEntry } from '../types/gameTypes';
import type { EquipmentSlotType } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface CharacterEquipmentPanelProps {
  visible: boolean;
  explorers: Explorer[];
  equipmentConfigs: EquipmentConfigEntry[];
  warehouse: ItemStack[]; // 避难所仓库
  onClose: () => void;
  onEquip: (explorerId: string, slotIndex: number, equipmentId: string) => void;
  onUnequip: (explorerId: string, slotIndex: number) => void;
}

const EQUIPMENT_SLOT_TYPES: EquipmentSlotType[] = ['工具', '武器', '防具', '饰品', '特殊', '备用'];
const SLOT_TYPE_NAMES: Record<EquipmentSlotType, string> = {
  工具: '工具',
  武器: '武器',
  防具: '防具',
  饰品: '饰品',
  特殊: '特殊',
  备用: '备用',
};

export function CharacterEquipmentPanel({
  visible,
  explorers,
  equipmentConfigs,
  warehouse,
  onClose,
  onEquip,
  onUnequip,
}: CharacterEquipmentPanelProps) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/99dbafae-a66d-45a6-82ab-975b44cc18a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CharacterEquipmentPanel:render',message:'组件渲染',data:{visible,explorersCount:explorers.length,explorerIds:explorers.map(e=>e.id)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const [selectedExplorerId, setSelectedExplorerId] = useState<string>(
    explorers.length > 0 ? explorers[0].id : ''
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  if (!visible || explorers.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/99dbafae-a66d-45a6-82ab-975b44cc18a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CharacterEquipmentPanel:early return',message:'提前返回',data:{visible,explorersCount:explorers.length,reason:!visible?'visible=false':explorers.length===0?'explorers.length=0':'unknown'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return null;
  }

  const selectedExplorer = explorers.find((e) => e.id === selectedExplorerId);
  if (!selectedExplorer) {
    // 如果选中的角色不存在，选择第一个
    if (explorers.length > 0) {
      setSelectedExplorerId(explorers[0].id);
      return null;
    }
    return null;
  }

  // 获取仓库中指定类型的装备
  const getAvailableEquipment = (slotType: EquipmentSlotType): EquipmentConfigEntry[] => {
    const warehouseEquipmentIds = warehouse
      .filter((item) => item.quantity > 0)
      .map((item) => item.itemId);
    
    return equipmentConfigs.filter((eq) => {
      // 检查是否在仓库中
      if (!warehouseEquipmentIds.includes(eq.ID)) return false;
      
      // 检查装备标签是否匹配槽位类型
      const tagsRaw = eq.装备标签列表 ?? '';
      let tags: string[] = [];
      if (typeof tagsRaw === 'string') {
        tags = tagsRaw.split('|').map((t) => t.trim()).filter(Boolean);
      } else if (Array.isArray(tagsRaw)) {
        tags = tagsRaw.map((t) => String(t).trim()).filter(Boolean);
      }
      return tags.includes(slotType);
    });
  };

  // 获取已装备的装备ID
  const getEquippedId = (slotIndex: number): string | null => {
    return selectedExplorer.equipment[slotIndex] ?? null;
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedSlotIndex === slotIndex) {
      // 如果点击的是已选中的槽位，取消选择
      setSelectedSlotIndex(null);
      setSelectedEquipmentId(null);
    } else {
      setSelectedSlotIndex(slotIndex);
      setSelectedEquipmentId(null);
    }
  };

  const handleEquipmentSelect = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
  };

  const handleInstall = () => {
    if (selectedSlotIndex !== null && selectedEquipmentId) {
      onEquip(selectedExplorerId, selectedSlotIndex, selectedEquipmentId);
      setSelectedSlotIndex(null);
      setSelectedEquipmentId(null);
    }
  };

  const handleUnequip = (slotIndex: number) => {
    onUnequip(selectedExplorerId, slotIndex);
    setSelectedSlotIndex(null);
    setSelectedEquipmentId(null);
  };

  const currentSlotType = selectedSlotIndex !== null 
    ? (selectedExplorer.equipmentSlotTypes[selectedSlotIndex] ?? EQUIPMENT_SLOT_TYPES[selectedSlotIndex])
    : null;
  const availableEquipment = currentSlotType 
    ? getAvailableEquipment(currentSlotType) 
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#222',
          padding: 24,
          borderRadius: 8,
          width: '90%',
          maxWidth: 1000,
          maxHeight: '90%',
          overflow: 'auto',
          color: '#fff',
          display: 'flex',
          gap: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧：角色列表 */}
        <div style={{ width: 200, borderRight: '1px solid #444', paddingRight: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>角色列表</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {explorers.map((explorer) => (
              <button
                key={explorer.id}
                onClick={() => {
                  setSelectedExplorerId(explorer.id);
                  setSelectedSlotIndex(null);
                  setSelectedEquipmentId(null);
                }}
                style={{
                  padding: 12,
                  background: selectedExplorerId === explorer.id ? '#444' : '#333',
                  border: selectedExplorerId === explorer.id ? '2px solid #0af' : '1px solid #555',
                  borderRadius: 4,
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{explorer.config.名称Key}</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>
                  HP: {explorer.currentHp}/{explorer.config.最大生命 ?? explorer.config.最大血量 ?? 10}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：装备槽位 */}
        <div style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>
            {selectedExplorer.config.名称Key} - 装备管理
          </h2>
          
          {/* 装备槽位网格 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 24,
            }}
          >
            {EQUIPMENT_SLOT_TYPES.map((slotType, index) => {
              const equippedId = getEquippedId(index);
              const isSelected = selectedSlotIndex === index;
              const equippedConfig = equippedId
                ? equipmentConfigs.find((eq) => eq.ID === equippedId)
                : null;

              return (
                <div
                  key={index}
                  style={{
                    border: isSelected ? '2px solid #0af' : '1px solid #555',
                    borderRadius: 4,
                    padding: 12,
                    background: isSelected ? '#333' : '#2a2a2a',
                    cursor: 'pointer',
                    minHeight: 100,
                  }}
                  onClick={() => handleSlotClick(index)}
                >
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
                    {SLOT_TYPE_NAMES[slotType]}
                  </div>
                  {equippedConfig ? (
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {equippedConfig.名称Key}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {equippedConfig.描述Key ?? ''}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: 12 }}>空槽位</div>
                  )}
                  {isSelected && equippedId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnequip(index);
                      }}
                      style={{
                        marginTop: 8,
                        padding: '4px 8px',
                        background: '#d32f2f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      卸下装备
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 装备选择区域 */}
          {selectedSlotIndex !== null && !getEquippedId(selectedSlotIndex) && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>
                选择{SLOT_TYPE_NAMES[currentSlotType!]}装备
              </h3>
              {availableEquipment.length === 0 ? (
                <div style={{ color: '#888', padding: 16, textAlign: 'center' }}>
                  仓库中没有可用的{SLOT_TYPE_NAMES[currentSlotType!]}装备
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {availableEquipment.map((eq) => {
                      const isSelected = selectedEquipmentId === eq.ID;
                      return (
                        <div
                          key={eq.ID}
                          onClick={() => handleEquipmentSelect(eq.ID)}
                          style={{
                            border: isSelected ? '2px solid #0af' : '1px solid #555',
                            borderRadius: 4,
                            padding: 8,
                            background: isSelected ? '#333' : '#2a2a2a',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: 12 }}>
                            {eq.名称Key}
                          </div>
                          {eq.描述Key && (
                            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                              {eq.描述Key}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedEquipmentId && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleInstall}
                        style={{
                          padding: '8px 16px',
                          background: '#0af',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        安装
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEquipmentId(null);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#666',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

