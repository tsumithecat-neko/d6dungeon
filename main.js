// main.js

// 暴露给 UI 调用的函数
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
        
        xp: 0,
        maxXp: 10,

        // --- 新增：装备栏初始化 ---
        equipment: { weapon: null, armor: null }
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
    window.worldLevel = 1; // 重置难度

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

// --- 新增：进入城镇 (整备阶段) ---
window.enterTown = function() {
    gameState = 'TOWN';
    // 刷新商店
    if(window.generateShopItems) window.generateShopItems();
    addLog(`🚩 英雄们满载而归，回到了城镇。当前世界等级: Lv.${window.worldLevel}`);
    updateUI();
};

// --- 新增：开启新一轮冒险 (难度提升) ---
window.startNextRun = function() {
    window.worldLevel++; // 难度 +1
    
    // 重置地牢
    for(let key in dungeon) delete dungeon[key];
    combatState.active = false;
    
    // 创建新起点
    const startRoom = createRoom('start');
    startRoom.absX = 0; startRoom.absY = 0; startRoom.id = 'start_room';
    dungeon['start_room'] = startRoom;
    playerRoomId = 'start_room';
    
    // 状态全满 + 复活
    party.forEach(p => {
        if(p.hp <= 0) p.hp = 1; // 仅复活为1血，需要喝药
        p.hp = p.maxHp; 
        p.mp = p.maxMp;
    });

    gameState = 'EXPLORING';
    addLog(`⚔️ 再次踏入黑暗... 敌人变得更强了 (Lv.${window.worldLevel})！`);
    updateUI();
};

// 启动
initGame();