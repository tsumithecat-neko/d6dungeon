// quests.js - 主城分层任务面板

function createQuestState() {
    return { boardLayer: null, offers: [], active: [], history: [] };
}

window.questState = createQuestState();

function resetQuestState() {
    window.questState = createQuestState();
    return window.questState;
}

function restoreQuestState(savedState) {
    window.questState = Object.assign(createQuestState(), savedState || {});
    ['offers', 'active', 'history'].forEach(key => {
        if (!Array.isArray(window.questState[key])) window.questState[key] = [];
    });
    return window.questState;
}

function createQuestOffers(layer) {
    const huntCategory = layer % 2 === 0 ? 'beast' : 'minion';
    const huntTarget = huntCategory === 'beast' ? 3 : 6;
    const huntLabel = huntCategory === 'beast' ? '异兽' : '小型怪物';
    return [
        {
            id: `hunt_${layer}`, kind: 'hunt', layer,
            title: `⚔️ ${huntLabel}讨伐令`,
            desc: `在第 ${layer} 层消灭 ${huntTarget} 名${huntLabel}。`,
            target: huntTarget, targetCategory: huntCategory, progress: 0, reward: 18 + layer * 8
        },
        {
            id: `trophy_${layer}`, kind: 'collect', layer,
            title: '🦷 异兽样本征集',
            desc: `从第 ${layer} 层带回 2 枚异兽獠牙。`,
            target: 2, itemKey: 'beast_fang', itemName: '异兽獠牙', reward: 26 + layer * 9
        },
        {
            id: `elite_${layer}`, kind: 'elite', layer,
            title: '⚜️ 精英悬赏',
            desc: `在第 ${layer} 层击败 1 名精英敌人。`,
            target: 1, progress: 0, reward: 35 + layer * 12
        }
    ];
}

function ensureQuestBoard() {
    const targetLayer = (window.worldLevel || 1) + 1;
    if (window.questState.boardLayer !== targetLayer) {
        window.questState.boardLayer = targetLayer;
        window.questState.offers = createQuestOffers(targetLayer)
            .filter(offer => !window.questState.active.some(quest => quest.id === offer.id));
    }
    return window.questState.offers;
}

function getQuestProgress(quest) {
    if (quest.kind === 'collect') {
        return inventory.items.filter(item => item.type === 'quest' && item.questItemKey === quest.itemKey && item.questLayer === quest.layer).length;
    }
    return Math.max(0, quest.progress || 0);
}

function isQuestComplete(quest) {
    return getQuestProgress(quest) >= quest.target;
}

window.acceptQuest = function(questId) {
    if (gameState !== 'TOWN') return;
    if (window.questState.active.length >= 2) {
        addLog({ type: 'warning', message: '任务栏已满，同时最多接取 2 个任务。' });
        return;
    }
    const index = window.questState.offers.findIndex(quest => quest.id === questId);
    if (index < 0) return;
    const quest = window.questState.offers.splice(index, 1)[0];
    window.questState.active.push(quest);
    addLog({ type: 'quest', message: `📌 已接取第 ${quest.layer} 层任务：[${quest.title.replace(/^\S+\s*/, '')}]` });
    updateUI();
};

function removeQuestItems(quest, amount) {
    let remaining = amount;
    for (let index = inventory.items.length - 1; index >= 0 && remaining > 0; index--) {
        const item = inventory.items[index];
        if (item.type === 'quest' && item.questItemKey === quest.itemKey && item.questLayer === quest.layer) {
            inventory.items.splice(index, 1);
            remaining--;
        }
    }
}

window.turnInQuest = function(questId) {
    if (gameState !== 'TOWN') return;
    const index = window.questState.active.findIndex(quest => quest.id === questId);
    if (index < 0) return;
    const quest = window.questState.active[index];
    if (quest.layer !== window.worldLevel || !isQuestComplete(quest)) return;
    if (quest.kind === 'collect') removeQuestItems(quest, quest.target);
    inventory.gold += quest.reward;
    window.questState.history.push({ id: quest.id, layer: quest.layer, completed: true });
    window.questState.active.splice(index, 1);
    addLog({ type: 'reward', message: `✅ 任务完成：[${quest.title.replace(/^\S+\s*/, '')}]，获得 ${quest.reward} 金币。` });
    updateUI();
};

function updateQuestProgress(kind, amount = 1, metadata = {}) {
    window.questState.active.forEach(quest => {
        if (quest.layer !== window.worldLevel || quest.kind !== kind || isQuestComplete(quest)) return;
        if (quest.targetCategory && metadata.category !== quest.targetCategory) return;
        quest.progress = Math.min(quest.target, (quest.progress || 0) + amount);
        if (isQuestComplete(quest)) {
            addLog({ type: 'quest', message: `✅ 任务目标已达成：[${quest.title.replace(/^\S+\s*/, '')}]，通关回城后可交付。` });
        }
    });
}

function grantQuestLoot(itemKey, itemName, amount = 1) {
    for (let i = 0; i < amount; i++) {
        inventory.items.push({
            id: `quest_${Date.now()}_${Math.random()}`,
            type: 'quest', questItemKey: itemKey, questLayer: window.worldLevel,
            name: itemName, desc: `第 ${window.worldLevel} 层任务战利品，无法出售或跨层保留。`
        });
    }
    addLog({ type: 'quest', message: `🎒 获得任务战利品：${itemName} ×${amount}` });
}

function questOnCombatWon(type, enemy) {
    if (type === 'elite') updateQuestProgress('elite', 1);
    const collectQuest = window.questState.active.find(quest =>
        quest.kind === 'collect' && quest.layer === window.worldLevel && !isQuestComplete(quest)
    );
    if (!collectQuest) return;
    const isBeast = enemy?.category === 'beast' || type === 'elite';
    if (isBeast) {
        const before = getQuestProgress(collectQuest);
        const dropAmount = Math.min(collectQuest.target - before, type === 'elite' ? 2 : 1);
        if (dropAmount > 0) grantQuestLoot(collectQuest.itemKey, collectQuest.itemName, dropAmount);
        if (before < collectQuest.target && isQuestComplete(collectQuest)) {
            addLog({ type: 'quest', message: `✅ 任务物品已集齐：[${collectQuest.title.replace(/^\S+\s*/, '')}]，通关回城后可交付。` });
        }
    }
}

function startQuestLayer(layer) {
    const expired = window.questState.active.filter(quest => quest.layer < layer);
    expired.forEach(quest => {
        window.questState.history.push({ id: quest.id, layer: quest.layer, completed: false });
        addLog({ type: 'warning', message: `⌛ 第 ${quest.layer} 层任务已过期：[${quest.title.replace(/^\S+\s*/, '')}]` });
    });
    window.questState.active = window.questState.active.filter(quest => quest.layer >= layer);
    inventory.items = inventory.items.filter(item => item.type !== 'quest' || item.questLayer >= layer);
    if (window.questState.boardLayer <= layer) {
        window.questState.boardLayer = null;
        window.questState.offers = [];
    }
}

function renderQuestBoard(container) {
    if (!container || gameState !== 'TOWN') return;
    ensureQuestBoard();
    const board = document.createElement('div');
    board.style.cssText = 'background:#fff8e1; border:2px solid #8d6e63; padding:9px; margin-bottom:12px; border-radius:4px;';
    board.innerHTML = `<h4 style="margin:0 0 7px;color:#5d4037">📋 冒险者任务板 <small>（最多 2 个）</small></h4>`;

    if (window.questState.active.length > 0) {
        window.questState.active.forEach(quest => {
            const progress = Math.min(quest.target, getQuestProgress(quest));
            const row = document.createElement('div');
            row.style.cssText = 'padding:6px; margin-bottom:6px; background:#fff; border-left:4px solid #f9a825;';
            const stateText = quest.layer > window.worldLevel ? `将在第 ${quest.layer} 层生效` : `进度 ${progress}/${quest.target}`;
            row.innerHTML = `<b>${quest.title}</b><br><small>${quest.desc}</small><br><span style="color:#6d4c41">${stateText} · 奖励 ${quest.reward} G</span>`;
            if (quest.layer === window.worldLevel && isQuestComplete(quest)) {
                const turnIn = document.createElement('button');
                turnIn.textContent = '领取奖励';
                turnIn.style.cssText = 'float:right; margin-top:-28px;';
                turnIn.onclick = () => window.turnInQuest(quest.id);
                row.appendChild(turnIn);
            }
            board.appendChild(row);
        });
    }

    window.questState.offers.forEach(quest => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; gap:8px; padding:6px 0; border-top:1px dashed #bcaaa4;';
        row.innerHTML = `<div><b>${quest.title}</b><br><small>${quest.desc} 奖励 ${quest.reward} G</small></div>`;
        const accept = document.createElement('button');
        accept.textContent = '接取';
        accept.disabled = window.questState.active.length >= 2;
        accept.onclick = () => window.acceptQuest(quest.id);
        row.appendChild(accept);
        board.appendChild(row);
    });
    container.appendChild(board);
}
