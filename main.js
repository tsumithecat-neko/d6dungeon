// main.js

// 暴露给 UI 调用的函数 (新增 customName 参数)
window.addCharacter = function(raceKey, classKey, customName) {
    if (party.length >= 4) return;
    
    const rData = RACES[raceKey];
    const cData = CLASS_BASE_STATS[classKey];
    
    // 计算最终属性
    const finalHp = cData.hp + rData.hp;
    const finalMp = cData.mp + rData.mp;
    const finalAtt = cData.att + rData.att;
    
    const finalName = (customName && customName.trim() !== "") 
                      ? customName 
                      : `${rData.name}${cData.name}`;

    const newChar = {
        name: finalName,
        raceName: rData.name,
        className: cData.name,
        class: classKey, 
        race: raceKey,
        
        hp: finalHp,
        maxHp: finalHp,
        mp: finalMp,
        maxMp: finalMp,
        att: finalAtt,
        lvl: 1,
        
        // --- 新增：经验值初始化 ---
        xp: 0,
        maxXp: 10 // 1级升2级需要10点XP
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
  party.length = 0; 
  updateUI();
}

// 启动
initGame();
