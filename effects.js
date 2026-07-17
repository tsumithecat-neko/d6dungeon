// effects.js - 可序列化效果 ID 对应的运行时实现

const SKILL_EFFECTS = {
    skill_warrior_sweep(user, battleState) {
        const damage = 2;
        if (battleState.type === 'group') {
            const kills = damageEnemy(damage);
            return `${user.name} 挥舞武器横扫，击倒了 ${kills} 个敌人！`;
        }
        damageEnemy(damage);
        return `${user.name} 重重地劈砍，对 ${battleState.enemy.name} 造成 2 点伤害！`;
    },

    skill_rogue_backstab(user, battleState) {
        damageEnemy(battleState.type === 'group' ? 1 : 2);
        return battleState.type === 'group'
            ? `${user.name} 潜行到阴影中发动背刺，秒杀了一个敌人！`
            : `${user.name} 找到了弱点，狠狠刺入！(2伤害)`;
    },

    skill_wizard_fireball(user, battleState) {
        if (battleState.type === 'group') {
            const kills = damageEnemy(d6());
            return `${user.name} 咏唱咒语扔出火球，炸飞了 ${kills} 个敌人！`;
        }
        damageEnemy(3);
        return `${user.name} 的火球术直接命中，造成 3 点爆发伤害！`;
    },

    skill_cleric_heal(user) {
        const livingParty = party.filter(member => member.hp > 0);
        if (livingParty.length === 0) return `${user.name} 的祈祷无人回应。`;
        const target = livingParty.reduce((lowest, member) => member.hp < lowest.hp ? member : lowest);
        const healAmount = 4;
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        return `${user.name} 祈祷神恩，${target.name} 的伤口愈合了 (+${healAmount} HP)。`;
    },

    skill_paladin_smite(user) {
        damageEnemy(2);
        const oldHp = user.hp;
        user.hp = Math.min(user.maxHp, user.hp + 2);
        return `${user.name} 沐浴着圣光挥剑！造成伤害并恢复了 ${user.hp - oldHp} 点生命。`;
    },

    skill_ranger_double_shot(user, battleState) {
        const damage = damageEnemy(2);
        return battleState.type === 'group'
            ? `${user.name} 快速射出两箭，精准地干掉了 ${damage} 个敌人！`
            : `${user.name} 的连珠箭全部命中目标！(2伤害)`;
    }
};

const ITEM_EFFECTS = {
    item_heal_4(target) {
        target.hp = Math.min(target.hp + 4, target.maxHp);
        addLog({ type: 'heal', message: `${target.name} 喝下药水，恢复了生命。(HP: ${target.hp})` });
        return true;
    },

    item_chain_lightning() {
        if (gameState !== 'COMBAT' || !combatState.active) {
            addLog({ type: 'warning', message: '只能在战斗中使用！' });
            return false;
        }
        if (combatState.type === 'group') {
            damageEnemy(combatState.enemy.count);
            addLog({ type: 'combat', message: '闪电链在敌群中跳跃，瞬间清除了所有小怪！' });
        } else {
            damageEnemy(2);
            addLog({ type: 'combat', message: `闪电击中 ${combatState.enemy.name}，造成 2 点伤害！` });
        }
        return true;
    }
};

const MONSTER_SKILL_EFFECTS = {
    monster_poison_spit(user, target) {
        target.hp = Math.max(0, target.hp - 1);
        applyStatus(target, 'poison', 3);
        return `${user.name} 喷出一口毒液！${target.name} 受伤并中毒了。`;
    },

    monster_web_trap(user, target) {
        applyStatus(target, 'stun', 1);
        return `${user.name} 射出粘稠的蛛网，${target.name} 动弹不得！`;
    },

    monster_warcry(user) {
        applyStatus(user, 'rage', 3);
        return `${user.name} 发出震耳欲聋的咆哮，进入了狂暴状态！`;
    },

    monster_curse(user, target) {
        applyStatus(target, 'weak', 3);
        return `${user.name} 念出亵渎的咒语，${target.name} 感到力量流失了。`;
    },

    monster_smash(user, target) {
        target.hp = Math.max(0, target.hp - 2);
        return `${user.name} 蓄力重击！${target.name} 受到了 2 点伤害！`;
    }
};

function executeSkillEffect(effectId, user, battleState) {
    const effect = SKILL_EFFECTS[effectId];
    if (!effect) throw new Error(`未知技能效果: ${effectId}`);
    return effect(user, battleState);
}

function executeItemEffect(effectId, target, battleState) {
    const effect = ITEM_EFFECTS[effectId];
    if (!effect) {
        addLog({ type: 'error', message: `物品效果丢失: ${effectId || 'unknown'}` });
        return false;
    }
    return effect(target, battleState);
}

function executeMonsterSkillEffect(effectId, user, target) {
    const effect = MONSTER_SKILL_EFFECTS[effectId];
    if (!effect) throw new Error(`未知怪物技能效果: ${effectId}`);
    return effect(user, target);
}
