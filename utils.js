// utils.js - 通用工具函数

function d6(){ return Math.floor(Math.random()*6)+1 }
// 新增 d10 函数
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
    // 根据点数生成对应数量的 pip div
    let pips = '';
    for(let i=0; i<value; i++) pips += '<div class="pip"></div>';
    
    return `<div class="die ${critClass}" data-val="${value}">${pips}</div>`;
}

// 在日志中显示的小骰子
function logDieIcon(val) {
    const isCrit = (val === 6);
    return `<span class="log-die ${isCrit?'crit':''}">${val}</span>`;
}

// 导出存档为字符串
function exportSaveGame() {
    const saveData = {
        party,
        dungeon,
        inventory,
        gameState,
        playerRoomId,
        combatState,
        timestamp: Date.now(),
        version: 1.0
    };

    try {
        const jsonString = JSON.stringify(saveData);
        // 处理中文编码并转为 Base64，防止乱码和换行
        const saveCode = btoa(unescape(encodeURIComponent(jsonString)));
        return saveCode;
    } catch (e) {
        console.error("导出失败:", e);
        return null;
    }
}

// 从字符串导入存档
function importSaveGame(saveCode) {
    if (!saveCode) return false;
    
    try {
        // Base64 解码并还原中文
        const jsonString = decodeURIComponent(escape(atob(saveCode)));
        const data = JSON.parse(jsonString);

        // 简单的版本检查 (可选)
        // if (data.version !== 1.0) { alert("存档版本不匹配"); return false; }

        // 1. 恢复队伍
        party.length = 0;
        data.party.forEach(p => party.push(p));

        // 2. 恢复地牢数据 (必须清空原对象再赋值，保持引用)
        for (let key in dungeon) delete dungeon[key];
        Object.assign(dungeon, data.dungeon);

        // 3. 恢复背包
        inventory.gold = data.inventory.gold;
        inventory.items = data.inventory.items;

        // 4. 恢复其他状态
        gameState = data.gameState;
        playerRoomId = data.playerRoomId;
        
        // 恢复 combatState (如果是引用替换，需要 assign)
        Object.assign(combatState, data.combatState);

        addLog(`💾 读档成功！时间: ${new Date(data.timestamp).toLocaleString()}`);
        updateUI();
        return true;
    } catch (e) {
        console.error(e);
        alert("存档代码无效或已损坏！");
        return false;
    }
}