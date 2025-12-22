// data.js - 游戏配置与静态数据

const TO_HIT_TARGET = 4; // 判定标准

// --- 房间生成表 (2d10) ---
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

// 连接用的短走廊
const CONNECTOR_CORRIDORS = {
    horiz_1: { name: "短通道", type: "corridor", w: 1, h: 1, shape: 'rect' },
    horiz_2: { name: "通道", type: "corridor", w: 2, h: 1, shape: 'rect' },
    vert_1:  { name: "短通道", type: "corridor", w: 1, h: 1, shape: 'rect' },
    vert_2:  { name: "通道", type: "corridor", w: 1, h: 2, shape: 'rect' }
};

// --- 1. 职业基础属性 (扩充到6个) ---
const CLASS_BASE_STATS = {
    warrior: { name: "战士", hp: 10, mp: 2, att: 1, desc: "前排肉盾，擅长物理攻击" },
    rogue:   { name: "盗贼", hp: 7,  mp: 4, att: 1, desc: "技巧型，擅长暴击和闪避" },
    wizard:  { name: "法师", hp: 4,  mp: 6, att: 0, desc: "脆皮高爆发，依赖魔法" },
    cleric:  { name: "牧师", hp: 6,  mp: 5, att: 0, desc: "辅助治疗，团队核心" },
    // 新增
    paladin: { name: "圣骑士", hp: 9, mp: 3, att: 1, desc: "神圣战士，能自我治疗的坦克" },
    ranger:  { name: "游侠",   hp: 8, mp: 4, att: 1, desc: "远程射手，多段攻击" }
};

// --- 2. 种族修正 (扩充到6个) ---
const RACES = {
    human:    { name: "人类", hp: 1, mp: 1, att: 0, desc: "均衡多才 (HP+1, MP+1)" },
    dwarf:    { name: "矮人", hp: 3, mp: -1, att: 0, desc: "坚韧顽强 (HP+3, MP-1)" },
    elf:      { name: "精灵", hp: -1, mp: 2, att: 0, desc: "魔法亲和 (MP+2, HP-1)" },
    orc:      { name: "兽人", hp: 2, mp: -2, att: 1, desc: "野蛮力量 (HP+2, 攻+1, MP-2)" },
    // 新增
    halfling: { name: "半身人", hp: -1, mp: 3, att: 0, desc: "幸运机敏 (MP+3, HP-1)" },
    tiefling: { name: "提夫林", hp: 0, mp: 1, att: 1, desc: "炼狱血统 (攻+1, MP+1)" }
};

// --- 3. 职业技能定义 (扩充到6个) ---
const CLASS_SKILLS = {
    warrior: {
        name: "强力横扫",
        cost: 1,
        desc: "消耗1体力，对敌人造成必中的 2 点伤害（群体战时击杀2人）。",
        effect: (user, battleState) => {
            const dmg = 2;
            if (battleState.type === 'group') {
                battleState.enemy.count = Math.max(0, battleState.enemy.count - dmg);
                return `${user.name} 挥舞武器横扫，击倒了 2 个敌人！`;
            } else {
                battleState.enemy.hp -= dmg;
                return `${user.name} 重重地劈砍，对 ${battleState.enemy.name} 造成 2 点伤害！`;
            }
        }
    },
    rogue: {
        name: "弱点背刺",
        cost: 1,
        desc: "消耗1技巧，造成致命一击（击杀1个敌人或对Boss造成2伤害）。",
        effect: (user, battleState) => {
             if (battleState.type === 'group') {
                battleState.enemy.count--;
                return `${user.name} 潜行到阴影中发动背刺，秒杀了一个敌人！`;
            } else {
                battleState.enemy.hp -= 2;
                return `${user.name} 找到了弱点，狠狠刺入！(2伤害)`;
            }
        }
    },
    wizard: {
        name: "爆裂火球",
        cost: 2,
        desc: "消耗2法力，随机消灭 d6 个小怪或对Boss造成 3 点伤害。",
        effect: (user, battleState) => {
            const roll = Math.floor(Math.random()*6)+1;
            if (battleState.type === 'group') {
                const kills = roll;
                battleState.enemy.count = Math.max(0, battleState.enemy.count - kills);
                return `${user.name} 咏唱咒语扔出火球，炸飞了 ${kills} 个敌人！`;
            } else {
                battleState.enemy.hp -= 3;
                return `${user.name} 的火球术直接命中，造成 3 点爆发伤害！`;
            }
        }
    },
    cleric: {
        name: "神圣治愈",
        cost: 2,
        desc: "消耗2信仰，为生命值最低的队友恢复 4 点 HP。",
        effect: (user, battleState) => {
            let target = party.sort((a,b) => a.hp - b.hp)[0];
            const healAmt = 4;
            target.hp = Math.min(target.maxHp, target.hp + healAmt); 
            return `${user.name} 祈祷神恩，${target.name} 的伤口愈合了 (+${healAmt} HP)。`;
        }
    },
    // 新增技能
    paladin: {
        name: "圣佑打击",
        cost: 2,
        desc: "消耗2信仰，造成2点伤害，并为自己恢复2点HP（攻守兼备）。",
        effect: (user, battleState) => {
            // 伤害逻辑
            if (battleState.type === 'group') {
                battleState.enemy.count = Math.max(0, battleState.enemy.count - 2);
            } else {
                battleState.enemy.hp -= 2;
            }
            // 回血逻辑
            const heal = 2;
            const oldHp = user.hp;
            user.hp = Math.min(user.maxHp, user.hp + heal);
            
            return `${user.name} 沐浴着圣光挥剑！造成伤害并恢复了 ${user.hp - oldHp} 点生命。`;
        }
    },
    ranger: {
        name: "双重射击",
        cost: 2,
        desc: "消耗2体力，发动两次攻击（共造成2点伤害），精准高效。",
        effect: (user, battleState) => {
            if (battleState.type === 'group') {
                battleState.enemy.count = Math.max(0, battleState.enemy.count - 2);
                return `${user.name} 快速射出两箭，精准地干掉了 2 个敌人！`;
            } else {
                battleState.enemy.hp -= 2;
                return `${user.name} 的连珠箭全部命中目标！(2伤害)`;
            }
        }
    }
};

// --- 新增：职业升级成长表 ---
const CLASS_GROWTH = {
    warrior: { hp: 2, mp: 0, att: 1, desc: "体格强化 (HP+2, 攻+1)" }, // 战士越战越勇
    rogue:   { hp: 1, mp: 1, att: 1, desc: "技巧磨练 (HP+1, MP+1, 攻+1)" }, // 均衡
    wizard:  { hp: 1, mp: 2, att: 0, desc: "魔力源泉 (MP+2, HP+1)" }, // 法师堆蓝
    cleric:  { hp: 1, mp: 2, att: 0, desc: "信仰加深 (MP+2, HP+1)" }, 
    paladin: { hp: 2, mp: 1, att: 0, desc: "圣光护体 (HP+2, MP+1)" }, 
    ranger:  { hp: 1, mp: 1, att: 1, desc: "狩猎本能 (HP+1, MP+1, 攻+1)" }
};

// 怪物池
const MONSTER_POOLS = {
  minion: [ { name: "骷髅兵", count: 4, att: 0 }, { name: "变异巨鼠", count: 5, att: 0 }, { name: "地精斥候", count: 3, att: 1 }, { name: "吸血蝙蝠", count: 4, att: 0 } ],
  beast: [ { name: "兽人狂战", count: 2, att: 1 }, { name: "食人妖", count: 1, att: 2 }, { name: "装甲蜘蛛", count: 2, att: 1 } ],
  boss: [ { name: "双头食人魔", hp: 8, att: 2 }, { name: "混沌死灵法师", hp: 6, att: 3 }, { name: "石化美杜莎", hp: 6, att: 3 }, { name: "深渊恶魔", hp: 10, att: 2 } ]
};

// 物品定义
const ITEM_TYPES = {
  potion: { name: "治疗药水", type: "consumable", desc: "恢复4点HP", effect: (target) => { 
      target.hp = Math.min(target.hp + 4, target.maxHp); 
      addLog(`${target.name} 喝下药水，恢复了生命。(HP: ${target.hp})`);
      return true;
  }},
  scroll: { name: "闪电卷轴", type: "combat", desc: "对所有敌人造成1点伤害", effect: () => {
      if(gameState !== 'COMBAT' || !combatState.active) { addLog("只能在战斗中使用！"); return false; }
      if(combatState.type === 'group') {
          combatState.enemy.count = 0; // 闪电清场，稍微强力一点
          addLog("闪电链在敌群中跳跃，瞬间清除了所有小怪！");
      } else {
          combatState.enemy.hp -= 2;
          addLog(`闪电击中 ${combatState.enemy.name}，造成 2 点伤害！`);
      }
      updateUI();
      return true;
  }},
  gem: { name: "红宝石", type: "treasure", desc: "价值 10 金币", value: 10 }
};
