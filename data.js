// data.js - 游戏配置与静态数据

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
            { label: "🏃 寻找安全落点", desc: "由最擅长体操的成员进行 D20 敏捷检定（DC 13）。", type: "roll_check", target: 13, ability: "dex", skill: "acrobatics", failDamage: 2, successMsg: "你们身手矫健，毒箭全部射在了空地上！", failMsg: "反应太慢了！几名队友被毒箭擦伤。" },
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
            { label: "🎲 推理机关", desc: "由调查能力最高的成员进行 D20 调查检定（DC 15）。", type: "gamble", target: 15, ability: "int", skill: "investigation" },
            { label: "💥 暴力破门", reqClass: ["warrior", "orc"], desc: "需: 战士/兽人。进行 D20 运动检定（DC 13）。", type: "force_open", target: 13, ability: "str", skill: "athletics" }
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

const SPECIAL_ROOM_TYPES = {
  armory:  { name: '尘封军械库', icon: '🗡️', desc: '可能找到装备，也可能触发残存机关。', eventKey: '特殊房·军械库' },
  alchemy: { name: '炼金实验室', icon: '⚗️', desc: '利用奥秘知识调制额外消耗品。', eventKey: '特殊房·炼金实验室' },
  spring:  { name: '地下圣泉', icon: '💧', desc: '在生命、法力和状态净化之间作出选择。', eventKey: '特殊房·地下圣泉' },
  prison:  { name: '废弃牢房', icon: '⛓️', desc: '营救幸存者或从他口中取得情报。', eventKey: '特殊房·废弃牢房' },
  fungus:  { name: '菌菇洞穴', icon: '🍄', desc: '采集药材需要承受孢子的风险。', eventKey: '特殊房·菌菇洞穴' },
  crypt:   { name: '古代墓室', icon: '⚰️', desc: '更强的亡灵守卫着额外陪葬品。', combat: true }
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

EVENT_DEFINITIONS['特殊房·军械库'] = {
    title: '🗡️ 尘封军械库',
    desc: '腐朽的武器架之间仍有一只完好的军备箱，但锁扣上残留着机关刻痕。',
    options: [
        { label: '检查并开启军备箱', desc: '进行 D20 调查检定（DC 13），成功获得一件装备。', type: 'special_gear_check', skill: 'investigation', ability: 'int', target: 13 },
        { label: '强行撬开', desc: '进行 D20 运动检定（DC 14），失败时全队受到 1 点伤害。', type: 'special_gear_check', skill: 'athletics', ability: 'str', target: 14, failDamage: 1 },
        { label: '保持警惕并离开', desc: '不触碰可能存在的机关。', type: 'leave' }
    ]
};

EVENT_DEFINITIONS['特殊房·炼金实验室'] = {
    title: '⚗️ 废弃炼金实验室',
    desc: '蒸馏器仍在微微冒泡，桌上散落着几瓶没有标签的药剂。',
    options: [
        { label: '调制治疗药剂', desc: '进行 D20 奥秘检定（DC 13），成功获得 2 瓶治疗药水。', type: 'alchemy_check', skill: 'arcana', ability: 'int', target: 13 },
        { label: '拿走一瓶稳定药剂', desc: '安全获得 1 瓶治疗药水。', type: 'brew_potion', amount: 1 },
        { label: '不要碰这些瓶子', desc: '离开实验室。', type: 'leave' }
    ]
};

EVENT_DEFINITIONS['特殊房·地下圣泉'] = {
    title: '💧 地下圣泉',
    desc: '清澈泉水从断裂的神像下流出，水面映不出地牢的天花板。',
    options: [
        { label: '饮下泉水', desc: '所有存活成员恢复一半最大 HP。', type: 'sacred_spring', mode: 'hp' },
        { label: '在泉边冥想', desc: '所有存活成员恢复一半最大 MP。', type: 'sacred_spring', mode: 'mp' },
        { label: '清洗伤口', desc: '清除全队的中毒、虚弱和眩晕。', type: 'sacred_spring', mode: 'cleanse' }
    ]
};

EVENT_DEFINITIONS['特殊房·废弃牢房'] = {
    title: '⛓️ 废弃牢房',
    desc: '最深处的牢门后还有一名虚弱的幸存者，他声称知道守卫藏钱的位置。',
    options: [
        { label: '撬锁救人', desc: '进行 D20 巧手检定（DC 12），成功获得金币和全队经验。', type: 'prison_rescue', skill: 'sleight', ability: 'dex', target: 12 },
        { label: '说服他交出情报', desc: '进行 D20 游说检定（DC 13），成功获得额外金币。', type: 'prison_bargain', skill: 'persuasion', ability: 'cha', target: 13 },
        { label: '无法信任他', desc: '让牢门继续保持关闭。', type: 'leave' }
    ]
};

EVENT_DEFINITIONS['特殊房·菌菇洞穴'] = {
    title: '🍄 发光菌菇洞穴',
    desc: '蓝绿色菌菇铺满岩壁，其中一些可以入药，另一些正释放着细小孢子。',
    options: [
        { label: '采集药用菌菇', desc: '进行 D20 生存检定（DC 12），成功恢复全队并获得药水。', type: 'fungus_forage', skill: 'survival', ability: 'wis', target: 12 },
        { label: '快速穿过孢子区', desc: '进行 D20 体质豁免（DC 12），失败成员会中毒。', type: 'fungus_endure', target: 12 },
        { label: '原路绕开', desc: '不冒险采集。', type: 'leave' }
    ]
};

const ABILITY_NAMES = { str: '力量', dex: '敏捷', con: '体质', int: '智力', wis: '感知', cha: '魅力' };

const CLASS_ABILITY_SCORES = {
    warrior: { str: 16, dex: 12, con: 15, int: 8,  wis: 10, cha: 10 },
    rogue:   { str: 10, dex: 16, con: 12, int: 13, wis: 12, cha: 10 },
    wizard:  { str: 8,  dex: 12, con: 12, int: 16, wis: 14, cha: 10 },
    cleric:  { str: 10, dex: 10, con: 14, int: 10, wis: 16, cha: 13 },
    paladin: { str: 16, dex: 10, con: 14, int: 8,  wis: 12, cha: 15 },
    ranger:  { str: 12, dex: 16, con: 13, int: 10, wis: 14, cha: 8 }
};

const RACE_ABILITY_BONUSES = {
    human:    { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    dwarf:    { con: 2, wis: 1 },
    elf:      { dex: 2, int: 1 },
    orc:      { str: 2, con: 1 },
    halfling: { dex: 2, cha: 1 },
    tiefling: { cha: 2, int: 1 }
};

const SKILL_DEFINITIONS = {
    athletics: { name: '运动', ability: 'str' }, acrobatics: { name: '体操', ability: 'dex' },
    sleight: { name: '巧手', ability: 'dex' }, stealth: { name: '隐匿', ability: 'dex' },
    arcana: { name: '奥秘', ability: 'int' }, history: { name: '历史', ability: 'int' },
    investigation: { name: '调查', ability: 'int' }, nature: { name: '自然', ability: 'int' },
    religion: { name: '宗教', ability: 'int' }, insight: { name: '洞悉', ability: 'wis' },
    medicine: { name: '医药', ability: 'wis' }, perception: { name: '察觉', ability: 'wis' },
    survival: { name: '生存', ability: 'wis' }, deception: { name: '欺瞒', ability: 'cha' },
    intimidation: { name: '威吓', ability: 'cha' }, persuasion: { name: '游说', ability: 'cha' }
};

const BACKGROUNDS = {
    soldier:  { name: '士兵', desc: '军旅生涯让你擅长正面冲突。', skills: ['athletics', 'intimidation'] },
    criminal: { name: '罪犯', desc: '熟悉阴影、机关和城市暗面。', skills: ['stealth', 'sleight'] },
    sage:     { name: '学者', desc: '长期研究魔法与古代文献。', skills: ['arcana', 'history'] },
    acolyte:  { name: '侍僧', desc: '接受过神殿教义与识人训练。', skills: ['religion', 'insight'] },
    outlander:{ name: '化外之民', desc: '在荒野中依靠直觉生存。', skills: ['survival', 'perception'] },
    noble:    { name: '贵族', desc: '熟悉礼仪、历史与权力关系。', skills: ['persuasion', 'history'] }
};

const CLASS_DEFAULT_BACKGROUNDS = {
    warrior: 'soldier', rogue: 'criminal', wizard: 'sage',
    cleric: 'acolyte', paladin: 'noble', ranger: 'outlander'
};

const CLASS_SAVING_THROWS = {
    warrior: ['str', 'con'], rogue: ['dex', 'int'], wizard: ['int', 'wis'],
    cleric: ['wis', 'cha'], paladin: ['wis', 'cha'], ranger: ['str', 'dex']
};

const CLASS_ATTACK_ABILITIES = {
    warrior: 'str', rogue: 'dex', wizard: 'int', cleric: 'wis', paladin: 'str', ranger: 'dex'
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
