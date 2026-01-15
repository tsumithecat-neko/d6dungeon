// utils.js - 通用工具函数与存档管理

function d6(){ return Math.floor(Math.random()*6)+1 }
function d10(){ return Math.floor(Math.random()*10)+1 }
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function arrow(d){ return {up:'↑',down:'↓',left:'←',right:'→'}[d] }

function addLog(t){ 
  const log = document.getElementById('logContent'); 
  const p = document.createElement('div'); 
  
  if (t.includes('击中') || t.includes('伤害')) p.style.color = '#ffcc80';
  if (t.includes('胜利') || t.includes('获得')) p.style.color = '#a5d6a7';
  if (t.includes('遭遇')) p.style.color = '#90caf9';
  if (t.includes('全灭') || t.includes('失败')) p.style.color = '#ef9a9a';
  if (t.includes('存档')) p.style.color = '#ce93d8';
  
  p.innerHTML = t; 
  log.appendChild(p); 
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

// --- 核心存档逻辑 ---

// 1. 收集当前游戏所有数据
function collectSaveData() {
    return {
        version: 1.1, // 升级版本号
        timestamp: Date.now(),
        party: party,
        dungeon: dungeon,
        inventory: inventory,
        gameState: gameState,
        playerRoomId: playerRoomId,
        combatState: combatState,
        // 新增属性：如果存在则保存
        worldLevel: window.worldLevel || 1,
        runStats: window.runStats || { kills: 0 },
        legacy: window.LegacySystem ? window.LegacySystem.data : null
    };
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
        if (data.party) data.party.forEach(p => party.push(p));

        for (let key in dungeon) delete dungeon[key];
        Object.assign(dungeon, data.dungeon || {});

        inventory.gold = data.inventory?.gold || 0;
        inventory.items = data.inventory?.items || [];

        gameState = data.gameState || 'CREATION';
        playerRoomId = data.playerRoomId || 'start_room';
        
        Object.assign(combatState, data.combatState || { active: false });

        // --- 新增属性的兼容性处理 ---
        window.worldLevel = data.worldLevel || 1;
        window.runStats = data.runStats || { kills: 0 };

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