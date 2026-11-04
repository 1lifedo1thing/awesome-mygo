import type { App } from '@awesome-mygo/catalog';
import type { ReactNode } from 'react';
import { BITMAPS, type BitmapName, EMBLEMS, type EmblemName, FOLDER, FOLDER_PAL, type FolderColor, PAL } from './bitmaps';

// ---- class names shared by every retro page ----

// A raised push button; `go` is the default (yellow, ringed) button of a dialog, `sm` the compact one used in strips. The bevel is a box-shadow, so focus restates the global yellow focus ring that it would otherwise replace.
export const btn = 'inline-flex h-[26px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border border-ink bg-face px-3.5 no-underline bevel hover:bg-hi active:bg-ink active:text-paper active:shadow-none aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:shadow-none focus-visible:shadow-[0_0_0_4px_var(--color-yel)] disabled:cursor-not-allowed disabled:bg-face disabled:text-lo disabled:hover:bg-face';
export const btnGo = `${btn} bg-yel outline-2 outline-offset-2 outline-ink hover:bg-yel-hi`;
export const btnSm = `${btn} h-[22px] px-2.5`;
// A sunken text field.
export const field = 'flex h-[22px] items-center gap-1.5 border border-ink bg-hi px-1.5 sunken';
// An inline link: dotted underline, inverted on hover.
export const lnk = 'underline decoration-dotted underline-offset-[3px] hover:bg-ink hover:text-yel hover:no-underline';
// A selectable label under an icon.
export const iconLabel = 'px-1 leading-4 group-hover:bg-ink group-hover:text-yel';
// The paper well inside a window.
export const well = 'border border-ink bg-paper sunken';

// ---- pixel art ----

function rects(rows: readonly string[], pal: Record<string, string>) {
	const out: ReactNode[] = [];
	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const c = row[x];
			let run = 1;
			while (x + run < row.length && row[x + run] === c) run++;
			if (c !== '.') out.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={pal[c]} />);
			x += run;
		}
	});
	return out;
}

export function Pixels({ rows, scale = 2, pal, className = '' }: { rows: readonly string[]; scale?: number; pal?: Record<string, string>; className?: string }) {
	const w = rows[0].length;
	const h = rows.length;
	return (
		<svg className={`block shrink-0 ${className}`} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering='crispEdges' aria-hidden='true'>
			{rects(rows, { ...PAL, ...pal })}
		</svg>
	);
}

export function PixelIcon({ name, scale = 2, className }: { name: BitmapName; scale?: number; className?: string }) {
	return <Pixels rows={BITMAPS[name]} scale={scale} className={className} />;
}

export function Folder({ emblem, color, scale = 3 }: { emblem: EmblemName; color: FolderColor; scale?: number }) {
	const rows = FOLDER.map((r) => r.split(''));
	EMBLEMS[emblem].forEach((er, dy) => {
		[...er].forEach((ch, dx) => {
			if (ch === 'k') rows[8 + dy][5 + dx] = 'k';
		});
	});
	const [tab, front] = FOLDER_PAL[color];
	return <Pixels rows={rows.map((r) => r.join(''))} scale={scale} pal={{ y: tab, f: front }} />;
}

// ---- windows ----

function TitleBox({ kind }: { kind: 'close' | 'zoom' | 'shade' }) {
	const mark = kind === 'zoom' ? 'bg-[linear-gradient(var(--color-ink),var(--color-ink))] bg-[length:6px_5px] bg-[position:2px_2px] bg-no-repeat' : kind === 'shade' ? 'bg-[linear-gradient(var(--color-ink),var(--color-ink))] bg-[length:7px_1px] bg-[position:2px_5px] bg-no-repeat' : '';
	return <span aria-hidden='true' className={`size-[13px] shrink-0 border border-ink bg-face shadow-[inset_1px_1px_0_var(--color-hi)] ${mark}`} />;
}

// A window: dithered title bar with its close/zoom/shade boxes, a face-coloured frame and a dithered drop shadow. `idle` greys the title bar like a window in the background. The title is a heading of the given level so each window labels its section.
export function Win({ title, idle = false, level = 2, id, className = '', bodyClassName = '', children, onClose, closeLabel }: { title: ReactNode; idle?: boolean; level?: 1 | 2 | 3; id?: string; className?: string; bodyClassName?: string; children: ReactNode; onClose?: () => void; closeLabel?: string }) {
	const H = `h${level}` as 'h1' | 'h2' | 'h3';
	return (
		<section id={id} aria-labelledby={id ? `${id}-t` : undefined} className={`dither-shadow border border-ink bg-face px-[3px] pb-[3px] bevel ${className}`}>
			<div className={`relative -mx-[3px] mb-[3px] flex h-[23px] items-center gap-2 border-b border-ink px-1.5 ${idle ? 'titlebar-idle text-muted' : 'titlebar text-hi'}`}>
				{onClose ? (
					<button type='button' onClick={onClose} aria-label={closeLabel} className='size-[13px] shrink-0 cursor-pointer border border-ink bg-face p-0 shadow-[inset_1px_1px_0_var(--color-hi)] hover:bg-ink' />
				) : (
					<TitleBox kind='close' />
				)}
				<H id={id ? `${id}-t` : undefined} className={`mx-auto min-w-0 truncate px-2.5 text-xs leading-[23px] font-normal ${idle ? 'bg-face' : 'bg-pur'}`}>
					{title}
				</H>
				<span className='flex gap-1'>
					<TitleBox kind='zoom' />
					<TitleBox kind='shade' />
				</span>
			</div>
			<div className={bodyClassName}>{children}</div>
		</section>
	);
}

// The status line along a window's bottom edge, with the resize grip.
export function StatusBar({ children }: { children: ReactNode }) {
	return (
		<div className='flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-lo px-2 pt-1 pb-px text-muted shadow-[inset_0_1px_0_var(--color-hi)]'>
			{children}
			<span aria-hidden='true' className='ml-auto size-3 grip' />
		</div>
	);
}

// ---- small pieces ----

export function KindTag({ kind, label }: { kind: App['kind']; label: string }) {
	return <span className={`inline-block border border-ink px-1.5 leading-4 ${kind === 'native' ? 'bg-ink text-paper' : 'bg-yel'}`}>{label}</span>;
}

// The app's official icon, or a letter tile when it has none.
export function AppIcon({ app, size }: { app: App; size: number }) {
	if (app.icon) return <img src={app.icon} alt='' width={size} height={size} loading='lazy' decoding='async' className='block shrink-0 border border-ink bg-paper object-cover' style={{ width: size, height: size }} />;
	return (
		<span aria-hidden='true' className='grid shrink-0 place-items-center border border-ink bg-yel leading-none' style={{ width: size, height: size, fontSize: Math.round(size / 2) }}>
			{app.name.charAt(0).toUpperCase()}
		</span>
	);
}

// A sticky-note: yellow paper with a darker strip and a dithered shadow.
export function Note({ title, className = '', children }: { title: ReactNode; className?: string; children: ReactNode }) {
	return (
		<aside className={`dither-shadow border border-ink bg-note px-4 pb-4 ${className}`}>
			<div className='-mx-4 mb-3 flex h-4 items-center gap-1.5 border-b border-ink bg-note-bar px-1.5'>
				<span aria-hidden='true' className='size-[9px] border border-ink bg-note' />
				<span className='sr-only'>{title}</span>
			</div>
			{children}
		</aside>
	);
}
