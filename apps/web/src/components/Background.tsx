import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/motion';

interface Point {
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	warm: boolean;
	ph: number;
}

// Fixed backdrop: drifting blobs, a moving grid, a particle network that shies away from the pointer, and a dot spotlight that follows it.
export function Background() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const spotRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const c = canvasRef.current;
		const ctx = c?.getContext('2d');
		if (!c || !ctx) return;
		const reduce = prefersReducedMotion();
		// The canvas is drawn at 1x, whatever the screen: its faint 1px lines and small dots look the same, and a 2x backing store is four times the pixels to clear, draw and hand to the compositor every frame, which Firefox's software renderer does on the CPU.
		const dpr = 1;
		let w = 0;
		let h = 0;
		let pts: Point[] = [];
		let raf = 0;
		let tt = 0;
		let last = 0;
		const mouse = { x: -9999, y: -9999 };

		const size = () => {
			w = c.clientWidth || window.innerWidth;
			h = c.clientHeight || window.innerHeight;
			c.width = w * dpr;
			c.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			// Connecting lines cost O(n²) per frame; phones and touch screens (no pointer to react to) get fewer points.
			const cap = w < 700 || window.matchMedia('(pointer: coarse)').matches ? 50 : 110;
			const n = Math.max(30, Math.min(cap, Math.round((w * h) / 15000)));
			pts = Array.from({ length: n }, () => ({
				x: Math.random() * w,
				y: Math.random() * h,
				vx: (Math.random() - 0.5) * 0.28,
				vy: (Math.random() - 0.5) * 0.28,
				r: Math.random() * 1.4 + 0.6,
				warm: Math.random() < 0.12,
				ph: Math.random() * 6.28,
			}));
		};

		// Redrawn about 30 times a second: the points drift slowly, so the eye does not miss the other frames, and every redraw changes the whole fixed backdrop the browser has to composite. Motion is scaled by the time since the last redraw (dt, in 60 Hz frames), so the drift keeps its speed at any refresh rate; called without a timestamp (reduced motion, resize) it draws one step.
		const frame = (now?: number) => {
			if (now !== undefined && last && now - last < 32) {
				raf = requestAnimationFrame(frame);
				return;
			}
			const dt = now !== undefined && last ? Math.min((now - last) / 16.667, 4) : 1;
			if (now !== undefined) last = now;
			tt += 0.016 * dt;
			ctx.clearRect(0, 0, w, h);
			for (const p of pts) {
				const dx = mouse.x - p.x;
				const dy = mouse.y - p.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < 200 && d > 1) {
					p.x -= (dx / d) * 0.35 * dt;
					p.y -= (dy / d) * 0.35 * dt;
				}
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				if (p.x < -20) p.x = w + 20;
				if (p.x > w + 20) p.x = -20;
				if (p.y < -20) p.y = h + 20;
				if (p.y > h + 20) p.y = -20;
			}
			ctx.lineWidth = 1;
			for (let i = 0; i < pts.length; i++) {
				const p = pts[i];
				for (let j = i + 1; j < pts.length; j++) {
					const q = pts[j];
					const dx = p.x - q.x;
					const dy = p.y - q.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < 16900) {
						ctx.strokeStyle = `rgba(63,211,245,${((1 - Math.sqrt(d2) / 130) * 0.16).toFixed(3)})`;
						ctx.beginPath();
						ctx.moveTo(p.x, p.y);
						ctx.lineTo(q.x, q.y);
						ctx.stroke();
					}
				}
				const dx = mouse.x - p.x;
				const dy = mouse.y - p.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < 220) {
					ctx.strokeStyle = `rgba(63,211,245,${((1 - d / 220) * 0.45).toFixed(3)})`;
					ctx.beginPath();
					ctx.moveTo(p.x, p.y);
					ctx.lineTo(mouse.x, mouse.y);
					ctx.stroke();
				}
			}
			for (const p of pts) {
				const tw = 0.55 + 0.45 * Math.sin(tt * 1.6 + p.ph);
				ctx.fillStyle = p.warm ? `rgba(255,181,71,${(0.8 * tw).toFixed(3)})` : `rgba(150,232,250,${(0.75 * tw).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, 6.2832);
				ctx.fill();
			}
			if (!reduce) raf = requestAnimationFrame(frame);
		};

		const move = (e: PointerEvent) => {
			mouse.x = e.clientX;
			mouse.y = e.clientY;
			spotRef.current?.style.setProperty('--mx', `${e.clientX}px`);
			spotRef.current?.style.setProperty('--my', `${e.clientY}px`);
			if (reduce) frame();
		};
		const leave = () => {
			mouse.x = -9999;
			mouse.y = -9999;
		};
		// Resizing clears the canvas, so the next frame draws whatever the throttle says, or the backdrop would show blank for a frame on every resize (every frame while a window edge is dragged).
		const resize = () => {
			size();
			last = 0;
			if (reduce) frame();
		};

		window.addEventListener('pointermove', move, { passive: true });
		document.addEventListener('pointerleave', leave);
		window.addEventListener('resize', resize);
		size();
		frame();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', move);
			document.removeEventListener('pointerleave', leave);
			window.removeEventListener('resize', resize);
		};
	}, []);

	return (
		<div className='pointer-events-none fixed inset-0 z-0 overflow-hidden' aria-hidden='true'>
			<div className='mesh' />
			<div className='blob b1' />
			<div className='blob b2' />
			<div className='blob b3' />
			<div className='blob b4' />
			<canvas ref={canvasRef} className='absolute inset-0 size-full' />
			<div className='spot' ref={spotRef} />
			<div className='absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_40%,transparent_55%,rgba(11,13,16,0.85)_100%)]' />
		</div>
	);
}
