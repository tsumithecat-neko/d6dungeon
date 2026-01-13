// combat.js - 战斗与交互逻辑

function initCombat(template, type) {
  gameState = 'COMBAT';
  const enemyData = JSON.parse(JSON.stringify(template));
  
  // --- 难度系数 scaling ---
  const multiplier = 1 + (window.worldLevel - 1) * 0.3; 
  enemyData.hp = Math.floor(enemyData.hp * multiplier);
  enemyData.att = enemyData.att + Math.floor((window.worldLevel - 1) / 2);
  // ---------------------------
  
  if (type === 'group') {
    if (!enemyData.count) enemyData.count = 1;
    addLog(`⚔️ 敌人出现 (Lv.${window.worldLevel})！${enemyData.name} x${enemyData.count} (ATK: ${enemyData.att})`);
  } else {
    addLog(`💀 首领降临 (Lv.${window.worldLevel})！${enemyData.name} (HP: ${enemyData.hp}, ATK: ${enemyData.att})`);
  }

  // 初始化战斗状态
  combatState = { 
      active: true, 
      type: type, 
      enemy: enemyData, 
      round: 1, 
      actedIndices: [] 
  };
  updateUI();
}

function useSkill(charIndex, skillData) {
  if (gameState !== 'COMBAT' || !combatState.active) return;
  if (combatState.actedIndices.includes(charIndex)) {
      addLog("该角色本回合已经行动过了！");
      return;
  }
  const user = party[charIndex];
  if (user.mp < skillData.cost) {
      addLog(`${user.name} MP不足！`);
      return;
  }

  user.mp -= skillData.cost;
  combatState.actedIndices.push(charIndex); 
  
  addLog(`✨ ${user.name} 发动了 [${skillData.name}]！`);
  const resultLog = skillData.effect(user, combatState);
  addLog(resultLog);

  if (checkWin()) return;
  updateUI();
}

function fightRound() {
  if (gameState !== 'COMBAT' || !combatState.active) return;
  
  const requests = [];
  const activePartyMembers = []; 

  party.forEach((p, index) => {
      if (p.hp > 0 && !combatState.actedIndices.includes(index)) {
          requests.push({ label: p.name, id: index });
          activePartyMembers.push(p);
      }
  });

  const finishTurn = () => {
      if (checkWin()) return;
      enemyTurn();
      combatState.round++;
      combatState.actedIndices = []; 
      updateUI();
  };

  if (requests.length === 0) {
      addLog("--- 所有人已完成行动 ---");
      finishTurn();
      return;
  }

  rollDiceAnim(requests, (results) => {
      const enemy = combatState.enemy;
      let hits = 0;
      
      activePartyMembers.forEach((p) => {
          const idx = party.indexOf(p);
          const roll = results[idx];
          
          // --- 6点再动逻辑 ---
          if (roll === 6) {
              addLog(`🎲 <b>${p.name} 骰出了 6！气势如虹，获得额外行动机会！</b>`);
              if (p.mp < p.maxMp) p.mp++;
              // 注意：这里不把 idx 加入 actedIndices，所以他还能动
          } else {
              combatState.actedIndices.push(idx);
          }
          // ------------------

          const bonus = (p.class === 'warrior') ? p.lvl : 0; 
          const weaponAtt = p.equipment?.weapon?.att || 0;
          const total = roll + p.att + weaponAtt + bonus;
          
          const rollIcon = logDieIcon(roll);
          
          if (total >= TO_HIT_TARGET) {
              hits++;
              if (combatState.type === 'group') {
                  enemy.count--;
                  addLog(`${p.name} ${rollIcon} 命中！(武器+${weaponAtt}) 击杀敌人。`);
              } else {
                  enemy.hp--;
                  addLog(`${p.name} ${rollIcon} 命中！(武器+${weaponAtt}) 造成伤害。`);
              }
          } else {
              addLog(`${p.name} ${rollIcon} 攻击偏斜了。`);
          }
      });
      
      if (hits === 0) addLog("普攻未能造成有效打击！");

      // --- 关键修改确认：胜利检查 ---
      // 如果 checkWin() 返回 true，说明敌人全灭，
      // 函数直接 return，不再执行下方的“计算剩余行动”逻辑。
      // 这就实现了“如果敌人已被击败，直接跳过额外行动阶段”。
      if (checkWin()) return; 

      // --- 额外行动阶段 ---
      // 只有战斗还在继续时，才会检查是否有人因为骰出6而剩下行动点
      const remainingActs = party.filter((p, i) => p.hp > 0 && !combatState.actedIndices.includes(i)).length;

      if (remainingActs === 0) {
          finishTurn();
      } else {
          addLog(`>>> ⚡ 还有 ${remainingActs} 次行动机会，回合继续！`);
          updateUI(); 
      }
  });
}

function checkWin() {
  const enemy = combatState.enemy;
  const isWin = (combatState.type === 'group' && enemy.count <= 0) || 
                (combatState.type === 'boss' && enemy.hp <= 0);
  if (isWin) { endCombat(true); return true; }
  return false;
}

function enemyTurn() {
    addLog(`敌人反击...`);
    const enemy = combatState.enemy;
    let attacks = (combatState.type === 'group') ? Math.min(enemy.count, 3) : 2; 

    for (let i = 0; i < attacks; i++) {
        const target = randomAliveCharacter();
        if (!target) break; 
        const roll = d6();
        if (roll + enemy.att >= TO_HIT_TARGET) {
            target.hp -= 1;
            addLog(`❌ ${enemy.name} 击中了 ${target.name}！(-1 HP)`);
        } else {
            addLog(`${enemy.name} 扑向 ${target.name} 但被躲开了。`);
        }
    }
    if (!randomAliveCharacter()) endCombat(false);
}

function endCombat(win) {
  combatState.active = false;
  if (win) {
    addLog(`🎉 战斗胜利！`);
    gameState = 'EXPLORING';
    if(dungeon[playerRoomId]) dungeon[playerRoomId]._encounterResolved = true;
    
    const xpGain = (combatState.type === 'boss') ? 5 : 2;
    addLog(`全员获得 ${xpGain} 点经验值。`);

    party.forEach(p => {
        if (p.hp > 0) gainXp(p, xpGain);
    });

    const lootRoll = d6();
    if (lootRoll >= 5) gainLoot('item'); 
    else if (lootRoll >= 3) gainLoot('gold'); 
    else addLog("并没有发现什么有价值的东西。");

    // BOSS 战回城逻辑
    if (combatState.type === 'boss') {
        addLog("🎉 恭喜！你击败了地牢的领主！城镇的灯火在远处召唤...");
        const btn = document.createElement('button');
        btn.innerHTML = "🏠 <b>凯旋回城 (结算)</b>";
        btn.style.cssText = "width:100%; padding:10px; background:#fdd835; color:#000; font-weight:bold; margin-top:10px; border:2px solid #fbc02d;";
        btn.onclick = () => window.enterTown();
        
        setTimeout(() => {
            const controls = document.getElementById('controls');
            if(controls) controls.prepend(btn);
        }, 100);
    }
    
  } else {
    addLog(`💀 队伍全灭...`);
    gameState = 'GAMEOVER';
  }
  updateUI();
}

function gainXp(char, amount) {
    char.xp += amount;
    if (char.xp >= char.maxXp) {
        levelUp(char);
    }
}

function levelUp(char) {
    char.xp -= char.maxXp;
    char.lvl++;
    char.maxXp += 5;
    const growth = CLASS_GROWTH[char.class] || { hp:1, mp:1, att:0, desc:"通用成长" };
    char.maxHp += growth.hp;
    char.maxMp += growth.mp;
    char.att += growth.att;
    char.hp = char.maxHp;
    char.mp = char.maxMp;
    const upIcon = "🆙";
    addLog(`${upIcon} <b>${char.name} 升到了 Lv.${char.lvl}！</b>`);
    addLog(`<span style="color:#ffd700; margin-left:20px">${growth.desc} (HP/MP全回复)</span>`);
    if (char.xp >= char.maxXp) levelUp(char);
}

function tryFlee() {
  addLog("你示意队伍撤退...");
  rollDiceAnim([{ label: "逃跑判定", id: "flee" }], (results) => {
      const roll = results["flee"];
      const rollIcon = logDieIcon(roll);
      if (roll >= 4) {
        addLog(`逃跑成功！(${rollIcon})`);
        const target = randomAliveCharacter();
        if (target) { target.hp -= 1; addLog(`${target.name} 在混乱中擦伤 (-1 HP)。`); }
        gameState = 'EXPLORING'; 
        updateUI();
      } else {
        addLog(`逃跑失败！(${rollIcon}) 敌人截住了退路。`);
        enemyTurn(); 
        combatState.round++; 
        combatState.actedIndices = [];
        updateUI();
      }
  });
}

function resolveEncounter(room){
  const enc = room.encounter;
  if (enc.main === 'none') { room._encounterResolved = true; return; }

  addLog(`>>> 遭遇：${enc.main} ${enc.subtype||''} <<<`);

  if (enc.main === 'monster') initCombat(enc.template, 'group');
  else if (enc.main === 'boss') initCombat(enc.template, 'boss');
  else if (enc.main === 'treasure') {
    if (enc.subtype.includes('金币')) gainLoot('gold'); else gainLoot('item');
    room._encounterResolved = true;
  } else if (enc.main === 'event') {
    if (enc.subtype === '陷阱') {
        const p = randomAliveCharacter();
        if(p) { 
            const dmg = 1; 
            p.hp -= dmg; 
            addLog(`咔嚓！触发了${enc.subtype}，${p.name} 受伤了 (-${dmg} HP)。`); 
        }
    } else {
        addLog(`你发现了 ${enc.subtype}，但似乎无事发生。`);
    }
    room._encounterResolved = true;
  } else {
    addLog("这里空荡荡的。");
    room._encounterResolved = true;
  }
}

window.performSearch = function() {
    if (gameState !== 'EXPLORING') return;
    const room = dungeon[playerRoomId];
    if (room.searched) { addLog("你已经翻遍了这里的每一块砖。"); return; }
    room.searched = true;
    const requests = [{ label: "搜寻判定", id: "search" }];
    rollDiceAnim(requests, (results) => {
        const roll = results["search"];
        const rollIcon = logDieIcon(roll);
        addLog(`队伍开始搜寻... (判定: ${rollIcon})`);
        if (roll === 1) {
            addLog("⚠️ 糟糕！触发了隐蔽的机关！全员受到 1 点伤害！");
            party.forEach(p => { if(p.hp > 0) p.hp = Math.max(0, p.hp - 1); });
            if (!randomAliveCharacter()) { addLog("队伍全灭..."); gameState = 'GAMEOVER'; }
        } 
        else if (roll === 6) { addLog("✨ 运气不错！你在角落里发现了一个暗格。"); gainLoot('item'); } 
        else if (roll >= 4) { addLog("你在废墟下找到了一些零散的金币。"); gainLoot('gold'); } 
        else { addLog("除了一些灰尘和碎骨头，什么也没找到。"); }
        updateUI();
    });
}