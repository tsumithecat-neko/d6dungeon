// ui.js - 界面渲染

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

const PAPER_BG = '#ffffff';
const GRID_COLOR = '#e0e0e0'; 
const INK_COLOR = '#222';    
const PENCIL_COLOR = '#666'; 
const HIGHLIGHT_COLOR = '#b71c1c'; 
window.TILE_SIZE = 20; 

function updateUI() {
  if (gameState === 'CREATION') {
      ctx.fillStyle = '#f4f1ea'; 
      ctx.fillRect(0,0,canvas.width,canvas.height);
      drawGrid(ctx, canvas.width, canvas.height); 
      ctx.fillStyle = INK_COLOR;
      ctx.font = '30px "Special Elite", monospace';
      ctx.textAlign = 'center';
      ctx.fillText("D6 Dungeon Adventure", canvas.width/2, canvas.height/2 - 60);
      ctx.font = '16px "Patrick Hand", cursive';
      ctx.fillStyle = PENCIL_COLOR;
      ctx.fillText("- 冒险者集结 -", canvas.width/2, canvas.height/2 - 20);
      renderCreation(); renderParty(); renderInventory();
      return;
  }
  if (gameState === 'TOWN') {
       ctx.fillStyle = '#fff3e0'; ctx.fillRect(0,0,canvas.width,canvas.height);
       renderParty(); renderTownShop(); renderInventory();
       return;
   }

  drawMap();
  renderParty();
  renderControls();
  renderInventory();
  
  const log = document.getElementById('logContent');
  log.scrollTop = log.scrollHeight;
}

function drawMap(){
  const pRoom = dungeon[playerRoomId];
  if(!pRoom || pRoom.absX === undefined) return; 

  const offX = canvas.width/2 - pRoom.absX;
  const offY = canvas.height/2 - pRoom.absY;

  ctx.fillStyle = PAPER_BG; ctx.fillRect(0,0,canvas.width,canvas.height);
  drawGrid(ctx, canvas.width, canvas.height);

  Object.keys(dungeon).forEach(k => {
    const r = dungeon[k];
    const cx = r.absX + offX; const cy = r.absY + offY;
    if(cx < -300 || cx > canvas.width+300 || cy < -300 || cy > canvas.height+300) return;
    const w = (r.shape.w || 3) * window.TILE_SIZE;
    const h = (r.shape.h || 3) * window.TILE_SIZE;
    const shapeType = r.shape.shape || 'rect';

    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK_COLOR; ctx.lineWidth = 2.5;
    if (k === playerRoomId) { ctx.strokeStyle = HIGHLIGHT_COLOR; ctx.lineWidth = 3; }
    if (r.isConnector) ctx.lineWidth = 1; 

    ctx.beginPath(); drawRoomShapePath(ctx, cx, cy, w, h, shapeType); ctx.fill(); ctx.stroke();
    if (r.shape.type !== 'corridor') drawDoors(ctx, r, cx, cy, w, h);
    if (r.encounter && r.encounter.main !== 'none'){
      ctx.fillStyle = INK_COLOR; ctx.font = '20px "Segoe UI Emoji", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let icon = '';
      if(r.encounter.main=='monster') icon='💀';
      if(r.encounter.main=='boss') icon='👹';
      if(r.encounter.main=='treasure') icon='💎';
      if(r.encounter.main=='event') icon='❓';
      ctx.fillText(icon, cx, cy);
    }
  });
}

function drawGrid(ctx, w, h) {
    ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < w; x += window.TILE_SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0.5; y < h; y += window.TILE_SIZE) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
}

function drawRoomShapePath(ctx, cx, cy, w, h, type) {
    if (type === 'rect' || type === 'corridor') { ctx.rect(cx - w/2, cy - h/2, w, h); } 
    else if (type === 'circle') { ctx.arc(cx, cy, Math.min(w,h)/2, 0, Math.PI * 2); } 
    else if (type === 'cross') {
        const thirdW = w/3; const thirdH = h/3;
        ctx.rect(cx - w/2, cy - thirdH/2, w, thirdH); ctx.rect(cx - thirdW/2, cy - h/2, thirdW, h); 
    }
    else if (type === 'diamond') {
        ctx.moveTo(cx, cy - h/2); ctx.lineTo(cx + w/2, cy); ctx.lineTo(cx, cy + h/2); ctx.lineTo(cx - w/2, cy); ctx.closePath();
    }
    else if (type === 'L_up_right') {
        const halfW = w/2; const halfH = h/2;
        ctx.rect(cx - halfW, cy - halfH, halfW, h); ctx.rect(cx - halfW, cy, w, halfH); 
    }
    else if (type === 'oct') {
        const d = w/4; const x = cx - w/2, y = cy - h/2;
        ctx.moveTo(x + d, y); ctx.lineTo(x + w - d, y); ctx.lineTo(x + w, y + d); ctx.lineTo(x + w, y + h - d);
        ctx.lineTo(x + w - d, y + h); ctx.lineTo(x + d, y + h); ctx.lineTo(x, y + h - d); ctx.lineTo(x, y + d); ctx.closePath();
    }
    else { ctx.rect(cx - w/2, cy - h/2, w, h); }
}

function drawDoors(ctx, room, cx, cy, w, h) {
    ['up','right','down','left'].forEach(dir => {
      const door = room.doors[dir];
      let dx=cx, dy=cy; const dw = 10, dh = 10;
      if(dir=='up') dy -= h/2; if(dir=='down') dy += h/2;
      if(dir=='left') dx -= w/2; if(dir=='right') dx += w/2;
      ctx.fillStyle = '#fff'; ctx.fillRect(dx-dw/2, dy-dh/2, dw, dh);
      if (door.leadsTo) {
          ctx.strokeStyle = INK_COLOR; ctx.lineWidth = 1.5; ctx.strokeRect(dx-dw/2, dy-dh/2, dw, dh);
      } else if (door.blocked) {
          ctx.fillStyle = HIGHLIGHT_COLOR; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline='middle'; ctx.fillText('X', dx, dy);
      } else if (door.closed) {
          ctx.strokeStyle = PENCIL_COLOR; ctx.setLineDash([3, 3]); ctx.strokeRect(dx-dw/2, dy-dh/2, dw, dh); ctx.setLineDash([]);
      }
    });
}

function renderParty(){
  const list = document.getElementById('characters'); list.innerHTML='';
  party.forEach(p=>{
    const li = document.createElement('li');
    li.style.borderBottom = "1px dashed #ccc"; li.style.paddingBottom = "6px"; li.style.marginBottom = "6px";
    
    const maxHp = p.maxHp || p.hp || 1; const maxMp = p.maxMp || p.mp || 1;
    if (!p.maxXp) p.maxXp = p.lvl * 5 + 5; if (p.xp === undefined) p.xp = 0;

    const hpBars = Math.ceil(p.hp / 2); 
    const hpStr = '▮'.repeat(Math.max(0, hpBars)).padEnd(Math.ceil(maxHp/2), '▯');
    const mpBars = p.mp;
    const mpStr = '●'.repeat(Math.max(0, mpBars)).padEnd(maxMp, '○');
    
    // --- 装备显示 (支持颜色) ---
    const renderEquip = (eq) => {
        if (!eq) return '无';
        const colorStyle = eq.color ? `color:${eq.color}; font-weight:bold` : '';
        return `<span style="${colorStyle}">${eq.name}</span>`;
    };
    const w = p.equipment?.weapon ? `🗡️${renderEquip(p.equipment.weapon)}` : '👊空手';
    const a = p.equipment?.armor ? `🛡️${renderEquip(p.equipment.armor)}` : '👕布衣';

    // --- 状态图标 ---
    let statusHtml = '';
    if (p.status && p.status.length > 0) {
        statusHtml = p.status.map(s => STATUS_ICONS[s.type]).join(' ');
    }

    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <div style="font-weight:bold; font-size:1.1em">
             ${p.name} <span style="font-size:0.7em; background:#222; color:#fff; padding:1px 4px; border-radius:3px">Lv.${p.lvl}</span>
             <span style="font-size:0.8em; font-weight:normal; color:#555">(${p.raceName} ${p.className})</span>
             <span style="margin-left:5px">${statusHtml}</span>
          </div>
      </div>
      <div style="font-size:0.85em; color:#555; margin:2px 0;">${w} | ${a}</div>
      <div style="font-family:monospace; margin-top:4px; color:#b71c1c; font-size:1.1em; line-height:1.2">
        HP: ${hpStr} <span style="color:#000; font-size:0.7em">(${p.hp}/${maxHp})</span>
      </div>
      <div style="font-family:monospace; color:#1565c0; font-size:1.1em; line-height:1.2">
        MP: ${mpStr} <span style="color:#000; font-size:0.7em">(${p.mp}/${maxMp})</span>
      </div>
      <div style="margin-top:4px; display:flex; align-items:center; gap:5px">
        <div style="font-size:0.8em; color:#e65100; font-weight:bold">XP</div>
        <div style="flex:1; height:4px; background:#ddd; border-radius:2px; overflow:hidden">
            <div style="width:${xpPct}%; height:100%; background:#ff9800;"></div>
        </div>
      </div>
    `;
    if (p.hp <= 0) { li.style.opacity = '0.5'; li.style.textDecoration = 'line-through'; }
    list.appendChild(li);
  });
}

function renderCreation() {
    const container = document.getElementById('controls');
    container.innerHTML = '';
    const header = document.createElement('h3');
    header.style.color = HIGHLIGHT_COLOR; header.style.marginTop = '0';
    header.style.fontFamily = '"Special Elite", monospace';
    header.textContent = `角色卡填写 (${party.length}/4)`;
    container.appendChild(header);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = "💾 读取旧的记忆";
    loadBtn.style.cssText = "width:100%; padding:8px; background:#e8f5e9; color:#1b5e20; margin-bottom:15px; border:1px solid #2e7d32; cursor:pointer";
    loadBtn.onclick = () => showSaveLoadMenu();
    container.appendChild(loadBtn);

    if (party.length >= 4) {
        const startBtn = document.createElement('button');
        startBtn.innerHTML = "🛡️ <b>踏入黑暗地牢</b>";
        startBtn.style.cssText = "width:100%; padding:15px; background:#2e7d32; color:white; font-size:18px; border:2px solid #1b5e20; border-radius:4px; cursor:pointer; margin-top:20px";
        startBtn.onclick = () => window.startGame();
        container.appendChild(startBtn);
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = "撕毁角色卡 (重置)";
        resetBtn.style.cssText = "width:100%; padding:8px; background:transparent; color:#555; margin-top:10px; border:1px dashed #555; cursor:pointer";
        resetBtn.onclick = () => { party.length = 0; updateUI(); };
        container.appendChild(resetBtn);
        return;
    }

    const form = document.createElement('div');
    form.style.background = "#fff"; form.style.padding = "15px"; form.style.border = "2px solid #222"; form.style.boxShadow = "3px 3px 0 rgba(0,0,0,0.1)";
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.placeholder = '请输入英雄大名...';
    nameInput.style.cssText = "width:100%; padding:8px; margin-bottom:12px; background:#f9f9f9; border:1px solid #555; font-family:'Patrick Hand', cursive; font-size:1.1em; color:#000; box-sizing: border-box;";
    form.innerHTML += "<b>1. 姓名:</b>"; form.appendChild(nameInput);
    const raceSelect = document.createElement('select'); raceSelect.style.cssText = "width:100%; padding:8px; margin-bottom:12px; background:#f9f9f9; border:1px solid #555; font-family:inherit; box-sizing: border-box;";
    Object.keys(RACES).forEach(key => { const r = RACES[key]; const opt = document.createElement('option'); opt.value = key; opt.textContent = `${r.name} (${r.desc})`; raceSelect.appendChild(opt); });
    form.innerHTML += "<b>2. 种族:</b>"; form.appendChild(raceSelect);
    const classSelect = document.createElement('select'); classSelect.style.cssText = "width:100%; padding:8px; margin-bottom:16px; background:#f9f9f9; border:1px solid #555; font-family:inherit; box-sizing: border-box;";
    Object.keys(CLASS_BASE_STATS).forEach(key => { const c = CLASS_BASE_STATS[key]; const opt = document.createElement('option'); opt.value = key; opt.textContent = `${c.name} - ${c.desc}`; classSelect.appendChild(opt); });
    form.innerHTML += "<b>3. 职业:</b>"; form.appendChild(classSelect);
    const addBtn = document.createElement('button'); addBtn.textContent = "➕ 登记角色"; addBtn.style.cssText = "width:100%; padding:10px; background:#eee; color:#000; border:2px solid #000; cursor:pointer; font-weight:bold";
    addBtn.onclick = () => { const nameVal = nameInput.value; const rKey = raceSelect.value; const cKey = classSelect.value; if (window.addCharacter) window.addCharacter(rKey, cKey, nameVal); };
    form.appendChild(addBtn); container.appendChild(form);
}

function renderTownShop() {
    const container = document.getElementById('controls'); container.innerHTML = '<h3>🏰 休憩城镇</h3>';
    const nextBtn = document.createElement('button'); nextBtn.innerHTML = `🔥 <b>挑战下一周目 (Lv.${window.worldLevel + 1})</b>`;
    nextBtn.style.cssText = "width:100%; padding:15px; background:#d84315; color:white; margin-bottom:20px; font-weight:bold; cursor:pointer";
    nextBtn.onclick = () => window.startNextRun(); container.appendChild(nextBtn);
    
    const shopDiv = document.createElement('div'); shopDiv.style.cssText = "background:#fff; padding:10px; border:2px solid #555;"; shopDiv.innerHTML = "<h4>🛒 杂货铺</h4>";
    window.shopStock.forEach((item, idx) => {
        const row = document.createElement('div'); row.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin:5px 0; border-bottom:1px dotted #ccc; padding:4px 0";
        let desc = item.type === 'weapon' ? `攻+${item.att}` : (item.type==='armor'?`HP+${item.hpMax}`:item.desc);
        if(item.desc && item.desc.includes('[')) desc = item.desc; // 优先显示词缀描述
        
        let nameHtml = item.name;
        if (item.color) nameHtml = `<span style="color:${item.color}; font-weight:bold">${item.name}</span>`;
        
        row.innerHTML = `<span>${nameHtml} <small style="font-size:0.8em; color:#555">${desc}</small></span>`;
        const buyBtn = document.createElement('button'); buyBtn.textContent = `${item.cost} G`; buyBtn.style.fontSize = "0.9em"; buyBtn.onclick = () => window.buyItem(idx);
        if (inventory.gold < item.cost) { buyBtn.disabled = true; buyBtn.style.opacity = 0.6; }
        row.appendChild(buyBtn); shopDiv.appendChild(row);
    });
    container.appendChild(shopDiv);
    const hr = document.createElement('hr'); hr.style.cssText = "margin: 15px 0; border: 0; border-top: 1px dashed #ccc;"; container.appendChild(hr);
    const systemBtn = document.createElement('button'); systemBtn.innerHTML = "💾 系统 / 存读档"; systemBtn.style.width = "100%"; systemBtn.fontSize = "0.9em";
    systemBtn.onclick = () => showSaveLoadMenu(); container.appendChild(systemBtn);
}

function renderControls(){
  const container = document.getElementById('controls'); container.innerHTML = ''; 

  if (gameState === 'EXPLORING') {
    const searchBtn = document.createElement('button');
    const room = dungeon[playerRoomId];
    if (room && room.searched) { searchBtn.disabled = true; searchBtn.textContent = '🔍 房间已搜空'; } 
    else { searchBtn.textContent = '🔍 搜寻当前房间'; searchBtn.onclick = () => { if(window.performSearch) window.performSearch(); }; }
    searchBtn.style.width = '100%'; container.appendChild(searchBtn);

    const btn = document.createElement('button'); btn.textContent = '🎲 随机方向开门'; btn.style.width = '100%';
    btn.onclick = () => { 
        const closed = Object.keys(room.doors).filter(d => room.doors[d].closed && !room.doors[d].blocked);
        if(closed.length) openDoor(closed[Math.floor(Math.random()*closed.length)]); else addLog("没有可以打开的门了。");
    };
    container.appendChild(btn);

    const doorsDiv = document.createElement('div');
    ['up','right','down','left'].forEach(dir=>{
        const door = room.doors[dir]; const dBtn = document.createElement('button'); dBtn.style.marginRight = '5px';
        let statusText = ''; if(door.leadsTo) statusText = '(通)'; else if(door.blocked) statusText = '(堵)'; else if(door.closed) statusText = '(闭)';
        dBtn.innerHTML = `${arrow(dir)} ${dir.toUpperCase()} ${statusText}`;
        if(door.leadsTo) dBtn.style.borderStyle = "dashed";
        if(door.blocked) { dBtn.disabled = true; dBtn.style.textDecoration = "line-through"; dBtn.style.opacity=0.5; }
        else { dBtn.onclick = () => openDoor(dir); }
        doorsDiv.appendChild(dBtn);
    });
    container.appendChild(doorsDiv);

  } else if (gameState === 'EVENT') {
      const eventPanel = document.createElement('div');
      eventPanel.style.border = `2px dashed ${HIGHLIGHT_COLOR}`; eventPanel.style.padding = '10px'; eventPanel.style.background = '#fff8e1';
      const title = document.createElement('h3'); title.innerText = activeEvent.title; title.style.marginTop = '0'; title.style.color = HIGHLIGHT_COLOR; eventPanel.appendChild(title);
      const desc = document.createElement('p'); desc.innerText = activeEvent.desc; desc.style.fontStyle = 'italic'; desc.style.fontSize = '0.95em'; eventPanel.appendChild(desc);
      activeEvent.options.forEach((opt, idx) => {
          const btn = document.createElement('button'); btn.style.width = '100%'; btn.style.textAlign = 'left'; btn.style.marginBottom = '8px';
          btn.innerHTML = `<b>${opt.label}</b><br><span style="font-size:0.8em; color:#555">${opt.desc}</span>`;
          if (opt.reqClass) {
              const reqs = Array.isArray(opt.reqClass) ? opt.reqClass : [opt.reqClass];
              const hasClass = party.some(p => reqs.includes(p.class || p.race) && p.hp > 0);
              if (!hasClass) { btn.disabled = true; btn.style.opacity = 0.5; btn.title = "缺乏相应的职业角色"; }
          }
          btn.onclick = () => window.handleEventChoice(idx); eventPanel.appendChild(btn);
      });
      container.appendChild(eventPanel);

  } else if (gameState === 'COMBAT') {
    const combatPanel = document.createElement('div');
    
    // --- 显示敌方状态 ---
    const enemy = combatState.enemy;
    let enemyStatusHtml = '';
    if (enemy.status && enemy.status.length > 0) {
        enemyStatusHtml = enemy.status.map(s => STATUS_ICONS[s.type]).join(' ');
    }
    const enemyInfo = document.createElement('div');
    enemyInfo.style.cssText = "margin-bottom:10px; text-align:center; font-weight:bold; color:#b71c1c";
    enemyInfo.innerHTML = `🆚 敌人: ${enemy.name} <span style="font-size:1.2em">${enemyStatusHtml}</span>`;
    combatPanel.appendChild(enemyInfo);
    // ------------------

    const remainingActs = party.filter((p, idx) => p.hp > 0 && !combatState.actedIndices.includes(idx)).length;
    
    const atkBtn = document.createElement('button');
    atkBtn.style.width = '100%'; atkBtn.style.fontWeight = 'bold';
    if (remainingActs > 0) {
        atkBtn.innerHTML = `⚔️ 全员普攻 (${remainingActs}人)`;
        atkBtn.style.borderColor = HIGHLIGHT_COLOR; atkBtn.style.color = HIGHLIGHT_COLOR; atkBtn.style.borderWidth = '3px';
    } else {
        atkBtn.innerHTML = `⌛ 回合结束 (结算)`;
        atkBtn.style.borderColor = '#e65100'; atkBtn.style.color = '#e65100';
    }
    atkBtn.onclick = fightRound;
    combatPanel.appendChild(atkBtn);

    const skillsDiv = document.createElement('div');
    skillsDiv.style.cssText = "display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:10px; margin-bottom:12px";

    party.forEach((p, idx) => {
        if (p.hp <= 0) return; 
        const skill = CLASS_SKILLS[p.class]; if (!skill) return;
        const hasActed = combatState.actedIndices.includes(idx);
        
        // --- 检查眩晕 ---
        const isStunned = p.status && p.status.some(s => s.type === 'stun');
        // ---------------

        const sBtn = document.createElement('button');
        sBtn.innerHTML = `<b>${p.name}</b><br><small>${skill.name}</small>`;
        sBtn.style.fontSize = "0.9em";
        
        if (hasActed || p.mp < skill.cost || isStunned) { 
            sBtn.disabled = true; sBtn.style.opacity = 0.5; 
            if(isStunned) sBtn.innerHTML += " (晕)";
        } 
        else { sBtn.onclick = () => useSkill(idx, skill); }
        skillsDiv.appendChild(sBtn);
    });
    combatPanel.appendChild(skillsDiv);
    
    const fleeBtn = document.createElement('button'); fleeBtn.innerHTML = "🏃 试图逃跑"; fleeBtn.style.width = '100%'; fleeBtn.onclick = tryFlee;
    combatPanel.appendChild(fleeBtn);
    container.appendChild(combatPanel);
  } 
  else if (gameState === 'GAMEOVER') {
    const rBtn = document.createElement('button');
    rBtn.textContent = "💀 重新开始";
    rBtn.style.cssText = "width:100%; padding:15px; border:3px solid #b71c1c; color:#b71c1c; font-weight:bold; font-size:1.2em; cursor:pointer";
    rBtn.onclick = () => location.reload();
    container.appendChild(rBtn);
  }

  if (gameState !== 'TOWN' && gameState !== 'CREATION') {
    const hr = document.createElement('hr'); hr.style.cssText = "margin: 15px 0; border: 0; border-top: 1px dashed #ccc;"; container.appendChild(hr);
    const systemBtn = document.createElement('button'); systemBtn.innerHTML = "💾 系统 / 存读档"; systemBtn.style.width = "100%"; systemBtn.fontSize = "0.9em";
    systemBtn.onclick = () => showSaveLoadMenu(); container.appendChild(systemBtn);
  }
}

function renderInventory() {
  document.getElementById('goldDisplay').textContent = `${inventory.gold} G`;
  const list = document.getElementById('itemList'); list.innerHTML = '';
  if (inventory.items.length === 0) { list.innerHTML = '<li style="color:#999; font-style:italic; text-align:center; padding:10px">背包里只有空气...</li>'; return; }

  inventory.items.forEach((item, index) => {
    const li = document.createElement('li');
    li.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px dotted #ccc; padding:6px 0";
    
    // --- 名称染色 ---
    let nameHtml = item.name;
    if (item.color) nameHtml = `<span style="color:${item.color}; font-weight:bold">${item.name}</span>`;
    // --------------

    const infoSpan = document.createElement('div');
    infoSpan.innerHTML = `<b>${nameHtml}</b> <small style="color:#666">${item.desc || (item.att?'攻+'+item.att:'HP+'+item.hpMax)}</small>`;
    const btn = document.createElement('button');
    btn.className = 'useBtn'; btn.style.fontSize = '0.8em'; btn.style.padding = '2px 8px';
    
    if (item.type === 'treasure') { btn.textContent = '卖出'; btn.onclick = () => window.sellItem(index); } 
    else if (item.type === 'weapon' || item.type === 'armor') { btn.textContent = '装备'; btn.onclick = () => showTargetSelection(index); }
    else {
        if (item.type === 'combat' && gameState !== 'COMBAT') { btn.textContent = '战斗用'; btn.disabled = true; } 
        else { btn.textContent = '使用'; btn.onclick = () => showTargetSelection(index); }
    }
    li.appendChild(infoSpan); li.appendChild(btn); list.appendChild(li);
  });
}

function showTargetSelection(itemIndex) {
    const item = inventory.items[itemIndex];
    const overlay = document.getElementById('diceOverlay'); const container = document.getElementById('diceContainer');
    overlay.classList.add('active'); container.innerHTML = ''; 

    const title = document.createElement('div');
    title.innerHTML = `谁来使用/装备 <span style="color:${HIGHLIGHT_COLOR}">${item.name}</span> ?`;
    title.style.cssText = "width:100%; text-align:center; margin-bottom:20px; font-weight:bold; font-size:18px; font-family:'Special Elite', monospace";
    container.appendChild(title);

    party.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.style.cssText = "display:block; width:220px; margin:10px auto; padding:10px; background:#fff; color:#000; border:2px solid #000; text-align:left";
        let status = ""; let disabled = false;

        if (p.hp <= 0) { status = " (已阵亡)"; disabled = true; } 
        else if (gameState === 'COMBAT' && combatState.actedIndices.includes(idx) && item.type !== 'weapon' && item.type !== 'armor') { status = " (已行动)"; disabled = true; }

        btn.innerHTML = `<b>${p.name}</b> <span style="font-size:0.8em; color:#666">${status}</span>`;
        if (disabled) { btn.style.opacity = 0.5; btn.style.borderStyle = "dashed"; btn.style.cursor = "not-allowed"; } 
        else { btn.onclick = () => { overlay.classList.remove('active'); if (window.confirmUseItem) window.confirmUseItem(itemIndex, idx); }; }
        container.appendChild(btn);
    });
    const cancelBtn = document.createElement('button'); cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = "display:block; width:100px; margin:20px auto 0; padding:8px; border:1px solid #555; color:#555";
    cancelBtn.onclick = () => overlay.classList.remove('active'); container.appendChild(cancelBtn);
}

function rollDiceAnim(diceRequests, callback) {
    const overlay = document.getElementById('diceOverlay'); const container = document.getElementById('diceContainer');
    overlay.classList.add('active'); container.innerHTML = '';
    const diceElements = [];
    diceRequests.forEach(req => {
        const wrapper = document.createElement('div'); wrapper.style.textAlign = 'center';
        const dieEl = document.createElement('div'); dieEl.className = 'die rolling'; 
        dieEl.innerHTML = '<div class="pip"></div>'.repeat(6); dieEl.dataset.id = req.id; 
        const label = document.createElement('div'); label.textContent = req.label;
        label.style.marginTop = '8px'; label.style.fontFamily = '"Patrick Hand", cursive';
        wrapper.appendChild(dieEl); wrapper.appendChild(label); container.appendChild(wrapper);
        diceElements.push(dieEl);
    });
    setTimeout(() => {
        const results = {};
        diceElements.forEach(el => {
            el.classList.remove('rolling'); const val = Math.floor(Math.random() * 6) + 1;
            const reqId = el.dataset.id; results[reqId] = val; 
            if (val === 6) el.classList.add('crit'); el.dataset.val = val; 
            let pipsHtml = ''; for(let i=0; i<val; i++) pipsHtml += '<div class="pip"></div>';
            el.innerHTML = pipsHtml;
        });
        setTimeout(() => { overlay.classList.remove('active'); callback(results); }, 1200); 
    }, 800); 
}

function showSaveLoadMenu() {
    const overlay = document.getElementById('diceOverlay'); const container = document.getElementById('diceContainer');
    overlay.classList.add('active'); container.innerHTML = ''; 
    const title = document.createElement('h2'); title.textContent = "💾 灵魂记录 (存/读档)"; title.style.width = "100%"; title.style.textAlign = "center"; title.style.fontFamily = '"Special Elite", monospace';
    container.appendChild(title);

    const exportBox = document.createElement('div'); exportBox.style.cssText = "width: 100%; margin-bottom: 20px; padding: 10px; border: 2px dashed #555; background: #fff;";
    const exportBtn = document.createElement('button'); exportBtn.textContent = "📤 生成当前存档代码"; exportBtn.style.width = "100%";
    exportBtn.onclick = () => {
        const code = window.exportSaveGame ? window.exportSaveGame() : "Error";
        if(code) {
            codeArea.value = code; codeArea.select();
            navigator.clipboard.writeText(code).then(() => { alert("存档代码已自动复制到剪贴板！"); }).catch(() => { alert("已生成。请全选并复制下方的代码。"); });
        }
    };
    exportBox.appendChild(exportBtn);
    const codeArea = document.createElement('textarea'); codeArea.placeholder = "点击上方按钮生成存档代码，然后复制保存..."; codeArea.style.cssText = "width: 100%; height: 80px; margin-top: 10px; font-size: 12px; resize: none; border: 1px solid #ccc;";
    exportBox.appendChild(codeArea); container.appendChild(exportBox);

    const importBox = document.createElement('div'); importBox.style.cssText = "width: 100%; margin-bottom: 20px; padding: 10px; border: 2px solid #2e7d32; background: #e8f5e9;";
    const importInput = document.createElement('textarea'); importInput.placeholder = "在此粘贴存档代码以恢复进度..."; importInput.style.cssText = "width: 100%; height: 60px; margin-bottom: 10px; font-size: 12px; resize: none; border: 1px solid #2e7d32;";
    importBox.appendChild(importInput);

    const importBtn = document.createElement('button'); importBtn.textContent = "📥 读取存档"; importBtn.style.cssText = "width: 100%; background: #2e7d32; color: white;";
    importBtn.onclick = () => {
        const code = importInput.value.trim(); if (!code) return;
        if (window.confirm("确定要读取存档吗？当前未保存的进度将丢失。")) {
            const success = window.importSaveGame(code); if (success) { overlay.classList.remove('active'); }
        }
    };
    importBox.appendChild(importBtn); container.appendChild(importBox);
    const closeBtn = document.createElement('button'); closeBtn.textContent = "关闭"; closeBtn.onclick = () => overlay.classList.remove('active'); container.appendChild(closeBtn);
}