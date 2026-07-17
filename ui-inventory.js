// ui-inventory.js - 背包与物品目标选择

function renderInventory() {
  document.getElementById('goldDisplay').textContent = `${inventory.gold} G`;
  const list = document.getElementById('itemList'); 
  if(!list) return;
  list.innerHTML = '';
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
    
    if (gameState === 'VICTORY') {
        btn.disabled = true;
        btn.textContent = '锁定';
        btn.style.opacity = 0.5;
    }

    li.appendChild(infoSpan); li.appendChild(btn); list.appendChild(li);
  });
}

function showTargetSelection(itemIndex) {
    const item = inventory.items[itemIndex];
    const overlay = document.getElementById('diceOverlay'); const container = document.getElementById('diceContainer');
    if(!overlay || !container) return;
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
