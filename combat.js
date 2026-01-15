// combat.js - 战斗与交互逻辑

function initCombat(template, type) {
  gameState = 'COMBAT';
  const enemyData = JSON.parse(JSON.stringify(template));
  
  const multiplier = 1 + (window.worldLevel - 1) * 0.5; 
  enemyData.hp = Math.floor(enemyData.hp * multiplier);
  enemyData.att = enemyData.att + Math.floor((window.worldLevel - 1) * 0.8);
  enemyData.status = []; 

  party.forEach(p => { if(!p.status) p.status = []; });

  if (type === 'group') {
    if (!enemyData.count) enemyData.count = 1;
    addLog(`⚔️ 敌人出现 (Lv.${window.worldLevel})！${enemyData.name} x${enemyData.count} (ATK: ${enemyData.att})`);
  } else {
    addLog(`💀 首领降临 (Lv.${window.worldLevel})！${enemyData.name} (HP: ${enemyData.hp}, ATK: ${enemyData.att})`);
  }

  combatState = { active: true, type: type, enemy: enemyData, round: 1, actedIndices: [] };
  
  // 战斗开始词缀 (狂暴)
  party.forEach(p => {
      if (p.hp > 0 && p.equipment?.weapon?.affix?.effect === 'rage_start') {
          applyStatus(p, 'rage', 3);
          addLog(`🔥 [狂暴] ${p.name} 的武器让他热血沸腾！`);
      }
  });
  updateUI();
}

// --- 状态与辅助函数 ---
function applyStatus(target, type, duration) {
    if (!target.status) target.status = [];
    const existing = target.status.find(s => s.type === type);
    if (existing) {
        existing.duration = Math.max(existing.duration, duration); 
        addLog(`> ${target.name} 的 [${window.STATUS_ICONS[type]}] 持续时间刷新了。`);
    } else {
        target.status.push({ type: type, duration: duration });
        addLog(`> ${target.name} 被施加了 [${window.STATUS_ICONS[type]}] 状态！`);
    }
}

function processStatusEffects(char) {
    if (!char.status || char.status.length === 0) return true; 

    let canAct = true;
    for (let i = char.status.length - 1; i >= 0; i--) {
        const s = char.status[i];
        
        if (s.type === 'poison') {
            char.hp -= 1;
            addLog(`${window.STATUS_ICONS.poison} ${char.name} 受到毒素伤害 (-1 HP)。`);
        } else if (s.type === 'regen') {
            char.hp = Math.min(char.maxHp || 99, char.hp + 1);
            addLog(`${window.STATUS_ICONS.regen} ${char.name} 恢复了生命 (+1 HP)。`);
        } else if (s.type === 'stun') {
            canAct = false;
            addLog(`${window.STATUS_ICONS.stun} ${char.name} 眩晕中，无法行动！`);
        }

        s.duration--;
        if (s.duration <= 0) {
            char.status.splice(i, 1);
            addLog(`> ${char.name} 的 [${window.STATUS_ICONS[s.type]}] 效果结束了。`);
        }
    }
    return canAct;
}

function getStatusBonus(char, stat) {
    if (!char.status) return 0;
    let bonus = 0;
    char.status.forEach(s => {
        if (stat === 'att') {
            if (s.type === 'rage') bonus += 2;
            if (s.type === 'weak') bonus -= 2;
        }
    });
    return bonus;
}

// --- 战斗循环 ---
function useSkill(charIndex, skillData) {
  if (gameState !== 'COMBAT' || !combatState.active) return;
  if (combatState.actedIndices.includes(charIndex)) return;
  
  const user = party[charIndex];
  const isStunned = user.status && user.status.some(s => s.type === 'stun');
  if(isStunned) { addLog("你处于眩晕状态，无法使用技能！"); return; }

  if (user.mp < skillData.cost) { addLog(`${user.name} MP不足！`); return; }

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

  addLog(`--- 第 ${combatState.round} 回合 ---`);
  
  party.forEach((p, index) => {
      if (p.hp <= 0) return;
      if (combatState.actedIndices.includes(index)) return;

      const canAct = processStatusEffects(p);
      if (p.hp > 0 && canAct) {
          requests.push({ label: p.name, id: index });
          activePartyMembers.push(p);
      } else if (!canAct) {
          combatState.actedIndices.push(index); 
      }
  });

  const finishTurn = () => {
      if (checkWin()) return;
      if (!randomAliveCharacter()) { endCombat(false); return; }
      enemyTurn();
      combatState.round++;
      combatState.actedIndices = []; 
      updateUI();
  };

  if (requests.length === 0) { finishTurn(); return; }

  rollDiceAnim(requests, (results) => {
      const enemy = combatState.enemy;
      let hits = 0;
      
      activePartyMembers.forEach((p) => {
          // fix: 检查战斗是否已经结束
          const isEnemyDead = (combatState.type === 'group' && enemy.count <= 0) || 
                              (combatState.type === 'boss' && enemy.hp <= 0);
          if (!combatState.active || isEnemyDead) return;

          const idx = party.indexOf(p);
          const roll = results[idx];
          
          if (roll === 6) {
              addLog(`🎲 <b>${p.name} 骰出了 6！(MP+1)</b>`);
              if (p.mp < p.maxMp) p.mp++;
          }
          combatState.actedIndices.push(idx);

          const bonus = (p.class === 'warrior') ? p.lvl : 0; 
          const weaponAtt = p.equipment?.weapon?.att || 0;
          const statusBonus = getStatusBonus(p, 'att');
          const total = roll + p.att + weaponAtt + bonus + statusBonus;
          
          const rollIcon = logDieIcon(roll);
          
          if (total >= TO_HIT_TARGET) {
              hits++;
              
              // 词缀效果：武器特效
              const wAffix = p.equipment?.weapon?.affix;
              if (wAffix) {
                  if (wAffix.effect === 'poison') {
                      addLog(`🧪 [剧毒] ${p.name} 的武器使敌人中毒了！`);
                      applyStatus(enemy, 'poison', 3);
                  }
                  if (wAffix.effect === 'lifesteal') {
                      p.hp = Math.min(p.maxHp, p.hp + 1);
                      addLog(`🩸 [吸血] ${p.name} 恢复了 1 点生命。`);
                  }
              }

              if (combatState.type === 'group') {
                  enemy.count--;
                  addLog(`${p.name} ${rollIcon} 命中！(修正:${total-roll}) 击杀敌人。`);
              } else {
                  enemy.hp--;
                  addLog(`${p.name} ${rollIcon} 命中！(修正:${total-roll}) 造成伤害。`);
              }
          } else {
              addLog(`${p.name} ${rollIcon} 攻击偏斜了。`);
          }
      });
      
      const isEnemyDeadNow = (combatState.type === 'group' && enemy.count <= 0) || 
                             (combatState.type === 'boss' && enemy.hp <= 0);
      if (hits === 0 && !isEnemyDeadNow) addLog("普攻未能造成有效打击！");

      finishTurn(); 
  });
}

function enemyTurn() {
    const enemy = combatState.enemy;
    const canAct = processStatusEffects(enemy);
    if (enemy.hp <= 0) { endCombat(true); return; } 
    if (!canAct) return; 

    addLog(`敌人反击...`);
    let attacks = (combatState.type === 'group') ? Math.min(enemy.count, 3) : 2; 

    for (let i = 0; i < attacks; i++) {
        const target = randomAliveCharacter();
        if (!target) break; 
        
        let skillUsed = false;
        if (enemy.skills && enemy.skills.length > 0) {
            const skillChance = (combatState.type === 'boss') ? 0.5 : 0.3;
            if (Math.random() < skillChance) {
                const skillKey = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
                const skillDef = MONSTER_SKILLS[skillKey];
                if (skillDef && Math.random() < (skillDef.rate || 1.0)) {
                    addLog(`⚠️ <b>${enemy.name} 使用了 [${skillDef.name}]！</b>`);
                    const finalTarget = skillDef.targetSelf ? enemy : target;
                    const msg = skillDef.perform(enemy, finalTarget);
                    addLog(msg);
                    skillUsed = true;
                }
            }
        }

        if (!skillUsed) {
            const aAffix = target.equipment?.armor?.affix;
            if (aAffix && aAffix.effect === 'dodge') {
                if (Math.random() < 0.15) { 
                    addLog(`💨 [轻灵] ${target.name} 灵巧地闪过了攻击！`);
                    continue; 
                }
            }

            const roll = d6();
            const attBonus = enemy.att + getStatusBonus(enemy, 'att');
            if (roll + attBonus >= TO_HIT_TARGET) {
                target.hp -= 1;
                addLog(`❌ ${enemy.name} 击中了 ${target.name}！(-1 HP)`);
                
                if (aAffix && aAffix.effect === 'thorns') {
                    enemy.hp -= 1;
                    addLog(`🌵 [荆棘] 铠甲反弹了 1 点伤害！`);
                }

            } else {
                addLog(`${enemy.name} 扑向 ${target.name} 但被躲开了。`);
            }
        }
    }
    if (!randomAliveCharacter()) endCombat(false);
}

function checkWin() {
  const enemy = combatState.enemy;
  const isWin = (combatState.type === 'group' && enemy.count <= 0) || 
                (combatState.type === 'boss' && enemy.hp <= 0);
  if (isWin) { endCombat(true); return true; }
  return false;
}

function endCombat(win) {
  combatState.active = false;
  party.forEach(p => p.status = []);
  
  if (win) {
    addLog(`🎉 战斗胜利！`);
    if(dungeon[playerRoomId]) dungeon[playerRoomId]._encounterResolved = true;
    
    const xpGain = (combatState.type === 'boss') ? 5 : 2;
    party.forEach(p => { if (p.hp > 0) gainXp(p, xpGain); });

    if (combatState.type === 'boss') {
        addLog("✨ 击败地牢领主，你在王座下发现了一个华丽的宝箱！");
        gainLoot('item'); 
        
        // --- CHANGE: 设置为 VICTORY 状态，阻止玩家移动或操作背包 ---
        gameState = 'VICTORY';
        updateUI(); 
        return; 
    } else {
        // 只有非 Boss 战才回到 EXPLORING
        gameState = 'EXPLORING';
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
    if (char.xp >= char.maxXp) { levelUp(char); }
}

function levelUp(char) {
    char.xp -= char.maxXp; char.lvl++; char.maxXp += 5;
    const growth = CLASS_GROWTH[char.class] || { hp:1, mp:1, att:0, desc:"通用成长" };
    char.maxHp += growth.hp; char.maxMp += growth.mp; char.att += growth.att;
    const hpHeal = growth.hp + 2; const mpHeal = growth.mp + 2;
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
        party.forEach(p => p.status = []); 
        gameState = 'EXPLORING'; updateUI();
      } else {
        addLog(`逃跑失败！敌人截住了退路。`);
        enemyTurn(); combatState.round++; combatState.actedIndices = []; updateUI();
      }
  });
}

// --- 事件处理 ---
window.resolveEncounter = function(room){
  const enc = room.encounter;
  if (enc.main === 'none') { room._encounterResolved = true; return; }

  if (enc.main === 'monster') {
      addLog(`>>> 遭遇：${enc.main} ${enc.subtype||''} <<<`);
      initCombat(enc.template, 'group'); return;
  }
  else if (enc.main === 'boss') {
      addLog(`>>> 遭遇：${enc.main} ${enc.subtype||''} <<<`);
      initCombat(enc.template, 'boss'); return;
  }
  
  if (enc.main === 'treasure') {
    addLog(`>>> 发现：${enc.subtype} <<<`);
    if (enc.subtype.includes('金币')) gainLoot('gold'); else gainLoot('item');
    room._encounterResolved = true; return;
  }
  if (enc.main === 'special') {
      addLog("这里空荡荡的。");
      room._encounterResolved = true; return;
  }

  if (enc.main === 'event') {
      const eventDef = EVENT_DEFINITIONS[enc.subtype];
      if (eventDef) {
          gameState = 'EVENT';
          activeEvent = eventDef;
          addLog(`>>> 触发事件：${eventDef.title} <<<`);
          updateUI(); 
      } else {
          addLog(`你发现了 ${enc.subtype}，但不知道怎么处理。`);
          room._encounterResolved = true;
      }
  }
};

window.handleEventChoice = function(optionIndex) {
    const option = activeEvent.options[optionIndex];
    if (option.reqClass) {
        const reqs = Array.isArray(option.reqClass) ? option.reqClass : [option.reqClass];
        const hasClass = party.some(p => reqs.includes(p.class || p.race) && p.hp > 0);
        if (!hasClass) { alert("你的队伍里没有活着的相关专家！"); return; }
    }
    addLog(`> 选择: ${option.label}`);

    if (option.type === 'class_check' || option.type === 'auto_loot') {
        addLog(`专家出手，轻松搞定！`); gainLoot('item'); endEvent();
    }
    else if (option.type === 'heal_party') {
        addLog(`神圣的光芒照耀着队伍...`);
        party.forEach(p => { if(p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + option.amount); });
        addLog(`全员恢复了 ${option.amount} 点生命。`); endEvent();
    }
    else if (option.type === 'sacrifice') {
        const p = randomAliveCharacter();
        if(p) {
            p.hp = Math.max(1, p.hp - option.cost);
            addLog(`${p.name} 献祭了鲜血 (-${option.cost} HP)，换来了力量！`);
            gainXp(p, 5); inventory.gold += 20;
            addLog("获得了 20 金币和 5 点经验。");
        } endEvent();
    }
    else if (option.type === 'leave') {
        addLog("你谨慎地离开了。"); endEvent();
    }
    else if (option.type === 'tank_damage') {
        const tank = party.find(p => (option.validClasses.includes(p.class)) && p.hp > 0);
        if (tank) {
            tank.hp -= option.damage;
            addLog(`${tank.name} 挺身而出挡住了伤害 (-${option.damage} HP)。`); endEvent();
        } else { alert("没有活着的肉盾！"); }
    }
    else if (option.type === 'roll_check') {
        rollDiceAnim([{label:"全员判定", id:"check"}], (results) => {
            const roll = results['check'];
            if (roll >= option.target) { addLog(`(🎲 ${roll}) ${option.successMsg}`); } 
            else {
                addLog(`(🎲 ${roll}) ${option.failMsg}`);
                party.forEach(p => { if(p.hp > 0) p.hp = Math.max(0, p.hp - option.failDamage); });
                if (!randomAliveCharacter()) { gameState = 'GAMEOVER'; updateUI(); return; }
            } endEvent();
        });
    }
    else if (option.type === 'gamble') {
        rollDiceAnim([{label:"运气测试", id:"gamble"}], (results) => {
            const roll = results['gamble'];
            if (roll === 6) { addLog(`(🎲 6) 机关打开，里面有宝藏！`); gainLoot('item'); } 
            else if (roll === 1) { addLog(`(🎲 1) 轰隆！你触动了陷阱！`); party.forEach(p => p.hp = Math.max(0, p.hp - 2)); } 
            else { addLog(`(🎲 ${roll}) 什么也没发生。`); }
            endEvent();
        });
    }
    else if (option.type === 'force_open') {
        rollDiceAnim([{label:"暴力破拆", id:"bash"}], (results) => {
            const roll = results['bash'];
            if (roll >= 4) { addLog(`轰的一声，门被砸开了！`); gainLoot('gold'); endEvent(); } 
            else {
                addLog(`噪音引来了敌人！`);
                const pool = MONSTER_POOLS['beast'];
                const enemy = pool[Math.floor(Math.random()*pool.length)];
                initCombat(enemy, 'group'); 
            }
        });
    }
};

function endEvent() {
    if (gameState === 'GAMEOVER') return;
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