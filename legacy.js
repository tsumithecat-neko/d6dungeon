// legacy.js - 局外成长与永久存档系统

const LEGACY_STORAGE_KEY = 'd6dungeon_legacy_v1';

// 定义可购买的升级项目
const LEGACY_UPGRADES = {
    'start_gold': {
        id: 'start_gold',
        name: "富二代",
        desc: "每次冒险初始金币 +50 G",
        cost: 200, // 涨价：100 -> 200
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
        cost: 300, // 涨价：200 -> 300
        maxLevel: 1,
        apply: (gameState) => {
            if (LegacySystem.getLevel('potion_hoarder') > 0) {
                if (typeof ITEM_TYPES !== 'undefined') {
                    gameState.inventory.items.push({ ...ITEM_TYPES.potion, itemKey: 'potion', id: 'legacy_pot_' + Date.now() });
                }
            }
        }
    },
    'experienced': {
        id: 'experienced',
        name: "老兵直觉",
        desc: "全员初始经验值 +2",
        cost: 400, // 涨价：300 -> 400
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
        cost: 800, // 涨价：500 -> 800
        maxLevel: 3,
        apply: (gameState) => {
            const bonus = LegacySystem.getLevel('divine_blessing');
            gameState.party.forEach(p => {
                p.maxHp += bonus;
                p.hp += bonus; 
            });
        }
    }
};

window.LEGACY_UPGRADES = LEGACY_UPGRADES;

window.LegacySystem = {
    data: {
        shards: 0,   
        upgrades: {} 
    },

    init: function() {
        const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
                // 确保 upgrades 对象存在
                if (!this.data.upgrades) this.data.upgrades = {};
                console.log("英灵殿数据读取成功:", this.data);
            } catch (e) {
                console.error("英灵殿存档损坏", e);
            }
        }
    },

    save: function() {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.data));
    },

    // 结算分数：大幅下调倍率
    calculateAndAwardShards: function(floor, gold, killCount, isWin) {
        // 新公式：层数*5 + 金币*0.1 + 击杀*1
        // 例如：3层 + 100金 + 20杀 = 15 + 10 + 20 = 45碎片
        let score = (floor * 5) + Math.floor(gold * 0.1) + (killCount * 1);
        
        // 只有主动退役(true)才会有额外加成，稍微给一点
        if (isWin) score += 20; 

        this.data.shards += score;
        this.save();
        return score;
    },

    getLevel: function(id) {
        return this.data.upgrades[id] || 0;
    },

    buyUpgrade: function(id) {
        const def = LEGACY_UPGRADES[id];
        if (!def) return false;

        const currentLv = this.getLevel(id);
        if (currentLv >= def.maxLevel) return false; 

        if (this.data.shards >= def.cost) {
            this.data.shards -= def.cost;
            this.data.upgrades[id] = currentLv + 1;
            this.save();
            return true;
        }
        return false;
    },

    applyAll: function(gameStateObj) {
        Object.keys(LEGACY_UPGRADES).forEach(key => {
            const def = LEGACY_UPGRADES[key];
            if (this.getLevel(key) > 0 && def.apply) {
                def.apply(gameStateObj);
            }
        });
    }
};

window.LegacySystem.init();
