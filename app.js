// 配置参数
const CONFIG = {
    gridRows: 512,          // 网格行数 (m)
    gridCols: 1024,          // 网格列数 (n)
    cellSize: 40,          // 每个网格单元的大小（像素）
    gridLineColor: 0x888888,  // 灰色网格线
    gridLineWidth: 1,
    borderColor: 0x111111,    // 深黑色外框
    borderWidth: 3,
    highlightColor: 0x4CAF50, // 高亮颜色（点）
    highlightAlpha: 0.3,
    lineHighlightColor: 0xFF9800, // 橙色（行/列）
    lineHighlightAlpha: 0.2,
    backgroundColor: 0x2a2a2a,
    minZoom: 0.1,
    maxZoom: 5,
    zoomSpeed: 0.1
};

// 处理高 DPI 显示
const dpr = window.devicePixelRatio || 1;

// 创建 PixiJS 应用
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: CONFIG.backgroundColor,
    resolution: dpr,
    autoDensity: true,
    antialias: true
});

document.getElementById('app').appendChild(app.view);

// 创建容器用于缩放和拖拽
const viewport = new PIXI.Container();
app.stage.addChild(viewport);

// 网格容器
const gridContainer = new PIXI.Container();
viewport.addChild(gridContainer);

// 高亮容器
const highlightContainer = new PIXI.Container();
viewport.addChild(highlightContainer);

// 存储高亮的网格单元
const highlightedCells = new Set();
// 网格图形缓存与重绘节流
let gridGraphics = null;
let pendingRedraw = false;
let hasCentered = false;

// 绘制网格
function drawGrid() {
    // 复用已有图形
    if (!gridGraphics) {
        gridGraphics = new PIXI.Graphics();
        gridContainer.addChild(gridGraphics);
    } else {
        gridGraphics.clear();
    }

    const totalWidth = CONFIG.gridCols * CONFIG.cellSize;
    const totalHeight = CONFIG.gridRows * CONFIG.cellSize;

    // 为保持屏幕上线宽恒定，按缩放反比设置线宽
    const lw = Math.max(1 / currentZoom, 0.5 / dpr);
    const bw = Math.max(CONFIG.borderWidth / currentZoom, 1 / dpr);
    const offset = 0.5 / currentZoom; // 半像素对齐，避免粗细不均

    // 绘制深黑色外框
    gridGraphics.lineStyle({ width: bw, color: CONFIG.borderColor, alpha: 1, alignment: 0.5 });
    gridGraphics.drawRect(offset, offset, totalWidth - offset * 2, totalHeight - offset * 2);

    // 绘制灰色网格线
    gridGraphics.lineStyle({ width: lw, color: CONFIG.gridLineColor, alpha: 1, alignment: 0.5 });

    // 垂直线
    for (let i = 0; i <= CONFIG.gridCols; i++) {
        const x = i * CONFIG.cellSize + offset;
        gridGraphics.moveTo(x, offset);
        gridGraphics.lineTo(x, totalHeight - offset);
    }

    // 水平线
    for (let i = 0; i <= CONFIG.gridRows; i++) {
        const y = i * CONFIG.cellSize + offset;
        gridGraphics.moveTo(offset, y);
        gridGraphics.lineTo(totalWidth - offset, y);
    }

    // 将网格居中显示（首次）
    if (!hasCentered) {
        viewport.x = (app.screen.width - totalWidth) / 2;
        viewport.y = (app.screen.height - totalHeight) / 2;
        hasCentered = true;
    }
}

function requestGridRedraw() {
    if (pendingRedraw) return;
    pendingRedraw = true;
    requestAnimationFrame(() => {
        drawGrid();
        pendingRedraw = false;
    });
}

// 创建高亮效果（单个点）
function createHighlight(row, col, color = CONFIG.highlightColor, alpha = CONFIG.highlightAlpha) {
    const highlight = new PIXI.Graphics();
    highlight.beginFill(color, alpha);
    highlight.drawRect(
        col * CONFIG.cellSize + CONFIG.gridLineWidth,
        row * CONFIG.cellSize + CONFIG.gridLineWidth,
        CONFIG.cellSize - CONFIG.gridLineWidth * 2,
        CONFIG.cellSize - CONFIG.gridLineWidth * 2
    );
    highlight.endFill();
    return highlight;
}

// 创建行高亮
function createRowHighlight(row) {
    const highlight = new PIXI.Graphics();
    highlight.beginFill(CONFIG.lineHighlightColor, CONFIG.lineHighlightAlpha);
    highlight.drawRect(
        CONFIG.gridLineWidth,
        row * CONFIG.cellSize + CONFIG.gridLineWidth,
        CONFIG.gridCols * CONFIG.cellSize - CONFIG.gridLineWidth * 2,
        CONFIG.cellSize - CONFIG.gridLineWidth * 2
    );
    highlight.endFill();
    return highlight;
}

// 创建列高亮
function createColHighlight(col) {
    const highlight = new PIXI.Graphics();
    highlight.beginFill(CONFIG.lineHighlightColor, CONFIG.lineHighlightAlpha);
    highlight.drawRect(
        col * CONFIG.cellSize + CONFIG.gridLineWidth,
        CONFIG.gridLineWidth,
        CONFIG.cellSize - CONFIG.gridLineWidth * 2,
        CONFIG.gridRows * CONFIG.cellSize - CONFIG.gridLineWidth * 2
    );
    highlight.endFill();
    return highlight;
}

// 获取网格单元的键
function getCellKey(row, col) {
    return `${row},${col}`;
}

// 切换高亮
function toggleHighlight(row, col) {
    const key = getCellKey(row, col);
    
    if (highlightedCells.has(key)) {
        // 移除高亮
        highlightedCells.delete(key);
        // 找到并移除对应的高亮图形
        highlightContainer.children.forEach((child, index) => {
            if (child.cellKey === key) {
                highlightContainer.removeChildAt(index);
            }
        });
    } else {
        // 添加高亮
        highlightedCells.add(key);
        const highlight = createHighlight(row, col);
        highlight.cellKey = key;
        highlightContainer.addChild(highlight);
    }
}

// 缩放和拖拽状态
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let viewportStart = { x: 0, y: 0 };
let currentZoom = 1;

// 鼠标按下事件
app.view.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    viewportStart.x = viewport.x;
    viewportStart.y = viewport.y;
});

// 鼠标移动事件
app.view.addEventListener('pointermove', (e) => {
    if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        viewport.x = viewportStart.x + dx;
        viewport.y = viewportStart.y + dy;
        updateInfo();
    } else {
        // 显示网格坐标
        showCellInfo(e);
    }
});

// 鼠标释放事件
app.view.addEventListener('pointerup', (e) => {
    if (isDragging) {
        // 检查是否是点击（没有拖拽）
        const dx = Math.abs(e.clientX - dragStart.x);
        const dy = Math.abs(e.clientY - dragStart.y);
        
        if (dx < 5 && dy < 5) {
            // 这是一个点击事件
            handleClick(e);
        }
    }
    isDragging = false;
});

app.view.addEventListener('pointerleave', () => {
    isDragging = false;
});

// 处理点击事件
function handleClick(e) {
    const rect = app.view.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 转换到网格坐标
    const localX = (mouseX - viewport.x) / viewport.scale.x;
    const localY = (mouseY - viewport.y) / viewport.scale.y;
    
    const col = Math.floor(localX / CONFIG.cellSize);
    const row = Math.floor(localY / CONFIG.cellSize);
    
    // 检查是否在网格范围内
    if (row >= 0 && row < CONFIG.gridRows && col >= 0 && col < CONFIG.gridCols) {
        toggleHighlight(row, col);
    }
}

// 滚轮缩放事件
app.view.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const rect = app.view.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 计算缩放前鼠标指向的世界坐标
    const worldPos = {
        x: (mouseX - viewport.x) / viewport.scale.x,
        y: (mouseY - viewport.y) / viewport.scale.y
    };
    
    // 计算新的缩放级别
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? (1 + CONFIG.zoomSpeed) : (1 - CONFIG.zoomSpeed);
    let newZoom = currentZoom * zoomFactor;
    
    // 限制缩放范围
    newZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newZoom));
    
    // 应用缩放
    viewport.scale.set(newZoom);
    currentZoom = newZoom;
    
    // 调整位置，使鼠标指向的点保持不变
    viewport.x = mouseX - worldPos.x * viewport.scale.x;
    viewport.y = mouseY - worldPos.y * viewport.scale.y;
    
    // 重新绘制网格以保持线宽一致
    requestGridRedraw();

    updateInfo();
}, { passive: false });

// 更新信息显示
function updateInfo() {
    const zoomPercent = Math.round(currentZoom * 100);
    document.getElementById('zoom-info').textContent = `缩放: ${zoomPercent}%`;
    
    const posX = Math.round(viewport.x);
    const posY = Math.round(viewport.y);
    document.getElementById('pos-info').textContent = `位置: (${posX}, ${posY})`;
}

// 显示网格单元信息
function showCellInfo(e) {
    const rect = app.view.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 转换到网格坐标
    const localX = (mouseX - viewport.x) / viewport.scale.x;
    const localY = (mouseY - viewport.y) / viewport.scale.y;
    
    const col = Math.floor(localX / CONFIG.cellSize);
    const row = Math.floor(localY / CONFIG.cellSize);
    
    const cellInfoDiv = document.getElementById('cell-info');
    const cellCoordsDiv = document.getElementById('cell-coords');
    
    // 检查是否在网格范围内
    if (row >= 0 && row < CONFIG.gridRows && col >= 0 && col < CONFIG.gridCols) {
        cellCoordsDiv.textContent = `列: ${col}, 行: ${row}`;
        cellInfoDiv.style.display = 'block';
        
        // 跟随鼠标显示，添加偏移避免遮挡光标
        const offsetX = 15;
        const offsetY = 15;
        let posX = e.clientX + offsetX;
        let posY = e.clientY + offsetY;
        
        // 防止超出屏幕边界
        const infoWidth = cellInfoDiv.offsetWidth;
        const infoHeight = cellInfoDiv.offsetHeight;
        
        if (posX + infoWidth > window.innerWidth) {
            posX = e.clientX - infoWidth - offsetX;
        }
        if (posY + infoHeight > window.innerHeight) {
            posY = e.clientY - infoHeight - offsetY;
        }
        
        cellInfoDiv.style.left = posX + 'px';
        cellInfoDiv.style.top = posY + 'px';
    } else {
        cellInfoDiv.style.display = 'none';
    }
}

// 从 JSON 加载高亮数据
function loadHighlightsFromJSON(data) {
    // 清除现有高亮
    clearAllHighlights();
    
    if (!Array.isArray(data)) {
        console.error('JSON 数据必须是数组格式');
        alert('JSON 数据格式错误：必须是数组格式');
        return;
    }
    
    let loadedCount = 0;
    
    data.forEach(item => {
        const x = item.x;
        const y = item.y;
        
        if (x === -1 && y >= 0 && y < CONFIG.gridRows) {
            // 高亮整行
            const highlight = createRowHighlight(y);
            highlight.cellKey = `row_${y}`;
            highlightContainer.addChild(highlight);
            highlightedCells.add(`row_${y}`);
            loadedCount++;
        } else if (y === -1 && x >= 0 && x < CONFIG.gridCols) {
            // 高亮整列
            const highlight = createColHighlight(x);
            highlight.cellKey = `col_${x}`;
            highlightContainer.addChild(highlight);
            highlightedCells.add(`col_${x}`);
            loadedCount++;
        } else if (x >= 0 && x < CONFIG.gridCols && y >= 0 && y < CONFIG.gridRows) {
            // 高亮单个点
            const key = getCellKey(y, x);
            if (!highlightedCells.has(key)) {
                const highlight = createHighlight(y, x);
                highlight.cellKey = key;
                highlightContainer.addChild(highlight);
                highlightedCells.add(key);
                loadedCount++;
            }
        }
    });
    
    console.log(`✅ 成功加载 ${loadedCount} 个高亮项`);
    alert(`成功加载 ${loadedCount} 个高亮项！`);
}

// 清除所有高亮
function clearAllHighlights() {
    highlightContainer.removeChildren();
    highlightedCells.clear();
}

// 文件加载处理
document.getElementById('load-json-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                loadHighlightsFromJSON(data);
            } catch (error) {
                console.error('JSON 解析错误:', error);
                alert('JSON 文件格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    }
    // 重置 input，允许重复加载同一文件
    e.target.value = '';
});

// 清除高亮按钮
document.getElementById('clear-highlights-btn').addEventListener('click', () => {
    clearAllHighlights();
    console.log('✅ 已清除所有高亮');
});

// 拖放文件支持
app.view.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

app.view.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                loadHighlightsFromJSON(data);
            } catch (error) {
                console.error('JSON 解析错误:', error);
                alert('JSON 文件格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    } else {
        alert('请拖放 JSON 文件');
    }
});

// 窗口大小改变时调整
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    
    // 重新计算居中位置
    const totalWidth = CONFIG.gridCols * CONFIG.cellSize;
    const totalHeight = CONFIG.gridRows * CONFIG.cellSize;
    viewport.x = (app.screen.width - totalWidth * currentZoom) / 2;
    viewport.y = (app.screen.height - totalHeight * currentZoom) / 2;
    
    updateInfo();
});

// 初始化
drawGrid();
updateInfo();

console.log('✅ PixiJS 网格画布初始化完成！');
console.log(`网格大小: ${CONFIG.gridRows} × ${CONFIG.gridCols}`);
console.log(`DPI 缩放: ${dpr}x`);

