import React from 'react';
import type { OreChoiceConfigEntry } from '../types/configTypes';
import { getText } from '../core/LanguageManager';

export interface OreChoicePanelProps {
  visible: boolean;
  choices: OreChoiceConfigEntry[]; // 三个选择选项
  onSelect: (choiceId: string) => void;
  onCancel?: () => void;
}

export function OreChoicePanel({
  visible,
  choices,
  onSelect,
  onCancel,
}: OreChoicePanelProps) {
  if (!visible || choices.length === 0) return null;

  // 确保只有三个选项
  const displayChoices = choices.slice(0, 3);

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
        if (e.target === e.currentTarget && onCancel) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          background: '#222',
          padding: 24,
          borderRadius: 12,
          width: 800,
          maxWidth: '90vw',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, color: '#4caf50' }}>
          选择下一层的矿石类型
        </h2>
        <p style={{ marginBottom: 24, color: '#aaa', fontSize: 14 }}>
          选择一个选项，它将影响下一层可以遇到的矿石种类、权重和数量上限
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {displayChoices.map((choice, index) => {
            const affectedOres = Array.isArray(choice.影响的矿石ID列表)
              ? choice.影响的矿石ID列表
              : choice.影响的矿石ID列表?.split('|').filter(Boolean) || [];

            return (
              <div
                key={choice.ID}
                style={{
                  border: '2px solid #555',
                  borderRadius: 8,
                  padding: 16,
                  background: '#1a1a1a',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4caf50';
                  e.currentTarget.style.background = '#1a3a1a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#555';
                  e.currentTarget.style.background = '#1a1a1a';
                }}
                onClick={() => onSelect(choice.ID)}
              >
                {/* 选项编号 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#4caf50',
                    color: '#000',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </div>

                {/* 选项名称 */}
                <h3 style={{ marginTop: 0, marginBottom: 12, color: '#4caf50' }}>
                  {getText(choice.名称Key)}
                </h3>

                {/* 选项描述 */}
                {choice.描述Key && (
                  <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12, minHeight: 40 }}>
                    {getText(choice.描述Key)}
                  </p>
                )}

                {/* 详细信息 */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid #333',
                    fontSize: 11,
                    color: '#888',
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <strong>影响矿石:</strong> {affectedOres.length} 种
                  </div>
                  {choice.权重调整 !== undefined && (
                    <div style={{ marginBottom: 4 }}>
                      <strong>权重调整:</strong> {choice.权重调整}x
                    </div>
                  )}
                  {choice.数量上限 !== undefined && (
                    <div>
                      <strong>数量上限:</strong> {choice.数量上限}
                    </div>
                  )}
                </div>

                {/* 选择按钮 */}
                <button
                  style={{
                    marginTop: 16,
                    width: '100%',
                    padding: '10px 16px',
                    background: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#45a049';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4caf50';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(choice.ID);
                  }}
                >
                  选择此选项
                </button>
              </div>
            );
          })}
        </div>

        {onCancel && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 24px',
                background: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

