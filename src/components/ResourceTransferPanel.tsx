import { useState } from 'react';
import type { Explorer, ItemStack } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface ResourceTransferPanelProps {
  visible: boolean;
  explorers: Explorer[];
  warehouse: ItemStack[];
  onClose: () => void;
  onTransfer: (selectedItems: ItemStack[]) => void;
}

export function ResourceTransferPanel({
  visible,
  explorers,
  warehouse,
  onClose,
  onTransfer,
}: ResourceTransferPanelProps) {
  if (!visible) return null;

  // 收集所有角色背包中的物品
  const allItems = new Map<string, ItemStack>();
  for (const explorer of explorers) {
    for (const item of explorer.inventory) {
      if (item.quantity > 0) {
        const existing = allItems.get(item.itemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          allItems.set(item.itemId, { ...item });
        }
      }
    }
  }

  const itemsArray = Array.from(allItems.values());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(itemsArray.map((i) => i.itemId)));

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const updated = new Set(prev);
      if (updated.has(itemId)) {
        updated.delete(itemId);
      } else {
        updated.add(itemId);
      }
      return updated;
    });
  };

  const handleTransferAll = () => {
    onTransfer(itemsArray);
  };

  const handleTransferSelected = () => {
    const toTransfer = itemsArray.filter((item) => selectedItems.has(item.itemId));
    onTransfer(toTransfer);
  };

  // 计算转移后的仓库预览
  const previewWarehouse = new Map<string, ItemStack>();
  for (const item of warehouse) {
    previewWarehouse.set(item.itemId, { ...item });
  }
  for (const item of itemsArray) {
    if (selectedItems.has(item.itemId)) {
      const existing = previewWarehouse.get(item.itemId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        previewWarehouse.set(item.itemId, { ...item });
      }
    }
  }

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
          maxWidth: 900,
          maxHeight: '90%',
          overflow: 'auto',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>资源转移</h2>
          <button onClick={onClose} style={{ padding: '6px 16px', background: '#555', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            关闭
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>角色背包中的资源</h3>
          {itemsArray.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>角色背包中没有资源</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {itemsArray.map((item) => (
                <div
                  key={item.itemId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 12,
                    background: selectedItems.has(item.itemId) ? '#2a4a2a' : '#1a1a1a',
                    borderRadius: 4,
                    border: '1px solid #555',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggleItem(item.itemId)}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.itemId)}
                    onChange={() => handleToggleItem(item.itemId)}
                    style={{ marginRight: 12, width: 20, height: 20 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{item.itemId}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>数量: {item.quantity}</div>
                  </div>
                  <div style={{ color: '#4caf50', fontWeight: 'bold' }}>x{item.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>转移后仓库预览</h3>
          {previewWarehouse.size === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>仓库为空</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 8,
                padding: 12,
                background: '#1a1a1a',
                borderRadius: 4,
                border: '1px solid #555',
              }}
            >
              {Array.from(previewWarehouse.values()).map((item) => (
                <div
                  key={item.itemId}
                  style={{
                    padding: 8,
                    background: '#2a2a2a',
                    borderRadius: 4,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, marginBottom: 4 }}>{item.itemId}</div>
                  <div style={{ color: '#4caf50', fontWeight: 'bold' }}>x{item.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={handleTransferAll}
            style={{
              padding: '10px 20px',
              background: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            全部转移
          </button>
          <button
            onClick={handleTransferSelected}
            disabled={selectedItems.size === 0}
            style={{
              padding: '10px 20px',
              background: selectedItems.size === 0 ? '#555' : '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            转移选中 ({selectedItems.size})
          </button>
        </div>
      </div>
    </div>
  );
}

