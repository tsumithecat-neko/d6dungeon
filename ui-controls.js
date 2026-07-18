// ui-controls.js - 探索、事件与战斗操作面板

function renderControls(){
  const container = document.getElementById('controls');
  if(!container) return;
  container.innerHTML = ''; 
  if (typeof renderStoryObjective === 'function') renderStoryObjective(container);

  if (gameState === 'EXPLORING') {
    const room = dungeon[playerRoomId];
    if (room?.specialType && SPECIAL_ROOM_TYPES[room.specialType]) {
        const roomType = SPECIAL_ROOM_TYPES[room.specialType];
        const roomInfo = document.createElement('div');
        roomInfo.style.cssText = "margin-bottom:9px; padding:8px 10px; background:#efebe9; border-left:4px solid #6d4c41;";
        roomInfo.innerHTML = `<b>${roomType.icon} ${roomType.name}</b><br><small>${roomType.desc}</small>`;
        container.appendChild(roomInfo);
    }
    const searchBtn = document.createElement('button');
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
      
      if (!activeEvent) {
          const errMsg = document.createElement('div'); errMsg.innerText = "事件数据丢失...";
          eventPanel.appendChild(errMsg); container.appendChild(eventPanel);
          return;
      }

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
    
    const enemy = combatState.enemy;
    const aliveCount = party.filter(p => p.hp > 0).length;
    const remainingActs = party.filter((p, idx) => p.hp > 0 && !combatState.actedIndices.includes(idx)).length;
    const actedCount = aliveCount - remainingActs;

    const roundInfo = document.createElement('div');
    roundInfo.style.cssText = "display:flex; justify-content:space-between; padding:6px 8px; margin-bottom:8px; background:#212121; color:#fff; font-family:'Special Elite', monospace;";
    const initiativeText = combatState.initiative?.side === 'enemy' ? '敌方先攻' : '我方先攻';
    roundInfo.innerHTML = `<span>第 ${combatState.round} 回合 · ${initiativeText}</span><span>已行动 ${actedCount}/${aliveCount}</span>`;
    combatPanel.appendChild(roundInfo);

    const currentValue = combatState.type === 'group' ? Math.max(0, enemy.count) : Math.max(0, enemy.hp);
    const maxValue = combatState.type === 'group' ? (enemy.maxCount || currentValue || 1) : (enemy.maxHp || currentValue || 1);
    const healthPct = Math.max(0, Math.min(100, Math.round((currentValue / maxValue) * 100)));
    const valueLabel = combatState.type === 'group' ? `剩余 ${currentValue}/${maxValue} 名` : `HP ${currentValue}/${maxValue}`;

    const enemyInfo = document.createElement('div');
    enemyInfo.style.cssText = "margin-bottom:8px; padding:10px; border:2px solid #b71c1c; background:#fff5f5;";
    enemyInfo.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:8px; font-weight:bold; color:#b71c1c">
        <span>🆚 ${enemy.name}</span><span>${valueLabel}</span>
      </div>
      <div style="height:8px; margin-top:6px; background:#e0e0e0; overflow:hidden">
        <div style="width:${healthPct}%; height:100%; background:#c62828"></div>
      </div>
      <div style="margin-top:5px; font-size:0.8em; color:#555">AC ${enemy.ac || 10} · 攻击修正 ${formatModifier(enemy.attackBonus || 0)} · 豁免 DC ${enemy.saveDC || 10}</div>`;
    combatPanel.appendChild(enemyInfo);

    if (combatState.enemyIntent?.length) {
        const intentInfo = document.createElement('div');
        intentInfo.style.cssText = "margin-bottom:8px; padding:8px; background:#fff8e1; border-left:4px solid #f57f17; font-size:0.85em;";
        const intentRows = combatState.enemyIntent.map(action => {
            const target = action.targetIndex === null ? enemy : party[action.targetIndex];
            const damage = typeof getEnemyIntentDamage === 'function' ? getEnemyIntentDamage(action) : action.estimatedDamage;
            return `<div>👁️ <b>${action.label}</b> → ${target?.name || '未知目标'} <span style="color:#b71c1c">预计 ${damage} 伤害</span></div>`;
        }).join('');
        intentInfo.innerHTML = `<div style="margin-bottom:4px; font-weight:bold">敌人下一步</div>${intentRows}`;
        combatPanel.appendChild(intentInfo);
    }

    if (enemy.status && enemy.status.length > 0) {
        const statusNames = { poison: '中毒', stun: '眩晕', rage: '狂暴', weak: '虚弱', regen: '再生' };
        const statusInfo = document.createElement('div');
        statusInfo.style.cssText = "margin-bottom:8px; padding:6px; background:#f3e5f5; border-left:4px solid #7b1fa2; font-size:0.85em;";
        statusInfo.innerHTML = enemy.status.map(status =>
            `${window.STATUS_ICONS?.[status.type] || '•'} ${statusNames[status.type] || status.type} (${status.duration}回合)`
        ).join(' · ');
        combatPanel.appendChild(statusInfo);
    }

    if (enemy.skills && enemy.skills.length > 0) {
        const skillNames = enemy.skills.map(key => MONSTER_SKILLS[key]?.name).filter(Boolean);
        if (skillNames.length > 0) {
            const threatInfo = document.createElement('div');
            threatInfo.style.cssText = "margin-bottom:8px; font-size:0.8em; color:#6d4c41;";
            threatInfo.textContent = `⚠️ 可能使用：${skillNames.join('、')}`;
            combatPanel.appendChild(threatInfo);
        }
    }

    const actionList = document.createElement('div');
    actionList.style.cssText = "display:grid; gap:3px; margin-bottom:10px; font-size:0.82em;";
    party.forEach((member, idx) => {
        const row = document.createElement('div');
        const isDead = member.hp <= 0;
        const isStunned = member.status?.some(status => status.type === 'stun');
        const hasActed = combatState.actedIndices.includes(idx);
        const isDefending = combatState.defendingIndices?.includes(idx);
        const stateText = isDead ? '阵亡' : isDefending ? '防御中' : hasActed ? '已行动' : isStunned ? '眩晕待结算' : '待行动';
        const stateColor = isDead ? '#777' : hasActed ? '#2e7d32' : isStunned ? '#7b1fa2' : '#e65100';
        row.style.cssText = "display:flex; justify-content:space-between; padding:3px 6px; background:#fafafa; border-bottom:1px dotted #ddd;";
        row.innerHTML = `<span>${member.name} · AC ${getCharacterAC(member)} · HP ${member.hp}/${member.maxHp} · MP ${member.mp}/${member.maxMp}</span><b style="color:${stateColor}">${stateText}</b>`;
        actionList.appendChild(row);
    });
    combatPanel.appendChild(actionList);
    
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
        
        const isStunned = p.status && p.status.some(s => s.type === 'stun');

        const sBtn = document.createElement('button');
        sBtn.innerHTML = `<b>${p.name}</b><br><small>${skill.name} Lv.${(p.skillLevel || 0) + 1} · ${skill.cost} MP</small>`;
        sBtn.style.fontSize = "0.9em";
        
        if (hasActed || p.mp < skill.cost || isStunned) { 
            sBtn.disabled = true; sBtn.style.opacity = 0.5; 
            if (hasActed) sBtn.innerHTML += " (已行动)";
            else if (isStunned) sBtn.innerHTML += " (眩晕)";
            else if (p.mp < skill.cost) sBtn.innerHTML += " (MP不足)";
        } 
        else { sBtn.onclick = () => useSkill(idx, skill); }
        skillsDiv.appendChild(sBtn);

        const defendBtn = document.createElement('button');
        defendBtn.innerHTML = `<b>🛡️ ${p.name}</b><br><small>防御 · 直接伤害减半</small>`;
        defendBtn.style.fontSize = "0.9em";
        if (hasActed || isStunned) {
            defendBtn.disabled = true;
            defendBtn.style.opacity = 0.5;
            defendBtn.innerHTML += hasActed ? " (已行动)" : " (眩晕)";
        } else {
            defendBtn.onclick = () => window.defendCharacter(idx);
        }
        skillsDiv.appendChild(defendBtn);
    });
    combatPanel.appendChild(skillsDiv);
    
    const fleeBtn = document.createElement('button'); fleeBtn.innerHTML = "🏃 试图逃跑"; fleeBtn.style.width = '100%'; fleeBtn.onclick = tryFlee;
    combatPanel.appendChild(fleeBtn);
    container.appendChild(combatPanel);
  } else if (gameState === 'VICTORY') {
      const victoryPanel = document.createElement('div');
      victoryPanel.style.textAlign = 'center';
      
      const msg = document.createElement('h3');
      msg.textContent = "🏆 恭喜通关！";
      msg.style.color = "#fbc02d";
      victoryPanel.appendChild(msg);

      const btn = document.createElement('button');
      btn.innerHTML = "🏠 <b>凯旋回城 (结算)</b>";
      btn.style.cssText = "width:100%; padding:10px; background:#fdd835; color:#000; font-weight:bold; margin-top:10px; border:2px solid #fbc02d;";
      btn.onclick = () => window.enterTown();
      victoryPanel.appendChild(btn);
      
      container.appendChild(victoryPanel);
  } else if (gameState === 'GAMEOVER') {
    const rBtn = document.createElement('button');
    rBtn.textContent = "💀 重新开始";
    rBtn.style.cssText = "width:100%; padding:15px; border:3px solid #b71c1c; color:#b71c1c; font-weight:bold; font-size:1.2em; cursor:pointer";
    rBtn.onclick = () => location.reload();
    container.appendChild(rBtn);
  }

  if (gameState !== 'TOWN' && gameState !== 'CREATION' && gameState !== 'VICTORY') {
    const hr = document.createElement('hr'); hr.style.cssText = "margin: 15px 0; border: 0; border-top: 1px dashed #ccc;"; container.appendChild(hr);
    const systemBtn = document.createElement('button'); systemBtn.innerHTML = "💾 系统 / 存读档<br><small>✓ 自动保存已开启</small>"; systemBtn.style.width = "100%"; systemBtn.fontSize = "0.9em";
    systemBtn.onclick = () => showSaveLoadMenu(); container.appendChild(systemBtn);
  }
}
