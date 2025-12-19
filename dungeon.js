// dungeon.js - 地牢生成与房间管理

// --- 辅助：物理碰撞检测 ---

// 计算房间的物理包围盒 (AABB)
// cx, cy: 中心点绝对坐标; wTiles, hTiles: 宽高的格数
function getRoomBounds(cx, cy, wTiles, hTiles) {
  // 引用 window.TILE_SIZE (需要在 ui.js 中定义并挂载到 window，或此处硬编码 18)
  const tileSize = window.TILE_SIZE || 18; 
  const wPixels = wTiles * tileSize;
  const hPixels = hTiles * tileSize;
  
  // 稍微缩小边界 (0.5px) 以允许紧密贴合但不重叠
  const buffer = 0.5;
  return {
    left: cx - wPixels / 2 + buffer,
    right: cx + wPixels / 2 - buffer,
    top: cy - hPixels / 2 + buffer,
    bottom: cy + hPixels / 2 - buffer
  };
}

// 检查目标区域是否与现有任何房间重叠
function checkCollision(targetBounds) {
  for (const id in dungeon) {
    const room = dungeon[id];
    // 跳过没有坐标的房间（如果有的话）
    if (room.absX === undefined || !room.shape) continue;
    
    const existingBounds = getRoomBounds(room.absX, room.absY, room.shape.w, room.shape.h);

    // AABB 碰撞判断：如果所有轴都重叠，则发生碰撞
    if (targetBounds.left < existingBounds.right &&
        targetBounds.right > existingBounds.left &&
        targetBounds.top < existingBounds.bottom &&
        targetBounds.bottom > existingBounds.top) {
      return true; // 撞了
    }
  }
  return false; // 没撞，位置安全
}

// --- 房间创建 ---

function createRoom(type, isConnector = false){
  let roll, shapeData;
  
  // 根据类型从 ROOM_TABLE 或 CONNECTOR_CORRIDORS 获取形状数据
  if (type === 'start') {
    roll = 6; 
    shapeData = JSON.parse(JSON.stringify(ROOM_TABLE[6])); // 默认入口方形
    shapeData.name = "入口大厅";
  } else if (type === 'connector_h1') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.horiz_1));
  } else if (type === 'connector_h2') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.horiz_2));
  } else if (type === 'connector_v1') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.vert_1));
  } else if (type === 'connector_v2') { shapeData = JSON.parse(JSON.stringify(CONNECTOR_CORRIDORS.vert_2));
  } else {
    // 4AD 核心规则：2d10 生成房间
    roll = d10() + d10();
    shapeData = JSON.parse(JSON.stringify(ROOM_TABLE[roll]));
  }
  
  // 走廊和起始房间不生成遭遇，其他生成
  const encounter = (type === 'start' || isConnector) ? { main: 'none' } : generateEncounter();
  
  const room = {
    id: null,
    absX: 0, absY: 0, // 绝对像素坐标，稍后计算
    genRoll: roll,
    shape: shapeData,
    doors: {}, 
    encounter: encounter,
    visited: isConnector, // 走廊默认已探索，方便绘制
    isConnector: isConnector,
    _encounterResolved: isConnector 
  };
  
  ['up','right','down','left'].forEach(dir => {
    room.doors[dir] = { closed: true, leadsTo: null, blocked: false }; 
  });
  
  return room;
}

function generateEncounter(){
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
  
  const pool = MONSTER_POOLS['boss'];
  const pick = pool[Math.floor(Math.random()*pool.length)];
  return { main: 'boss', template: JSON.parse(JSON.stringify(pick)) };
}

// --- 核心交互逻辑 ---

function openDoor(dir){
  if (gameState !== 'EXPLORING') return;

  const room = dungeon[playerRoomId];
  
  // 检查是否是死路
  if (room.doors[dir].blocked) {
      addLog("这个方向被废墟堵死了，无法通行。");
      return;
  }

  let nextRoomId = room.doors[dir].leadsTo;

  if (room.doors[dir].closed) {
    // 尝试生成并放置新房间
    const newRoom = openDoorFrom(playerRoomId, dir);
    
    // 如果返回 null，说明放置失败（死胡同）
    if (!newRoom) {
        updateUI(); 
        return; 
    }
    
    nextRoomId = newRoom.id;
    const targetName = newRoom.isConnector ? "未知的通道" : newRoom.shape.name;
    addLog(`你推开了 ${dir} 方向的门，进入了 ${targetName}...`);

  } else {
    addLog(`你移动到了 ${dir} 方向的房间。`);
  }

  playerRoomId = nextRoomId;
  const currentRoom = dungeon[playerRoomId];
  currentRoom.visited = true;

  if (!currentRoom._encounterResolved) resolveEncounter(currentRoom);
  else if (!currentRoom.isConnector) addLog("这是一个安全的区域。");

  updateUI();
}

// 核心算法：尝试放置房间，处理碰撞和走廊延伸
function openDoorFrom(roomId, dir){
  const prevRoom = dungeon[roomId];
  const tileSize = window.TILE_SIZE || 18;
  
  // 定义方向向量和对应的走廊类型
  const dirConfig = {
      up:    { dx: 0,  dy: -1, opp: 'down', connectorType: 'vert' },
      down:  { dx: 0,  dy: 1,  opp: 'up',   connectorType: 'vert' },
      left:  { dx: -1, dy: 0,  opp: 'right', connectorType: 'horiz' },
      right: { dx: 1,  dy: 0,  opp: 'left',  connectorType: 'horiz' }
  }[dir];

  // 1. 准备要放置的目标房间
  let newRoom = createRoom(); // 2d10 随机房间
  let finalRoom = null;
  let placementSuccess = false;

  // 内部函数：尝试在特定位置放置房间
  // sourceRoom: 参考房间
  // targetRoom: 要放置的房间
  // gapUnits: 中间空几格 (用于计算中心距)
  function tryPlace(sourceRoom, targetRoom, gapUnits) {
      const sW = sourceRoom.shape.w * tileSize;
      const sH = sourceRoom.shape.h * tileSize;
      const tW = targetRoom.shape.w * tileSize;
      const tH = targetRoom.shape.h * tileSize;
      const gapPixels = gapUnits * tileSize;

      let tx, ty;

      // 计算目标中心点：源中心 + 偏移
      if (dir === 'up') {
          tx = sourceRoom.absX;
          ty = sourceRoom.absY - sH/2 - gapPixels - tH/2;
      } else if (dir === 'down') {
          tx = sourceRoom.absX;
          ty = sourceRoom.absY + sH/2 + gapPixels + tH/2;
      } else if (dir === 'left') {
          tx = sourceRoom.absX - sW/2 - gapPixels - tW/2;
          ty = sourceRoom.absY;
      } else if (dir === 'right') {
          tx = sourceRoom.absX + sW/2 + gapPixels + tW/2;
          ty = sourceRoom.absY;
      }

      // 碰撞检测
      const bounds = getRoomBounds(tx, ty, targetRoom.shape.w, targetRoom.shape.h);
      if (!checkCollision(bounds)) {
          targetRoom.absX = tx;
          targetRoom.absY = ty;
          return true;
      }
      return false;
  }

  // --- 策略 0: 直接连接 ---
  if (tryPlace(prevRoom, newRoom, 0)) {
      addRoomToDungeon(newRoom, prevRoom, dir);
      finalRoom = newRoom;
      placementSuccess = true;
  } 
  
  // --- 策略 1: 插入 1 格走廊 ---
  else {
      const c1Type = dirConfig.connectorType + '_1';
      const connector1 = createRoom(c1Type, true);
      
      // 先看走廊放不放得下
      if (tryPlace(prevRoom, connector1, 0)) {
          // 再看走廊后面能不能放目标房间 (注意：这里把走廊当做源，间隔0)
          if (tryPlace(connector1, newRoom, 0)) {
              addRoomToDungeon(connector1, prevRoom, dir);
              addRoomToDungeon(newRoom, connector1, dir); // 这里的 dir 逻辑上是延续的
              finalRoom = newRoom; // 玩家最终落脚点
              placementSuccess = true;
              addLog("通道狭窄，你挤过了一条短走廊...");
          }
      }
  }

  // --- 策略 2: 插入 2 格走廊 ---
  if (!placementSuccess) {
      const c2Type = dirConfig.connectorType + '_2';
      const connector2 = createRoom(c2Type, true);

      if (tryPlace(prevRoom, connector2, 0)) {
          if (tryPlace(connector2, newRoom, 0)) {
              addRoomToDungeon(connector2, prevRoom, dir);
              addRoomToDungeon(newRoom, connector2, dir);
              finalRoom = newRoom;
              placementSuccess = true;
              addLog("你沿着一条较长的走廊前进...");
          }
      }
  }

  // --- 结果处理 ---
  if (placementSuccess) {
      return finalRoom;
  } else {
      // 死胡同逻辑
      addLog(`通往 ${dir} 的道路被坍塌的石块完全堵死了。`);
      prevRoom.doors[dir].closed = true;
      prevRoom.doors[dir].blocked = true; // 标记为堵死，UI显示红叉
      return null;
  }
}

// 辅助：注册房间并建立连接
function addRoomToDungeon(newRoom, fromRoom, dirFrom) {
    const newId = 'rm_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    newRoom.id = newId;
    dungeon[newId] = newRoom;
    linkRooms(fromRoom.id, newId, dirFrom);
}

function linkRooms(id1, id2, dirFrom1){
  dungeon[id1].doors[dirFrom1].leadsTo = id2;
  dungeon[id1].doors[dirFrom1].closed = false;
  
  const back = {up:'down',down:'up',left:'right',right:'left'}[dirFrom1];
  // 确保反向门存在（防止数据异常）
  if (dungeon[id2].doors[back]) {
      dungeon[id2].doors[back].leadsTo = id1;
      dungeon[id2].doors[back].closed = false;
  }
}

// resolveEncounter 保持不变，包含在原代码中，这里为了完整性不再重复列出，
// 如果你需要它，请告诉我，通常它不需要修改。
function resolveEncounter(room){
  const enc = room.encounter;
  if (enc.main === 'none') { room._encounterResolved = true; return; }

  addLog(`>>> 遭遇：${enc.main} ${enc.subtype||''} <<<`);

  if (enc.main === 'monster') initCombat(enc.template, 'group');
  else if (enc.main === 'boss') initCombat(enc.template, 'boss');
  else if (enc.main === 'treasure') {
    if (enc.subtype.includes('金币')) gainLoot('gold'); else gainLoot('item');
    room._encounterResolved = true;
  } else if (enc.main === 'event') {
    if (enc.subtype === '陷阱') {
        const p = randomAliveCharacter();
        if(p) { p.hp--; addLog(`触发陷阱！${p.name} 受了伤。`); }
    } else {
        addLog(`遇到 ${enc.subtype}。`);
    }
    room._encounterResolved = true;
  } else {
    addLog("这里什么也没有。");
    room._encounterResolved = true;
  }
}