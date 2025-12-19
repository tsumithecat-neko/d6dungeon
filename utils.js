// utils.js - 通用工具函数

function d6(){ return Math.floor(Math.random()*6)+1 }
// 新增 d10 函数
function d10(){ return Math.floor(Math.random()*10)+1 }

function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)] }

function arrow(d){ return {up:'↑',down:'↓',left:'←',right:'→'}[d] }

function addLog(t){ 
  const log = document.getElementById('logContent'); 
  const p = document.createElement('div'); 
  
  if (t.includes('击中') || t.includes('伤害')) p.style.color = '#ffcc80';
  if (t.includes('胜利') || t.includes('获得')) p.style.color = '#a5d6a7';
  if (t.includes('遭遇')) p.style.color = '#90caf9';
  if (t.includes('全灭') || t.includes('失败')) p.style.color = '#ef9a9a';
  
  p.innerHTML = t; 
  log.appendChild(p); 
}

function randomAliveCharacter(){
  const alive = party.filter(p=>p.hp>0);
  if (!alive.length) return null;
  return alive[Math.floor(Math.random()*alive.length)];
}

function getDieHTML(value, isCrit = false) {
    const critClass = isCrit ? 'crit' : '';
    // 根据点数生成对应数量的 pip div
    let pips = '';
    for(let i=0; i<value; i++) pips += '<div class="pip"></div>';
    
    return `<div class="die ${critClass}" data-val="${value}">${pips}</div>`;
}

// 在日志中显示的小骰子
function logDieIcon(val) {
    const isCrit = (val === 6);
    return `<span class="log-die ${isCrit?'crit':''}">${val}</span>`;
}