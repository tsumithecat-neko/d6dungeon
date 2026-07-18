// utils.js - 通用工具函数与存档管理

function d6(){ return Math.floor(Math.random()*6)+1 }
function d10(){ return Math.floor(Math.random()*10)+1 }
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function arrow(d){ return {up:'↑',down:'↓',left:'←',right:'→'}[d] }

function inferLogType(message) {
  if (message.includes('主线') || message.includes('结局') || message.includes('线索') || message.includes('王座')) return 'story';
  if (message.includes('意图') || message.includes('准备')) return 'intent';
  if (message.includes('全灭') || message.includes('失败') || message.includes('阵亡')) return 'danger';
  if (message.includes('胜利') || message.includes('获得') || message.includes('升级')) return 'reward';
  if (message.includes('恢复') || message.includes('治愈')) return 'heal';
  if (message.includes('遭遇') || message.includes('敌人出现') || message.includes('首领')) return 'encounter';
  if (message.includes('击中') || message.includes('伤害') || message.includes('攻击')) return 'combat';
  if (message.includes('存档') || message.includes('读档')) return 'system';
  if (message.includes('警告') || message.includes('⚠️')) return 'warning';
  return 'info';
}

function normalizeLogEntry(input, fallbackType = null) {
  const message = typeof input === 'object' && input !== null ? String(input.message || '') : String(input || '');
  const type = typeof input === 'object' && input !== null && input.type
      ? input.type
      : fallbackType || inferLogType(message);
  return { type, message, timestamp: Date.now() };
}

function createLogElement(entry) {
  const element = document.createElement('div');
  element.className = `log-entry log-${entry.type}`;
  element.dataset.logType = entry.type;
  element.innerHTML = entry.message;
  return element;
}

function renderLogHistory() {
  const log = document.getElementById('logContent');
  if (!log) return;
  log.innerHTML = '';
  adventureLog.forEach(entry => log.appendChild(createLogElement(entry)));
  log.scrollTop = log.scrollHeight;
}

function addLog(entryOrMessage, fallbackType = null){
  const entry = normalizeLogEntry(entryOrMessage, fallbackType);
  adventureLog.push(entry);
  if (adventureLog.length > 200) adventureLog.splice(0, adventureLog.length - 200);

  const log = document.getElementById('logContent');
  if (!log) return entry;
  log.appendChild(createLogElement(entry));
  log.scrollTop = log.scrollHeight;
  return entry;
}

function randomAliveCharacter(){
  const alive = party.filter(p=>p.hp>0);
  if (!alive.length) return null;
  return alive[Math.floor(Math.random()*alive.length)];
}

function getDieHTML(value, isCrit = false) {
    const critClass = isCrit ? 'crit' : '';
    let pips = '';
    for(let i=0; i<value; i++) pips += '<div class="pip"></div>';
    return `<div class="die ${critClass}" data-val="${value}">${pips}</div>`;
}

function logDieIcon(val) {
    const isCrit = (val === 6);
    return `<span class="log-die ${isCrit?'crit':''}">${val}</span>`;
}

// JSON 存档和深拷贝不会保留函数。根据静态定义恢复物品行为，
// 同时兼容尚未包含 itemKey 的旧存档。
function rehydrateItem(item) {
    if (!item || typeof item !== 'object') return item;

    const matchedEntry = Object.entries(ITEM_TYPES).find(([key, def]) =>
        item.itemKey === key || (item.type === def.type && item.name === def.name)
    );
    if (!matchedEntry) return item;

    const [itemKey, definition] = matchedEntry;
    const hydrated = {
        ...definition,
        ...item,
        itemKey,
        effectId: item.effectId || definition.effectId
    };
    delete hydrated.effect;
    return hydrated;
}

function cloneItem(item) {
    return rehydrateItem(JSON.parse(JSON.stringify(item)));
}

// --- 核心存档逻辑 ---

const AUTO_SAVE_KEY = 'd6dungeon_autosave_v1';
const AUTO_SAVE_STATES = new Set(['EXPLORING', 'COMBAT', 'EVENT', 'TOWN', 'VICTORY']);

// 1. 收集当前游戏所有数据
function collectSaveData() {
    const activeEventKey = activeEvent
        ? Object.keys(EVENT_DEFINITIONS).find(key => EVENT_DEFINITIONS[key] === activeEvent || EVENT_DEFINITIONS[key].title === activeEvent.title)
        : null;

    return {
        version: 1.8,
        timestamp: Date.now(),
        party: party,
        dungeon: dungeon,
        inventory: inventory,
        gameState: gameState,
        playerRoomId: playerRoomId,
        combatState: combatState,
        activeEventKey: activeEventKey || null,
        activeEvent: activeEvent,
        shopStock: window.shopStock || [],
        logEntries: adventureLog,
        // 新增属性：如果存在则保存
        worldLevel: window.worldLevel || 1,
        runStats: window.runStats || { kills: 0 },
        storyState: window.storyState || null,
        questState: window.questState || null,
        legacy: window.LegacySystem ? window.LegacySystem.data : null
    };
}

function readAutoSaveData() {
    try {
        const raw = localStorage.getItem(AUTO_SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.party) || !data.gameState) return null;
        return data;
    } catch (error) {
        console.warn('自动存档读取失败:', error);
        return null;
    }
}

function getAutoSaveSummary() {
    const data = readAutoSaveData();
    if (!data) return null;
    return {
        timestamp: data.timestamp || 0,
        gameState: data.gameState,
        worldLevel: data.worldLevel || 1,
        partyCount: data.party.length
    };
}

function autoSaveGame() {
    if (!AUTO_SAVE_STATES.has(gameState) || party.length === 0) return false;
    try {
        const data = collectSaveData();
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
        window.lastAutoSaveAt = data.timestamp;
        return true;
    } catch (error) {
        console.warn('自动存档写入失败:', error);
        return false;
    }
}

function loadAutoSaveGame() {
    const data = readAutoSaveData();
    if (!data) return false;
    return importSaveGame(data);
}

function clearAutoSave() {
    try {
        localStorage.removeItem(AUTO_SAVE_KEY);
        window.lastAutoSaveAt = null;
        return true;
    } catch (error) {
        console.warn('自动存档删除失败:', error);
        return false;
    }
}

// 2. 导出为文件 (下载)
function downloadSaveFile() {
    try {
        const data = collectSaveData();
        const jsonStr = JSON.stringify(data, null, 2); // 美化格式，方便手动修改debug
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        // 文件名包含时间，防止混淆
        const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,"-");
        a.download = `d6dungeon_save_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog("💾 存档文件已生成并下载！");
    } catch (e) {
        console.error(e);
        alert("导出失败，请检查控制台");
    }
}

// 3. 从文件导入 (读取)
function triggerImportFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                importSaveGame(data);
            } catch (err) {
                alert("存档文件损坏或格式错误！");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 4. 执行读档 (包含兼容性合并)
function importSaveGame(data) {
    if (!data) return false;
    
    try {
        // --- 基础数据恢复 ---
        party.length = 0;
        if (data.party) data.party.forEach(p => {
            p.skillLevel = Math.max(0, Math.min(3, p.skillLevel || 0));
            if (!Array.isArray(p.status)) p.status = [];
            if (!p.equipment) p.equipment = { weapon: null, armor: null };
            if (typeof hydrateCharacterRules === 'function') hydrateCharacterRules(p);
            party.push(p);
        });

        for (let key in dungeon) delete dungeon[key];
        Object.assign(dungeon, data.dungeon || {});

        inventory.gold = data.inventory?.gold || 0;
        inventory.items = (data.inventory?.items || []).map(rehydrateItem);

        gameState = data.gameState || 'CREATION';
        playerRoomId = data.playerRoomId || 'start_room';
        
        Object.assign(combatState, {
            active: false, type: null, enemy: null, round: 0,
            actedIndices: [], defendingIndices: [], enemyIntent: [], initiative: null
        }, data.combatState || {});
        if (!Array.isArray(combatState.actedIndices)) combatState.actedIndices = [];
        if (!Array.isArray(combatState.defendingIndices)) combatState.defendingIndices = [];
        if (!Array.isArray(combatState.enemyIntent)) combatState.enemyIntent = [];
        if (combatState.enemy) {
            if (combatState.type === 'group' && !combatState.enemy.maxCount) combatState.enemy.maxCount = combatState.enemy.count;
            if (combatState.type !== 'group' && !combatState.enemy.maxHp) combatState.enemy.maxHp = combatState.enemy.hp;
            const savedWorldLevel = data.worldLevel || 1;
            const tierBonus = Math.floor((savedWorldLevel - 1) / 2);
            combatState.enemy.ac = combatState.enemy.ac || (combatState.type === 'boss' ? 13 : combatState.type === 'elite' ? 12 : 10) + tierBonus;
            combatState.enemy.attackBonus = combatState.enemy.attackBonus ?? 2 + (combatState.enemy.att || 0);
            combatState.enemy.saveDC = combatState.enemy.saveDC || 10 + tierBonus + (combatState.type === 'boss' ? 2 : combatState.type === 'elite' ? 1 : 0);
            if (!combatState.initiative && typeof rollCombatInitiative === 'function') combatState.initiative = rollCombatInitiative(combatState.enemy);
        }

        const eventKey = data.activeEventKey || dungeon[playerRoomId]?.encounter?.subtype;
        activeEvent = gameState === 'EVENT' ? (data.activeEvent || (eventKey ? EVENT_DEFINITIONS[eventKey] : null)) : null;
        if (gameState === 'COMBAT' && combatState.active && combatState.enemyIntent.length === 0 && typeof planEnemyTurn === 'function') {
            planEnemyTurn();
        }
        window.shopStock = (data.shopStock || []).map(rehydrateItem);
        if (gameState === 'TOWN' && window.shopStock.length === 0 && typeof window.generateShopItems === 'function') {
            window.generateShopItems();
        }

        adventureLog.length = 0;
        (data.logEntries || []).slice(-200).forEach(entry => {
            if (entry && typeof entry.message === 'string') {
                adventureLog.push({ type: entry.type || inferLogType(entry.message), message: entry.message, timestamp: entry.timestamp || Date.now() });
            }
        });
        if (typeof renderLogHistory === 'function') renderLogHistory();

        // --- 新增属性的兼容性处理 ---
        window.worldLevel = data.worldLevel || 1;
        window.runStats = data.runStats || { kills: 0 };
        if (typeof restoreStoryState === 'function') restoreStoryState(data.storyState, window.worldLevel);
        if (typeof restoreQuestState === 'function') restoreQuestState(data.questState);

        // 恢复英灵殿数据 (如果存档里没有，保持现有数据，或者重置为初始值)
        if (window.LegacySystem && data.legacy) {
            window.LegacySystem.data = data.legacy;
            window.LegacySystem.save(); // 同步更新到 localStorage
        }

        // --- UI 刷新 ---
        addLog(`📂 读档成功！(v${data.version || 1.0})`);
        
        // 如果是在战斗中读档，重新初始化界面可能需要特殊处理
        if (gameState === 'COMBAT') {
            addLog("正在恢复战斗现场...");
        }
        
        updateUI();
        return true;
    } catch (e) {
        console.error(e);
        alert("读档逻辑执行失败！数据可能不兼容。");
        return false;
    }
}

// 保留旧的字符串导出函数作为备用 (可选)
function exportSaveGame() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(collectSaveData()))));
}
