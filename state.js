// state.js - 全局状态

// 队伍
const party = [
  // 初始为空，由玩家创建
];

// 地图数据
const dungeon = {};
let playerRoomId = '0,0';

// 游戏状态机：'EXPLORING' | 'COMBAT' | 'GAMEOVER' | 'TOWN' (新增)
let gameState = 'CREATION'; // 初始为创建界面

// 战斗状态
let combatState = {
  active: false,
  type: null, 
  enemy: null, 
  round: 0,
  actedIndices: [] 
};

// 背包状态
const inventory = {
  gold: 0,
  items: [] 
};

// 全局难度与商店 (新增)
window.worldLevel = 1; // 当前周目/难度等级
window.shopStock = []; // 商店当前库存