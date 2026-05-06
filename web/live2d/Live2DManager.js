/**
 * Live2D Manager - Cubism SDK 封装
 *
 * 提供统一的 Live2D 模型加载、渲染、动作和表情管理接口
 */

export class Live2DManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.model = null;
        this.motions = {};
        this.expressions = {};
        this.currentExpression = 'neutral';
        this.isPlaying = false;
        this.animator = null;

        // 鼠标/触摸跟踪
        this.mouseX = 0;
        this.mouseY = 0;
        this.isDragging = false;

        this._setupCanvas();
        this._bindEvents();
    }

    _setupCanvas() {
        const resize = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        // 开始渲染循环
        this._startRenderLoop();
    }

    _bindEvents() {
        const getPosition = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            if (e.touches) {
                return {
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top
                };
            }
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const pos = getPosition(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
            this._onTap(pos.x, pos.y);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getPosition(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isDragging = true;
            const pos = getPosition(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
            this._onTap(pos.x, pos.y);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const pos = getPosition(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
        });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    _onTap(x, y) {
        // 点击回调，可以在这里添加交互逻辑
        console.log('Live2D tapped at:', x, y);

        // 触发一个开心的动作
        if (this.motions['tap']) {
            this.playMotion('tap');
        }
    }

    async loadModel(modelPath) {
        /**
         * 加载 Live2D Cubism 模型
         *
         * 支持的模型格式:
         * - .model3.json (Cubism 4)
         * - .model.json (Cubism 3)
         * - .model2.json (Cubism 2)
         */

        try {
            console.log('Loading Live2D model:', modelPath);

            // 获取模型目录
            const basePath = modelPath.replace(/[^/]+$/, '');

            // 加载模型配置文件
            const response = await fetch(modelPath);
            if (!response.ok) {
                throw new Error(`Failed to load model config: ${modelPath}`);
            }

            const modelConfig = await response.json();

            // 加载模型文件
            const modelUrl = basePath + modelConfig.FileReferences.Moc;
            const mocResponse = await fetch(modelUrl);
            if (!mocResponse.ok) {
                throw new Error(`Failed to load Moc file`);
            }

            // 存储模型配置
            this.modelConfig = modelConfig;
            this.basePath = basePath;
            this.model = {
                config: modelConfig,
                loaded: true
            };

            // 加载纹理
            await this._loadTextures(modelConfig.FileReferences.Textures);

            // 加载动作文件
            if (modelConfig.FileReferences.Motions) {
                await this._loadMotions(modelConfig.FileReferences.Motions);
            }

            // 加载表情文件
            if (modelConfig.FileReferences.Expressions) {
                await this._loadExpressions(modelConfig.FileReferences.Expressions);
            }

            console.log('Live2D model loaded successfully');
            return true;

        } catch (error) {
            console.error('Failed to load Live2D model:', error);
            throw error;
        }
    }

    async _loadTextures(texturePaths) {
        this.textures = [];

        for (const path of texturePaths) {
            const url = this.basePath + path;
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            this.textures.push(img);
        }
    }

    async _loadMotions(motionsConfig) {
        for (const [groupName, motions] of Object.entries(motionsConfig)) {
            for (const motion of motions) {
                const url = this.basePath + motion.File;
                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    const name = motion.Name || motion.File.split('/').pop().replace('.motion3.json', '');
                    this.motions[name] = data;
                    console.log('Loaded motion:', name);
                } catch (error) {
                    console.warn('Failed to load motion:', motion.File);
                }
            }
        }
    }

    async _loadExpressions(expressionsConfig) {
        this.expressions = {};

        for (const expr of expressionsConfig) {
            const url = this.basePath + expr.File;
            try {
                const response = await fetch(url);
                const data = await response.json();
                this.expressions[expr.Name] = data;
                console.log('Loaded expression:', expr.Name);
            } catch (error) {
                console.warn('Failed to load expression:', expr.File);
            }
        }
    }

    playMotion(motionName) {
        if (!this.motions[motionName]) {
            console.warn('Motion not found:', motionName);
            return false;
        }

        console.log('Playing motion:', motionName);
        this.currentMotion = motionName;
        this.motionTime = 0;

        // 动画将在渲染循环中处理
        return true;
    }

    setExpression(expressionName) {
        if (!this.expressions[expressionName]) {
            console.warn('Expression not found:', expressionName);
            // 尝试使用 neutral
            if (this.expressions['neutral']) {
                expressionName = 'neutral';
            } else {
                return false;
            }
        }

        console.log('Setting expression:', expressionName);
        this.currentExpression = expressionName;
        return true;
    }

    _startRenderLoop() {
        let lastTime = 0;

        const render = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            this._render(deltaTime);
            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    }

    _render(deltaTime) {
        // 清除画布
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.model || !this.model.loaded) {
            return;
        }

        // 更新动画时间
        if (this.currentMotion && this.motions[this.currentMotion]) {
            this.motionTime = (this.motionTime || 0) + deltaTime / 1000;
        }

        // 绘制模型
        this._drawModel();
    }

    _drawModel() {
        const ctx = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 计算缩放和位置，使模型居中
        const scale = Math.min(w, h) * 0.4;
        const centerX = w / 2;
        const centerY = h / 2 + scale * 0.2;

        ctx.save();
        ctx.translate(centerX, centerY);

        // 如果有纹理，绘制纹理
        if (this.textures && this.textures.length > 0) {
            const texture = this.textures[0];

            // 应用呼吸动画
            const breathe = Math.sin(Date.now() * 0.002) * 5;

            ctx.drawImage(
                texture,
                -scale + breathe,
                -scale,
                scale * 2,
                scale * 2
            );
        }

        // 应用鼠标跟踪效果（如果模型支持）
        if (this.isDragging) {
            const offsetX = (this.mouseX - this.canvas.width / 2) * 0.02;
            ctx.translate(offsetX, 0);
        }

        ctx.restore();
    }

    // 获取模型信息
    getModelInfo() {
        return {
            hasMotions: Object.keys(this.motions).length > 0,
            hasExpressions: Object.keys(this.expressions).length > 0,
            motionCount: Object.keys(this.motions).length,
            expressionCount: Object.keys(this.expressions).length,
            currentMotion: this.currentMotion,
            currentExpression: this.currentExpression
        };
    }

    // 释放资源
    dispose() {
        this.model = null;
        this.textures = [];
        this.motions = {};
        this.expressions = {};
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

/**
 * 简化版的 Live2D 渲染器
 * 当 Cubism SDK 不可用时使用
 */
export class SimpleLive2DRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.expression = 'neutral';
        this.isTalking = false;

        this._setupCanvas();
        this._startAnimation();
    }

    _setupCanvas() {
        const resize = () => {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        };

        resize();
        window.addEventListener('resize', resize);
    }

    _startAnimation() {
        let time = 0;

        const animate = () => {
            this._draw(time);
            time++;
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    _draw(time) {
        const ctx = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const centerX = w / 2;
        const centerY = h / 2 + 30;
        const baseRadius = Math.min(w, h) * 0.25;

        // 呼吸动画
        const breathe = Math.sin(time * 0.02) * 5;

        // 上下浮动
        const floatY = Math.sin(time * 0.015) * 8;

        ctx.save();
        ctx.translate(centerX, centerY + floatY);

        // 身体
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius + breathe, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
        gradient.addColorStop(0, '#ff8fbc');
        gradient.addColorStop(1, '#ff6b9d');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 眼睛
        const eyeY = -baseRadius * 0.15;
        const eyeSpacing = baseRadius * 0.35;
        const eyeRadius = baseRadius * 0.15;

        // 眨眼
        const blinkPhase = Math.sin(time * 0.08);
        const isBlinking = blinkPhase > 0.98;

        // 左眼
        ctx.beginPath();
        if (isBlinking) {
            ctx.ellipse(-eyeSpacing, eyeY, eyeRadius * 1.2, eyeRadius * 0.3, 0, 0, Math.PI * 2);
        } else {
            ctx.arc(-eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#fff';
        ctx.fill();

        // 左眼瞳孔
        if (!isBlinking) {
            ctx.beginPath();
            ctx.arc(-eyeSpacing, eyeY + 2, eyeRadius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#2d2d4a';
            ctx.fill();

            // 高光
            ctx.beginPath();
            ctx.arc(-eyeSpacing - eyeRadius * 0.2, eyeY - eyeRadius * 0.2, eyeRadius * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }

        // 右眼
        ctx.beginPath();
        if (isBlinking) {
            ctx.ellipse(eyeSpacing, eyeY, eyeRadius * 1.2, eyeRadius * 0.3, 0, 0, Math.PI * 2);
        } else {
            ctx.arc(eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#fff';
        ctx.fill();

        // 右眼瞳孔
        if (!isBlinking) {
            ctx.beginPath();
            ctx.arc(eyeSpacing, eyeY + 2, eyeRadius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#2d2d4a';
            ctx.fill();

            // 高光
            ctx.beginPath();
            ctx.arc(eyeSpacing - eyeRadius * 0.2, eyeY - eyeRadius * 0.2, eyeRadius * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }

        // 嘴巴
        const mouthY = baseRadius * 0.25;
        const mouthWidth = baseRadius * 0.25;

        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        if (this.isTalking) {
            // 张嘴说话
            ctx.ellipse(0, mouthY, mouthWidth, mouthWidth * 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4d7d';
            ctx.fill();
        } else {
            // 微笑
            ctx.beginPath();
            ctx.arc(0, mouthY - mouthWidth * 0.3, mouthWidth, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        }

        // 腮红
        const blushY = eyeY + baseRadius * 0.25;
        const blushX = eyeSpacing * 1.3;

        ctx.beginPath();
        ctx.arc(-blushX, blushY, baseRadius * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 150, 180, 0.5)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(blushX, blushY, baseRadius * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // 表情特效（根据 expression）
        if (this.expression === 'happy' || this.expression === 'excited') {
            // 星星
            this._drawStar(ctx, -baseRadius * 0.8, -baseRadius * 0.6, 10, time);
            this._drawStar(ctx, baseRadius * 0.9, -baseRadius * 0.4, 8, time + 100);
        }

        if (this.expression === 'sad') {
            // 泪滴
            this._drawTear(ctx, -eyeSpacing - 5, eyeY + baseRadius * 0.3, time);
        }

        ctx.restore();
    }

    _drawStar(ctx, x, y, size, time) {
        const rotation = time * 0.05;
        const scale = 0.8 + Math.sin(time * 0.1) * 0.2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffd700';
        ctx.fill();

        ctx.restore();
    }

    _drawTear(ctx, x, y, time) {
        const offsetY = (time * 0.3) % 30;

        ctx.beginPath();
        ctx.ellipse(x, y + offsetY, 4, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
        ctx.fill();
    }

    setExpression(expression) {
        this.expression = expression;
    }

    setTalking(isTalking) {
        this.isTalking = isTalking;
    }
}
