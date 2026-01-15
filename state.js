// state.js - 全局状态

// 队伍
const party = [
  // 初始为空，由玩家创建
];

// 地图数据
const dungeon = {};
let playerRoomId = '0,0';

// 游戏状态机：'EXPLORING' | 'COMBAT' | 'GAMEOVER' | 'TOWN' | 'EVENT' (新增事件状态)
let gameState = 'CREATION'; // 初始为创建界面

// 战斗状态
let combatState = {
  active: false,
  type: null, 
  enemy: null, 
  round: 0,
  actedIndices: [] 
};

// 当前激活的互动事件 (新增)
let activeEvent = null;

// 背包状态
const inventory = {
  gold: 0,
  items: [] 
};

// 全局难度与商店
window.worldLevel = 1; // 当前周目/难度等级
window.shopStock = []; // 商店当前库存