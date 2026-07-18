// rules.js - D20、六维属性、AC、豁免与技能检定

function d20() { return Math.floor(Math.random() * 20) + 1; }

function getAbilityModifier(score) {
    return Math.floor(((score || 10) - 10) / 2);
}

function formatModifier(value) {
    return value >= 0 ? `+${value}` : String(value);
}

function getProficiencyBonus(character) {
    return 2 + Math.floor((Math.max(1, character?.lvl || 1) - 1) / 4);
}

function buildAbilityScores(raceKey, classKey) {
    const base = CLASS_ABILITY_SCORES[classKey] || CLASS_ABILITY_SCORES.warrior;
    const bonus = RACE_ABILITY_BONUSES[raceKey] || {};
    const scores = {};
    Object.keys(ABILITY_NAMES).forEach(key => scores[key] = (base[key] || 10) + (bonus[key] || 0));
    return scores;
}

function hydrateCharacterRules(character) {
    if (!character) return character;
    character.backgroundKey = character.backgroundKey || CLASS_DEFAULT_BACKGROUNDS[character.class] || 'soldier';
    character.backgroundName = BACKGROUNDS[character.backgroundKey]?.name || '冒险者';
    if (!character.abilities) character.abilities = buildAbilityScores(character.race, character.class);
    character.skillProficiencies = Array.isArray(character.skillProficiencies)
        ? character.skillProficiencies
        : [...(BACKGROUNDS[character.backgroundKey]?.skills || [])];
    character.savingThrowProficiencies = Array.isArray(character.savingThrowProficiencies)
        ? character.savingThrowProficiencies
        : [...(CLASS_SAVING_THROWS[character.class] || [])];
    return character;
}

function getCharacterAC(character) {
    hydrateCharacterRules(character);
    const dexterity = getAbilityModifier(character.abilities.dex);
    const armor = character.equipment?.armor;
    return 10 + dexterity + (armor?.def || 0);
}

function getAttackModifier(character) {
    hydrateCharacterRules(character);
    const ability = CLASS_ATTACK_ABILITIES[character.class] || 'str';
    return getAbilityModifier(character.abilities[ability]) + getProficiencyBonus(character) + (character.equipment?.weapon?.att || 0) + getStatusBonus(character, 'att');
}

function getSkillModifier(character, skillKey, abilityOverride = null) {
    hydrateCharacterRules(character);
    const ability = abilityOverride || SKILL_DEFINITIONS[skillKey]?.ability || 'wis';
    const proficient = skillKey && character.skillProficiencies.includes(skillKey);
    return getAbilityModifier(character.abilities[ability]) + (proficient ? getProficiencyBonus(character) : 0);
}

function getSavingThrowModifier(character, ability) {
    hydrateCharacterRules(character);
    const proficient = character.savingThrowProficiencies.includes(ability);
    return getAbilityModifier(character.abilities[ability]) + (proficient ? getProficiencyBonus(character) : 0);
}

function makeSavingThrow(character, ability, dc) {
    const roll = d20();
    const modifier = getSavingThrowModifier(character, ability);
    const total = roll + modifier;
    const success = roll === 20 || (roll !== 1 && total >= dc);
    addLog({
        type: success ? 'check' : 'warning',
        message: `🎲 ${character.name} 进行${ABILITY_NAMES[ability]}豁免：${roll} ${formatModifier(modifier)} = ${total}，${success ? '成功' : '失败'}（DC ${dc}）`
    });
    return { roll, modifier, total, success };
}

function getBestPartyChecker(skillKey, abilityOverride = null) {
    const living = party.filter(character => character.hp > 0);
    if (living.length === 0) return null;
    return living.reduce((best, character) =>
        getSkillModifier(character, skillKey, abilityOverride) > getSkillModifier(best, skillKey, abilityOverride) ? character : best
    );
}

function rollPartySkillCheck({ skill, ability, dc, label }, callback) {
    const checker = getBestPartyChecker(skill, ability);
    if (!checker) return;
    const modifier = getSkillModifier(checker, skill, ability);
    const skillName = SKILL_DEFINITIONS[skill]?.name || ABILITY_NAMES[ability] || '能力';
    rollDiceAnim([{ label: `${checker.name} · ${skillName} ${formatModifier(modifier)}`, id: 'd20check', sides: 20 }], results => {
        const roll = results.d20check;
        const total = roll + modifier;
        const success = roll === 20 || (roll !== 1 && total >= dc);
        addLog({ type: success ? 'check' : 'warning', message: `🎲 ${label || skillName}：${checker.name} 掷出 ${roll} ${formatModifier(modifier)} = ${total}（DC ${dc}）` });
        callback({ checker, roll, modifier, total, success });
    });
}

function rollCombatInitiative(enemy) {
    const partyRolls = party.map((character, index) => {
        hydrateCharacterRules(character);
        const roll = d20();
        const modifier = getAbilityModifier(character.abilities.dex);
        return { index, roll, modifier, total: roll + modifier };
    });
    const bestParty = partyRolls.filter(entry => party[entry.index].hp > 0).reduce((best, entry) => !best || entry.total > best.total ? entry : best, null);
    const enemyRoll = d20();
    const enemyModifier = enemy.initiativeBonus || Math.max(0, enemy.att || 0);
    const enemyEntry = { roll: enemyRoll, modifier: enemyModifier, total: enemyRoll + enemyModifier };
    const side = bestParty && bestParty.total >= enemyEntry.total ? 'party' : 'enemy';
    return { party: partyRolls, enemy: enemyEntry, side };
}
