// ui.js - Canvas、地图与界面总调度

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const CANVAS_LOGICAL_WIDTH = 700;
const CANVAS_LOGICAL_HEIGHT = 500;

const PAPER_BG = '#ffffff';
const GRID_COLOR = '#e0e0e0'; 
const INK_COLOR = '#222';    
const PENCIL_COLOR = '#666'; 
const HIGHLIGHT_COLOR = '#b71c1c'; 
window.TILE_SIZE = 20; 

function configureCanvasResolution() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetWidth = Math.round(CANVAS_LOGICAL_WIDTH * dpr);
    const targetHeight = Math.round(CANVAS_LOGICAL_HEIGHT * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }
    canvas.style.aspectRatio = `${CANVAS_LOGICAL_WIDTH} / ${CANVAS_LOGICAL_HEIGHT}`;
    if (typeof ctx.setTransform === 'function') ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

configureCanvasResolution();
if (typeof window.addEventListener === 'function') {
    let canvasResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(canvasResizeTimer);
        canvasResizeTimer = setTimeout(() => {
            configureCanvasResolution();
            updateUI();
        }, 100);
    });
}

function arrow(dir) {
    if (dir === 'up') return '↑';
    if (dir === 'down') return '↓';
    if (dir === 'left') return '←';
    if (dir === 'right') return '→';
    return dir;
}

function updateUI() {
  if (typeof autoSaveGame === 'function') autoSaveGame();

  if (gameState === 'CREATION') {
      ctx.fillStyle = '#f4f1ea'; 
      ctx.fillRect(0,0,CANVAS_LOGICAL_WIDTH,CANVAS_LOGICAL_HEIGHT);
      drawGrid(ctx, CANVAS_LOGICAL_WIDTH, CANVAS_LOGICAL_HEIGHT);
      ctx.fillStyle = INK_COLOR;
      ctx.font = '30px "Special Elite", monospace';
      ctx.textAlign = 'center';
      ctx.fillText("D6 Dungeon Adventure", CANVAS_LOGICAL_WIDTH/2, CANVAS_LOGICAL_HEIGHT/2 - 60);
      ctx.font = '16px "Patrick Hand", cursive';
      ctx.fillStyle = PENCIL_COLOR;
      ctx.fillText("- 冒险者集结 -", CANVAS_LOGICAL_WIDTH/2, CANVAS_LOGICAL_HEIGHT/2 - 20);
      renderCreation(); renderParty(); renderInventory();
      return;
  }
  if (gameState === 'TOWN') {
       ctx.fillStyle = '#fff3e0'; ctx.fillRect(0,0,CANVAS_LOGICAL_WIDTH,CANVAS_LOGICAL_HEIGHT);
       renderParty(); renderTownShop(); renderInventory();
       return;
   }

  drawMap();
  renderParty();
  renderControls();
  renderInventory();
  
  const log = document.getElementById('logContent');
  if(log) log.scrollTop = log.scrollHeight;
}
function drawMap(){
  const pRoom = dungeon[playerRoomId];
  if(!pRoom || pRoom.absX === undefined) return; 

  const offX = CANVAS_LOGICAL_WIDTH/2 - pRoom.absX;
  const offY = CANVAS_LOGICAL_HEIGHT/2 - pRoom.absY;

  ctx.fillStyle = PAPER_BG; ctx.fillRect(0,0,CANVAS_LOGICAL_WIDTH,CANVAS_LOGICAL_HEIGHT);
  drawGrid(ctx, CANVAS_LOGICAL_WIDTH, CANVAS_LOGICAL_HEIGHT);

  Object.keys(dungeon).forEach(k => {
    const r = dungeon[k];
    const cx = r.absX + offX; const cy = r.absY + offY;
    if(cx < -300 || cx > CANVAS_LOGICAL_WIDTH+300 || cy < -300 || cy > CANVAS_LOGICAL_HEIGHT+300) return;
    const w = (r.shape.w || 3) * window.TILE_SIZE;
    const h = (r.shape.h || 3) * window.TILE_SIZE;
    const shapeType = r.shape.shape || 'rect';

    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK_COLOR; ctx.lineWidth = 2.5;
    if (k === playerRoomId) { ctx.strokeStyle = HIGHLIGHT_COLOR; ctx.lineWidth = 3; }
    if (r.isConnector) ctx.lineWidth = 1; 

    ctx.beginPath(); drawRoomShapePath(ctx, cx, cy, w, h, shapeType); ctx.fill(); ctx.stroke();
    if (r.shape.type !== 'corridor') drawDoors(ctx, r, cx, cy, w, h);
    if (r.encounter && r.encounter.main !== 'none'){
      const resolved = Boolean(r._encounterResolved);
      ctx.fillStyle = resolved ? '#9e9e9e' : INK_COLOR;
      ctx.globalAlpha = resolved ? 0.28 : 1;
      ctx.font = '20px "Segoe UI Emoji", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let icon = '';
      if(r.encounter.main=='monster') icon='💀';
      if(r.encounter.main=='boss') icon='👹';
      if(r.encounter.main=='treasure') icon='💎';
      if(r.encounter.main=='event') icon='❓';
      ctx.fillText(icon, cx, cy);
      ctx.globalAlpha = 1;
    }
  });
}

function drawGrid(ctx, w, h) {
    ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < w; x += window.TILE_SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0.5; y < h; y += window.TILE_SIZE) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
}

function drawRoomShapePath(ctx, cx, cy, w, h, type) {
    if (type === 'rect' || type === 'corridor') { ctx.rect(cx - w/2, cy - h/2, w, h); } 
    else if (type === 'circle') { ctx.arc(cx, cy, Math.min(w,h)/2, 0, Math.PI * 2); } 
    else if (type === 'cross') {
        const thirdW = w/3; const thirdH = h/3;
        ctx.rect(cx - w/2, cy - thirdH/2, w, thirdH); ctx.rect(cx - thirdW/2, cy - h/2, thirdW, h); 
    }
    else if (type === 'diamond') {
        ctx.moveTo(cx, cy - h/2); ctx.lineTo(cx + w/2, cy); ctx.lineTo(cx, cy + h/2); ctx.lineTo(cx - w/2, cy); ctx.closePath();
    }
    else if (type === 'L_up_right') {
        const halfW = w/2; const halfH = h/2;
        ctx.rect(cx - halfW, cy - halfH, halfW, h); ctx.rect(cx - halfW, cy, w, halfH); 
    }
    else if (type === 'oct') {
        const d = w/4; const x = cx - w/2, y = cy - h/2;
        ctx.moveTo(x + d, y); ctx.lineTo(x + w - d, y); ctx.lineTo(x + w, y + d); ctx.lineTo(x + w, y + h - d);
        ctx.lineTo(x + w - d, y + h); ctx.lineTo(x + d, y + h); ctx.lineTo(x, y + h - d); ctx.lineTo(x, y + d); ctx.closePath();
    }
    else { ctx.rect(cx - w/2, cy - h/2, w, h); }
}

function drawDoors(ctx, room, cx, cy, w, h) {
    ['up','right','down','left'].forEach(dir => {
      const door = room.doors[dir];
      let dx=cx, dy=cy; const dw = 10, dh = 10;
      if(dir=='up') dy -= h/2; if(dir=='down') dy += h/2;
      if(dir=='left') dx -= w/2; if(dir=='right') dx += w/2;
      ctx.fillStyle = '#fff'; ctx.fillRect(dx-dw/2, dy-dh/2, dw, dh);
      if (door.leadsTo) {
          ctx.strokeStyle = INK_COLOR; ctx.lineWidth = 1.5; ctx.strokeRect(dx-dw/2, dy-dh/2, dw, dh);
      } else if (door.blocked) {
          ctx.fillStyle = HIGHLIGHT_COLOR; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline='middle'; ctx.fillText('X', dx, dy);
      } else if (door.closed) {
          ctx.strokeStyle = PENCIL_COLOR; ctx.setLineDash([3, 3]); ctx.strokeRect(dx-dw/2, dy-dh/2, dw, dh); ctx.setLineDash([]);
      }
    });
}
