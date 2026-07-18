// ui-overlays.js - 骰子、存档与英灵殿弹层

function rollDiceAnim(diceRequests, callback) {
    const overlay = document.getElementById('diceOverlay'); const container = document.getElementById('diceContainer');
    if(!overlay || !container) return;
    overlay.classList.add('active'); container.innerHTML = '';
    const diceElements = [];
    diceRequests.forEach(req => {
        const wrapper = document.createElement('div'); wrapper.style.textAlign = 'center';
        const dieEl = document.createElement('div'); dieEl.className = `die ${req.sides === 20 ? 'd20' : ''} rolling`;
        dieEl.innerHTML = req.sides === 20 ? '<span>?</span>' : '<div class="pip"></div>'.repeat(6);
        dieEl.dataset.id = req.id;
        dieEl.dataset.sides = req.sides || 6;
        const label = document.createElement('div'); label.textContent = req.label;
        label.style.marginTop = '8px'; label.style.fontFamily = '"Patrick Hand", cursive';
        wrapper.appendChild(dieEl); wrapper.appendChild(label); container.appendChild(wrapper);
        diceElements.push(dieEl);
    });
    setTimeout(() => {
        const results = {};
        diceElements.forEach(el => {
            const sides = Number(el.dataset.sides || 6);
            el.classList.remove('rolling'); const val = Math.floor(Math.random() * sides) + 1;
            const reqId = el.dataset.id; results[reqId] = val; 
            if (val === sides) el.classList.add('crit'); el.dataset.val = val;
            if (sides === 20) el.innerHTML = `<span>${val}</span>`;
            else {
                let pipsHtml = ''; for(let i=0; i<val; i++) pipsHtml += '<div class="pip"></div>';
                el.innerHTML = pipsHtml;
            }
        });
        setTimeout(() => { overlay.classList.remove('active'); callback(results); }, 1200); 
    }, 800); 
}

// --- 适配新的文件读写存档系统 ---
function showSaveLoadMenu() {
    const overlay = document.getElementById('diceOverlay'); 
    const container = document.getElementById('diceContainer');
    if(!overlay || !container) return;
    
    overlay.classList.add('active'); 
    container.innerHTML = ''; 
    
    const title = document.createElement('h2'); 
    title.innerHTML = "💾 灵魂记录 (文件存取)"; 
    title.style.width = "100%"; title.style.textAlign = "center"; 
    title.style.fontFamily = '"Special Elite", monospace';
    container.appendChild(title);

    const autoSave = typeof getAutoSaveSummary === 'function' ? getAutoSaveSummary() : null;
    const autoBox = document.createElement('div');
    autoBox.style.cssText = "width:100%; margin-bottom:20px; padding:15px; border:2px solid #f9a825; background:#fff8e1; text-align:center;";
    if (autoSave) {
        const timeText = autoSave.timestamp ? new Date(autoSave.timestamp).toLocaleString('zh-CN') : '未知时间';
        const autoText = document.createElement('div');
        autoText.innerHTML = `<b>✨ 自动存档可用</b><br><small>世界 Lv.${autoSave.worldLevel} · ${timeText}</small>`;
        autoText.style.marginBottom = '8px';
        autoBox.appendChild(autoText);

        const autoLoadBtn = document.createElement('button');
        autoLoadBtn.innerHTML = '▶️ <b>读取自动存档</b>';
        autoLoadBtn.style.cssText = "width:80%; padding:10px; background:#f9a825; color:#fff; border:2px solid #f57f17;";
        autoLoadBtn.onclick = () => {
            if (!confirm('确定读取自动存档吗？当前未保存的进度将丢失。')) return;
            if (!loadAutoSaveGame()) alert('自动存档已损坏或不存在。');
            overlay.classList.remove('active');
        };
        autoBox.appendChild(autoLoadBtn);
    } else {
        autoBox.textContent = '尚无自动存档。开始冒险后会在移动、战斗和城镇操作时自动记录。';
        autoBox.style.color = '#666';
    }
    container.appendChild(autoBox);

    // --- 导出区域 ---
    const exportBox = document.createElement('div'); 
    exportBox.style.cssText = "width: 100%; margin-bottom: 20px; padding: 15px; border: 2px dashed #555; background: #fff; text-align:center;";
    
    const dlBtn = document.createElement('button'); 
    dlBtn.innerHTML = "📤 <b>保存到文件 (.json)</b><br><small>推荐：下载到本地，永久保存</small>"; 
    dlBtn.style.cssText = "width: 80%; padding: 10px; font-size: 16px; cursor: pointer; background:#e3f2fd; color:#1565c0; border:2px solid #1565c0;";
    dlBtn.onclick = () => {
        // 调用 utils.js 的新函数 (需确保 utils.js 已更新)
        if (window.downloadSaveFile) window.downloadSaveFile(); 
        else alert("缺少下载功能，请更新 utils.js");
    };
    exportBox.appendChild(dlBtn);
    container.appendChild(exportBox);

    // --- 导入区域 ---
    const importBox = document.createElement('div'); 
    importBox.style.cssText = "width: 100%; margin-bottom: 20px; padding: 15px; border: 2px solid #2e7d32; background: #e8f5e9; text-align:center;";
    
    const loadBtn = document.createElement('button'); 
    loadBtn.innerHTML = "📥 <b>读取存档文件</b><br><small>选择之前的 .json 文件</small>"; 
    loadBtn.style.cssText = "width: 80%; padding: 10px; font-size: 16px; cursor: pointer; background:#c8e6c9; color:#2e7d32; border:2px solid #2e7d32;";
    loadBtn.onclick = () => {
        if (window.confirm("确定要读取新存档吗？当前未保存的进度将丢失。")) {
            if (window.triggerImportFile) window.triggerImportFile();
            else alert("缺少读取功能，请更新 utils.js");
            overlay.classList.remove('active');
        }
    };
    importBox.appendChild(loadBtn);
    container.appendChild(importBox);

    // 关闭按钮
    const closeBtn = document.createElement('button'); 
    closeBtn.textContent = "关闭"; 
    closeBtn.style.cssText = "padding: 8px 20px;";
    closeBtn.onclick = () => overlay.classList.remove('active'); 
    container.appendChild(closeBtn);
}

// --- 英灵殿界面 ---
function showLegacyMenu() {
    const overlay = document.getElementById('diceOverlay');
    const container = document.getElementById('diceContainer');
    if(!overlay || !container) return;
    
    overlay.classList.add('active'); 
    container.innerHTML = ''; 

    // 标题
    const title = document.createElement('h2'); 
    const shards = window.LegacySystem ? LegacySystem.data.shards : 0;
    title.innerHTML = `🏛️ 英灵殿 (碎片: ${shards})`;
    title.style.width = "100%"; title.style.textAlign = "center"; 
    title.style.fontFamily = '"Special Elite", monospace';
    container.appendChild(title);

    // 列表容器
    const list = document.createElement('div');
    list.style.cssText = "width:100%; max-height:400px; overflow-y:auto; background:#fff; padding:10px; border:2px solid #222;";
    
    // 使用 window.LEGACY_UPGRADES 进行安全检查
    if (window.LEGACY_UPGRADES && window.LegacySystem) {
        Object.values(window.LEGACY_UPGRADES).forEach(upg => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #ccc; padding:10px 0;";
            
            const currentLv = LegacySystem.getLevel(upg.id);
            const isMax = currentLv >= upg.maxLevel;
            
            const info = document.createElement('div');
            info.innerHTML = `<b>${upg.name}</b> <small>(Lv.${currentLv}/${upg.maxLevel})</small><br><span style="color:#666; font-size:0.9em">${upg.desc}</span>`;
            
            const btn = document.createElement('button');
            if (isMax) {
                btn.textContent = "已满级";
                btn.disabled = true;
            } else {
                btn.textContent = `${upg.cost} 碎片`;
                btn.onclick = () => {
                    if (LegacySystem.buyUpgrade(upg.id)) {
                        showLegacyMenu(); // 刷新
                    } else {
                        alert("灵魂碎片不足！");
                    }
                };
                if (LegacySystem.data.shards < upg.cost) {
                    btn.style.opacity = 0.5;
                }
            }
            
            row.appendChild(info);
            row.appendChild(btn);
            list.appendChild(row);
        });
    } else {
        list.innerHTML = `<div style="text-align:center; padding:20px;">
          ⚠️ 英灵殿系统未正确加载。<br>请检查 legacy.js 是否已引入，以及是否使用了正确的修复版本。
        </div>`;
    }
    container.appendChild(list);

    // 关闭按钮
    const closeBtn = document.createElement('button'); 
    closeBtn.textContent = "返回现世"; 
    closeBtn.style.cssText = "margin-top:20px; padding:10px 20px;";
    closeBtn.onclick = () => {
        overlay.classList.remove('active');
        updateUI(); // 刷新主界面以更新按钮上的碎片数
    };
    container.appendChild(closeBtn);
}
