// ui-party.js - 队伍状态面板

function renderParty(){
  const list = document.getElementById('characters'); 
  if(!list) return;
  list.innerHTML='';
  
  party.forEach(p=>{
    const li = document.createElement('li');
    li.style.borderBottom = "1px dashed #ccc"; li.style.paddingBottom = "6px"; li.style.marginBottom = "6px";
    
    const maxHp = p.maxHp || p.hp || 1; const maxMp = p.maxMp || p.mp || 1;
    if (!p.maxXp) p.maxXp = p.lvl * 5 + 5; if (p.xp === undefined) p.xp = 0;

    const hpBars = Math.ceil(p.hp / 2); 
    const hpStr = '▮'.repeat(Math.max(0, hpBars)).padEnd(Math.ceil(maxHp/2), '▯');
    const mpBars = p.mp;
    const mpStr = '●'.repeat(Math.max(0, mpBars)).padEnd(maxMp, '○');
    
    const xpPct = Math.floor((p.xp / p.maxXp) * 100);
    
    const renderEquip = (eq) => {
        if (!eq) return '无';
        const colorStyle = eq.color ? `color:${eq.color}; font-weight:bold` : '';
        return `<span style="${colorStyle}">${eq.name}</span>`;
    };
    const w = p.equipment?.weapon ? `🗡️${renderEquip(p.equipment.weapon)}` : '👊空手';
    const a = p.equipment?.armor ? `🛡️${renderEquip(p.equipment.armor)}` : '👕布衣';

    let statusHtml = '';
    if (p.status && p.status.length > 0 && window.STATUS_ICONS) {
        statusHtml = p.status.map(s => window.STATUS_ICONS[s.type] || '?').join(' ');
    }

    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <div style="font-weight:bold; font-size:1.1em">
             ${p.name} <span style="font-size:0.7em; background:#222; color:#fff; padding:1px 4px; border-radius:3px">Lv.${p.lvl}</span>
             <span style="font-size:0.8em; font-weight:normal; color:#555">(${p.raceName} ${p.className})</span>
             <span style="margin-left:5px">${statusHtml}</span>
          </div>
      </div>
      <div style="font-size:0.85em; color:#555; margin:2px 0;">${w} | ${a}</div>
      <div style="font-family:monospace; margin-top:4px; color:#b71c1c; font-size:1.1em; line-height:1.2">
        HP: ${hpStr} <span style="color:#000; font-size:0.7em">(${p.hp}/${maxHp})</span>
      </div>
      <div style="font-family:monospace; color:#1565c0; font-size:1.1em; line-height:1.2">
        MP: ${mpStr} <span style="color:#000; font-size:0.7em">(${p.mp}/${maxMp})</span>
      </div>
      <div style="margin-top:4px; display:flex; align-items:center; gap:5px">
        <div style="font-size:0.8em; color:#e65100; font-weight:bold">XP</div>
        <div style="flex:1; height:4px; background:#ddd; border-radius:2px; overflow:hidden">
            <div style="width:${xpPct}%; height:100%; background:#ff9800;"></div>
        </div>
      </div>
    `;
    if (p.hp <= 0) { li.style.opacity = '0.5'; li.style.textDecoration = 'line-through'; }
    list.appendChild(li);
  });
}
