// inventory.js - 背包管理

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
    
    // 生成一个唯一ID
    inventory.items.push({ ...ITEM_TYPES[itemKey], id: Date.now() + Math.random() });
    addLog(`你获得了：${ITEM_TYPES[itemKey].name}`);
  }
  updateUI();
}

// 确认使用物品 (由 UI 选择角色后调用)
// itemIndex: 背包索引
// userIndex: 队伍角色索引
window.confirmUseItem = function(itemIndex, userIndex) {
    const item = inventory.items[itemIndex];
    const user = party[userIndex];

    // 1. 战斗状态下的行动点检查
    if (gameState === 'COMBAT') {
        if (combatState.actedIndices.includes(userIndex)) {
            addLog(`${user.name} 本回合已经忙碌过了，无法分心使用物品。`);
            return;
        }
    }

    // 2. 执行物品效果
    // 我们将使用者(user)和战斗状态(combatState)传给 effect 函数
    // 药水通常是 user 回血，卷轴是 user 发动攻击
    const used = item.effect(user, combatState); 

    if (used !== false) { 
        // 成功使用后，从背包移除
        inventory.items.splice(itemIndex, 1);
        
        // 如果是在战斗中，标记该角色为“已行动”
        if (gameState === 'COMBAT') {
            combatState.actedIndices.push(userIndex);
        }
    }

    updateUI();
};

// 出售物品逻辑
window.sellItem = function(index) {
    const item = inventory.items[index];
    if (item.type === 'treasure') {
        inventory.gold += item.value;
        addLog(`你卖掉了 ${item.name}，获得 ${item.value} 金币。`);
        inventory.items.splice(index, 1);
        updateUI();
    }
};

// 这里的 useItem 主要是保留给旧接口兼容或用于触发 UI 选择，
// 实际逻辑已迁移到 ui.js 的按钮点击事件 (showTargetSelection)
function useItem(index) {
    // 现在的逻辑移交给了 UI 层来决定是 卖出 还是 选人
    // 这个函数暂时留空或作为后备
}