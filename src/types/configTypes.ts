export interface ExplorerConfigEntry {
  ID: string; // explorerId
  名称Key: string;
  描述Key?: string;
  最大生命?: number;
  初始生命?: number;
  最大体力?: number;
  初始体力?: number;
  攻击力?: number;
  背包格子数量?: number; // inventoryCapacity
  初始天赋ID列表?: string; // Talent IDs joined by |
  装备槽位数量?: number; // equipmentSlots
}

export interface MonsterConfigEntry {
  ID: string; // monsterId
  名称Key: string;
  描述Key?: string;
  血量: number;
  攻击力: number;
  出现时间段?: string;
  出现概率?: number;
}

export interface MapConfigEntry {
  X坐标: number;
  Y坐标: number;
  格子类型: string;
  初始状态?: string;
  资源生成规则ID?: string;
  可建设类型?: string;
}

export interface ExplorationPointConfigEntry {
  ID: string; // explorationPointId
  名称Key: string;
  描述Key?: string;
  最大层数: number;
  探索难度: string;
  棋盘出现内容: string | string[]; // 字符串格式: "Monster_monster_zombie_10|Garbage_garbage_trash_5" 或数组格式: ["Monster_monster_zombie_10", "Garbage_garbage_trash_5"]
  震动值最大值?: number; // 每个探索点独立配置的震动值最大值
  入侵怪物配置列表?: string | string[]; // 格式同"棋盘出现内容"，例如：`"Monster_monster_invader_1_10|Monster_monster_invader_2_5"`
}

export interface ResourceConfigEntry {
  ID: string;
  名称Key: string;
  描述Key?: string;
  基础产出: number;
  稀有度: string;
  资源类型: string;
  堆叠最大数量: number;
}

export interface ItemConfigEntry {
  ID: string;
  名称Key: string;
  描述Key?: string;
  道具类型: string;
  使用效果类型: string;
  使用效果数值?: number | string;
  消耗条件?: string;
  堆叠最大数量: number;
  增加震动值?: number; // 道具触发时增加的震动值（可选）
}

export interface ShelterLevelConfigEntry {
  等级: number;
  默认解锁设施ID列表?: string | string[];
  可建造设施ID列表?: string | string[];
  最大设施数量?: number;
  升级前置条件资源ID?: string;
  升级前置条件资源数量?: number;
  初始工具ID列表?: string | string[]; // 工具ID列表，支持字符串格式（用|分隔）或数组格式，例如：equipment_tool_1_sieve|equipment_tool_2_trap 或 ["equipment_tool_1_sieve", "equipment_tool_2_trap"]
}

export interface GarbageConfigEntry {
  ID: string; // garbageId
  名称Key: string;
  描述Key?: string;
  默认搜索产出: string; // 资源ID_数量|资源ID_数量
  垃圾类型列表: string; // 类型A|类型B
  进阶产出机制ID列表?: string; // condition ids joined by |
  进阶产出?: string; // 资源ID_数量|资源ID_数量
}

export interface AdvancedOutputConditionConfigEntry {
  ID: string; // conditionId
  名称Key: string;
  描述Key?: string;
  适用垃圾类型列表: string; // 类型A|类型B
  触发条件类型: string;
  触发条件参数?: string;
}

export interface SkillConfigEntry {
  ID: string; // skillId
  名称Key: string;
  描述Key?: string;
  效果类型: string;
  效果参数?: string;
  触发时机: string;
  作用目标: string;
  消耗道具ID?: string;
}

export interface TalentConfigEntry {
  ID: string; // talentId
  名称Key: string;
  描述Key?: string;
  效果类型: string;
  效果参数?: string;
  解锁条件类型?: string;
  解锁条件参数?: string;
  是否可叠加?: boolean | string;
  最大叠加层数?: number | string;
}

export interface QuestConfigEntry {
  ID: string; // questId
  名称Key: string;
  描述Key?: string;
  触发条件类型: string; // RoundReached, QuestCompleted, ResourceOwned, ExplorationCompleted, MonsterDefeated, ShelterLevelReached
  触发条件参数?: string; // JSON字符串或键值对格式
  完成条件类型: string; // CollectResource, DefeatMonster, CompleteExploration, BuildFacility, ReachRound
  完成条件目标ID: string; // 资源ID、怪物ID、探索点ID等
  完成条件目标值: number; // 目标值
  奖励资源列表?: string; // 资源ID_数量|资源ID_数量
  奖励道具列表?: string; // 道具ID_数量|道具ID_数量
  下一个任务ID?: string; // 任务链中的下一个任务ID
  优先级?: number; // 优先级（数字越小优先级越高）
  是否章节结束任务?: boolean | string; // 是否为章节结束任务
}

export interface ChapterConfigEntry {
  ID: string; // chapterId
  名称Key: string;
  剧情Key: string; // 剧情文本的多语言Key
  章节编号: number; // 章节编号（1, 2, 3...）
  地图ID列表: string; // 该章节包含的地图ID列表（以|分隔）
  解锁任务ID?: string; // 解锁该章节所需的任务ID（上一章节的结束任务）
  优先级?: number; // 优先级（用于排序）
}

export interface EquipmentConfigEntry {
  ID: string; // equipmentId
  名称Key: string;
  描述Key?: string;
  装备标签列表?: string | string[]; // 装备标签列表，支持字符串格式（以|分隔）或数组格式
  匹配垃圾类型列表?: string | string[]; // 匹配的垃圾类型列表，支持字符串格式（以|分隔）或数组格式
  效果类型?: string; // 效果类型（ProvideTag, MatchGarbageType, BoostAdvancedOutput）
  效果参数?: string; // 效果参数（JSON字符串或键值对）
  堆叠最大数量?: number; // 堆叠最大数量（如果装备可以作为道具）
}

export interface ShipConfigEntry {
  ID: string; // 勘探船ID
  名称Key: string;
  描述Key?: string;
  初始血量: number; // 船体初始血量
  最大血量: number; // 船体最大血量
  每回合震动值增加值: number; // 勘探船每回合默认增加的震动值
}

export interface DefenseFacilityConfigEntry {
  ID: string; // 设施ID
  名称Key: string;
  描述Key?: string;
  设施类型: string; // 如"炮台"、"护盾"等
  初始血量: number;
  最大血量: number;
  攻击力: number; // 防御设施的攻击力
  攻击范围: number; // 攻击范围（格子数）
  攻击速度: number; // 每秒攻击次数
  建造消耗资源列表?: string; // 格式：资源ID_数量|资源ID_数量
  升级消耗资源列表?: string; // 格式同上
}

export interface OreChoiceConfigEntry {
  ID: string; // 选择选项ID
  名称Key: string;
  描述Key?: string;
  影响的矿石ID列表: string | string[]; // 格式：garbage_id_1|garbage_id_2 或数组格式
  权重调整?: number; // 权重倍数（默认1.0，大于1增加出现概率，小于1减少）
  数量上限?: number; // 该层最多出现多少个该类矿石（默认无限制）
  图标Key?: string; // 图标资源Key（可选）
}

export interface ConfigBundle {
  explorers: ExplorerConfigEntry[];
  monsters: MonsterConfigEntry[];
  mapCells: MapConfigEntry[];
  explorationPoints: ExplorationPointConfigEntry[];
  resources: ResourceConfigEntry[];
  items: ItemConfigEntry[];
  shelterLevels: ShelterLevelConfigEntry[];
  garbages: GarbageConfigEntry[];
  advancedOutputConditions: AdvancedOutputConditionConfigEntry[];
  skills: SkillConfigEntry[];
  talents: TalentConfigEntry[];
  quests: QuestConfigEntry[];
  chapters: ChapterConfigEntry[];
  equipments: EquipmentConfigEntry[];
  ships: ShipConfigEntry[];
  defenseFacilities: DefenseFacilityConfigEntry[];
  oreChoices: OreChoiceConfigEntry[];
}
