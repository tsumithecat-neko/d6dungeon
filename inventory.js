// inventory.js - 背包、商店与城镇服务

// --- 随机装备生成逻辑 ---
function generateLoot(type, level) {
    let pool = [];
    if (type === 'weapon') pool = GEAR_DATA.weapons;
    else pool = GEAR_DATA.armors;

    const validBase = pool.filter(i => i.level <= level + 1);
    const baseItem = validBase[Math.floor(Math.random() * validBase.length)] || pool[0];
    
    const item = JSON.parse(JSON.stringify(baseItem));
    item.id = Date.now() + Math.random();

    // 40% 几率出现词缀
    if (Math.random() < 0.4) {
        const affixPool = (type === 'weapon') ? WEAPON_AFFIXES : ARMOR_AFFIXES;
        const affix = affixPool[Math.floor(Math.random() * affixPool.length)];
        
        item.name = `${affix.name} ${item.name}`;
        item.affix = affix; 
        item.color = affix.color || null;
        
        if (affix.att) item.att = (item.att || 0) + affix.att;
        if (affix.hpMax) item.hpMax = (item.hpMax || 0) + affix.hpMax;
        
        item.cost = Math.floor(item.cost * (affix.costMult || 1.5));
        let extraDesc = affix.desc ? ` [${affix.desc}]` : "";
        item.desc = (item.desc || "") + extraDesc;
    }
    return item;
}

// 获得战利品
function gainLoot(type) {
  if (type === 'gold') {
    const amt = d6() + d6();
    inventory.gold += amt;
    addLog(`你捡到了 ${amt} 枚金币。`);
  } else if (type === 'item') {
    const roll = d6();
    let newItem;
    if (roll >= 4) {
        const gearType = (Math.random() > 0.5) ? 'weapon' : 'armor';
        newItem = generateLoot(gearType, window.worldLevel);
    } else {
        let itemKey = 'potion';
        if(roll === 3) itemKey = 'scroll';
        else if(roll === 1) itemKey = 'gem';
        newItem = { ...ITEM_TYPES[itemKey], id: Date.now() + Math.random() };
    }
    inventory.items.push(newItem);
    
    let nameHtml = newItem.name;
    if (newItem.color) nameHtml = `<span style="color:${newItem.color}; font-weight:bold">${newItem.name}</span>`;
    addLog(`你获得了：${nameHtml}`);
  }
  updateUI();
}

window.confirmUseItem = function(itemIndex, userIndex) {
    const item = inventory.items[itemIndex];
    const user = party[userIndex];

    if (item.type === 'weapon' || item.type === 'armor') {
        window.equipItem(itemIndex, userIndex);
        return; 
    }

    if (gameState === 'COMBAT') {
        if (combatState.actedIndices.includes(userIndex)) {
            addLog(`${user.name} 本回合已经忙碌过了，无法分心使用物品。`);
            return;
        }
    }

    const used = item.effect(user, combatState); 

    if (used !== false) { 
        inventory.items.splice(itemIndex, 1);
        if (gameState === 'COMBAT') {
            combatState.actedIndices.push(userIndex);
        }
    }
    updateUI();
};

window.sellItem = function(index) {
    const item = inventory.items[index];
    const sellPrice = item.type === 'treasure' ? item.value : Math.floor(item.cost / 2);
    inventory.gold += sellPrice;
    addLog(`你卖掉了 ${item.name}，获得 ${sellPrice} 金币。`);
    inventory.items.splice(index, 1);
    updateUI();
};

window.generateShopItems = function() {
    window.shopStock = [];
    const lvl = window.worldLevel;
    for(let i=0; i<5; i++) {
        const type = (Math.random() > 0.5) ? 'weapon' : 'armor';
        const item = generateLoot(type, lvl);
        window.shopStock.push(item);
    }
    window.shopStock.push({ ...ITEM_TYPES.potion, cost: 10, id: 'pot_' + Date.now() });
};

window.buyItem = function(itemIdx) {
    const item = window.shopStock[itemIdx];
    if (inventory.gold < item.cost) { alert("金币不足！"); return; }
    inventory.gold -= item.cost;
    inventory.items.push(JSON.parse(JSON.stringify(item)));
    addLog(`购买了 ${item.name}。`);
    updateUI();
};

window.equipItem = function(itemIndex, charIndex) {
    const item = inventory.items[itemIndex];
    const char = party[charIndex];
    
    if (item.type === 'weapon') {
        if (char.equipment.weapon) inventory.items.push(char.equipment.weapon);
        char.equipment.weapon = item;
    } else if (item.type === 'armor') {
        if (char.equipment.armor) {
             const oldBonus = char.equipment.armor.hpMax || 0;
             char.maxHp -= oldBonus;
             char.hp = Math.min(char.hp, char.maxHp);
             inventory.items.push(char.equipment.armor);
        }
        char.equipment.armor = item;
        const newBonus = item.hpMax || 0;
        char.maxHp += newBonus;
        char.hp += newBonus; 
    }
    inventory.items.splice(itemIndex, 1);
    addLog(`${char.name} 装备了 ${item.name}。`);
    updateUI();
};

// --- 新增：城镇服务逻辑 ---

// 1. 圣堂服务
window.serviceHealParty = function() {
    const cost = 20 + (window.worldLevel * 10); // 随等级涨价
    if (inventory.gold < cost) { alert(`你需要 ${cost} 金币来支付奉纳金。`); return; }
    
    // 检查是否需要治疗
    const needsHeal = party.some(p => p.hp > 0 && (p.hp < p.maxHp || p.mp < p.maxMp));
    if (!needsHeal) { alert("牧师微笑着说：你们看起来精神焕发，无需治疗。"); return; }

    inventory.gold -= cost;
    party.forEach(p => {
        if (p.hp > 0) {
            p.hp = p.maxHp;
            p.mp = p.maxMp;
        }
    });
    addLog("👼 牧师咏唱了治愈祷言，队伍状态已完全恢复。");
    updateUI();
};

window.serviceRevive = function(charIndex) {
    const char = party[charIndex];
    if (char.hp > 0) return;
    
    const cost = char.lvl * 100;
    if (inventory.gold < cost) { alert(`复活需要 ${cost} 金币购买祭品。`); return; }

    inventory.gold -= cost;
    char.hp = Math.floor(char.maxHp); 
    char.mp = Math.floor(char.maxMp);
    addLog(`✨ 奇迹降临！${char.name} 从死亡的深渊归来了！`);
    updateUI();
};

// 2. 铁匠铺服务
window.serviceUpgradeItem = function(charIndex, slot) {
    const char = party[charIndex];
    const item = char.equipment[slot];
    if (!item) return;

    // 强化费用：基础50 + 物品原价的40%
    const upgradeCost = Math.floor(50 + (item.cost * 0.4));
    
    if (inventory.gold < upgradeCost) { alert(`金币不足！强化需要 ${upgradeCost} G`); return; }
    inventory.gold -= upgradeCost;

    // 属性提升
    if (slot === 'weapon') {
        item.att = (item.att || 0) + 1;
    } else {
        item.hpMax = (item.hpMax || 0) + 1;
        // 立即应用HP上限提升
        char.maxHp += 1;
        char.hp += 1;
    }
    
    // 改名：增加 +1, +2 后缀
    if (!item.plus) item.plus = 0;
    item.plus++;
    // 移除旧的后缀，避免出现 "剑+1+1"
    const baseName = item.name.replace(/\+\d+$/, '').replace(/\+$/, '');
    item.name = `${baseName}+${item.plus}`;
    
    // 物品价值提升，下次强化更贵
    item.cost = Math.floor(item.cost * 1.5);
    
    addLog(`🔨 叮当！${char.name} 的 [${baseName}] 被强化到了 +${item.plus}！`);
    updateUI();
};