// ui-screens.js - 角色创建与城镇界面

function renderCreation() {
    const container = document.getElementById('controls');
    if(!container) return;
    container.innerHTML = '';
    const header = document.createElement('h3');
    header.style.color = HIGHLIGHT_COLOR; header.style.marginTop = '0';
    header.style.fontFamily = '"Special Elite", monospace';
    header.textContent = `角色卡填写 (${party.length}/4)`;
    container.appendChild(header);

    const autoSave = typeof getAutoSaveSummary === 'function' ? getAutoSaveSummary() : null;
    if (autoSave) {
        const stateLabels = { EXPLORING: '探索中', COMBAT: '战斗中', EVENT: '事件中', TOWN: '城镇', VICTORY: '已通关' };
        const autoBox = document.createElement('div');
        autoBox.style.cssText = "padding:10px; margin-bottom:12px; background:#fff8e1; border:2px solid #f9a825; text-align:center;";

        const timeText = autoSave.timestamp ? new Date(autoSave.timestamp).toLocaleString('zh-CN') : '未知时间';
        const summary = document.createElement('div');
        summary.innerHTML = `<b>✨ 发现自动存档</b><br><small>世界 Lv.${autoSave.worldLevel} · ${stateLabels[autoSave.gameState] || autoSave.gameState} · ${timeText}</small>`;
        summary.style.marginBottom = '8px';
        autoBox.appendChild(summary);

        const continueBtn = document.createElement('button');
        continueBtn.innerHTML = '▶️ <b>继续上次冒险</b>';
        continueBtn.style.cssText = "width:100%; padding:10px; background:#f9a825; color:#fff; border:2px solid #f57f17;";
        continueBtn.onclick = () => {
            if (party.length > 0 && !confirm('读取自动存档会覆盖当前正在填写的角色卡，确定继续吗？')) return;
            if (!loadAutoSaveGame()) alert('自动存档已损坏或不存在。');
        };
        autoBox.appendChild(continueBtn);

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '删除自动存档';
        clearBtn.style.cssText = "width:100%; margin-top:5px; padding:5px; font-size:0.85em; color:#777; border:1px dashed #999; box-shadow:none;";
        clearBtn.onclick = () => {
            if (!confirm('确定删除自动存档吗？此操作不会影响英灵殿数据。')) return;
            clearAutoSave();
            updateUI();
        };
        autoBox.appendChild(clearBtn);
        container.appendChild(autoBox);
    }

    const loadBtn = document.createElement('button');
    loadBtn.textContent = "💾 读取旧的记忆";
    loadBtn.style.cssText = "width:100%; padding:8px; background:#e8f5e9; color:#1b5e20; margin-bottom:5px; border:1px solid #2e7d32; cursor:pointer";
    loadBtn.onclick = () => showSaveLoadMenu();
    container.appendChild(loadBtn);

    // --- 新增：英灵殿入口 ---
    const legacyBtn = document.createElement('button');
    const shardCount = window.LegacySystem ? LegacySystem.data.shards : 0;
    legacyBtn.innerHTML = `🏛️ <b>进入英灵殿</b> <span style="font-size:0.8em">(${shardCount} 碎片)</span>`;
    legacyBtn.style.cssText = "width:100%; padding:8px; background:#e0f7fa; color:#006064; margin-bottom:15px; border:1px solid #0097a7; cursor:pointer";
    legacyBtn.onclick = () => showLegacyMenu();
    container.appendChild(legacyBtn);
    // -----------------------

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
    const container = document.getElementById('controls');
    if(!container) return;
    container.innerHTML = ''; 
    
    // Header
    const header = document.createElement('h3');
    header.innerHTML = `🏰 <b>边境城镇 (Lv.${window.worldLevel})</b>`;
    header.style.textAlign = 'center'; header.style.marginTop = '0';
    container.appendChild(header);

    if (typeof renderQuestBoard === 'function') renderQuestBoard(container);

    // --- 新增：按钮组 ---
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '10px';
    btnGroup.style.marginBottom = '15px';

    // 1. 下一层按钮
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = `⚔️ <b>挑战下一层</b>`;
    nextBtn.style.cssText = "flex: 2; padding:12px; background:#d84315; color:white; font-weight:bold; cursor:pointer; border:2px solid #bf360c;";
    nextBtn.onclick = () => window.startNextRun();
    btnGroup.appendChild(nextBtn);

    // 2. 结束冒险按钮 (主动结算)
    const retireBtn = document.createElement('button');
    retireBtn.innerHTML = `🏠 <b>结算/退役</b>`;
    retireBtn.style.cssText = "flex: 1; padding:12px; background:#fff; color:#333; font-weight:bold; cursor:pointer; border:2px solid #555;";
    retireBtn.title = "结束当前游戏，将战利品结算为灵魂碎片";
    retireBtn.onclick = () => window.retireGame();
    btnGroup.appendChild(retireBtn);

    container.appendChild(btnGroup);
    // ----------------

    // 1. Church Block
    const churchDiv = document.createElement('div');
    churchDiv.style.cssText = "background:#e3f2fd; border:1px solid #90caf9; padding:8px; margin-bottom:10px; border-radius:4px;";
    churchDiv.innerHTML = `<h4 style="margin:0 0 5px 0; color:#1565c0;">⛪ 圣堂 (治疗与复活)</h4>`;
    
    // Heal All Button
    const healCost = 20 + (window.worldLevel * 10);
    const healBtn = document.createElement('button');
    healBtn.innerHTML = `💖 全员治愈 (${healCost} G)`;
    healBtn.style.cssText = "width:100%; margin-bottom:5px; background:#fff; border:1px solid #1565c0; color:#1565c0; cursor:pointer;";
    healBtn.onclick = () => window.serviceHealParty();
    churchDiv.appendChild(healBtn);

    // Revive List
    const deadMembers = party.filter(p => p.hp <= 0);
    if (deadMembers.length > 0) {
        deadMembers.forEach(p => {
            const cost = p.lvl * 100;
            const revBtn = document.createElement('button');
            revBtn.innerHTML = `⚰️ 复活 <b>${p.name}</b> (${cost} G)`;
            revBtn.style.cssText = "width:100%; margin-top:4px; background:#424242; color:#fff; border:1px solid #000; cursor:pointer;";
            revBtn.onclick = () => window.serviceRevive(party.indexOf(p));
            churchDiv.appendChild(revBtn);
        });
    } else {
        const msg = document.createElement('div');
        msg.textContent = "全员存活。女神保佑你们。";
        msg.style.fontSize = "0.8em"; msg.style.color = "#555";
        churchDiv.appendChild(msg);
    }
    container.appendChild(churchDiv);

    // 2. Blacksmith Block
    const smithDiv = document.createElement('div');
    smithDiv.style.cssText = "background:#efebe9; border:1px solid #a1887f; padding:8px; margin-bottom:10px; border-radius:4px;";
    smithDiv.innerHTML = `<h4 style="margin:0 0 5px 0; color:#5d4037;">⚒️ 铁匠铺 (装备强化)</h4>`;
    
    party.forEach((p, idx) => {
        if (p.hp <= 0) return; 
        const row = document.createElement('div');
        row.style.marginBottom = "8px";
        row.style.borderBottom = "1px dotted #ccc";
        row.innerHTML = `<div style="font-weight:bold; font-size:0.9em">${p.name}</div>`;
        
        // Weapon
        if (p.equipment.weapon) {
            const w = p.equipment.weapon;
            const cost = Math.floor(50 + (w.cost * 0.4));
            const btn = document.createElement('button');
            btn.innerHTML = `🗡️ 强化 ${w.name} <br><small>${cost} G (+1攻)</small>`;
            btn.style.width = "100%"; btn.style.fontSize = "0.8em"; btn.style.marginBottom = "4px";
            if (inventory.gold < cost) { btn.disabled = true; btn.style.opacity = 0.6; }
            btn.onclick = () => window.serviceUpgradeItem(idx, 'weapon');
            row.appendChild(btn);
        }
        // Armor
        if (p.equipment.armor) {
            const a = p.equipment.armor;
            const cost = Math.floor(50 + (a.cost * 0.4));
            const btn = document.createElement('button');
            btn.innerHTML = `🛡️ 强化 ${a.name} <br><small>${cost} G (+1血)</small>`;
            btn.style.width = "100%"; btn.style.fontSize = "0.8em";
            if (inventory.gold < cost) { btn.disabled = true; btn.style.opacity = 0.6; }
            btn.onclick = () => window.serviceUpgradeItem(idx, 'armor');
            row.appendChild(btn);
        }
        smithDiv.appendChild(row);
    });
    container.appendChild(smithDiv);

    // 3. Market Block (Shop)
    const marketDiv = document.createElement('div');
    marketDiv.style.cssText = "background:#fff; border:1px solid #ccc; padding:8px; border-radius:4px;";
    marketDiv.innerHTML = `<h4 style="margin:0 0 5px 0;">🛒 杂货集市</h4>`;
    
    window.shopStock.forEach((item, idx) => {
        const row = document.createElement('div');
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin:5px 0; border-bottom:1px dotted #eee; padding:4px 0";
        
        let desc = item.type === 'weapon' ? `攻+${item.att}` : (item.type==='armor'?`HP+${item.hpMax}`:item.desc);
        if(item.desc && item.desc.includes('[')) desc = item.desc; 
        
        let nameHtml = item.name;
        if (item.color) nameHtml = `<span style="color:${item.color}; font-weight:bold">${item.name}</span>`;

        const comparison = typeof getBestEquipmentComparison === 'function' ? getBestEquipmentComparison(item) : '';
        row.innerHTML = `<div style="line-height:1.1"><div>${nameHtml}</div><div style="font-size:0.75em; color:#666">${desc}</div>${comparison ? `<div style="font-size:0.72em; color:${comparison.includes('暂无') ? '#888' : '#2e7d32'}">${comparison}</div>` : ''}</div>`;
        
        const buyBtn = document.createElement('button');
        buyBtn.textContent = `${item.cost} G`;
        buyBtn.style.minWidth = "50px";
        buyBtn.onclick = () => window.buyItem(idx);
        if (inventory.gold < item.cost) { buyBtn.disabled = true; buyBtn.style.opacity = 0.6; }
        
        row.appendChild(buyBtn);
        marketDiv.appendChild(row);
    });
    container.appendChild(marketDiv);

    // Save System Footer
    const hr = document.createElement('hr'); hr.style.cssText = "margin: 15px 0; border: 0; border-top: 1px dashed #ccc;"; container.appendChild(hr);
    const systemBtn = document.createElement('button'); systemBtn.innerHTML = "💾 系统 / 存读档<br><small>✓ 自动保存已开启</small>"; systemBtn.style.width = "100%"; systemBtn.fontSize = "0.9em";
    systemBtn.onclick = () => showSaveLoadMenu(); container.appendChild(systemBtn);
}
