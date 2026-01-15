// combat.js - 战斗与交互逻辑

function initCombat(template, type) {
  gameState = 'COMBAT';
  const enemyData = JSON.parse(JSON.stringify(template));
  
  // 难度 Scaling
  const multiplier = 1 + (window.worldLevel - 1) * 0.5; 
  enemyData.hp = Math.floor(enemyData.hp * multiplier);
  enemyData.att = enemyData.att + Math.floor((window.worldLevel - 1) * 0.8);
  
  if (type === 'group') {
    if (!enemyData.count) enemyData.count = 1;
    addLog(`⚔️ 敌人出现 (Lv.${window.worldLevel})！${enemyData.name} x${enemyData.count} (ATK: ${enemyData.att})`);
  } else {
    addLog(`💀 首领降临 (Lv.${window.worldLevel})！${enemyData.name} (HP: ${enemyData.hp}, ATK: ${enemyData.att})`);
  }

  combatState = { active: true, type: type, enemy: enemyData, round: 1, actedIndices: [] };
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
          
          if (roll === 6) {
              addLog(`🎲 <b>${p.name} 骰出了 6！获得再动机会！</b>`);
              if (p.mp < p.maxMp) p.mp++;
          } else {
              combatState.actedIndices.push(idx);
          }

          const bonus = (p.class === 'warrior') ? p.lvl : 0; 
          const weaponAtt = p.equipment?.weapon?.att || 0;
          const total = roll + p.att + weaponAtt + bonus;
          
          const rollIcon = logDieIcon(roll);
          
          if (total >= TO_HIT_TARGET) {
              hits++;
              if (combatState.type === 'group') {
                  enemy.count--;
                  addLog(`${p.name} ${rollIcon} 命中！击杀敌人。`);
              } else {
                  enemy.hp--;
                  addLog(`${p.name} ${rollIcon} 命中！造成伤害。`);
              }
          } else {
              addLog(`${p.name} ${rollIcon} 攻击偏斜了。`);
          }
      });
      
      if (hits === 0) addLog("普攻未能造成有效打击！");
      if (checkWin()) return; 

      const remainingActs = party.filter((p, i) => p.hp > 0 && !combatState.actedIndices.includes(i)).length;
      if (remainingActs === 0) finishTurn();
      else updateUI();
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
    party.forEach(p => { if (p.hp > 0) gainXp(p, xpGain); });

    if (combatState.type === 'boss') {
        addLog("✨ 击败地牢领主，你在王座下发现了一个华丽的宝箱！");
        gainLoot('item'); 
        updateUI();
        
        const controls = document.getElementById('controls');
        if(controls) {
            controls.innerHTML = '';
            const btn = document.createElement('button');
            btn.innerHTML = "🏠 <b>凯旋回城 (结算)</b>";
            btn.style.cssText = "width:100%; padding:10px; background:#fdd835; color:#000; font-weight:bold; margin-top:10px; border:2px solid #fbc02d;";
            btn.onclick = () => window.enterTown();
            controls.appendChild(btn);
        }
        return; 
    } else {
        const lootRoll = d6();
        if (lootRoll >= 5) gainLoot('item'); 
        else if (lootRoll >= 3) gainLoot('gold'); 
        else addLog("并没有发现什么有价值的东西。");
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
    
    const hpHeal = growth.hp + 2;
    const mpHeal = growth.mp + 2;

    char.hp = Math.min(char.maxHp, char.hp + hpHeal);
    char.mp = Math.min(char.maxMp, char.mp + mpHeal);

    addLog(`🆙 <b>${char.name} 升到了 Lv.${char.lvl}！</b>`);
}

function tryFlee() {
  addLog("你示意队伍撤退...");
  rollDiceAnim([{ label: "逃跑判定", id: "flee" }], (results) => {
      const roll = results["flee"];
      if (roll >= 4) {
        addLog(`逃跑成功！`);
        const target = randomAliveCharacter();
        if (target) { target.hp -= 1; addLog(`${target.name} 在混乱中擦伤 (-1 HP)。`); }
        gameState = 'EXPLORING'; 
        updateUI();
      } else {
        addLog(`逃跑失败！敌人截住了退路。`);
        enemyTurn(); 
        combatState.round++; 
        combatState.actedIndices = [];
        updateUI();
      }
  });
}

// --- 修改后的遭遇解决函数 ---
window.resolveEncounter = function(room){
  const enc = room.encounter;
  if (enc.main === 'none') { room._encounterResolved = true; return; }

  // 1. 怪物/Boss 保持原样
  if (enc.main === 'monster') {
      addLog(`>>> 遭遇：${enc.main} ${enc.subtype||''} <<<`);
      initCombat(enc.template, 'group');
      return;
  }
  else if (enc.main === 'boss') {
      addLog(`>>> 遭遇：${enc.main} ${enc.subtype||''} <<<`);
      initCombat(enc.template, 'boss');
      return;
  }
  
  // 2. 宝箱/空房间 自动结算
  if (enc.main === 'treasure') {
    addLog(`>>> 发现：${enc.subtype} <<<`);
    if (enc.subtype.includes('金币')) gainLoot('gold'); else gainLoot('item');
    room._encounterResolved = true;
    return;
  }
  if (enc.main === 'special') {
      addLog("这里空荡荡的。");
      room._encounterResolved = true;
      return;
  }

  // 3. 事件 (祭坛/谜题/陷阱) -> 进入互动模式
  if (enc.main === 'event') {
      const eventDef = EVENT_DEFINITIONS[enc.subtype];
      if (eventDef) {
          gameState = 'EVENT';
          activeEvent = eventDef;
          addLog(`>>> 触发事件：${eventDef.title} <<<`);
          updateUI(); // 触发 UI 渲染事件面板
      } else {
          // 如果数据缺失，回退到自动
          addLog(`你发现了 ${enc.subtype}，但不知道怎么处理。`);
          room._encounterResolved = true;
      }
  }
};

// --- 新增：处理事件选项 ---
window.handleEventChoice = function(optionIndex) {
    const option = activeEvent.options[optionIndex];
    
    // 检查职业要求
    if (option.reqClass) {
        const reqs = Array.isArray(option.reqClass) ? option.reqClass : [option.reqClass];
        // 还要检查角色是否活着
        const hasClass = party.some(p => reqs.includes(p.class || p.race) && p.hp > 0);
        
        if (!hasClass) {
            alert("你的队伍里没有活着的相关专家来执行此操作！");
            return;
        }
    }

    addLog(`> 选择: ${option.label}`);

    // 根据类型执行逻辑
    if (option.type === 'class_check' || option.type === 'auto_loot') {
        addLog(`专家出手，轻松搞定！`);
        gainLoot('item');
        endEvent();
    }
    else if (option.type === 'heal_party') {
        addLog(`神圣的光芒照耀着队伍...`);
        party.forEach(p => { if(p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + option.amount); });
        addLog(`全员恢复了 ${option.amount} 点生命。`);
        endEvent();
    }
    else if (option.type === 'sacrifice') {
        const p = randomAliveCharacter();
        if(p) {
            p.hp = Math.max(1, p.hp - option.cost);
            addLog(`${p.name} 献祭了鲜血 (-${option.cost} HP)，换来了力量！`);
            gainXp(p, 5);
            inventory.gold += 20;
            addLog("获得了 20 金币和 5 点经验。");
        }
        endEvent();
    }
    else if (option.type === 'leave') {
        addLog("你谨慎地离开了，什么也没发生。");
        endEvent();
    }
    else if (option.type === 'tank_damage') {
        // 找个肉盾
        const tank = party.find(p => (option.validClasses.includes(p.class)) && p.hp > 0);
        if (tank) {
            tank.hp -= option.damage;
            addLog(`${tank.name} 挺身而出挡住了伤害 (-${option.damage} HP)，保护了队友。`);
            endEvent();
        } else {
            alert("没有活着的肉盾！"); // UI 应该禁用此按钮，但做个双保险
        }
    }
    else if (option.type === 'roll_check') {
        // 骰子判定
        rollDiceAnim([{label:"全员判定", id:"check"}], (results) => {
            const roll = results['check'];
            if (roll >= option.target) {
                addLog(`(🎲 ${roll}) ${option.successMsg}`);
            } else {
                addLog(`(🎲 ${roll}) ${option.failMsg}`);
                party.forEach(p => { if(p.hp > 0) p.hp = Math.max(0, p.hp - option.failDamage); });
                if (!randomAliveCharacter()) { gameState = 'GAMEOVER'; updateUI(); return; }
            }
            endEvent();
        });
    }
    else if (option.type === 'gamble') {
        rollDiceAnim([{label:"运气测试", id:"gamble"}], (results) => {
            const roll = results['gamble'];
            if (roll === 6) {
                addLog(`(🎲 6) 奇迹发生了！机关打开，里面有宝藏！`);
                gainLoot('item');
            } else if (roll === 1) {
                addLog(`(🎲 1) 轰隆！你触动了陷阱！`);
                party.forEach(p => p.hp = Math.max(0, p.hp - 2));
            } else {
                addLog(`(🎲 ${roll}) 什么也没发生。`);
            }
            endEvent();
        });
    }
    else if (option.type === 'force_open') {
        // 暴力开门：50% 几率得宝，50% 几率刷怪
        rollDiceAnim([{label:"暴力破拆", id:"bash"}], (results) => {
            const roll = results['bash'];
            if (roll >= 4) {
                addLog(`轰的一声，门被砸开了！里面有宝物。`);
                gainLoot('gold');
                endEvent();
            } else {
                addLog(`巨大的噪音引来了敌人！`);
                const pool = MONSTER_POOLS['beast'];
                const enemy = pool[Math.floor(Math.random()*pool.length)];
                initCombat(enemy, 'group'); // 切换到战斗，事件结束
                // 注意：initCombat 会设gameState为COMBAT，覆盖 EVENT
            }
        });
    }
};

function endEvent() {
    if (gameState === 'GAMEOVER') return;
    
    // 增加一个“继续”按钮的过渡状态，或者直接回探索
    // 这里为了流畅，直接显示一个小结然后回探索，但为了防止玩家没看清日志，我们可以让 UI 渲染一个“完成”按钮
    // 为了简单，我们直接切回探索，但在 UI 上我们增加一个 check
    
    if (dungeon[playerRoomId]) dungeon[playerRoomId]._encounterResolved = true;
    gameState = 'EXPLORING';
    updateUI();
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