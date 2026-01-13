// inventory.js - 背包与商店管理

// 获得战利品
function gainLoot(type) {
  if (type === 'gold') {
    const amt = d6() + d6();
    inventory.gold += amt;
    addLog(`你捡到了 ${amt} 枚金币。`);
  } else if (type === 'item') {
    const roll = d6();
    let itemKey = 'potion';
    if(roll >= 5) itemKey = 'scroll';
    else if(roll === 1) itemKey = 'gem';
    
    inventory.items.push({ ...ITEM_TYPES[itemKey], id: Date.now() + Math.random() });
    addLog(`你获得了：${ITEM_TYPES[itemKey].name}`);
  }
  updateUI();
}

// 确认使用物品 (由 UI 选择角色后调用)
window.confirmUseItem = function(itemIndex, userIndex) {
    const item = inventory.items[itemIndex];
    const user = party[userIndex];

    // --- 新增：装备逻辑分支 ---
    if (item.type === 'weapon' || item.type === 'armor') {
        window.equipItem(itemIndex, userIndex);
        return; // 装备完毕直接返回
    }
    // ------------------------

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
    if (item.type === 'treasure') {
        inventory.gold += item.value;
        addLog(`你卖掉了 ${item.name}，获得 ${item.value} 金币。`);
        inventory.items.splice(index, 1);
        updateUI();
    }
};

// --- 新增：商店生成 ---
window.generateShopItems = function() {
    window.shopStock = [];
    const lvl = window.worldLevel;
    
    // 随机选 4 件装备，等级在 lvl 附近浮动
    const count = 4; 
    const allGear = [...GEAR_DATA.weapons, ...GEAR_DATA.armors];
    
    for(let i=0; i<count; i++) {
        // 筛选：只卖等级 <= 当前难度+1 的装备
        const valid = allGear.filter(g => g.level <= lvl + 1);
        const item = valid[Math.floor(Math.random() * valid.length)];
        if (item) {
            window.shopStock.push({ ...item, id: Date.now() + i });
        }
    }
    // 必卖药水
    window.shopStock.push({ ...ITEM_TYPES.potion, cost: 10, id: 'pot_' + Date.now() });
};

// --- 新增：购买物品 ---
window.buyItem = function(itemIdx) {
    const item = window.shopStock[itemIdx];
    if (inventory.gold < item.cost) {
        alert("金币不足！");
        return;
    }
    inventory.gold -= item.cost;
    inventory.items.push(item);
    addLog(`购买了 ${item.name}。`);
    updateUI();
};

// --- 新增：穿戴装备 ---
window.equipItem = function(itemIndex, charIndex) {
    const item = inventory.items[itemIndex];
    const char = party[charIndex];
    
    if (item.type === 'weapon') {
        // 卸下旧的放回背包
        if (char.equipment.weapon) inventory.items.push(char.equipment.weapon);
        char.equipment.weapon = item;
    } else if (item.type === 'armor') {
        if (char.equipment.armor) {
             char.maxHp -= (char.equipment.armor.hpMax || 0);
             inventory.items.push(char.equipment.armor);
        }
        char.equipment.armor = item;
        // 应用新护甲HP加成，并按比例回血
        char.maxHp += (item.hpMax || 0);
        char.hp += (item.hpMax || 0); 
    }
    
    inventory.items.splice(itemIndex, 1);
    addLog(`${char.name} 装备了 ${item.name}。`);
    updateUI();
};