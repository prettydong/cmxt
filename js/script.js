// 未来可以在这里添加交互逻辑
// 例如：通过API获取数据并动态更新仪表盘

console.log("脚本加载成功");

document.addEventListener('DOMContentLoaded', () => {
    const tabList = document.getElementById('tab-list');
    const addTabBtn = document.getElementById('add-tab-btn');
    const tabContentContainer = document.getElementById('tab-content-container');

    let tabs = [];
    let activeTabId = null;
    let nextTabId = 1;

    // --- Internationalization (i18n) ---
    const translations = {
        zh: {
            // Main screen
            main_title_1: "More Smart",
            main_title_2: "Less",
            main_title_input: "Input",
            placeholder_main: "请输入数字...",
            // Parameter labels
            param_label: "参数",
            // Output panel
            output_left: "左侧数据 (40%)",
            output_right: "右侧数据 (60%)",
            output_bottom: "下方区域 (30%)",
            result_table: "Result表格",
            // Tab titles
            tab_title: "标签",
            // Help Modal
            help_title: "帮助文档",
            help_intro: "这是一个基于 AI 驱动的降本增效应用。",
            help_flow: "基本流程:",
            help_step1: "在主界面输入一个初始参数，然后按",
            help_step2: "系统将根据您的输入，加载一系列可编辑的预设参数。",
            help_step3: "您可以在这些参数框中修改数值，修改后按",
            help_step4: "所有参数确认后，系统将进行分析并从右侧面板输出结果（此功能待开发）。",
            help_add_tab: "您可以通过点击顶部的",
            help_add_tab_icon: "按钮来创建新的任务选项卡。",
            // KV Data
            kv_model: "设备型号",
            kv_status: "当前状态",
            kv_temp: "核心温度",
            kv_power: "能量输出",
            kv_shield: "护盾强度",
            // ... (Add all other KV keys here)
        },
        en: {
            main_title_1: "More Smart",
            main_title_2: "Less",
            main_title_input: "Input",
            placeholder_main: "Enter a number...",
            param_label: "Parameter",
            output_left: "Left Data (40%)",
            output_right: "Right Data (60%)",
            output_bottom: "Bottom Area (30%)",
            result_table: "Result Table",
            tab_title: "Tab",
            help_title: "Help Document",
            help_intro: "This is an AI-driven application for cost reduction and efficiency improvement.",
            help_flow: "Basic Flow:",
            help_step1: "Enter an initial parameter on the main screen, then press",
            help_step2: "The system will load a series of editable preset parameters based on your input.",
            help_step3: "You can modify the values in these parameter boxes, then press",
            help_step4: "After all parameters are confirmed, the system will perform analysis and output the results in the right panel (feature in development).",
            help_add_tab: "You can create a new task tab by clicking the",
            help_add_tab_icon: "button at the top.",
            kv_model: "Device Model",
            kv_status: "Current Status",
            kv_temp: "Core Temperature",
            kv_power: "Power Output",
            kv_shield: "Shield Strength",
            // ... (Add all other KV keys here for English)
        }
    };
    let currentLang = localStorage.getItem('lang') || 'zh';

    const memoryStickSVGHTML = `
        <svg class="memory-stick-svg" viewBox="0 0 200 55" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FDE08D;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#c89b3c;stop-opacity:1" />
                </linearGradient>
            </defs>
            <path d="M 5,5 L 195,5 L 195,45 L 105,45 L 100,40 L 95,45 L 5,45 Z" fill="#2c3e50" stroke="#7F8C8D" stroke-width="1"/>
            <rect x="20" y="10" width="25" height="15" rx="2" fill="#34495e" />
            <rect x="55" y="10" width="25" height="15" rx="2" fill="#34495e" />
            <rect x="90" y="10" width="20" height="10" rx="1" fill="#34495e" />
            <rect x="120" y="10" width="25" height="15" rx="2" fill="#34495e" />
            <rect x="155" y="10" width="25" height="15" rx="2" fill="#34495e" />
            <g transform="translate(0, 45)">
                <rect x="7" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="12" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="17" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="22" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="27" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="32" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="37" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="42" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="47" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="52" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="57" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="62" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="67" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="72" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="77" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="82" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="87" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="107" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="112" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="117" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="122" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="127" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="132" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="137" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="142" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="147" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="152" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="157" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="162" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="167" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="172" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="177" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="182" y="0" width="3" height="5" fill="url(#gold-gradient)"/><rect x="187" y="0" width="3" height="5" fill="url(#gold-gradient)"/>
            </g>
        </svg>
    `;

    function t(key) {
        return translations[currentLang][key] || key;
    }

    function getPresetParameters() {
        // This should also be internationalized if labels change
        return [
            { id: 2, label: `${t('param_label')} 2`, value: '768' },
            { id: 3, label: `${t('param_label')} 3`, value: '3.14' },
            { id: 4, label: `${t('param_label')} 4`, value: '2.71' },
            { id: 5, label: `${t('param_label')} 5`, value: '1.618' },
            { id: 6, label: `${t('param_label')} 6`, value: '0.618' },
        ];
    }
    
    function getKVData() {
        return `
            <div class="kv-item"><span class="key">${t('kv_model')}</span><span class="value">X-Wing T-65B</span></div>
            <div class="kv-item"><span class="key">${t('kv_status')}</span><span class="value">待命</span></div>
            <div class="kv-item"><span class="key">${t('kv_temp')}</span><span class="value">35°C</span></div>
            <div class="kv-item"><span class="key">${t('kv_power')}</span><span class="value">85%</span></div>
            <div class="kv-item"><span class="key">${t('kv_shield')}</span><span class="value">100%</span></div>
            // ... all other kv items
        `;
    }

    function render() {
        // Re-render all text elements on language change
        document.title = currentLang === 'zh' ? '工业风格单页应用' : 'Industrial Style SPA';
        addTabBtn.title = currentLang === 'zh' ? '添加新选项卡' : 'Add new tab';
        document.getElementById('help-btn').title = t('help_title');
        // ... update other static text ...

        // 1. Render Tabs
        tabList.innerHTML = '';
        tabs.forEach(tab => {
            const tabElement = document.createElement('li');
            tabElement.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
            tabElement.dataset.tabId = tab.id;
            const closeButtonVisible = tabs.length > 1;
            tabElement.innerHTML = `<span>${t('tab_title')} ${tab.id}</span> ${closeButtonVisible ? `<button class="tab-close-btn" data-tab-id="${tab.id}">&times;</button>` : ''}`;
            tabList.appendChild(tabElement);
        });

        // 2. Render Content
        tabContentContainer.innerHTML = '';
        const activeTab = tabs.find(tab => tab.id === activeTabId);
        if (!activeTab) return;

        const contentElement = document.createElement('div');
        contentElement.className = 'tab-content active';

        if (activeTab.isInitialState) {
            contentElement.innerHTML = `
                <div class="main-input-area">
                    <div id="memory-rain-container"></div>
                    <div class="title-container">
                        <h2 class="main-title">${t('main_title_1')}</h2>
                        <h2 class="main-title">${t('main_title_2')} <span class="title-input-word">${t('main_title_input')}</span></h2>
                    </div>
                    <div class="input-container">
                        <div class="input-wrapper">
                            <input type="text" class="number-input main-input" placeholder="${t('placeholder_main')}" inputmode="numeric">
                            <span class="input-icon"></span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            contentElement.classList.add('has-params');
            const paramsContainer = document.createElement('div');
            paramsContainer.className = 'parameters-container';
            activeTab.parameters.forEach(param => {
                const paramEl = document.createElement('div');
                if (param.id === 1) {
                    paramEl.className = 'param-item locked';
                    paramEl.innerHTML = `
                        <p class="param-label">${t('param_label')} 1</p>
                        <div class="locked-value-wrapper">
                            <span class="param-value">${param.value}</span>
                            <span class="lock-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                                </svg>
                            </span>
                        </div>
                    `;
                } else {
                    paramEl.className = 'param-item';
                    paramEl.innerHTML = `
                        <p class="param-label">${param.label}</p>
                        <div class="input-wrapper">
                            <input type="text" class="number-input param-input" value="${param.value}" 
                                   data-param-id="${param.id}" inputmode="numeric">
                            <span class="input-icon"></span>
                        </div>
                    `;
                }
                paramsContainer.appendChild(paramEl);
            });
            contentElement.appendChild(paramsContainer);

            const outputPanel = document.createElement('div');
            outputPanel.className = 'output-panel';
            outputPanel.innerHTML = `
                <div class="output-section-left">
                    <div class="kv-data-list">
                        <div class="kv-item"><span class="key">设备型号</span><span class="value">X-Wing T-65B</span></div>
                        <div class="kv-item"><span class="key">当前状态</span><span class="value">待命</span></div>
                        <div class="kv-item"><span class="key">核心温度</span><span class="value">35°C</span></div>
                        <div class="kv-item"><span class="key">能量输出</span><span class="value">85%</span></div>
                        <div class="kv-item"><span class="key">护盾强度</span><span class="value">100%</span></div>
                        <div class="kv-item"><span class="key">上次维护</span><span class="value">21小时前</span></div>
                        <div class="kv-item"><span class="key">出厂日期</span><span class="value">2023-10-26</span></div>
                        <div class="kv-item"><span class="key">系统版本</span><span class="value">v2.8.1</span></div>
                        <div class="kv-item"><span class="key">错误日志</span><span class="value">无</span></div>
                        <div class="kv-item"><span class="key">在线时长</span><span class="value">7天 4小时</span></div>
                        <div class="kv-item"><span class="key">网络延迟</span><span class="value">12ms</span></div>
                        <div class="kv-item"><span class="key">主传感器</span><span class="value">正常</span></div>
                        <div class="kv-item"><span class="key">副传感器</span><span class="value">正常</span></div>
                        <div class="kv-item"><span class="key">冷却系统</span><span class="value">启动</span></div>
                        <div class="kv-item"><span class="key">液压</span><span class="value">2.1 bar</span></div>
                        <div class="kv-item"><span class="key">电源负载</span><span class="value">60%</span></div>
                        <div class="kv-item"><span class="key">数据链路</span><span class="value">已加密</span></div>
                        <div class="kv-item"><span class="key">定位精度</span><span class="value">0.5m</span></div>
                        <div class="kv-item"><span class="key">紧急制动</span><span class="value">未激活</span></div>
                        <div class="kv-item"><span class="key">运行模式</span><span class="value">自动</span></div>
                        <div class="kv-item"><span class="key">任务队列</span><span class="value">3</span></div>
                        <div class="kv-item"><span class="key">操作员</span><span class="value">C-3PO</span></div>
                    </div>
                </div>
                <div class="output-section-right">
                    <div class="output-section-right-top">
                        <div class="pie-chart-container">
                            <svg class="pie-chart" viewBox="0 0 36 36">
                                <!-- Background Circle -->
                                <circle class="pie-chart-background" cx="18" cy="18" r="15.9155"></circle>
                                <!-- Data Slices -->
                                <circle class="pie-chart-slice" data-color="#34495e" data-value="40" cx="18" cy="18" r="15.9155"></circle>
                                <circle class="pie-chart-slice" data-color="#5D6D7E" data-value="30" cx="18" cy="18" r="15.9155"></circle>
                                <circle class="pie-chart-slice" data-color="#85929E" data-value="20" cx="18" cy="18" r="15.9155"></circle>
                                <circle class="pie-chart-slice" data-color="#AEB6BF" data-value="10" cx="18" cy="18" r="15.9155"></circle>
                            </svg>
                            <div class="pie-chart-legend">
                                <div class="legend-item" style="--color: #34495e;"><span>核心模块 A (40%)</span></div>
                                <div class="legend-item" style="--color: #5D6D7E;"><span>模块 B (30%)</span></div>
                                <div class="legend-item" style="--color: #85929E;"><span>边缘模块 C (20%)</span></div>
                                <div class="legend-item" style="--color: #AEB6BF;"><span>其他 (10%)</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="output-section-right-bottom">
                        <a href="#" class="result-link" target="_blank" rel="noopener noreferrer">
                            <span class="result-link-text">${t('result_table')}</span>
                            <svg class="result-link-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                        </a>
                    </div>
                </div>
            `;
            contentElement.appendChild(outputPanel);
        }
        
        tabContentContainer.appendChild(contentElement);

        if (activeTab.isInitialState) {
            initMemoryRain();
        }

        // Also update help modal text
        updateHelpModalText();
    }
    
    function updateHelpModalText() {
        const helpModal = document.getElementById('help-modal');
        helpModal.querySelector('h2').textContent = t('help_title');
        // ... update all other p, li, etc.
    }

    function initPieChart() {
        const slices = document.querySelectorAll('.pie-chart-slice');
        if (!slices.length) return;

        let accumulatedPercentage = 0;

        slices.forEach(slice => {
            const value = parseFloat(slice.dataset.value);
            slice.style.stroke = slice.dataset.color;
            // The circumference is ~100 (2 * pi * 15.9155)
            // so value is directly the percentage length.
            // We set the dash to the value, and the gap to the rest of the circle.
            slice.style.strokeDasharray = `${value} 100`;

            // We offset by the accumulated percentage of previous slices.
            slice.style.strokeDashoffset = -accumulatedPercentage;
            
            accumulatedPercentage += value;
        });
    }

    function switchTab(tabId) {
        activeTabId = tabId;
        render();
    }

    function addTab() {
        const newTab = {
            id: nextTabId,
            title: `${t('tab_title')} ${nextTabId}`,
            parameters: [],
            isInitialState: true, // Flag to show the main screen
        };
        tabs.push(newTab);
        nextTabId++;
        switchTab(newTab.id);
    }

    function closeTab(tabId) {
        if (tabs.length <= 1) return;
        const tabIndex = tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) return;
        const newActiveTabId = (activeTabId === tabId) 
            ? (tabIndex > 0 ? tabs[tabIndex - 1].id : tabs[1].id) 
            : activeTabId;
        tabs = tabs.filter(tab => tab.id !== tabId);
        switchTab(newActiveTabId);
    }

    addTabBtn.addEventListener('click', addTab);

    tabList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('tab-close-btn')) {
            e.stopPropagation();
            closeTab(parseInt(target.dataset.tabId, 10));
        } else if (target.closest('.item')) {
            const tabIdToSwitch = parseInt(target.closest('.tab-item').dataset.tabId, 10);
            if (tabIdToSwitch !== activeTabId) switchTab(tabIdToSwitch);
        }
    });

    tabContentContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('number-input')) {
            e.preventDefault();
            const input = e.target;
            const wrapper = input.closest('.input-wrapper');
            if (!wrapper || !wrapper.classList.contains('valid')) return;

            const activeTab = tabs.find(tab => tab.id === activeTabId);
            if (!activeTab) return;

            if (input.classList.contains('main-input')) {
                activeTab.isInitialState = false;
                const mainParam = { id: 1, label: '参数 1', value: input.value.trim() };
                activeTab.parameters = [mainParam, ...getPresetParameters()];
                render();
                initPieChart();
            } else if (input.classList.contains('param-input')) {
                const paramId = parseInt(input.dataset.paramId, 10);
                const param = activeTab.parameters.find(p => p.id === paramId);
                if (param) param.value = input.value.trim();
                input.blur();
            }
        }
    });

    tabContentContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('number-input')) {
            const input = e.target;
            const wrapper = input.closest('.input-wrapper');
            if (!wrapper) return;
            const value = input.value.trim();
            if (value === '') {
                wrapper.classList.remove('valid', 'invalid', 'shake-icon');
            } else {
                wrapper.classList.remove('shake-icon');
                void wrapper.offsetWidth;
                wrapper.classList.add('shake-icon');
                const isNumeric = !isNaN(Number(value)) && isFinite(Number(value));
                if (isNumeric) {
                    wrapper.classList.add('valid');
                    wrapper.classList.remove('invalid');
                } else {
                    wrapper.classList.add('invalid');
                    wrapper.classList.remove('valid');
                }
            }
        }
    });

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;

    function applyTheme(theme) {
        if (theme === 'light') body.classList.add('light-theme');
        else body.classList.remove('light-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = body.classList.contains('light-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // --- Help Modal Logic ---
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    function openModal() {
        helpModal.classList.add('visible');
    }

    function closeModal() {
        helpModal.classList.remove('visible');
    }

    helpBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    helpModal.addEventListener('click', (e) => {
        // Close modal if overlay is clicked, but not the content inside it
        if (e.target === helpModal) {
            closeModal();
        }
    });

    // --- Language Toggle Logic ---
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('lang', currentLang);
        render(); // Re-render the entire UI with the new language
    });

    function init() {
        addTab();
    }
    init();

    function submitParameter() {
        const activeTabId = document.querySelector('.tab.active').dataset.tab;
        const input = document.getElementById(`param-input-${activeTabId}`);
        const value = input.value;
        const isValid = /^\d+$/.test(value);
        updateInputIcon(activeTabId, isValid);

        if (isValid) {
            tabs[activeTabId].hasContent = true;
            tabs[activeTabId].initialValue = value;
            render(activeTabId);
            initPieChart();
        }
    }

    function initMemoryRain() {
        const container = document.getElementById('memory-rain-container');
        if (!container) return;
        container.innerHTML = ''; // Clear old sticks

        const stickCount = 25;
        
        for (let i = 0; i < stickCount; i++) {
            const stickWrapper = document.createElement('div');
            stickWrapper.className = 'raining-stick';
            stickWrapper.innerHTML = memoryStickSVGHTML;

            const randomLeft = Math.random() * 110 - 5; // -5 to 105vw to cover edges
            const randomDuration = Math.random() * 5 + 8; // 8 to 13 seconds
            const randomDelay = Math.random() * 10; // 0 to 10 seconds
            const randomScale = Math.random() * 0.5 + 0.75; // Scale from 0.75 to 1.25

            stickWrapper.style.left = `${randomLeft}vw`;
            stickWrapper.style.animationDuration = `${randomDuration}s`;
            stickWrapper.style.animationDelay = `${randomDelay}s`;
            
            const svgEl = stickWrapper.querySelector('.memory-stick-svg');
            svgEl.style.transform = `rotate(45deg) scale(${randomScale})`;
            svgEl.style.opacity = Math.random() * 0.15 + 0.15; // Range: 0.15 to 0.3

            container.appendChild(stickWrapper);
        }
    }
}); 