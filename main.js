// main.js

// 暴露给 UI 调用的函数
window.addCharacter = function(raceKey, classKey) {
    if (party.length >= 4) return;
    
    const rData = RACES[raceKey];
    const cData = CLASS_BASE_STATS[classKey];
    
    // 计算最终属性 = 职业基础 + 种族修正
    const finalHp = cData.hp + rData.hp;
    const finalMp = cData.mp + rData.mp;
    const finalAtt = cData.att + rData.att;
    
    const newChar = {
        name: `${rData.name}${cData.name}`, // 自动命名，如“矮人战士”
        raceName: rData.name,
        className: cData.name,
        class: classKey, // 用于查找技能
        race: raceKey,
        
        hp: finalHp,
        maxHp: finalHp,
        mp: finalMp,
        maxMp: finalMp,
        att: finalAtt,
        lvl: 1
    };
    
    party.push(newChar);
    updateUI();
};

window.startGame = function() {
    if (party.length < 1) {
        alert("请至少创建一个角色！");
        return;
    }
    
    // 初始化地牢
    // 清空旧数据
    for(let key in dungeon) delete dungeon[key];
    combatState.active = false;
    inventory.items = []; 
    inventory.gold = 0;

    // 创建起始房间
    const startRoom = createRoom('start');
    startRoom.absX = 0;
    startRoom.absY = 0;
    startRoom.id = 'start_room';
    dungeon['start_room'] = startRoom;
    playerRoomId = 'start_room';
    
    // 切换状态
    gameState = 'EXPLORING';
    
    updateUI();
    addLog("队伍集结完毕。你们站在古老地牢的入口，火把照亮了通往黑暗的第一步...");
};

function initGame(){
  // 仅设置状态，等待玩家操作
  gameState = 'CREATION';
  party.length = 0; // 确保清空
  
  // 启动 UI 循环
  updateUI();
  
  // 不再自动添加日志，因为还没开始
}

// 启动
initGame();