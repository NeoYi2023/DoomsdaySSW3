import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { ExplorationBoardLayer, Explorer, Monster, ResourceStack, DefenseFacility } from '../types/gameTypes';
import type { GarbageConfigEntry, ResourceConfigEntry } from '../types/configTypes';
import { ExplorationCell } from './ExplorationCell';
import { applyShakeEffect } from '../utils/shakeAnimation';

export interface ExplorationBoardProps {
  layer: ExplorationBoardLayer;
  explorers: Map<string, Explorer>;
  monsters: Map<string, Monster>;
  garbages: GarbageConfigEntry[];
  resourceConfigs?: ResourceConfigEntry[];
  // 视觉反馈数据
  shakingCellIndices?: Set<number>;
  displayLootByCell?: Map<number, ResourceStack[]>;
  // 入侵系统相关
  invasionMonsters?: Map<string, Monster>; // 入侵怪物列表
  defenseFacilities?: Map<string, DefenseFacility>; // 防御设施列表
}

export interface ExplorationBoardRef {
  getCellElement: (cellIndex: number) => HTMLDivElement | null;
}

export const ExplorationBoard = forwardRef<ExplorationBoardRef, ExplorationBoardProps>(
  ({ layer, explorers, monsters, garbages, resourceConfigs, shakingCellIndices, displayLootByCell, invasionMonsters, defenseFacilities }, ref) => {
    const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    useImperativeHandle(ref, () => ({
      getCellElement: (cellIndex: number) => {
        return cellRefs.current.get(cellIndex) || null;
      },
    }));

    // 应用震动效果
    useEffect(() => {
      if (shakingCellIndices) {
        shakingCellIndices.forEach((cellIndex) => {
          const element = cellRefs.current.get(cellIndex);
          if (element) {
            applyShakeEffect(element, 300);
          }
        });
      }
    }, [shakingCellIndices]);

    const garbageMap = new Map<string, GarbageConfigEntry>();
    for (const g of garbages) {
      garbageMap.set(g.ID, g);
    }

    const width = 4;
    const height = 6;

    const rows: JSX.Element[] = [];
    for (let y = 0; y < height; y++) {
      const cells: JSX.Element[] = [];
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const cell = layer.cells.find((c) => c.index === index)!;
        const explorer = cell.explorerId ? explorers.get(cell.explorerId) : undefined;
        const monster = cell.monsterId ? monsters.get(cell.monsterId) : undefined;
        const garbageConfig = cell.garbageId ? garbageMap.get(cell.garbageId) : undefined;
        const isShaking = shakingCellIndices?.has(index) || false;
        const displayLoot = displayLootByCell?.get(index);

        cells.push(
          <ExplorationCell
            key={index}
            ref={(el) => {
              if (el) {
                cellRefs.current.set(index, el);
              } else {
                cellRefs.current.delete(index);
              }
            }}
            cell={cell}
            explorer={explorer}
            monster={monster}
            garbageConfig={garbageConfig}
            isShaking={isShaking}
            displayLoot={displayLoot}
            resourceConfigs={resourceConfigs}
          />,
        );
      }
      rows.push(
        <div key={y} style={{ display: 'flex' }}>
          {cells}
        </div>
      );
    }

    // 渲染防御设施（在棋盘外围）
    const renderDefenseFacilities = () => {
      if (!defenseFacilities || defenseFacilities.size === 0) return null;

      const facilityElements: JSX.Element[] = [];
      const boardWidth = 4;
      const boardHeight = 6;
      const cellSize = 80; // 每个格子80px（与ExplorationCell一致）
      const padding = 4; // 与棋盘容器的 padding 一致

      for (const facility of defenseFacilities.values()) {
        const { x, y } = facility.position;
        // 计算设施在屏幕上的位置
        let left = 0;
        let top = 0;

        if (y === -1) {
          // 上边缘
          left = x * cellSize + padding;
          top = -cellSize + padding;
        } else if (y === boardHeight) {
          // 下边缘
          left = x * cellSize + padding;
          top = boardHeight * cellSize + padding;
        } else if (x === -1) {
          // 左边缘
          left = -cellSize + padding;
          top = y * cellSize + padding;
        } else if (x === boardWidth) {
          // 右边缘
          left = boardWidth * cellSize + padding;
          top = y * cellSize + padding;
        }

        facilityElements.push(
          <div
            key={facility.id}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: cellSize - 8,
              height: cellSize - 8,
              background: facility.currentHp <= 0 ? '#f44' : '#4af',
              border: '2px solid #fff',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
              zIndex: 10,
            }}
            title={`${facility.config.名称Key} (Lv.${facility.level}) - HP: ${facility.currentHp}/${facility.config.最大血量}`}
          >
            <div>🛡️</div>
            <div style={{ fontSize: 8, marginTop: 2 }}>
              {facility.currentHp}/{facility.config.最大血量}
            </div>
          </div>
        );
      }

      return facilityElements;
    };

    // 渲染入侵怪物（在棋盘上）
    const renderInvasionMonsters = () => {
      if (!invasionMonsters || invasionMonsters.size === 0) return null;

      const monsterElements: JSX.Element[] = [];
      const cellSize = 80; // 每个格子80px（与ExplorationCell一致）
      const padding = 4; // 与棋盘容器的 padding 一致

      for (const monster of invasionMonsters.values()) {
        if (!monster.currentPosition || monster.currentHp <= 0) continue;

        const { x, y } = monster.currentPosition;
        const left = x * cellSize + padding;
        const top = y * cellSize + padding;

        monsterElements.push(
          <div
            key={monster.id}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: cellSize - 8,
              height: cellSize - 8,
              background: monster.monsterType === 'ranged' ? '#fa4' : '#f44',
              border: '2px solid #fff',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
              zIndex: 5,
            }}
            title={`入侵怪物 - HP: ${monster.currentHp}/${monster.config.血量}`}
          >
            <div>{monster.monsterType === 'ranged' ? '🏹' : '⚔️'}</div>
            <div style={{ fontSize: 8, marginTop: 2 }}>
              {monster.currentHp}/{monster.config.血量}
            </div>
          </div>
        );
      }

      return monsterElements;
    };

    // 计算棋盘尺寸
    const cellSize = 80;
    const boardWidth = width * cellSize;
    const boardHeight = height * cellSize;
    const padding = 4;
    const totalWidth = boardWidth + padding * 2;
    const totalHeight = boardHeight + padding * 2;

    // 渲染下层特殊道具
    const renderBottomSpecialItems = () => {
      if (!layer.bottomSpecialItems || layer.bottomSpecialItems.length === 0) return null;

      const itemElements: JSX.Element[] = [];
      const boardWidthCells = 4; // 棋盘宽度（格子数）

      for (const item of layer.bottomSpecialItems) {
        if (item.isCollected) continue; // 已收集的道具不显示

        // 计算覆盖区域的边界
        const indices = item.coveredCellIndices;
        if (indices.length === 0) continue;

        const minX = Math.min(...indices.map((idx) => idx % boardWidthCells));
        const maxX = Math.max(...indices.map((idx) => idx % boardWidthCells));
        const minY = Math.min(...indices.map((idx) => Math.floor(idx / boardWidthCells)));
        const maxY = Math.max(...indices.map((idx) => Math.floor(idx / boardWidthCells)));

        const left = minX * cellSize + padding;
        const top = minY * cellSize + padding;
        const width = (maxX - minX + 1) * cellSize - padding * 2;
        const height = (maxY - minY + 1) * cellSize - padding * 2;

        itemElements.push(
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: '2px dashed rgba(100, 200, 255, 0.6)',
              background: 'rgba(100, 200, 255, 0.1)',
              borderRadius: 4,
              zIndex: 0.5,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="未知特殊装置"
          >
            <div
              style={{
                fontSize: 12,
                color: 'rgba(100, 200, 255, 0.8)',
                textAlign: 'center',
              }}
            >
              ?
            </div>
          </div>,
        );
      }

      return itemElements;
    };

    return (
      <div style={{ position: 'relative' }}>
        <h2>探索棋盘 - 第 {layer.layerIndex} 层</h2>
        {/* 棋盘内容 */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            border: '1px solid #555',
            padding: padding,
            background: '#111',
            width: boardWidth,
            height: boardHeight,
            // 将背景图作为棋盘背景
            backgroundImage: 'url("/images/QiPan.png")',
            backgroundSize: `${totalWidth}px ${totalHeight}px`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            zIndex: 1,
          }}
        >
          {/* 渲染下层特殊道具（在背景和上层格子之间） */}
          {renderBottomSpecialItems()}
          {rows}
          {/* 渲染入侵怪物 */}
          {renderInvasionMonsters()}
          {/* 渲染防御设施 */}
          {renderDefenseFacilities()}
        </div>
      </div>
    );
  },
);

ExplorationBoard.displayName = 'ExplorationBoard';
