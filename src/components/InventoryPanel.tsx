import type { Explorer, ItemStack } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface InventoryPanelProps {
  visible: boolean;
  explorers: Explorer[];
  tempInventory?: ItemStack[];
  isTempInventoryLocked?: boolean;
  onClose: () => void;
  onMoveFromTempToExplorer?: (itemId: string, quantity: number, explorerId: string) => void;
}

export function InventoryPanel({
  visible,
  explorers,
  tempInventory = [],
  isTempInventoryLocked = true,
  onClose,
  onMoveFromTempToExplorer,
}: InventoryPanelProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#222',
          padding: 16,
          borderRadius: 8,
          width: '90%',
          maxWidth: 800,
          maxHeight: '90%',
          overflow: 'auto',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>探险队背包</h2>
          <button onClick={onClose} style={{ padding: '4px 12px' }}>
            关闭
          </button>
        </div>

        {explorers.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>暂无探险队成员</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {explorers.map((explorer) => {
              const nameKey = (explorer.config as any).名称Key ?? explorer.id;
              const maxHp = (explorer.config as any).最大血量 ?? (explorer.config as any).最大生命 ?? 100;
              const currentHp = explorer.currentHp ?? maxHp;
              const inventory = explorer.inventory ?? [];
              const capacity = explorer.inventoryCapacity ?? 10;
              const usedSlots = inventory.filter((slot) => slot.quantity > 0).length;

              return (
                <div
                  key={explorer.id}
                  style={{
                    border: '1px solid #555',
                    borderRadius: 4,
                    padding: 12,
                    background: '#1a1a1a',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ marginRight: 8, fontSize: 20 }}>🧍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {getText(nameKey)}
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>
                        HP: {currentHp} / {maxHp} | 背包: {usedSlots} / {capacity}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: 4,
                      marginTop: 8,
                    }}
                  >
                    {Array.from({ length: capacity }, (_, i) => {
                      const slot = inventory[i];
                      const isEmpty = !slot || slot.quantity <= 0;

                      return (
                        <div
                          key={i}
                          style={{
                            width: 80,
                            height: 80,
                            border: '1px solid #555',
                            borderRadius: 4,
                            padding: 4,
                            background: isEmpty ? '#111' : '#2a2a2a',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                          }}
                        >
                          {isEmpty ? (
                            <span style={{ color: '#555' }}>空</span>
                          ) : (
                            <>
                              <div style={{ marginBottom: 4, fontSize: 16 }}>📦</div>
                              <div style={{ textAlign: 'center', wordBreak: 'break-word' }}>
                                {slot.itemId}
                              </div>
                              <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
                                x{slot.quantity}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* 临时背包区域 */}
        {!isTempInventoryLocked && tempInventory.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              border: '2px solid #ff9800',
              borderRadius: 8,
              background: '#2a1a0a',
            }}
          >
            <div style={{ marginBottom: 12, color: '#ff9800', fontWeight: 'bold' }}>
              ⚠️ 临时背包（本回合结束后将清空）
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: 4,
              }}
            >
              {tempInventory.map((item, index) => (
                <div
                  key={`${item.itemId}-${index}`}
                  style={{
                    width: 80,
                    height: 80,
                    border: '1px solid #ff9800',
                    borderRadius: 4,
                    padding: 4,
                    background: '#3a2a1a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                  }}
                >
                  <div style={{ marginBottom: 4, fontSize: 16 }}>📦</div>
                  <div style={{ textAlign: 'center', wordBreak: 'break-word' }}>
                    {item.itemId}
                  </div>
                  <div style={{ color: '#ff9800', fontWeight: 'bold' }}>x{item.quantity}</div>
                  {onMoveFromTempToExplorer && explorers.length > 0 && (
                    <button
                      style={{
                        marginTop: 4,
                        padding: '2px 6px',
                        fontSize: 10,
                        background: '#4caf50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        // 移动到第一个有空间的探险者
                        const firstExplorer = explorers[0];
                        if (firstExplorer) {
                          onMoveFromTempToExplorer(item.itemId, item.quantity, firstExplorer.id);
                        }
                      }}
                    >
                      移动
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
