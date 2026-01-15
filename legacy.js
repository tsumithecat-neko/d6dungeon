// legacy.js - 局外成长与永久存档系统

const LEGACY_STORAGE_KEY = 'd6dungeon_legacy_v1';

// 定义可购买的升级项目
const LEGACY_UPGRADES = {
    'start_gold': {
        id: 'start_gold',
        name: "富二代",
        desc: "每次冒险初始金币 +50 G",
        cost: 100,
        maxLevel: 5, 
        apply: (gameState) => {
            if (!gameState.inventory) return;
            gameState.inventory.gold += (LegacySystem.getLevel('start_gold') * 50);
        }
    },
    'potion_hoarder': {
        id: 'potion_hoarder',
        name: "药剂囤积者",
        desc: "初始携带 1 瓶治疗药水",
        cost: 200,
        maxLevel: 1,
        apply: (gameState) => {
            if (LegacySystem.getLevel('potion_hoarder') > 0) {
                // 确保 ITEM_TYPES 存在 (依赖 data.js)
                if (window.ITEM_TYPES) {
                    gameState.inventory.items.push({ ...window.ITEM_TYPES.potion, id: 'legacy_pot_' + Date.now() });
                }
            }
        }
    },
    'experienced': {
        id: 'experienced',
        name: "老兵直觉",
        desc: "全员初始经验值 +2",
        cost: 300,
        maxLevel: 3,
        apply: (gameState) => {
            const bonus = LegacySystem.getLevel('experienced') * 2;
            gameState.party.forEach(p => p.xp += bonus);
        }
    },
    'divine_blessing': {
        id: 'divine_blessing',
        name: "女神眷顾",
        desc: "全员最大生命值 +1",
        cost: 500,
        maxLevel: 3,
        apply: (gameState) => {
            const bonus = LegacySystem.getLevel('divine_blessing');
            gameState.party.forEach(p => {
                p.maxHp += bonus;
                p.hp += bonus; // 同时加当前血量
            });
        }
    }
};

// --- 关键修复：将配置显式挂载到 window 对象，供 ui.js 检查 ---
window.LEGACY_UPGRADES = LEGACY_UPGRADES;

window.LegacySystem = {
    data: {
        shards: 0,   // 灵魂碎片（货币）
        upgrades: {} // 已购买的升级 { id: level }
    },

    // 初始化：从 localStorage 读取
    init: function() {
        const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
                console.log("英灵殿数据读取成功:", this.data);
            } catch (e) {
                console.error("英灵殿存档损坏", e);
            }
        }
    },

    save: function() {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.data));
    },

    // 结算分数：将本局表现转换为灵魂碎片
    calculateAndAwardShards: function(floor, gold, killCount, isWin) {
        // 计算公式：层数 * 10 + 金币 * 0.2 + 击杀数 * 5
        let score = (floor * 10) + Math.floor(gold * 0.2) + (killCount * 5);
        if (isWin) score += 100; // 通关大奖

        this.data.shards += score;
        this.save();
        return score;
    },

    // 获取某项升级的等级
    getLevel: function(id) {
        return this.data.upgrades[id] || 0;
    },

    // 购买/升级
    buyUpgrade: function(id) {
        const def = LEGACY_UPGRADES[id];
        if (!def) return false;

        const currentLv = this.getLevel(id);
        if (currentLv >= def.maxLevel) return false; // 已满级

        if (this.data.shards >= def.cost) {
            this.data.shards -= def.cost;
            this.data.upgrades[id] = currentLv + 1;
            this.save();
            return true;
        }
        return false;
    },

    // 应用所有已购买的效果（在游戏开始时调用）
    applyAll: function(gameStateObj) {
        Object.keys(LEGACY_UPGRADES).forEach(key => {
            const def = LEGACY_UPGRADES[key];
            if (this.getLevel(key) > 0 && def.apply) {
                def.apply(gameStateObj);
            }
        });
    }
};

// 页面加载时自动初始化
window.LegacySystem.init();