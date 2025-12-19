// state.js - 全局状态

// 队伍
// state.js

const party = [
  // 战士：怒气系统 (MP代表怒气/体力)，较高HP
  { name: "战士", hp: 10, maxHp: 10, mp: 3, maxMp: 3, lvl: 1, att: 1, class: 'warrior' },
  // 盗贼：技巧值，中等HP
  { name: "盗贼", hp: 7, maxHp: 7, mp: 3, maxMp: 3, lvl: 1, att: 1, class: 'rogue' },
  // 法师：法力值，低HP
  { name: "法师", hp: 4, maxHp: 4, mp: 5, maxMp: 5, lvl: 1, att: 0, class: 'wizard' },
  // 牧师：信仰值，中等HP
  { name: "牧师", hp: 6, maxHp: 6, mp: 4, maxMp: 4, lvl: 1, att: 0, class: 'cleric' }
];

// 地图数据
const dungeon = {};
let playerRoomId = '0,0';

// 游戏状态机：'EXPLORING' | 'COMBAT' | 'GAMEOVER'
let gameState = 'EXPLORING'; 

// 战斗状态
let combatState = {
  active: false,
  type: null, 
  enemy: null, 
  round: 0,
  // --- 新增：记录本回合已经行动过的角色索引 ---
  actedIndices: [] 
};

// 背包状态
const inventory = {
  gold: 0,
  items: [] 
};