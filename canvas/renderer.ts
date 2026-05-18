// src/canvas/renderer.ts

import { Shape, Arrow, ViewState } from "../types/canvas";
import { COLORS, GRID_SIZE } from "./constants";

/**
 * CanvasRenderer
 * Responsible for drawing all shapes, arrows, selection handles,
 * the dot-grid background, and the minimap overlay.
 */
export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    width: number;
    height: number;

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    updateSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = COLORS.canvasBg;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    setViewTransform(viewState: ViewState): void {
        this.ctx.save();
        this.ctx.translate(viewState.offsetX, viewState.offsetY);
        this.ctx.scale(viewState.zoom, viewState.zoom);
    }

    resetTransform(): void {
        this.ctx.restore();
    }

    /** Alias used by engine.ts */
    restoreViewTransform(): void {
        this.ctx.restore();
    }

    /** Draw dot-grid background aligned to world space */
    drawGrid(viewState: ViewState): void {
        const { offsetX, offsetY, zoom } = viewState;
        const dotColor = "rgba(255,255,255,0.07)";
        const dotRadius = 1;
        const spacingWorld = GRID_SIZE;
        const spacingScreen = spacingWorld * zoom;

        if (spacingScreen < 6) return; // don't render when too dense

        const startX = ((offsetX % spacingScreen) + spacingScreen) % spacingScreen;
        const startY = ((offsetY % spacingScreen) + spacingScreen) % spacingScreen;

        this.ctx.fillStyle = dotColor;
        for (let x = startX; x < this.width; x += spacingScreen) {
            for (let y = startY; y < this.height; y += spacingScreen) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    /** Rounded rectangle helper */
    private roundRect(x: number, y: number, w: number, h: number, r: number): void {
        const cr = Math.min(r, w / 2, h / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(x + cr, y);
        this.ctx.lineTo(x + w - cr, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + cr);
        this.ctx.lineTo(x + w, y + h - cr);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
        this.ctx.lineTo(x + cr, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - cr);
        this.ctx.lineTo(x, y + cr);
        this.ctx.quadraticCurveTo(x, y, x + cr, y);
        this.ctx.closePath();
    }

    /** Draw centered label text with optional bold markdown */
    private drawLabel(text: string, x: number, y: number, maxWidth: number, fontSize: number, color: string): void {
        if (!text) return;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        if (text.includes("**")) {
            const parts = text.split("**");
            this.ctx.font = `${fontSize}px Outfit, sans-serif`;
            const totalWidth = parts.reduce((sum, part, i) => {
                this.ctx.font = `${i % 2 !== 0 ? "bold " : ""}${fontSize}px Outfit, sans-serif`;
                return sum + this.ctx.measureText(part).width;
            }, 0);
            let currentX = x - Math.min(totalWidth, maxWidth) / 2;
            this.ctx.textAlign = "left";
            parts.forEach((part, i) => {
                if (!part) return;
                this.ctx.font = `${i % 2 !== 0 ? "bold " : ""}${fontSize}px Outfit, sans-serif`;
                this.ctx.fillText(part, currentX, y, maxWidth);
                currentX += this.ctx.measureText(part).width;
            });
            return;
        }

        this.ctx.font = `${fontSize}px Outfit, sans-serif`;
        this.ctx.fillText(text, x, y, maxWidth);
    }

    /** Apply common shape stroke+fill settings */
    private applyShapeStyle(shape: Shape): void {
        this.ctx.globalAlpha = shape.opacity ?? 1;
        this.ctx.strokeStyle = shape.strokeColor || COLORS.accent;
        this.ctx.lineWidth = shape.strokeWidth || 2;
        this.ctx.fillStyle = shape.fillColor || "transparent";
    }

    /** Main dispatcher — draws a shape according to its type */
    drawShape(shape: Shape, isSelected: boolean, isEditing: boolean): void {
        this.ctx.save();

        if (shape.rotation) {
            const cx = shape.x + shape.w / 2;
            const cy = shape.y + shape.h / 2;
            this.ctx.translate(cx, cy);
            this.ctx.rotate((shape.rotation * Math.PI) / 180);
            this.ctx.translate(-cx, -cy);
        }

        this.applyShapeStyle(shape);

        switch (shape.type) {
            case "rectangle": this.drawRectangle(shape); break;
            case "rounded-rect": this.drawRoundedRect(shape); break;
            case "circle": this.drawCircle(shape); break;
            case "database":
            case "cylinder": this.drawCylinder(shape); break;
            case "api-gateway": this.drawApiGateway(shape); break;
            case "load-balancer": this.drawLoadBalancer(shape); break;
            case "queue": this.drawQueue(shape); break;
            case "redis-cache": this.drawRedisCache(shape); break;
            case "cdn": this.drawCdn(shape); break;
            case "kafka": this.drawKafka(shape); break;
            case "service": this.drawService(shape); break;
            case "auth": this.drawAuth(shape); break;
            case "message": this.drawMessage(shape); break;
            case "comment-bubble": this.drawCommentBubble(shape); break;
            case "worker": this.drawWorker(shape); break;
            case "storage": this.drawStorage(shape); break;
            case "analytics": this.drawAnalytics(shape); break;
            case "external-api": this.drawExternalApi(shape); break;
            case "mobile-client": this.drawMobileClient(shape); break;
            case "browser-client": this.drawBrowserClient(shape); break;
            case "server": this.drawServer(shape); break;
            case "cron": this.drawCron(shape); break;
            case "websocket": this.drawWebsocket(shape); break;
            case "group":
            case "container": this.drawContainer(shape); break;
            case "text": this.drawText(shape); break;
            case "code-block": this.drawCodeBlock(shape); break;
            case "annotation": this.drawAnnotation(shape); break;
            default: this.drawRectangle(shape); break;
        }

        if (isSelected) this.drawSelectionHandles(shape);
        if (isEditing) this.drawEditingBorder(shape);

        this.ctx.globalAlpha = 1;
        this.ctx.restore();
    }

    private drawRectangle(shape: Shape): void {
        this.ctx.beginPath();
        this.ctx.rect(shape.x, shape.y, shape.w, shape.h);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();
        this.drawLabel(shape.label, shape.x + shape.w / 2, shape.y + shape.h / 2, shape.w - 12, 13, COLORS.textPrimary);
    }

    private drawRoundedRect(shape: Shape): void {
        this.roundRect(shape.x, shape.y, shape.w, shape.h, 10);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();
        this.drawLabel(shape.label, shape.x + shape.w / 2, shape.y + shape.h / 2, shape.w - 12, 13, COLORS.textPrimary);
    }

    private drawCircle(shape: Shape): void {
        const cx = shape.x + shape.w / 2;
        const cy = shape.y + shape.h / 2;
        const rx = shape.w / 2;
        const ry = shape.h / 2;
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();
        this.drawLabel(shape.label, cx, cy, shape.w - 12, 13, COLORS.textPrimary);
    }

    private drawCylinder(shape: Shape): void {
        const { x, y, w, h } = shape;
        const rx = w / 2;
        const ry = Math.max(h * 0.15, 10);
        const cx = x + rx;

        this.ctx.beginPath();
        this.ctx.ellipse(cx, y + ry, rx, ry, 0, Math.PI, 0);
        this.ctx.lineTo(x + w, y + h - ry);
        this.ctx.ellipse(cx, y + h - ry, rx, ry, 0, 0, Math.PI);
        this.ctx.lineTo(x, y + ry);
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.ellipse(cx, y + ry, rx, ry, 0, 0, Math.PI * 2);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, y + h / 2 + ry / 2, w - 12, 12, COLORS.textPrimary);
    }

    private drawApiGateway(shape: Shape): void {
        const { x, y, w, h } = shape;
        // Draw as hexagon
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(cx + rx * 0.5, cy - ry);       // top-right
        this.ctx.lineTo(cx + rx, cy - ry * 0.5);       // right-top
        this.ctx.lineTo(cx + rx, cy + ry * 0.5);       // right-bottom
        this.ctx.lineTo(cx + rx * 0.5, cy + ry);       // bottom-right
        this.ctx.lineTo(cx - rx * 0.5, cy + ry);       // bottom-left
        this.ctx.lineTo(cx - rx, cy + ry * 0.5);       // left-bottom
        this.ctx.lineTo(cx - rx, cy - ry * 0.5);       // left-top
        this.ctx.lineTo(cx - rx * 0.5, cy - ry);       // top-left
        this.ctx.closePath();

        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy, w - 12, 13, COLORS.textPrimary);
    }

    private drawLoadBalancer(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as diamond
        this.ctx.beginPath();
        this.ctx.moveTo(cx, y);                  // top point
        this.ctx.lineTo(x + w, cy);              // right point
        this.ctx.lineTo(cx, y + h);              // bottom point
        this.ctx.lineTo(x, cy);                  // left point
        this.ctx.closePath();

        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy, w - 12, 13, COLORS.textPrimary);
    }

    private drawQueue(shape: Shape): void {
        const { x, y, w, h } = shape;
        // Queue as stacked bars
        const barH = h / 5;
        const barY1 = y + 8;
        const barY2 = y + h / 2 - barH / 2;
        const barY3 = y + h - barH - 8;

        const barX = x + 12;
        const barW = w - 24;

        [barY1, barY2, barY3].forEach((by) => {
            this.ctx.beginPath();
            this.ctx.rect(barX, by, barW, barH);
            if (shape.fillColor !== "transparent") this.ctx.fill();
            this.ctx.stroke();
        });

        this.drawLabel(shape.label, x + w / 2, y + h - 16, w - 24, 11, COLORS.textPrimary);
    }

    private drawRedisCache(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const ry = Math.min(h * 0.14, 12);
        // Draw as a flat disc/cylinder
        this.ctx.beginPath();
        this.ctx.ellipse(cx, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(x, y + ry);
        this.ctx.lineTo(x, y + h - ry);
        this.ctx.ellipse(cx, y + h - ry, w / 2, ry, 0, Math.PI, 0);
        this.ctx.lineTo(x + w, y + ry);
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.drawLabel("Redis", cx, y + h / 2 + 4, w - 12, 11, COLORS.textSecondary);
        if (shape.label && shape.label.toLowerCase() !== "redis") {
            this.drawLabel(shape.label, cx, y + h / 2 + 18, w - 12, 12, COLORS.textPrimary);
        }
    }

    private drawCdn(shape: Shape): void {
        const { x, y, w, h } = shape;
        this.roundRect(x, y, w, h, 20);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = shape.strokeColor;
        this.ctx.font = "bold 9px Outfit, monospace";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        this.ctx.fillText("CDN", x + 8, y + 8);

        this.drawLabel(shape.label, x + w / 2, y + h / 2 + 4, w - 16, 12, COLORS.textPrimary);
    }

    private drawKafka(shape: Shape): void {
        const { x, y, w, h } = shape;
        // Kafka icon: hexagon-ish or parallelogram
        const off = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(x + off, y);
        this.ctx.lineTo(x + w, y);
        this.ctx.lineTo(x + w - off, y + h);
        this.ctx.lineTo(x, y + h);
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = shape.strokeColor;
        this.ctx.font = "bold 8px Outfit, monospace";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        this.ctx.fillText("Kafka", x + off + 4, y + 6);

        this.drawLabel(shape.label, x + w / 2, y + h / 2 + 6, w - 16, 12, COLORS.textPrimary);
    }

    private drawService(shape: Shape): void {
        const { x, y, w, h } = shape;
        this.roundRect(x, y, w, h, 8);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();
        this.drawLabel(shape.label, x + w / 2, y + h / 2, w - 12, 13, COLORS.textPrimary);
    }

    private drawAuth(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2 * 0.85;
        const ry = h / 2 * 0.9;

        // Draw as shield shape
        this.ctx.beginPath();
        this.ctx.moveTo(cx - rx, cy - ry);        // top-left
        this.ctx.lineTo(cx + rx, cy - ry);        // top-right
        this.ctx.lineTo(cx + rx, cy - ry * 0.3); // right side
        this.ctx.quadraticCurveTo(cx + rx * 0.7, cy + ry * 0.8, cx, cy + ry);
        this.ctx.quadraticCurveTo(cx - rx * 0.7, cy + ry * 0.8, cx - rx, cy - ry * 0.3);
        this.ctx.closePath();

        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy - 4, w - 12, 13, COLORS.textPrimary);
    }

    private drawContainer(shape: Shape): void {
        const { x, y, w, h } = shape;
        this.ctx.save();
        this.ctx.setLineDash([6, 4]);
        this.roundRect(x, y, w, h, 12);
        this.ctx.strokeStyle = shape.strokeColor + "88";
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.restore();

        // Header label area
        this.ctx.fillStyle = shape.strokeColor + "22";
        this.roundRect(x, y, w, 28, 12);
        this.ctx.fill();

        this.ctx.font = "bold 12px Outfit, sans-serif";
        this.ctx.fillStyle = shape.strokeColor;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(shape.label || "Group", x + 12, y + 14, w - 20);
    }

    private drawText(shape: Shape): void {
        this.ctx.font = "14px Outfit, sans-serif";
        this.ctx.fillStyle = shape.strokeColor || COLORS.textPrimary;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        const lines = (shape.label || "").split("\n");
        lines.forEach((line, i) => {
            this.ctx.fillText(line, shape.x + 4, shape.y + 4 + i * 18, shape.w - 8);
        });
    }

    private drawCodeBlock(shape: Shape): void {
        const { x, y, w, h } = shape;
        this.roundRect(x, y, w, h, 6);
        this.ctx.fillStyle = "rgba(15,23,42,0.6)";
        this.ctx.fill();
        this.ctx.strokeStyle = "#334155";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Header bar
        this.ctx.fillStyle = "#1e293b";
        this.roundRect(x, y, w, 24, 6);
        this.ctx.fill();

        this.ctx.font = "11px Outfit, monospace";
        this.ctx.fillStyle = "#94a3b8";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(shape.label || "Code", x + 10, y + 12, w - 20);
    }

    private drawAnnotation(shape: Shape): void {
        const { x, y, w, h } = shape;
        this.ctx.save();
        this.ctx.globalAlpha = 0.9;
        this.roundRect(x, y, w, h, 6);
        this.ctx.fillStyle = "rgba(254,243,199,0.12)";
        this.ctx.fill();
        this.ctx.strokeStyle = "#f59e0b";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.font = "12px Outfit, sans-serif";
        this.ctx.fillStyle = "#fef3c7";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";
        const lines = (shape.label || "").split("\n");
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x + 8, y + 8 + i * 16, w - 16);
        });
    }

    private drawMessage(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as rounded rectangle with message tail
        this.roundRect(x, y, w, h - 8, 8);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Message tail triangle at bottom
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, y + h - 8);
        this.ctx.lineTo(cx + 8, y + h - 8);
        this.ctx.lineTo(cx, y + h);
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy - 4, w - 16, 12, COLORS.textPrimary);
    }

    private drawCommentBubble(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as speech bubble (rounded rect with tail pointing left)
        this.roundRect(x + 8, y, w - 8, h, 8);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Tail triangle on left
        this.ctx.beginPath();
        this.ctx.moveTo(x + 8, cy - 6);
        this.ctx.lineTo(x + 8, cy + 6);
        this.ctx.lineTo(x - 4, cy);
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        this.drawLabel(shape.label, cx + 4, cy, w - 20, 12, COLORS.textPrimary);
    }

    private drawWorker(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as gear/cog (rotated square with notches)
        const numTeeth = 8;
        const outerR = Math.min(w, h) / 2 * 0.9;
        const innerR = outerR * 0.6;

        this.ctx.beginPath();
        for (let i = 0; i < numTeeth * 2; i++) {
            const angle = (i * Math.PI) / numTeeth;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Center hole
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, innerR * 0.4, 0, Math.PI * 2);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy + h / 2.5, w - 12, 11, COLORS.textPrimary);
    }

    private drawStorage(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as bucket/container
        const top = y + h * 0.15;
        const bottom = y + h * 0.85;
        const side = w * 0.25;

        this.ctx.beginPath();
        this.ctx.moveTo(x + side, top);
        this.ctx.lineTo(x + w - side, top);
        this.ctx.lineTo(x + w, bottom);
        this.ctx.lineTo(x, bottom);
        this.ctx.closePath();
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Handle
        this.ctx.beginPath();
        this.ctx.moveTo(x + w * 0.3, top);
        this.ctx.quadraticCurveTo(cx, y - 10, x + w * 0.7, top);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy, w - 12, 12, COLORS.textPrimary);
    }

    private drawAnalytics(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as bar chart (3 bars of different heights)
        const barW = w * 0.18;
        const spacing = w * 0.05;
        const x1 = x + w * 0.15;
        const x2 = x1 + barW + spacing;
        const x3 = x2 + barW + spacing;

        const h1 = h * 0.6;
        const h2 = h * 0.8;
        const h3 = h * 0.4;

        const baseline = y + h * 0.7;

        [
            { x: x1, h: h1 },
            { x: x2, h: h2 },
            { x: x3, h: h3 },
        ].forEach((bar) => {
            this.ctx.beginPath();
            this.ctx.rect(bar.x, baseline - bar.h, barW, bar.h);
            if (shape.fillColor !== "transparent") this.ctx.fill();
            this.ctx.stroke();
        });

        // Baseline
        this.ctx.beginPath();
        this.ctx.moveTo(x + w * 0.1, baseline);
        this.ctx.lineTo(x + w * 0.9, baseline);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, y + h - 14, w - 12, 11, COLORS.textPrimary);
    }

    private drawExternalApi(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as globe (circle with latitude/longitude lines)
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, Math.min(w, h) / 2 * 0.85, 0, Math.PI * 2);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Latitude lines
        for (let i = 1; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, (Math.min(w, h) / 2 * 0.85 * (3 - i)) / 3, (Math.min(w, h) / 2 * 0.85 * (3 - i)) / 6, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Vertical meridian
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, Math.min(w, h) / 2 * 0.85, 0, Math.PI * 2);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, cy + h / 2.5, w - 12, 11, COLORS.textPrimary);
    }

    private drawMobileClient(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as mobile phone frame
        this.roundRect(x + w * 0.15, y + h * 0.05, w * 0.7, h * 0.9, 8);
        this.ctx.stroke();

        // Screen area
        this.roundRect(x + w * 0.2, y + h * 0.1, w * 0.6, h * 0.75, 4);
        this.ctx.fillStyle = shape.fillColor || "transparent";
        this.ctx.fill();
        this.ctx.stroke();

        // Notch at top
        this.roundRect(cx - w * 0.12, y + h * 0.05, w * 0.24, h * 0.06, 2);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, y + h - 12, w - 12, 10, COLORS.textPrimary);
    }

    private drawBrowserClient(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const headerH = h * 0.15;

        // Draw as browser window frame
        this.roundRect(x, y, w, h, 4);
        this.ctx.stroke();

        // Title bar
        this.ctx.beginPath();
        this.ctx.rect(x, y, w, headerH);
        this.ctx.stroke();

        // URL bar
        this.ctx.fillStyle = shape.fillColor || "transparent";
        this.roundRect(x + w * 0.04, y + headerH * 0.5, w * 0.92, headerH * 0.4, 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Dots (menu)
        const dotX = x + w - 8;
        const dotY = y + headerH / 2;
        [0, 6, 12].forEach((offset) => {
            this.ctx.beginPath();
            this.ctx.arc(dotX - offset, dotY, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.drawLabel(shape.label, cx, y + h - 14, w - 12, 11, COLORS.textPrimary);
    }

    private drawServer(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;

        // Draw as server tower (stacked rectangles)
        const boxH = h / 3.5;
        const spacing = 4;

        for (let i = 0; i < 3; i++) {
            const by = y + 8 + i * (boxH + spacing);
            this.roundRect(x + 8, by, w - 16, boxH, 2);
            if (shape.fillColor !== "transparent") this.ctx.fill();
            this.ctx.stroke();

            // Indicator lights
            for (let j = 0; j < 2; j++) {
                this.ctx.fillStyle = j === 0 ? "#10b981" : "#ef4444";
                this.ctx.beginPath();
                this.ctx.arc(x + 14 + j * 8, by + boxH / 2, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.drawLabel(shape.label, cx, y + h - 12, w - 12, 11, COLORS.textPrimary);
    }

    private drawCron(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as clock
        const r = Math.min(w, h) / 2 * 0.85;

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Clock numbers (12, 3, 6, 9)
        this.ctx.font = "8px Outfit, sans-serif";
        this.ctx.fillStyle = COLORS.textPrimary;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        ["12", "3", "6", "9"].forEach((num, i) => {
            const angle = (i * Math.PI) / 2 - Math.PI / 2;
            const nx = cx + Math.cos(angle) * r * 0.7;
            const ny = cy + Math.sin(angle) * r * 0.7;
            this.ctx.fillText(num, nx, ny);
        });

        // Hour and minute hands
        const now = Date.now() / 1000;
        const seconds = now % 60;
        const minutes = (now / 60) % 60;
        const hours = (now / 3600) % 12;

        // Hour hand
        const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(
            cx + Math.cos(hourAngle) * r * 0.5,
            cy + Math.sin(hourAngle) * r * 0.5
        );
        this.ctx.stroke();

        // Minute hand
        const minAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(
            cx + Math.cos(minAngle) * r * 0.7,
            cy + Math.sin(minAngle) * r * 0.7
        );
        this.ctx.stroke();

        // Center dot
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.drawLabel(shape.label, cx, cy + h / 2.5, w - 12, 11, COLORS.textPrimary);
    }

    private drawWebsocket(shape: Shape): void {
        const { x, y, w, h } = shape;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Draw as bidirectional connection (two arrows pointing opposite directions)
        const boxW = w * 0.4;
        const boxH = h * 0.4;

        // Left box
        this.roundRect(x + 8, cy - boxH / 2, boxW, boxH, 4);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Right box
        this.roundRect(x + w - boxW - 8, cy - boxH / 2, boxW, boxH, 4);
        if (shape.fillColor !== "transparent") this.ctx.fill();
        this.ctx.stroke();

        // Left arrow (→)
        const arrowMid = x + w / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + boxW + 12, cy);
        this.ctx.lineTo(arrowMid - 12, cy);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(arrowMid - 12, cy);
        this.ctx.lineTo(arrowMid - 8, cy - 3);
        this.ctx.moveTo(arrowMid - 12, cy);
        this.ctx.lineTo(arrowMid - 8, cy + 3);
        this.ctx.stroke();

        // Right arrow (←)
        this.ctx.beginPath();
        this.ctx.moveTo(x + w - boxW - 12, cy);
        this.ctx.lineTo(arrowMid + 12, cy);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(arrowMid + 12, cy);
        this.ctx.lineTo(arrowMid + 8, cy - 3);
        this.ctx.moveTo(arrowMid + 12, cy);
        this.ctx.lineTo(arrowMid + 8, cy + 3);
        this.ctx.stroke();

        this.drawLabel(shape.label, cx, y + h - 14, w - 12, 11, COLORS.textPrimary);
    }

    /** Draw selection handles around a shape */
    drawSelectionHandles(shape: Shape): void {
        const HANDLE = 7;
        const { x, y, w, h } = shape;
        const handles = [
            { x: x - HANDLE / 2, y: y - HANDLE / 2 },
            { x: x + w / 2 - HANDLE / 2, y: y - HANDLE / 2 },
            { x: x + w - HANDLE / 2, y: y - HANDLE / 2 },
            { x: x + w - HANDLE / 2, y: y + h / 2 - HANDLE / 2 },
            { x: x + w - HANDLE / 2, y: y + h - HANDLE / 2 },
            { x: x + w / 2 - HANDLE / 2, y: y + h - HANDLE / 2 },
            { x: x - HANDLE / 2, y: y + h - HANDLE / 2 },
            { x: x - HANDLE / 2, y: y + h / 2 - HANDLE / 2 },
        ];

        // Selection border
        this.ctx.save();
        this.ctx.strokeStyle = COLORS.accent;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 3]);
        this.ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        this.ctx.setLineDash([]);

        // Handle squares
        handles.forEach((h) => {
            this.ctx.fillStyle = "#ffffff";
            this.ctx.strokeStyle = COLORS.accent;
            this.ctx.lineWidth = 1.5;
            this.ctx.fillRect(h.x, h.y, HANDLE, HANDLE);
            this.ctx.strokeRect(h.x, h.y, HANDLE, HANDLE);
        });

        // Delete button in top-right corner
        const buttonSize = 20;
        const buttonX = x + w + 8;
        const buttonY = y - 10;
        
        // Red background circle
        this.ctx.fillStyle = COLORS.error;
        this.ctx.beginPath();
        this.ctx.arc(buttonX, buttonY, buttonSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // White X icon
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = "round";
        
        const iconSize = 7;
        const iconX = buttonX;
        const iconY = buttonY;
        
        // Draw X (cross) icon
        this.ctx.beginPath();
        this.ctx.moveTo(iconX - iconSize, iconY - iconSize);
        this.ctx.lineTo(iconX + iconSize, iconY + iconSize);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(iconX + iconSize, iconY - iconSize);
        this.ctx.lineTo(iconX - iconSize, iconY + iconSize);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    /** Glow border when shape is text-editing */
    drawEditingBorder(shape: Shape): void {
        this.ctx.save();
        this.ctx.strokeStyle = COLORS.accent;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = COLORS.accent;
        this.ctx.shadowBlur = 8;
        this.ctx.strokeRect(shape.x - 2, shape.y - 2, shape.w + 4, shape.h + 4);
        this.ctx.restore();
    }

    /** Draw an arrow connector between two shapes */
    drawArrowConnector(
        arrow: Arrow,
        fromShape: Shape,
        toShape: Shape,
        isSelected: boolean
    ): void {
        const getCenter = (s: Shape) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
        const from = getCenter(fromShape);
        const to = getCenter(toShape);

        this.ctx.save();
        this.ctx.strokeStyle = isSelected ? COLORS.accent : (arrow.strokeColor || "#6b7280");
        this.ctx.lineWidth = arrow.strokeWidth || 2;

        if (arrow.strokeStyle === "dashed") this.ctx.setLineDash([6, 4]);
        else if (arrow.strokeStyle === "dotted") this.ctx.setLineDash([2, 3]);

        // Animated dashes (event streams)
        const offset = arrow.animated ? (Date.now() / 60) % 30 : 0;
        if (arrow.animated) this.ctx.lineDashOffset = -offset;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) { this.ctx.restore(); return; }

        const ux = dx / len;
        const uy = dy / len;
        const startX = from.x + ux * Math.min(fromShape.w / 2, 60);
        const startY = from.y + uy * Math.min(fromShape.h / 2, 40);
        const endX = to.x - ux * Math.min(toShape.w / 2, 60);
        const endY = to.y - uy * Math.min(toShape.h / 2, 40);

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Arrow head
        this.ctx.setLineDash([]);
        this.ctx.lineDashOffset = 0;
        const headLen = 12;
        const angle = Math.atan2(endY - startY, endX - startX);
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
        this.ctx.stroke();

        // Bidirectional: also draw reverse head
        if (arrow.bidirectional) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(startX + headLen * Math.cos(angle - 0.4 + Math.PI), startY + headLen * Math.sin(angle - 0.4 + Math.PI));
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(startX + headLen * Math.cos(angle + 0.4 + Math.PI), startY + headLen * Math.sin(angle + 0.4 + Math.PI));
            this.ctx.stroke();
        }

        // Label
        if (arrow.label) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            this.ctx.font = "11px Outfit, sans-serif";
            this.ctx.fillStyle = "#cbd5e1";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillStyle = "rgba(11,18,32,0.7)";
            const tw = this.ctx.measureText(arrow.label).width;
            this.ctx.fillRect(midX - tw / 2 - 4, midY - 9, tw + 8, 18);
            this.ctx.fillStyle = "#cbd5e1";
            this.ctx.fillText(arrow.label, midX, midY);
        }

        this.ctx.restore();
    }

    /** Preview line while drawing an arrow (dashed) */
    drawArrowPreview(x1: number, y1: number, x2: number, y2: number): void {
        this.ctx.save();
        this.ctx.setLineDash([6, 4]);
        this.ctx.strokeStyle = COLORS.accent;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    /** Draw the marquee (lasso) selection rectangle in screen space */
    drawMarqueeSelection(x: number, y: number, w: number, h: number): void {
        this.ctx.fillStyle = "rgba(91,127,255,0.1)";
        this.ctx.fillRect(x, y, w, h);

        this.ctx.strokeStyle = "rgba(91,127,255,0.6)";
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeStyle = "rgba(91,127,255,0.4)";
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.setLineDash([]);
    }

    /** Minimap overlay – drawn in screen space (after restoring transform) */
    drawMinimap(shapes: Shape[], viewState: ViewState): void {
        const MAP_SIZE = 150;
        const PADDING = 20;
        const mapX = this.width - MAP_SIZE - PADDING;
        const mapY = this.height - MAP_SIZE - PADDING;

        this.ctx.save();
        
        // ── Begin strict clip region ──────────────────────────────────────────────
        this.ctx.beginPath();
        this.roundRect(mapX, mapY, MAP_SIZE, MAP_SIZE, 8);
        this.ctx.clip();

        // Background
        this.ctx.fillStyle = "rgba(11,18,32,0.88)";
        this.ctx.fillRect(mapX, mapY, MAP_SIZE, MAP_SIZE);

        if (shapes.length === 0) { 
            this.ctx.restore(); 
            return; 
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shapes.forEach((s) => {
            if (s.x < minX) minX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.x + s.w > maxX) maxX = s.x + s.w;
            if (s.y + s.h > maxY) maxY = s.y + s.h;
        });

        const worldW = maxX - minX || 1;
        const worldH = maxY - minY || 1;
        const inset = 10;
        const mapScale = Math.min((MAP_SIZE - inset * 2) / worldW, (MAP_SIZE - inset * 2) / worldH);

        this.ctx.save();
        this.ctx.translate(mapX + inset, mapY + inset);
        this.ctx.scale(mapScale, mapScale);
        this.ctx.translate(-minX, -minY);

        shapes.forEach((s) => {
            this.ctx.fillStyle = s.strokeColor + "88";
            this.ctx.fillRect(s.x, s.y, s.w, s.h);
        });

        // Viewport rectangle
        const vpWorldX = -viewState.offsetX / viewState.zoom;
        const vpWorldY = -viewState.offsetY / viewState.zoom;
        const vpWorldW = this.width / viewState.zoom;
        const vpWorldH = this.height / viewState.zoom;

        this.ctx.strokeStyle = "#60a5fa";
        this.ctx.lineWidth = 2 / mapScale;
        this.ctx.strokeRect(vpWorldX, vpWorldY, vpWorldW, vpWorldH);
        this.ctx.fillStyle = "rgba(96,165,250,0.1)";
        this.ctx.fillRect(vpWorldX, vpWorldY, vpWorldW, vpWorldH);

        this.ctx.restore();
        this.ctx.restore(); // removes clip
        // ── End clip region ───────────────────────────────────────────────────────

        // Border drawn OUTSIDE clip (so it appears on top cleanly)
        this.ctx.strokeStyle = "#64748b";
        this.ctx.lineWidth = 1;
        this.ctx.save();
        this.roundRect(mapX, mapY, MAP_SIZE, MAP_SIZE, 8);
        this.ctx.stroke();
        this.ctx.restore();
    }

    // ─── Compatibility API for architectureEngine.ts ────────────────────────

    /** Alias: resize the internal size tracking */
    resize(width: number, height: number): void {
        this.updateSize(width, height);
    }

    /** Begin drawing in world space (save + apply view transform) */
    beginWorld(viewState: ViewState): void {
        this.setViewTransform(viewState);
    }

    /** End world-space drawing (restore) */
    endWorld(): void {
        this.ctx.restore();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawNode(node: any, isSelected: boolean): void {
        const shape = {
            id: node.id, type: node.nodeType ?? "service",
            x: node.visual.x, y: node.visual.y, w: node.visual.w, h: node.visual.h,
            label: node.title ?? "",
            fillColor: "transparent",
            strokeColor: node.visual.color ?? COLORS.accent,
            strokeWidth: 2, opacity: 1, rotation: 0, locked: false,
            zIndex: node.visual.zIndex,
        } as Shape;
        this.drawShape(shape, isSelected, false);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawContainerNode(node: any, isSelected: boolean): void {
        this.drawNode(node, isSelected);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawEdge(edge: any, fromNode: any, toNode: any, isSelected: boolean): void {
        const arrow = {
            id: edge.id,
            fromShapeId: edge.fromNodeId,
            toShapeId: edge.toNodeId,
            fromPoint: "center" as const, toPoint: "center" as const,
            strokeColor: edge.strokeColor ?? COLORS.textSecondary,
            strokeWidth: edge.strokeWidth ?? 2,
            strokeStyle: (edge.strokeStyle ?? "solid") as "solid" | "dashed" | "dotted",
            bidirectional: edge.bidirectional ?? false,
            animated: edge.animated ?? false,
            label: edge.label,
        } as Arrow;
        const from = { id: fromNode.id, x: fromNode.visual.x, y: fromNode.visual.y, w: fromNode.visual.w, h: fromNode.visual.h, type: "rectangle", label: "", fillColor: "transparent", strokeColor: "", strokeWidth: 2, opacity: 1, rotation: 0, locked: false } as Shape;
        const to = { id: toNode.id, x: toNode.visual.x, y: toNode.visual.y, w: toNode.visual.w, h: toNode.visual.h, type: "rectangle", label: "", fillColor: "transparent", strokeColor: "", strokeWidth: 2, opacity: 1, rotation: 0, locked: false } as Shape;
        this.drawArrowConnector(arrow, from, to, isSelected);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawArrowFromIndicator(node: any): void {
        this.ctx.save();
        this.ctx.strokeStyle = COLORS.accent;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 3]);
        this.ctx.strokeRect(node.visual.x - 3, node.visual.y - 3, node.visual.w + 6, node.visual.h + 6);
        this.ctx.restore();
    }
}

