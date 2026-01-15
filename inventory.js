// inventory.js - 背包与商店管理

// --- 新增：随机装备生成逻辑 ---
function generateLoot(type, level) {
    let pool = [];
    if (type === 'weapon') pool = GEAR_DATA.weapons;
    else pool = GEAR_DATA.armors;

    // 1. 筛选合适的基底 (等级 <= level + 1)
    const validBase = pool.filter(i => i.level <= level + 1);
    const baseItem = validBase[Math.floor(Math.random() * validBase.length)] || pool[0];
    
    // 克隆基底
    const item = JSON.parse(JSON.stringify(baseItem));
    item.id = Date.now() + Math.random();

    // 2. 随机词缀判定 (40% 几率出现词缀，Boss战或高级箱子可以更高，这里取通用)
    if (Math.random() < 0.4) {
        const affixPool = (type === 'weapon') ? WEAPON_AFFIXES : ARMOR_AFFIXES;
        const affix = affixPool[Math.floor(Math.random() * affixPool.length)];
        
        // 应用词缀
        item.name = `${affix.name} ${item.name}`;
        item.affix = affix; // 保存词缀数据供战斗使用
        item.color = affix.color || null; // 稀有度颜色
        
        // 合并基础属性
        if (affix.att) item.att = (item.att || 0) + affix.att;
        if (affix.hpMax) item.hpMax = (item.hpMax || 0) + affix.hpMax;
        
        // 价格翻倍
        item.cost = Math.floor(item.cost * (affix.costMult || 1.5));
        
        // 更新描述
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
    
    // 50% 几率出装备，50% 出消耗品
    if (roll >= 4) {
        // 出装备
        const gearType = (Math.random() > 0.5) ? 'weapon' : 'armor';
        newItem = generateLoot(gearType, window.worldLevel);
    } else {
        // 出消耗品
        let itemKey = 'potion';
        if(roll === 3) itemKey = 'scroll';
        else if(roll === 1) itemKey = 'gem';
        newItem = { ...ITEM_TYPES[itemKey], id: Date.now() + Math.random() };
    }
    
    inventory.items.push(newItem);
    
    // 稀有装备加粗显示
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
    // 现在装备也可以卖了，按半价
    const sellPrice = item.type === 'treasure' ? item.value : Math.floor(item.cost / 2);
    
    inventory.gold += sellPrice;
    addLog(`你卖掉了 ${item.name}，获得 ${sellPrice} 金币。`);
    inventory.items.splice(index, 1);
    updateUI();
};

window.generateShopItems = function() {
    window.shopStock = [];
    const lvl = window.worldLevel;
    
    // 生成 5 件随机装备，使用新的生成器
    for(let i=0; i<5; i++) {
        const type = (Math.random() > 0.5) ? 'weapon' : 'armor';
        const item = generateLoot(type, lvl);
        window.shopStock.push(item);
    }
    // 必卖药水
    window.shopStock.push({ ...ITEM_TYPES.potion, cost: 10, id: 'pot_' + Date.now() });
};

window.buyItem = function(itemIdx) {
    const item = window.shopStock[itemIdx];
    if (inventory.gold < item.cost) {
        alert("金币不足！");
        return;
    }
    inventory.gold -= item.cost;
    // 必须深拷贝，防止买同一个引用
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
             // 卸下旧甲：扣除旧甲提供的HP上限 (注意：如果当前血量高于新上限，也要扣除)
             const oldBonus = char.equipment.armor.hpMax || 0;
             char.maxHp -= oldBonus;
             char.hp = Math.min(char.hp, char.maxHp); // 修正当前血量
             inventory.items.push(char.equipment.armor);
        }
        char.equipment.armor = item;
        // 穿上新甲：增加上限，并回复等量的血
        const newBonus = item.hpMax || 0;
        char.maxHp += newBonus;
        char.hp += newBonus; 
    }
    
    inventory.items.splice(itemIndex, 1);
    addLog(`${char.name} 装备了 ${item.name}。`);
    updateUI();
};