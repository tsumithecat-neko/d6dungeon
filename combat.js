// combat.js - 战斗与交互逻辑

function initCombat(template, type) {
  gameState = 'COMBAT';
  const enemyData = JSON.parse(JSON.stringify(template));
  
  const multiplier = 1 + (window.worldLevel - 1) * 0.5; 
  enemyData.hp = Math.floor(enemyData.hp * multiplier);
  enemyData.att = enemyData.att + Math.floor((window.worldLevel - 1) * 0.8);
  enemyData.status = []; 

  if (type === 'group') enemyData.maxCount = enemyData.count || 1;
  else enemyData.maxHp = enemyData.hp || 1;

  party.forEach(p => { if(!p.status) p.status = []; });

  if (type === 'group') {
    if (!enemyData.count) enemyData.count = 1;
    addLog(`⚔️ 敌人出现 (Lv.${window.worldLevel})！${enemyData.name} x${enemyData.count} (ATK: ${enemyData.att})`);
  } else if (type === 'boss') {
    addLog(`💀 首领降临 (Lv.${window.worldLevel})！${enemyData.name} (HP: ${enemyData.hp}, ATK: ${enemyData.att})`);
  } else {
    addLog(`⚜️ 精英挡住了去路 (Lv.${window.worldLevel})！${enemyData.name} (HP: ${enemyData.hp}, ATK: ${enemyData.att})`);
  }

  combatState = {
    active: true, type: type, enemy: enemyData, round: 1,
    actedIndices: [], defendingIndices: [], enemyIntent: []
  };
  planEnemyTurn();
  
  // 战斗开始词缀 (狂暴)
  party.forEach(p => {
      if (p.hp > 0 && p.equipment?.weapon?.affix?.effect === 'rage_start') {
          applyStatus(p, 'rage', 3);
          addLog(`🔥 [狂暴] ${p.name} 的武器让他热血沸腾！`);
      }
  });
  updateUI();
}

function recordEnemyKills(amount) {
    const kills = Math.max(0, Math.floor(amount || 0));
    if (kills === 0) return;
    if (!window.runStats) window.runStats = { kills: 0 };
    window.runStats.kills = (window.runStats.kills || 0) + kills;
    if (typeof updateQuestProgress === 'function') {
        updateQuestProgress('hunt', kills, { category: combatState.enemy?.category, enemyName: combatState.enemy?.name });
    }
}

function isEnemyDefeated() {
    const enemy = combatState.enemy;
    if (!enemy) return false;
    return combatState.type === 'group' ? enemy.count <= 0 : enemy.hp <= 0;
}

// 所有玩家造成的敌方伤害都走同一入口，确保小怪群、Boss 与击杀统计一致。
function damageEnemy(amount) {
    const enemy = combatState.enemy;
    const damage = Math.max(0, Math.floor(amount || 0));
    if (!enemy || damage === 0) return 0;

    if (combatState.type === 'group') {
        const before = Math.max(0, enemy.count || 0);
        enemy.count = Math.max(0, before - damage);
        const kills = before - enemy.count;
        recordEnemyKills(kills);
        return kills;
    }

    const before = Math.max(0, enemy.hp || 0);
    enemy.hp = Math.max(0, before - damage);
    if (before > 0 && enemy.hp === 0) recordEnemyKills(1);
    return before - enemy.hp;
}

function damageCharacter(target, amount) {
    const rawDamage = Math.max(0, Math.floor(amount || 0));
    if (!target || rawDamage === 0) return 0;
    const targetIndex = party.indexOf(target);
    const isDefending = targetIndex >= 0 && combatState.defendingIndices?.includes(targetIndex);
    const finalDamage = isDefending ? Math.floor(rawDamage / 2) : rawDamage;
    target.hp = Math.max(0, target.hp - finalDamage);
    if (isDefending && finalDamage < rawDamage) {
        addLog({ type: 'combat', message: `🛡️ ${target.name} 的防御将伤害从 ${rawDamage} 降至 ${finalDamage}。` });
    }
    return finalDamage;
}

function getIntentBaseDamage(skillKey) {
    if (skillKey === 'smash') return 2;
    if (skillKey === 'poison_spit') return 1;
    return skillKey ? 0 : 1;
}

function getEnemyIntentDamage(intent) {
    const baseDamage = Math.max(0, intent?.estimatedDamage || 0);
    return combatState.defendingIndices?.includes(intent?.targetIndex) ? Math.floor(baseDamage / 2) : baseDamage;
}

function planEnemyTurn() {
    if (!combatState.active || !combatState.enemy) return [];
    const enemy = combatState.enemy;
    const aliveIndices = party.map((member, index) => member.hp > 0 ? index : -1).filter(index => index >= 0);
    if (aliveIndices.length === 0) return (combatState.enemyIntent = []);
    const attacks = combatState.type === 'group' ? Math.min(enemy.count, 3) : 2;
    combatState.enemyIntent = Array.from({ length: Math.max(0, attacks) }, () => {
        let skillKey = null;
        if (enemy.skills?.length) {
            const skillChance = combatState.type === 'boss' ? 0.5 : 0.3;
            if (Math.random() < skillChance) {
                const candidate = randomFrom(enemy.skills);
                const skillDef = MONSTER_SKILLS[candidate];
                if (skillDef && Math.random() < (skillDef.rate || 1)) skillKey = candidate;
            }
        }
        const skillDef = skillKey ? MONSTER_SKILLS[skillKey] : null;
        return {
            skillKey,
            targetIndex: skillDef?.targetSelf ? null : randomFrom(aliveIndices),
            label: skillDef?.name || '普通攻击',
            estimatedDamage: getIntentBaseDamage(skillKey)
        };
    });
    return combatState.enemyIntent;
}

window.defendCharacter = function(charIndex) {
    if (gameState !== 'COMBAT' || !combatState.active) return;
    const member = party[charIndex];
    if (!member || member.hp <= 0 || combatState.actedIndices.includes(charIndex)) return;
    if (member.status?.some(status => status.type === 'stun')) {
        addLog({ type: 'warning', message: `${member.name} 正在眩晕，无法防御。` });
        return;
    }
    combatState.actedIndices.push(charIndex);
    if (!combatState.defendingIndices.includes(charIndex)) combatState.defendingIndices.push(charIndex);
    addLog({ type: 'combat', message: `🛡️ ${member.name} 摆出防御姿态，本回合受到的直接伤害减半。` });
    updateUI();
};

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
            if (char === combatState.enemy) {
                damageEnemy(1);
                const unit = combatState.type === 'group' ? '一名敌人毒发倒下' : `${char.name} 受到毒素伤害 (-1 HP)`;
                addLog(`${window.STATUS_ICONS.poison} ${unit}。`);
            } else {
                char.hp = Math.max(0, char.hp - 1);
                addLog(`${window.STATUS_ICONS.poison} ${char.name} 受到毒素伤害 (-1 HP)。`);
            }
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
  const resultLog = executeSkillEffect(skillData.effectId, user, combatState);
  addLog({ type: 'skill', message: resultLog });

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
      combatState.defendingIndices = [];
      if (combatState.active) planEnemyTurn();
      updateUI();
  };

  if (requests.length === 0) { finishTurn(); return; }

  rollDiceAnim(requests, (results) => {
      const enemy = combatState.enemy;
      let hits = 0;
      
      activePartyMembers.forEach((p) => {
          const isEnemyDead = isEnemyDefeated();
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
              
              // 词缀效果
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
                  damageEnemy(1);
                  addLog(`${p.name} ${rollIcon} 命中！(修正:${total-roll}) 击杀敌人。`);
              } else {
                  damageEnemy(1);
                  addLog(`${p.name} ${rollIcon} 命中！(修正:${total-roll}) 造成伤害。`);
              }
          } else {
              addLog(`${p.name} ${rollIcon} 攻击偏斜了。`);
          }
      });
      
      const isEnemyDeadNow = isEnemyDefeated();
      if (hits === 0 && !isEnemyDeadNow) addLog("普攻未能造成有效打击！");

      finishTurn(); 
  });
}

function enemyTurn() {
    const enemy = combatState.enemy;
    const canAct = processStatusEffects(enemy);
    if (isEnemyDefeated()) { endCombat(true); return; }
    if (!canAct) return;

    const plannedActions = combatState.enemyIntent?.length ? combatState.enemyIntent : planEnemyTurn();
    const intentText = plannedActions.map(action => {
        const target = action.targetIndex === null ? enemy : party[action.targetIndex];
        return `${action.label} → ${target?.name || '未知目标'}（预计 ${getEnemyIntentDamage(action)} 伤害）`;
    }).join('；');
    addLog({ type: 'intent', message: `👁️ <b>${enemy.name} 的意图：</b>${intentText}` });
    addLog({ type: 'combat', message: '敌人开始行动...' });

    for (let i = 0; i < plannedActions.length; i++) {
        const action = plannedActions[i];
        let target = action.targetIndex === null ? enemy : party[action.targetIndex];
        if (target !== enemy && (!target || target.hp <= 0)) target = randomAliveCharacter();
        if (!target) break;

        const skillDef = action.skillKey ? MONSTER_SKILLS[action.skillKey] : null;
        const skillUsed = Boolean(skillDef);
        if (skillDef) {
            addLog({ type: 'skill', message: `⚠️ <b>${enemy.name} 使用了 [${skillDef.name}]！</b>` });
            const finalTarget = skillDef.targetSelf ? enemy : target;
            const msg = executeMonsterSkillEffect(skillDef.effectId, enemy, finalTarget);
            addLog({ type: 'combat', message: msg });
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
                const damage = damageCharacter(target, 1);
                addLog(`❌ ${enemy.name} 击中了 ${target.name}！(-${damage} HP)`);
                
                if (aAffix && aAffix.effect === 'thorns') {
                    damageEnemy(1);
                    addLog(`🌵 [荆棘] 铠甲反弹了 1 点伤害！`);
                    if (checkWin()) return;
                }

            } else {
                addLog(`${enemy.name} 扑向 ${target.name} 但被躲开了。`);
            }
        }
    }
    if (!randomAliveCharacter()) endCombat(false);
}

function checkWin() {
  const isWin = isEnemyDefeated();
  if (isWin) { endCombat(true); return true; }
  return false;
}

function handlePartyDefeat(source = 'unknown') {
  if (gameState === 'GAMEOVER') return false;

  combatState.active = false;
  party.forEach(p => p.status = []);
  activeEvent = null;
  gameState = 'GAMEOVER';
  addLog(`💀 队伍全灭...`);

  if (window.LegacySystem) {
      const kills = window.runStats ? window.runStats.kills : 0;
      const shards = window.LegacySystem.calculateAndAwardShards(window.worldLevel, inventory.gold, kills, false);
      addLog(`👻 你的灵魂飘向了英灵殿... (获得 ${shards} 碎片)`);
  }

  if (typeof clearAutoSave === 'function') clearAutoSave();

  updateUI();
  return true;
}

function endCombat(win) {
  combatState.active = false;
  party.forEach(p => p.status = []);
  
  if (win) {
    addLog(`🎉 战斗胜利！`);
    if (typeof storyOnCombatWon === 'function') storyOnCombatWon(combatState.type, combatState.enemy);
    if (typeof questOnCombatWon === 'function') questOnCombatWon(combatState.type, combatState.enemy);
    if(dungeon[playerRoomId]) dungeon[playerRoomId]._encounterResolved = true;
    
    // 如果是 BOSS 战
    if (combatState.type === 'boss') {
        // --- 修改：移除了 calculateAndAwardShards 调用 ---
        addLog(`✨ 击败地牢领主！虽然没有直接获得碎片，但你的传奇还在继续...`);
        addLog(`(想要结算碎片，请在城镇中选择“结束冒险”)`);
        
        gainLoot('item'); 
        gameState = 'VICTORY'; // 胜利状态，等待回城
        updateUI(); 
        return; 
    } else {
        const isElite = combatState.type === 'elite';
        const xpGain = isElite ? 4 : 2;
        party.forEach(p => { if (p.hp > 0) gainXp(p, xpGain); });

        gameState = 'EXPLORING';
        if (isElite) {
            gainLoot('elite');
        } else {
            const lootRoll = d6();
            if (lootRoll >= 5) gainLoot('item');
            else if (lootRoll >= 3) gainLoot('gold');
            else addLog("并没有发现什么有价值的东西。");
        }
    }
    
  } else {
    handlePartyDefeat('combat');
    return;
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
        combatState.active = false;
        gameState = 'EXPLORING'; updateUI();
      } else {
        addLog(`逃跑失败！敌人截住了退路。`);
        enemyTurn();
        combatState.round++;
        combatState.actedIndices = [];
        combatState.defendingIndices = [];
        if (combatState.active) planEnemyTurn();
        updateUI();
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
  else if (enc.main === 'elite') {
      addLog(`>>> 精英遭遇：${enc.template.name} <<<`);
      initCombat(enc.template, 'elite'); return;
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
    else if (option.type === 'story_choice') {
        if (typeof handleStoryChoice === 'function') handleStoryChoice(option);
        endEvent();
    }
    else if (option.type === 'heal_party') {
        addLog(`神圣的光芒照耀着队伍...`);
        party.forEach(p => { if(p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + option.amount); });
        addLog(`全员恢复了 ${option.amount} 点生命。`); endEvent();
    }
    else if (option.type === 'camp_heal') {
        party.forEach(member => {
            if (member.hp > 0) { member.hp = member.maxHp; member.mp = member.maxMp; }
        });
        addLog({ type: 'heal', message: '🔥 队伍在营火旁充分休息，存活成员的 HP 与 MP 已全部恢复。' });
        endEvent();
    }
    else if (option.type === 'choose_skill_upgrade') {
        const candidates = party.map((member, charIndex) => ({ member, charIndex }))
            .filter(entry => entry.member.hp > 0 && (entry.member.skillLevel || 0) < 3);
        if (candidates.length === 0) {
            addLog({ type: 'warning', message: '队伍中没有可以继续升级技能的成员。' });
            return;
        }
        activeEvent = {
            title: '📖 选择训练对象',
            desc: '技能升级会永久提高该职业技能的伤害或治疗量。',
            options: candidates.map(({ member, charIndex }) => ({
                label: `${member.name}：${CLASS_SKILLS[member.class]?.name || '职业技能'} Lv.${(member.skillLevel || 0) + 1} → Lv.${(member.skillLevel || 0) + 2}`,
                desc: '本次训练后立即生效。', type: 'upgrade_skill', charIndex
            }))
        };
        updateUI();
    }
    else if (option.type === 'upgrade_skill') {
        const member = party[option.charIndex];
        if (!member || member.hp <= 0 || (member.skillLevel || 0) >= 3) return;
        member.skillLevel = (member.skillLevel || 0) + 1;
        addLog({ type: 'skill', message: `📖 ${member.name} 的 [${CLASS_SKILLS[member.class]?.name || '职业技能'}] 提升到 Lv.${member.skillLevel + 1}！` });
        endEvent();
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
            tank.hp = Math.max(0, tank.hp - option.damage);
            addLog(`${tank.name} 挺身而出挡住了伤害 (-${option.damage} HP)。`);
            if (!randomAliveCharacter()) handlePartyDefeat('event');
            else endEvent();
        } else { alert("没有活着的肉盾！"); }
    }
    else if (option.type === 'roll_check') {
        rollDiceAnim([{label:"全员判定", id:"check"}], (results) => {
            const roll = results['check'];
            if (roll >= option.target) { addLog(`(🎲 ${roll}) ${option.successMsg}`); } 
            else {
                addLog(`(🎲 ${roll}) ${option.failMsg}`);
                party.forEach(p => { if(p.hp > 0) p.hp = Math.max(0, p.hp - option.failDamage); });
                if (!randomAliveCharacter()) { handlePartyDefeat('event'); return; }
            } endEvent();
        });
    }
    else if (option.type === 'gamble') {
        rollDiceAnim([{label:"运气测试", id:"gamble"}], (results) => {
            const roll = results['gamble'];
            if (roll === 6) { addLog(`(🎲 6) 机关打开，里面有宝藏！`); gainLoot('item'); } 
            else if (roll === 1) {
                addLog(`(🎲 1) 轰隆！你触动了陷阱！`);
                party.forEach(p => p.hp = Math.max(0, p.hp - 2));
                if (!randomAliveCharacter()) { handlePartyDefeat('event'); return; }
            }
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
    if (!randomAliveCharacter()) { handlePartyDefeat('event'); return; }
    if (dungeon[playerRoomId]) dungeon[playerRoomId]._encounterResolved = true;
    activeEvent = null;
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
            if (!randomAliveCharacter()) { handlePartyDefeat('search'); return; }
        } 
        else if (roll === 6) { addLog("✨ 运气不错！你在角落里发现了一个暗格。"); gainLoot('item'); } 
        else if (roll >= 4) { addLog("你在废墟下找到了一些零散的金币。"); gainLoot('gold'); } 
        else { addLog("除了一些灰尘和碎骨头，什么也没找到。"); }
        updateUI();
    });
}
