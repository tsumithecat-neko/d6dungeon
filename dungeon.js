// dungeon.js - 地牢生成与房间管理

// --- 辅助：物理碰撞检测 ---
function getRoomBounds(cx, cy, wTiles, hTiles) {
  const tileSize = window.TILE_SIZE || 20; 
  const wPixels = wTiles * tileSize;
  const hPixels = hTiles * tileSize;
  const buffer = 0.5;
  return {
    left: cx - wPixels / 2 + buffer,
    right: cx + wPixels / 2 - buffer,
    top: cy - hPixels / 2 + buffer,
    bottom: cy + hPixels / 2 - buffer
  };
}

function checkCollision(targetBounds) {
  for (const id in dungeon) {
    const room = dungeon[id];
    if (room.absX === undefined || !room.shape) continue;
    const existingBounds = getRoomBounds(room.absX, room.absY, room.shape.w, room.shape.h);
    if (targetBounds.left < existingBounds.right &&
        targetBounds.right > existingBounds.left &&
        targetBounds.top < existingBounds.bottom &&
        targetBounds.bottom > existingBounds.top) {
      return true; 
    }
  }
  return false; 
}

// --- 房间创建 ---
function createRoom(type, isConnector = false){
  let roll, shapeData;
  const roomCount = Object.keys(dungeon).length;
  const forceBoss = (!type && !isConnector && roomCount > 12);

  if (type === 'start') {
    roll = 6; 
    shapeData = JSON.parse(JSON.stringify(ROOM_TABLE[6])); 
    shapeData.name = "入口大厅";
  } else if (type === 'connector_h1') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.horiz_1));
  } else if (type === 'connector_h2') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.horiz_2));
  } else if (type === 'connector_v1') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.vert_1));
  } else if (type === 'connector_v2') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.vert_2));
  } else {
    if (forceBoss) { roll = 19; } else { roll = d10() + d10(); }
    shapeData = JSON.parse(JSON.stringify(ROOM_TABLE[roll]));
  }
  
  const roomType = shapeData.type || 'room';
  const encounter = (type === 'start' || isConnector) ? { main: 'none' } : generateEncounter(roomType);
  
  const room = {
    id: null, absX: 0, absY: 0, genRoll: roll, shape: shapeData,
    doors: {}, encounter: encounter, visited: isConnector, isConnector: isConnector,
    _encounterResolved: isConnector 
  };
  
  ['up','right','down','left'].forEach(dir => {
    room.doors[dir] = { closed: true, leadsTo: null, blocked: false }; 
  });
  
  return room;
}

// --- 遭遇生成逻辑 ---
function generateEncounter(roomType){
  if (roomType === 'boss_room') {
      const pool = MONSTER_POOLS['boss'];
      const pick = pool[Math.floor(Math.random()*pool.length)];
      return { main: 'boss', template: JSON.parse(JSON.stringify(pick)) };
  }

  const r = d6();
  if (r <= 2) { 
    const sub = (d6() <= 4) ? 'minion' : 'beast';
    const pool = MONSTER_POOLS[sub];
    const pick = pool[Math.floor(Math.random()*pool.length)];
    return { main: 'monster', subtype: sub, template: JSON.parse(JSON.stringify(pick)) };
  }
  if (r === 3) return { main: 'event', subtype: randomFrom(['陷阱','祭坛','谜题']) };
  if (r === 4) return { main: 'treasure', subtype: randomFrom(['金币','宝石','魔法卷轴']) };
  if (r === 5) return { main: 'special', subtype: '空房间' };
  
  const pool = MONSTER_POOLS['beast'];
  const pick = JSON.parse(JSON.stringify(pool[Math.floor(Math.random()*pool.length)]));
  pick.name = "游荡的 " + pick.name; 
  return { main: 'monster', subtype: 'beast', template: pick };
}

// --- 核心交互逻辑 ---
function openDoor(dir){
  if (gameState !== 'EXPLORING') return;
  const room = dungeon[playerRoomId];
  if (room.doors[dir].blocked) { addLog("这个方向被废墟堵死了，无法通行。"); return; }

  let nextRoomId = room.doors[dir].leadsTo;
  if (room.doors[dir].closed) {
    const newRoom = openDoorFrom(playerRoomId, dir);
    if (!newRoom) { updateUI(); return; }
    nextRoomId = newRoom.id;
    const targetName = newRoom.isConnector ? "未知的通道" : newRoom.shape.name;
    addLog(`你推开了 ${dir} 方向的门，进入了 ${targetName}...`);
  } else {
    addLog(`你移动到了 ${dir} 方向的房间。`);
  }

  playerRoomId = nextRoomId;
  const currentRoom = dungeon[playerRoomId];
  currentRoom.visited = true;

  if (!currentRoom._encounterResolved) {
      if (window.resolveEncounter) window.resolveEncounter(currentRoom);
  }
  else if (!currentRoom.isConnector) addLog("这是一个安全的区域。");
  updateUI();
}

function openDoorFrom(roomId, dir){
  const prevRoom = dungeon[roomId];
  const tileSize = window.TILE_SIZE || 20;
  
  const dirConfig = {
      up:    { dx: 0,  dy: -1, opp: 'down', connectorType: 'vert' },
      down:  { dx: 0,  dy: 1,  opp: 'up',   connectorType: 'vert' },
      left:  { dx: -1, dy: 0,  opp: 'right', connectorType: 'horiz' },
      right: { dx: 1,  dy: 0,  opp: 'left',  connectorType: 'horiz' }
  }[dir];

  let newRoom = createRoom(); 
  let finalRoom = null;
  let placementSuccess = false;

  function tryPlace(sourceRoom, targetRoom, gapUnits) {
      const sW = sourceRoom.shape.w * tileSize;
      const sH = sourceRoom.shape.h * tileSize;
      const tW = targetRoom.shape.w * tileSize;
      const tH = targetRoom.shape.h * tileSize;
      const gapPixels = gapUnits * tileSize;

      let tx, ty;
      if (dir === 'up') { tx = sourceRoom.absX; ty = sourceRoom.absY - sH/2 - gapPixels - tH/2; } 
      else if (dir === 'down') { tx = sourceRoom.absX; ty = sourceRoom.absY + sH/2 + gapPixels + tH/2; } 
      else if (dir === 'left') { tx = sourceRoom.absX - sW/2 - gapPixels - tW/2; ty = sourceRoom.absY; } 
      else if (dir === 'right') { tx = sourceRoom.absX + sW/2 + gapPixels + tW/2; ty = sourceRoom.absY; }

      const bounds = getRoomBounds(tx, ty, targetRoom.shape.w, targetRoom.shape.h);
      if (!checkCollision(bounds)) {
          targetRoom.absX = tx; targetRoom.absY = ty; return true;
      }
      return false;
  }

  if (tryPlace(prevRoom, newRoom, 0)) {
      addRoomToDungeon(newRoom, prevRoom, dir);
      finalRoom = newRoom; placementSuccess = true;
  } else {
      const c1Type = dirConfig.connectorType + '_1';
      const connector1 = createRoom(c1Type, true);
      if (tryPlace(prevRoom, connector1, 0)) {
          if (tryPlace(connector1, newRoom, 0)) {
              addRoomToDungeon(connector1, prevRoom, dir);
              addRoomToDungeon(newRoom, connector1, dir); 
              finalRoom = newRoom; placementSuccess = true;
              addLog("通道狭窄，你挤过了一条短走廊...");
          }
      }
  }

  if (!placementSuccess) {
      const c2Type = dirConfig.connectorType + '_2';
      const connector2 = createRoom(c2Type, true);
      if (tryPlace(prevRoom, connector2, 0)) {
          if (tryPlace(connector2, newRoom, 0)) {
              addRoomToDungeon(connector2, prevRoom, dir);
              addRoomToDungeon(newRoom, connector2, dir);
              finalRoom = newRoom; placementSuccess = true;
              addLog("你沿着一条较长的走廊前进...");
          }
      }
  }

  if (placementSuccess) { return finalRoom; } 
  else {
      addLog(`通往 ${dir} 的道路被坍塌的石块完全堵死了。`);
      prevRoom.doors[dir].closed = true; prevRoom.doors[dir].blocked = true; 
      return null;
  }
}

function addRoomToDungeon(newRoom, fromRoom, dirFrom) {
    const newId = 'rm_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    newRoom.id = newId; dungeon[newId] = newRoom;
    linkRooms(fromRoom.id, newId, dirFrom);
}

function linkRooms(id1, id2, dirFrom1){
  dungeon[id1].doors[dirFrom1].leadsTo = id2;
  dungeon[id1].doors[dirFrom1].closed = false;
  const back = {up:'down',down:'up',left:'right',right:'left'}[dirFrom1];
  if (dungeon[id2].doors[back]) {
      dungeon[id2].doors[back].leadsTo = id1;
      dungeon[id2].doors[back].closed = false;
  }
}
