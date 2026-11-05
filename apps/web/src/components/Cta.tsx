import type { ReactNode } from 'react';

// The call to action under a listing (the UI libraries, the state solutions, the plugins): a dashed box with the text on the left and the buttons on the right, wrapping under it when the row is too narrow. `amber` draws the border in the state page's amber.
export function CtaBox({ amber = false, children }: { amber?: boolean; children: ReactNode }) {
	return <div className={`rv flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-dashed bg-bg/60 p-7 max-sm:p-5 ${amber ? 'border-amber' : 'border-line-3'}`}>{children}</div>;
}

// The box's text when it is a single line.
export const ctaP = 'm-0 text-[16px] text-fg-2';

// The box's text when it has a heading over it; `as` is the heading's level.
export function CtaHead({ as: H, title, text }: { as: 'h2' | 'h3'; title: ReactNode; text: ReactNode }) {
	return (
		<div className='flex flex-col gap-1.5'>
			<H className='m-0 text-[20px] font-black'>{title}</H>
			<p className='m-0 text-[15px] text-fg-2'>{text}</p>
		</div>
	);
}
