import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

// The filter bar over a listing (the showcase, the UI libraries and the plugins): a row of chips and the selects beside them. From md up it is a panel that sticks under the header while the list scrolls. Below md it is neither a panel nor sticky, as a sticky bar of wrapped chips covered the cards on a phone: the chips become one row that scrolls sideways, out to the screen's edges, and the selects share the row under it. A screen under 560px tall (a phone held sideways, which is md wide) keeps the panel but does not stick it, as header and panel would leave a strip of the list.
export function FilterBar({ children }: { children: ReactNode }) {
	return <div className='sticky top-[72px] z-5 flex [@media(max-height:560px)]:static flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-well/90 p-3 backdrop-blur-[10px] max-md:static max-md:flex-col max-md:flex-nowrap max-md:items-stretch max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:backdrop-blur-none'>{children}</div>;
}

// The chips' row. Below md it runs past the page's gutter (16px below sm, 24px up to md) to the screen's edges, with the gutter as its padding and scroll padding, so the first chip lines up with the page and the row scrolls under the edge; the scroll bar is hidden, and a few pixels above and below keep a focused chip's outline from being clipped.
export function FilterChips({ label, children }: { label: string; children: ReactNode }) {
	const row = useRef<HTMLDivElement>(null);
	useScrollToPressed(row);
	return (
		<div
			ref={row}
			className='flex flex-wrap gap-2 max-md:-my-1 max-md:flex-nowrap max-md:overflow-x-auto max-md:py-1 max-md:[scrollbar-width:none] max-sm:-mx-4 max-sm:scroll-px-4 max-sm:px-4 sm:max-md:-mx-6 sm:max-md:scroll-px-6 sm:max-md:px-6 max-md:[&::-webkit-scrollbar]:hidden'
			role='group'
			aria-label={label}
		>
			{children}
		</div>
	);
}

// A page opened on a group late in the row (a shared ?cat= link) would show no pressed chip on a phone, so the row scrolls to the pressed chip whenever it changes and is out of view. Only the row scrolls: scrollIntoView would scroll the page as well.
function useScrollToPressed(row: RefObject<HTMLDivElement | null>) {
	const shown = useRef<Element | null>(null);
	useEffect(() => {
		const el = row.current;
		const chip = el?.querySelector('[aria-pressed="true"]');
		if (!el || !chip || chip === shown.current) return;
		shown.current = chip;
		const pad = Number.parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
		const box = el.getBoundingClientRect();
		const c = chip.getBoundingClientRect();
		if (c.left < box.left + pad || c.right > box.right - pad) el.scrollLeft += c.left - box.left - pad;
	});
}

export interface ChipItem {
	key: string;
	label: string;
	pressed: boolean;
	onSelect: () => void;
}

const CHIP_GAP = 8;
const chipClass = 'min-h-10 rounded-full border border-line-3 bg-transparent px-[18px] py-0 text-[14px] font-semibold whitespace-nowrap';
const moreClass = 'inline-flex h-10 items-center rounded-full border py-0 pr-[34px] pl-[18px] text-[14px] font-semibold whitespace-nowrap';

// The chips of a long list in one row. Below md it is FilterChips' row that scrolls sideways, every chip in it. From md up the chips that fit stay in the row, which takes the room the selects beside it leave, and the rest go into a More menu at its end, a native select drawn as a chip: it reads More, or the pressed group's name while that group is one of its own, drawn as pressed. A hidden ruler holds every chip and every way the menu reads, so the row measures them without showing them, whenever it or the chips change size.
export function OverflowChips({ label, moreLabel, items }: { label: string; moreLabel: string; items: readonly ChipItem[] }) {
	const row = useRef<HTMLDivElement>(null);
	const ruler = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState(items.length);
	useScrollToPressed(row);
	// The measure reads the latest items, and runs again only when what it measures changes: the labels, and which chip is pressed.
	const latest = useRef(items);
	latest.current = items;
	const labels = items.map((i) => i.label).join('\n');
	const pressedKey = items.find((i) => i.pressed)?.key;
	useLayoutEffect(() => {
		const el = row.current;
		const r = ruler.current;
		if (!el || !r) return;
		const measure = () => {
			const items = latest.current;
			if (!matchMedia('(min-width: 48rem)').matches) return setFit(items.length);
			const spans = [...r.children].map((c) => c.getBoundingClientRect().width);
			const chips = spans.slice(0, items.length);
			const menus = spans.slice(items.length);
			const room = el.clientWidth;
			const width = (n: number) => chips.slice(0, n).reduce((a, b) => a + b, 0) + CHIP_GAP * Math.max(0, n - 1);
			if (width(items.length) <= room) return setFit(items.length);
			const pressed = items.findIndex((i) => i.pressed);
			let n = items.length - 1;
			// The menu reads More (menus[0]) unless the pressed chip is in it, when it reads that chip's name (menus[1 + index]).
			const menu = (k: number) => (pressed >= k ? menus[1 + pressed] : menus[0]);
			while (n > 1 && width(n) + CHIP_GAP + menu(n) > room) n--;
			setFit(n);
		};
		measure();
		const watch = new ResizeObserver(measure);
		watch.observe(el);
		return () => watch.disconnect();
	}, [labels, pressedKey]);
	const rest = items.slice(fit);
	const chosen = rest.find((i) => i.pressed);
	return (
		<div className='relative flex min-w-0 items-center gap-2 md:flex-1'>
			<div
				ref={row}
				className='flex min-w-0 flex-1 gap-2 md:flex-nowrap md:overflow-hidden max-md:-my-1 max-md:flex-nowrap max-md:overflow-x-auto max-md:py-1 max-md:[scrollbar-width:none] max-sm:-mx-4 max-sm:scroll-px-4 max-sm:px-4 sm:max-md:-mx-6 sm:max-md:scroll-px-6 sm:max-md:px-6 max-md:[&::-webkit-scrollbar]:hidden'
				role='group'
				aria-label={label}
			>
				{items.map((i, k) => (
					<span key={i.key} className={k >= fit ? 'contents md:hidden' : 'contents'}>
						<FilterChip pressed={i.pressed} onClick={i.onSelect}>
							{i.label}
						</FilterChip>
					</span>
				))}
				{rest.length > 0 && (
					<span className={`relative flex-none max-md:hidden ${moreClass} ${chosen ? 'border-cyan bg-cyan text-bg' : 'border-line-3 text-fg-2 hover:border-fg'}`}>
						{chosen ? chosen.label : moreLabel}
						<svg aria-hidden='true' className='pointer-events-none absolute right-3.5' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
							<path d='M3 4.5 6 7.5 9 4.5' />
						</svg>
						{/* The native select lies over the chip it is drawn as, so the keyboard, screen readers and phones use the platform's menu. */}
						<select
							aria-label={moreLabel}
							className='absolute inset-0 cursor-pointer appearance-none opacity-0'
							value={chosen?.key ?? ''}
							onChange={(e) => rest.find((i) => i.key === e.target.value)?.onSelect()}
						>
							<option value='' disabled>
								{moreLabel}
							</option>
							{rest.map((i) => (
								<option key={i.key} value={i.key}>
									{i.label}
								</option>
							))}
						</select>
					</span>
				)}
			</div>
			{/* The ruler sits in a box of no size that clips it, so the page never scrolls sideways to it. */}
			<div aria-hidden='true' className='pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden max-md:hidden'>
				<div ref={ruler} className='flex w-max gap-2'>
					{items.map((i) => (
						<span key={i.key} className={chipClass}>
							{i.label}
						</span>
					))}
					<span className={moreClass}>{moreLabel}</span>
					{items.map((i) => (
						<span key={i.key} className={moreClass}>
							{i.label}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

// Below md a chip that is not pressed takes the panel's fill, which the bar no longer draws there, so it does not fade into the hero behind it.
export function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
	return (
		<button type='button' className='min-h-10 rounded-full border border-line-3 bg-transparent px-[18px] py-0 text-[14px] font-semibold text-fg-2 transition-[border-color,background] duration-150 ease-[ease] hover:border-fg aria-pressed:border-cyan aria-pressed:bg-cyan aria-pressed:text-bg shrink-0 whitespace-nowrap max-md:not-aria-pressed:bg-well/90' onClick={onClick} aria-pressed={pressed}>
			{children}
		</button>
	);
}

// The selects of a bar. On the showcase they stay together at the bar's end (`grouped`); on the other pages each is an item of the bar itself. Below md they share one row, each taking half of it, a lone one too.
export function FilterSelects({ grouped = false, children }: { grouped?: boolean; children: ReactNode }) {
	return <div className={grouped ? 'flex flex-wrap items-center gap-x-4 gap-y-3 max-md:flex-nowrap max-md:gap-3' : 'flex gap-3 md:contents'}>{children}</div>;
}

// A labelled select. Below md its text is 16px, the smallest size at which iOS does not zoom the page when the select is tapped, and the label goes above it, so the select has its half of the row to itself in every language.
export function FilterSelect({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
	return (
		<div className='flex items-center gap-2.5 max-md:min-w-0 max-md:max-w-[calc(50%-6px)] max-md:flex-1 max-md:flex-col max-md:items-stretch max-md:gap-1.5'>
			<label htmlFor={id} className='text-[14px] text-fg-2'>
				{label}
			</label>
			{/* sort-select sets the inherited font and draws the chevron (styles/primitives.css). */}
			<select id={id} value={value} onChange={(e) => onChange(e.target.value)} className='sort-select h-10 cursor-pointer appearance-none rounded-[10px] border border-line-3 bg-panel py-0 pr-[34px] pl-3 text-[14px] text-fg hover:border-fg-3 max-md:min-w-0 max-md:text-[16px]'>
				{children}
			</select>
		</div>
	);
}
