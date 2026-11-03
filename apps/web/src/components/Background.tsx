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
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let w = 0;
		let h = 0;
		let pts: Point[] = [];
		let raf = 0;
		let tt = 0;
		const mouse = { x: -9999, y: -9999 };

		const size = () => {
			w = c.clientWidth || window.innerWidth;
			h = c.clientHeight || window.innerHeight;
			c.width = w * dpr;
			c.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const n = Math.max(30, Math.min(110, Math.round((w * h) / 15000)));
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

		const frame = () => {
			tt += 0.016;
			ctx.clearRect(0, 0, w, h);
			for (const p of pts) {
				const dx = mouse.x - p.x;
				const dy = mouse.y - p.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < 200 && d > 1) {
					p.x -= (dx / d) * 0.35;
					p.y -= (dy / d) * 0.35;
				}
				p.x += p.vx;
				p.y += p.vy;
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
		const resize = () => {
			size();
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
		<div className='bg' aria-hidden='true'>
			<div className='grid' />
			<div className='blob b1' />
			<div className='blob b2' />
			<div className='blob b3' />
			<div className='blob b4' />
			<canvas ref={canvasRef} className='bg-canvas' />
			<div className='spot' ref={spotRef} />
			<div className='vig' />
		</div>
	);
}
