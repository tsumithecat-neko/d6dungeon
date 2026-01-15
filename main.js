// main.js - 游戏入口与循环控制

window.addCharacter = function(raceKey, classKey, customName) {
    if (party.length >= 4) return;
    
    const rData = RACES[raceKey];
    const cData = CLASS_BASE_STATS[classKey];
    
    const finalHp = cData.hp + rData.hp;
    const finalMp = cData.mp + rData.mp;
    const finalAtt = cData.att + rData.att;
    const finalName = (customName && customName.trim() !== "") ? customName : `${rData.name}${cData.name}`;

    const newChar = {
        name: finalName, raceName: rData.name, className: cData.name,
        class: classKey, race: raceKey,
        hp: finalHp, maxHp: finalHp, mp: finalMp, maxMp: finalMp,
        att: finalAtt, lvl: 1, xp: 0, maxXp: 10,
        equipment: { weapon: null, armor: null },
        status: [] 
    };
    
    party.push(newChar);
    updateUI();
};

window.startGame = function() {
    if (party.length < 1) { alert("请至少创建一个角色！"); return; }
    
    // 初始化地牢
    for(let key in dungeon) delete dungeon[key];
    combatState.active = false;
    inventory.items = []; inventory.gold = 0;
    window.worldLevel = 1;
    
    // --- 新增：初始化运行统计 ---
    window.runStats = { kills: 0 }; 

    // --- 新增：应用英灵殿加成 ---
    if (window.LegacySystem) {
        LegacySystem.applyAll({ inventory: inventory, party: party });
        if (Object.values(LegacySystem.data.upgrades).some(v => v > 0)) {
            addLog("✨ [英灵殿] 先祖的庇护已生效！");
        }
    }

    // 创建起始房间
    if (typeof createRoom === 'function') {
        const startRoom = createRoom('start');
        startRoom.absX = 0; startRoom.absY = 0; startRoom.id = 'start_room';
        dungeon['start_room'] = startRoom;
        playerRoomId = 'start_room';
        
        gameState = 'EXPLORING';
        updateUI();
        addLog("队伍集结完毕。你们站在古老地牢的入口，火把照亮了通往黑暗的第一步...");
    } else {
        console.error("Critical Error: createRoom not found!");
    }
};

function initGame(){
  gameState = 'CREATION';
  party.length = 0; 
  updateUI();
}

window.enterTown = function() {
    gameState = 'TOWN';
    party.forEach(p => p.status = []);
    if(window.generateShopItems) window.generateShopItems();
    addLog(`🚩 英雄们满载而归，回到了城镇。当前世界等级: Lv.${window.worldLevel}`);
    
    // 进城也可以视为一种胜利结算节点，这里简单处理，只在全灭或通关时结算碎片
    updateUI();
};

window.startNextRun = function() {
    window.worldLevel++; 
    for(let key in dungeon) delete dungeon[key];
    combatState.active = false;
    
    if (typeof createRoom === 'function') {
        const startRoom = createRoom('start');
        startRoom.absX = 0; startRoom.absY = 0; startRoom.id = 'start_room';
        dungeon['start_room'] = startRoom;
        playerRoomId = 'start_room';
        
        party.forEach(p => {
            p.status = []; 
            if(p.hp <= 0) { p.hp = 1; addLog(`${p.name} 勉强苏醒了过来 (1 HP)。`); }
        });

        gameState = 'EXPLORING';
        addLog(`⚔️ 再次踏入黑暗... 敌人变得更强了 (Lv.${window.worldLevel})！`);
        updateUI();
    }
};

setTimeout(initGame, 100);