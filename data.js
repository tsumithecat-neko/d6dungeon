// data.js - 游戏配置与静态数据

const TO_HIT_TARGET = 4; // 判定标准

// --- 状态与图标 (挂载到 window 以防访问不到) ---
window.STATUS_ICONS = {
    poison: '☠️', // 中毒
    stun:   '💫', // 眩晕
    rage:   '💢', // 狂暴(加攻)
    weak:   '📉', // 虚弱(减攻)
    regen:  '🌿'  // 再生
};

// --- 怪物技能库 ---
const MONSTER_SKILLS = {
    'poison_spit': { 
        name: "剧毒喷吐", desc: "造成1点伤害并施加中毒(3回合)", rate: 0.4, 
        effectId: 'monster_poison_spit'
    },
    'web_trap': {
        name: "蛛网缠绕", desc: "使目标眩晕(1回合)", rate: 0.3,
        effectId: 'monster_web_trap'
    },
    'warcry': {
        name: "战吼", desc: "自身获得狂暴(3回合)", rate: 0.3, targetSelf: true,
        effectId: 'monster_warcry'
    },
    'curse': {
        name: "虚弱诅咒", desc: "使目标虚弱(3回合)", rate: 0.4,
        effectId: 'monster_curse'
    },
    'smash': {
        name: "重击", desc: "造成2点强力伤害", rate: 0.5,
        effectId: 'monster_smash'
    }
};

// --- 装备词缀定义 ---
const WEAPON_AFFIXES = [
    { name: "锋利的", att: 1, chance: 0.3, costMult: 1.5 },
    { name: "致命的", att: 2, chance: 0.1, color: "#e91e63", costMult: 2.5 }, 
    { name: "剧毒的", effect: "poison", chance: 0.2, color: "#4caf50", desc: "攻击施加中毒", costMult: 2 },
    { name: "吸血的", effect: "lifesteal", chance: 0.1, color: "#f44336", desc: "攻击恢复1HP", costMult: 3 },
    { name: "狂暴的", effect: "rage_start", chance: 0.1, color: "#ff9800", desc: "战斗开始获得狂暴", costMult: 2.5 }
];

const ARMOR_AFFIXES = [
    { name: "坚固的", hpMax: 2, chance: 0.3, costMult: 1.5 },
    { name: "神佑的", hpMax: 4, chance: 0.1, color: "#2196f3", costMult: 2.5 }, 
    { name: "荆棘的", effect: "thorns", chance: 0.2, color: "#795548", desc: "反弹1点伤害", costMult: 2 },
    { name: "轻灵的", effect: "dodge", chance: 0.1, color: "#00bcd4", desc: "15%几率闪避", costMult: 2.5 }
];

// --- 互动事件定义 ---
const EVENT_DEFINITIONS = {
    '陷阱': {
        title: "⛔ 致命机关",
        desc: "你听到脚下的地板发出令人不安的‘咔哒’声，墙壁上的孔洞里隐约闪烁着寒光...",
        options: [
            { label: "✋ 尝试拆除", reqClass: "rogue", desc: "需: 盗贼。利用专业工具尝试卡住齿轮。", type: "class_check" },
            { label: "🏃 全员闪避", desc: "全队尝试躲开毒箭。(判定: d6 >= 4)", type: "roll_check", target: 4, failDamage: 2, successMsg: "你们身手矫健，毒箭全部射在了空地上！", failMsg: "反应太慢了！几名队友被毒箭擦伤。" },
            { label: "🛡️ 举盾硬抗", desc: "需: 战士/圣骑士。站在最前面挡下伤害。", type: "tank_damage", damage: 2, validClasses: ["warrior", "paladin"] }
        ]
    },
    '祭坛': {
        title: "🕯️ 诡异的祭坛",
        desc: "房间中央摆放着一座散发着微光的石制祭坛，上面刻满了模糊不清的符文。",
        options: [
            { label: "🙏 虔诚祈祷", reqClass: ["cleric", "paladin"], desc: "需: 牧师/圣骑士。向神明祈求庇护。(恢复全体 HP)", type: "heal_party", amount: 3 },
            { label: "🩸 献祭鲜血", desc: "献上自己的生命力以换取力量。(HP -3, 获得经验/金币)", type: "sacrifice", cost: 3 },
            { label: "👋 转身离开", desc: "不要招惹未知的存在。", type: "leave" }
        ]
    },
    '谜题': {
        title: "🧩 远古谜题",
        desc: "一个巨大的石门挡住了去路，门上不仅没有锁孔，反而刻着一道复杂的逻辑谜题。",
        options: [
            { label: "✨ 解读符文", reqClass: "wizard", desc: "需: 法师。利用奥术知识直接破解。(获得宝物)", type: "auto_loot" },
            { label: "🎲 尝试猜测", desc: "随便按一个按钮试试？(判定: d6 = 6 成功, 1 触发陷阱)", type: "gamble" },
            { label: "💥 暴力破门", reqClass: ["warrior", "orc"], desc: "需: 战士/兽人。用蛮力砸开它！", type: "force_open" }
        ]
    }
};

EVENT_DEFINITIONS['营火'] = {
    title: "🔥 安静的营火",
    desc: "火焰驱散了地牢的寒意。队伍可以在这里休整，或让一名成员磨炼自己的职业技能。",
    options: [
        { label: "🛏️ 扎营休息", desc: "恢复所有存活成员的全部 HP 与 MP。", type: "camp_heal" },
        { label: "📖 磨炼技能", desc: "选择一名成员，使其职业技能永久升级（最高 4 级）。", type: "choose_skill_upgrade" },
        { label: "👋 熄火离开", desc: "保留现在的状态，继续探索。", type: "leave" }
    ]
};

// --- 怪物池 ---
const MONSTER_POOLS = {
  minion: [ 
      { name: "骷髅兵", count: 4, att: 0, skills: [] }, 
      { name: "变异巨鼠", count: 5, att: 0, skills: ['poison_spit'] }, 
      { name: "地精斥候", count: 3, att: 1, skills: [] }, 
      { name: "吸血蝙蝠", count: 4, att: 0, skills: ['curse'] } 
  ],
  beast: [ 
      { name: "兽人狂战", count: 2, att: 1, skills: ['warcry'] }, 
      { name: "食人妖", count: 1, att: 2, skills: ['smash'] }, 
      { name: "装甲蜘蛛", count: 2, att: 1, skills: ['web_trap', 'poison_spit'] } 
  ],
  boss: [ 
      { name: "双头食人魔", hp: 10, att: 2, skills: ['warcry', 'smash'] }, 
      { name: "混沌死灵法师", hp: 8, att: 3, skills: ['curse', 'poison_spit'] }, 
      { name: "石化美杜莎", hp: 8, att: 3, skills: ['web_trap', 'curse'] }, 
      { name: "深渊恶魔", hp: 12, att: 2, skills: ['warcry', 'smash', 'poison_spit'] } 
  ]
};

// --- 房间生成表 ---
const ROOM_TABLE = {
  2:  { name: "狭窄走廊", type: "corridor", w: 1, h: 4, shape: 'rect' },
  3:  { name: "宽阔走廊", type: "corridor", w: 2, h: 4, shape: 'rect' },
  4:  { name: "废弃哨站", type: "room", w: 3, h: 3, shape: 'rect' },
  5:  { name: "小型储藏室", type: "room", w: 2, h: 3, shape: 'rect' },
  6:  { name: "正方形大厅", type: "room", w: 4, h: 4, shape: 'rect' },
  7:  { name: "长方形兵营", type: "room", w: 3, h: 5, shape: 'rect' },
  8:  { name: "十字路口", type: "room", w: 3, h: 3, shape: 'cross' }, 
  9:  { name: "圆形祭坛", type: "room", w: 4, h: 4, shape: 'circle' },
  10: { name: "大型餐厅", type: "room", w: 5, h: 3, shape: 'rect' },
  11: { name: "图书馆", type: "room", w: 4, h: 5, shape: 'rect' },
  12: { name: "L型回廊", type: "room", w: 4, h: 4, shape: 'L_up_right' }, 
  13: { name: "大教堂", type: "room", w: 4, h: 6, shape: 'rect' },
  14: { name: "八角密室", type: "room", w: 3, h: 3, shape: 'oct' },
  15: { name: "坍塌的洞穴", type: "room", w: 4, h: 4, shape: 'cave' },
  16: { name: "长廊", type: "corridor", w: 1, h: 6, shape: 'rect' },
  17: { name: "巨大中庭", type: "room", w: 6, h: 6, shape: 'rect' },
  18: { name: "双柱大厅", type: "room", w: 5, h: 4, shape: 'rect' },
  19: { name: "王座间", type: "boss_room", w: 5, h: 7, shape: 'rect' },
  20: { name: "古代宝库", type: "treasure_room", w: 4, h: 4, shape: 'diamond' }
};

const CONNECTOR_CORRIDORS = {
    horiz_1: { name: "短通道", type: "corridor", w: 1, h: 1, shape: 'rect' },
    horiz_2: { name: "通道", type: "corridor", w: 2, h: 1, shape: 'rect' },
    vert_1:  { name: "短通道", type: "corridor", w: 1, h: 1, shape: 'rect' },
    vert_2:  { name: "通道", type: "corridor", w: 1, h: 2, shape: 'rect' }
};

const CLASS_BASE_STATS = {
    warrior: { name: "战士", hp: 10, mp: 2, att: 1, desc: "前排肉盾，擅长物理攻击" },
    rogue:   { name: "盗贼", hp: 7,  mp: 4, att: 1, desc: "技巧型，擅长暴击和闪避" },
    wizard:  { name: "法师", hp: 4,  mp: 6, att: 0, desc: "脆皮高爆发，依赖魔法" },
    cleric:  { name: "牧师", hp: 6,  mp: 5, att: 0, desc: "辅助治疗，团队核心" },
    paladin: { name: "圣骑士", hp: 9, mp: 3, att: 1, desc: "神圣战士，能自我治疗的坦克" },
    ranger:  { name: "游侠",   hp: 8, mp: 4, att: 1, desc: "远程射手，多段攻击" }
};

const RACES = {
    human:    { name: "人类", hp: 1, mp: 1, att: 0, desc: "均衡多才 (HP+1, MP+1)" },
    dwarf:    { name: "矮人", hp: 3, mp: -1, att: 0, desc: "坚韧顽强 (HP+3, MP-1)" },
    elf:      { name: "精灵", hp: -1, mp: 2, att: 0, desc: "魔法亲和 (MP+2, HP-1)" },
    orc:      { name: "兽人", hp: 2, mp: -2, att: 1, desc: "野蛮力量 (HP+2, 攻+1, MP-2)" },
    halfling: { name: "半身人", hp: -1, mp: 3, att: 0, desc: "幸运机敏 (MP+3, HP-1)" },
    tiefling: { name: "提夫林", hp: 0, mp: 1, att: 1, desc: "炼狱血统 (攻+1, MP+1)" }
};

const CLASS_SKILLS = {
    warrior: {
        name: "强力横扫", cost: 1, desc: "消耗1体力，对敌人造成必中的 2 点伤害。",
        effectId: 'skill_warrior_sweep'
    },
    rogue: {
        name: "弱点背刺", cost: 1, desc: "消耗1技巧，造成致命一击（击杀1个敌人或对Boss造成2伤害）。",
        effectId: 'skill_rogue_backstab'
    },
    wizard: {
        name: "爆裂火球", cost: 2, desc: "消耗2法力，随机消灭 d6 个小怪或对Boss造成 3 点伤害。",
        effectId: 'skill_wizard_fireball'
    },
    cleric: {
        name: "神圣治愈", cost: 2, desc: "消耗2信仰，为生命值最低的队友恢复 4 点 HP。",
        effectId: 'skill_cleric_heal'
    },
    paladin: {
        name: "圣佑打击", cost: 2, desc: "消耗2信仰，造成2点伤害，并为自己恢复2点HP。",
        effectId: 'skill_paladin_smite'
    },
    ranger: {
        name: "双重射击", cost: 2, desc: "消耗2体力，发动两次攻击（共造成2点伤害）。",
        effectId: 'skill_ranger_double_shot'
    }
};

const CLASS_GROWTH = {
    warrior: { hp: 2, mp: 0, att: 1, desc: "体格强化 (HP+2, 攻+1)" },
    rogue:   { hp: 1, mp: 1, att: 1, desc: "技巧磨练 (HP+1, MP+1, 攻+1)" },
    wizard:  { hp: 1, mp: 2, att: 0, desc: "魔力源泉 (MP+2, HP+1)" },
    cleric:  { hp: 1, mp: 2, att: 0, desc: "信仰加深 (MP+2, HP+1)" }, 
    paladin: { hp: 2, mp: 1, att: 0, desc: "圣光护体 (HP+2, MP+1)" }, 
    ranger:  { hp: 1, mp: 1, att: 1, desc: "狩猎本能 (HP+1, MP+1, 攻+1)" }
};

const ITEM_TYPES = {
  potion: { name: "治疗药水", type: "consumable", desc: "恢复4点HP", effectId: 'item_heal_4' },
  scroll: { name: "闪电卷轴", type: "combat", desc: "对所有敌人造成1点伤害", effectId: 'item_chain_lightning' },
  gem: { name: "红宝石", type: "treasure", desc: "价值 10 金币", value: 10 }
};

const GEAR_DATA = {
    weapons: [
        { name: "生锈短剑", type: "weapon", att: 1, cost: 20, level: 1 },
        { name: "铁制长剑", type: "weapon", att: 2, cost: 50, level: 2 },
        { name: "精钢战斧", type: "weapon", att: 3, cost: 120, level: 3 },
        { name: "屠龙巨剑", type: "weapon", att: 5, cost: 300, level: 5 }
    ],
    armors: [
        { name: "破旧皮甲", type: "armor", def: 0, hpMax: 2, cost: 20, level: 1 }, 
        { name: "锁子甲",   type: "armor", def: 1, hpMax: 0, cost: 60, level: 2 }, 
        { name: "秘银板甲", type: "armor", def: 2, hpMax: 5, cost: 200, level: 4 }
    ]
};
