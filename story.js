// story.js - 轻量主线剧情与探索阶段

const STORY_EVENT_KEYS = {
    journal: '剧情·守门人手记',
    whisper: '剧情·井中低语'
};

function createStoryState(worldLevel = 1) {
    return {
        worldLevel,
        chapter: 0,
        roomsEntered: 0,
        clues: [],
        choices: {},
        eliteClueFound: false,
        bossRevealed: false,
        ending: null
    };
}

window.storyState = createStoryState(window.worldLevel || 1);

function resetStoryState(worldLevel = 1) {
    window.storyState = createStoryState(worldLevel);
    return window.storyState;
}

function restoreStoryState(savedState, worldLevel = 1) {
    const defaults = createStoryState(worldLevel);
    window.storyState = Object.assign(defaults, savedState || {});
    if (!Array.isArray(window.storyState.clues)) window.storyState.clues = [];
    if (!window.storyState.choices || typeof window.storyState.choices !== 'object') window.storyState.choices = {};
    return window.storyState;
}

function addStoryClue(clue) {
    if (!window.storyState.clues.includes(clue)) window.storyState.clues.push(clue);
}

function getStoryObjective() {
    const state = window.storyState;
    if (state.ending) return `结局：${state.ending}`;
    if (state.chapter === 0) return '寻找失踪守门人留下的记录';
    if (state.chapter === 1) return '追查手记中提到的“井中低语”';
    if (state.chapter === 2) return '深入地牢，寻找被抹去的王座';
    if (state.chapter === 3) return '找到空王的化身，并决定地牢的命运';
    return '继续探索地牢残存的秘密';
}

function beginDungeonStory(worldLevel = 1) {
    resetStoryState(worldLevel);
    const intro = worldLevel > 1
        ? `📜 <b>第 ${worldLevel} 次回响：</b>地牢再次苏醒。墙上的名字已经改变，但那顶空王冠仍在呼唤你们。`
        : '📜 <b>序章·无主王座：</b>三十年前，边境守门人带着王室密令进入地牢，从此再未归来。如今，井下再次传来钟声。';
    addLog({ type: 'story', message: intro });
    addLog({ type: 'story', message: `🎯 当前目标：${getStoryObjective()}` });
}

function storyOnRoomEntered(room) {
    if (!room || room.isConnector || room._storySeen) return;
    room._storySeen = true;
    const state = window.storyState;
    state.roomsEntered++;

    if (room.encounter?.main === 'boss') {
        if (!room.encounter._storyTagged) {
            room.encounter.template.name = `空王的化身·${room.encounter.template.name}`;
            room.encounter._storyTagged = true;
        }
        state.chapter = Math.max(state.chapter, 3);
        state.bossRevealed = true;
        addLog({ type: 'story', message: '👑 王座后的阴影缓缓起身。守门人并非失踪——他用自己的名字封住了某个更古老的存在。' });
        return;
    }

    if (state.chapter === 0 && state.roomsEntered >= 2) {
        room.encounter = { main: 'event', subtype: STORY_EVENT_KEYS.journal };
        room._encounterResolved = false;
        return;
    }
    if (state.chapter === 1 && state.roomsEntered >= 5) {
        room.encounter = { main: 'event', subtype: STORY_EVENT_KEYS.whisper };
        room._encounterResolved = false;
        return;
    }
    if (state.chapter === 2 && state.roomsEntered >= 8) {
        state.chapter = 3;
        addStoryClue('破碎的空王冠');
        addLog({ type: 'story', message: '👑 你们在石阶下找到一块冰冷的王冠残片。所有怪物都在避开它，通往王座的道路已经不远。' });
    } else {
        const ambience = [
            '墙上的浮雕描绘着一场没有胜利者的加冕礼。',
            '远处传来三声钟响，但地牢地图上没有钟楼。',
            '一行褪色小字写着：“王座必须有人坐，哪怕坐着的是影子。”'
        ];
        if ([1, 3, 6].includes(state.roomsEntered)) {
            addLog({ type: 'story', message: `📖 ${ambience[[1, 3, 6].indexOf(state.roomsEntered)]}` });
        }
    }
}

function handleStoryChoice(option) {
    const state = window.storyState;
    state.choices[option.choiceKey] = option.choiceValue;
    addStoryClue(option.clue);
    state.chapter = Math.max(state.chapter, option.storyStage || state.chapter);
    addLog({ type: 'story', message: option.result });
    addLog({ type: 'story', message: `🎯 当前目标：${getStoryObjective()}` });
}

function storyOnCombatWon(type, enemy) {
    const state = window.storyState;
    if (type === 'elite' && !state.eliteClueFound) {
        state.eliteClueFound = true;
        addStoryClue('刻有守门人徽记的黑铁钥匙');
        addLog({ type: 'story', message: `🗝️ ${enemy.name} 倒下后，一枚刻有守门人徽记的黑铁钥匙从它身上滚落。` });
    }
    if (type !== 'boss') return;

    const keptSigil = state.choices.sigil === 'keep';
    const trustedVoice = state.choices.whisper === 'trust';
    if (keptSigil && trustedVoice) {
        state.ending = '新守门人';
        addLog({ type: 'story', message: '📜 <b>结局·新守门人：</b>徽记与低语合为完整的誓言。你们没有摧毁王座，而是接过了看守深渊的职责。地牢沉寂下来，却仍记得你们的名字。' });
    } else if (!keptSigil && !trustedVoice) {
        state.ending = '永寂封印';
        addLog({ type: 'story', message: '📜 <b>结局·永寂封印：</b>你们拒绝了王座的一切许诺，将王冠和守门人的秘密一同埋进坍塌的深井。钟声终于停止。' });
    } else {
        state.ending = '未完的回响';
        addLog({ type: 'story', message: '📜 <b>结局·未完的回响：</b>化身已被击败，但你们带走的线索彼此矛盾。返程时，地牢深处又响起了一声钟鸣。' });
    }
    state.chapter = 4;
}

function renderStoryObjective(container) {
    if (!container || !window.storyState || gameState === 'CREATION' || gameState === 'TOWN') return;
    const panel = document.createElement('div');
    panel.style.cssText = 'margin-bottom:10px; padding:8px 10px; border-left:4px solid #6a1b9a; background:#f3e5f5; font-size:0.86em;';
    const clueCount = window.storyState.clues.length;
    panel.innerHTML = `<b>📜 主线：无主王座</b><br><span>${getStoryObjective()}</span><br><small style="color:#666">已发现线索 ${clueCount}</small>`;
    container.appendChild(panel);
}

EVENT_DEFINITIONS[STORY_EVENT_KEYS.journal] = {
    title: '📕 守门人的最后一页',
    desc: '一具披着旧制服的骸骨倚在墙边。手记最后写着：“不要让徽记和井里的声音同时落入王座。”',
    options: [
        { label: '拿走银色徽记', desc: '也许它能打开王座前的封印。', type: 'story_choice', choiceKey: 'sigil', choiceValue: 'keep', clue: '守门人的银色徽记', storyStage: 1, result: '你收起徽记。冰冷金属贴近掌心时，地牢深处响起了一声钟鸣。' },
        { label: '砸碎徽记', desc: '不让任何人再次完成守门人的仪式。', type: 'story_choice', choiceKey: 'sigil', choiceValue: 'destroy', clue: '被砸碎的银色徽记', storyStage: 1, result: '徽记裂成数片，墙缝中随即渗出黑雾，像是什么东西终于松了一口气。' }
    ]
};

EVENT_DEFINITIONS[STORY_EVENT_KEYS.whisper] = {
    title: '🕳️ 没有倒影的深井',
    desc: '井里传来守门人的声音：“王座上的怪物不是国王。相信我，我能告诉你如何结束这一切。”',
    options: [
        { label: '回应井中的声音', desc: '听完守门人未能写下的真相。', type: 'story_choice', choiceKey: 'whisper', choiceValue: 'trust', clue: '井中守门人的誓言', storyStage: 2, result: '声音告诉你：空王冠会寻找新的看守者，而徽记是自愿接过誓言的证明。' },
        { label: '用石块封住井口', desc: '地牢里的声音不值得相信。', type: 'story_choice', choiceKey: 'whisper', choiceValue: 'doubt', clue: '被封住的无影井', storyStage: 2, result: '最后一块石头落下前，井中声音低声说道：“那么，王座会替你们选择。”' }
    ]
};
