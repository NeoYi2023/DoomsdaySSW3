import type {
  ExplorerConfigEntry,
  MonsterConfigEntry,
  MapConfigEntry,
  ExplorationPointConfigEntry,
  ResourceConfigEntry,
  ItemConfigEntry,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
  SkillConfigEntry,
  TalentConfigEntry,
  QuestConfigEntry,
  ChapterConfigEntry,
  EquipmentConfigEntry,
} from './configTypes';

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export interface ResourceStack {
  resourceId: string;
  quantity: number;
}

export interface Explorer {
  id: string;
  config: ExplorerConfigEntry;
  currentHp: number;
  currentStamina: number;
  inventory: ItemStack[];
  inventoryCapacity: number;
  initialTalentIds: string[];
  equipmentSlots: number; // 装备槽位数量
  equipment: string[]; // 当前装备的装备ID列表（长度 <= equipmentSlots）
}

export interface Monster {
  id: string;
  config: MonsterConfigEntry;
  currentHp: number;
}

// 地图格子类型：
// - Shelter / 避难所
// - Road / 道路
// - ExplorationPoint / 探索点
// - Obstacle / 障碍（原“空地”，不可通行）
// - Built / 已建设地点（同样视为障碍）
export type GridCellType = 'Shelter' | 'Road' | 'ExplorationPoint' | 'Obstacle' | 'Built';

export interface DroppedItemOnCell {
  items: ItemStack[];
  deathRound: number;
  deadExplorerId: string;
}

export interface MapCellRuntime {
  x: number;
  y: number;
  type: GridCellType;
  state?: string;
  explorationPointId?: string;
  dropped?: DroppedItemOnCell;
  explorationProgress?: number; // 探索进度 (0-100)
}

export interface ExplorationBoardCell {
  index: number; // 0-23 for 6x4
  explorerId?: string;
  monsterId?: string;
  garbageId?: string;
}

export interface ExplorationBoardLayer {
  layerIndex: number; // 1-based
  cells: ExplorationBoardCell[];
}

export interface ExplorationSession {
  pointConfig: ExplorationPointConfigEntry;
  currentLayerIndex: number;
  maxLayers: number;
  board: ExplorationBoardLayer;
}

export interface GarbageUnitRuntime {
  id: string; // garbageId
  config: GarbageConfigEntry;
}

export interface AdvancedOutputConditionRuntime {
  id: string; // conditionId
  config: AdvancedOutputConditionConfigEntry;
}

export interface SkillRuntime {
  id: string; // skillId
  config: SkillConfigEntry;
}

export interface TalentRuntime {
  id: string; // talentId
  config: TalentConfigEntry;
}

export type QuestStatus = 'NotTriggered' | 'Accepted' | 'Completed' | 'RewardClaimed';

export type QuestTriggerType =
  | 'RoundReached'
  | 'QuestCompleted'
  | 'ResourceOwned'
  | 'ExplorationCompleted'
  | 'MonsterDefeated'
  | 'ShelterLevelReached';

export type QuestCompletionType =
  | 'CollectResource'
  | 'DefeatMonster'
  | 'CompleteExploration'
  | 'BuildFacility'
  | 'ReachRound';

export interface QuestTriggerCondition {
  type: QuestTriggerType;
  params: Record<string, unknown>; // 触发条件参数
}

export interface QuestCompletionCondition {
  type: QuestCompletionType;
  targetId: string; // 目标ID（资源ID、怪物ID等）
  targetValue: number; // 目标值
  currentValue: number; // 当前值（动态更新）
}

export interface QuestReward {
  resources: Array<{ resourceId: string; quantity: number }>; // 资源奖励
  items: Array<{ itemId: string; quantity: number }>; // 道具奖励
  experience?: number; // 经验奖励（如果有）
}

export interface Quest {
  questId: string;
  config: QuestConfigEntry;
  status: QuestStatus;
  triggerCondition: QuestTriggerCondition;
  completionCondition: QuestCompletionCondition;
  reward: QuestReward;
  nextQuestId?: string; // 下一个任务ID（任务链）
  priority: number; // 优先级（用于排序显示）
  isChapterEndQuest: boolean; // 是否为章节结束任务
}

export type ChapterStatus = 'Locked' | 'Unlocked' | 'InProgress' | 'Completed';

export interface Chapter {
  chapterId: string;
  config: ChapterConfigEntry;
  status: ChapterStatus;
  currentMapIndex: number; // 当前地图索引（从1开始）
  mapIds: string[]; // 该章节包含的地图ID列表
}

export interface Equipment {
  equipmentId: string;
  config: EquipmentConfigEntry;
  tags: string[]; // 装备标签列表
  matchedGarbageTypes: string[]; // 匹配的垃圾类型列表
}

export type {
  ExplorerConfigEntry,
  MonsterConfigEntry,
  MapConfigEntry,
  ExplorationPointConfigEntry,
  ResourceConfigEntry,
  ItemConfigEntry,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
  SkillConfigEntry,
  TalentConfigEntry,
  QuestConfigEntry,
  ChapterConfigEntry,
  EquipmentConfigEntry,
};
