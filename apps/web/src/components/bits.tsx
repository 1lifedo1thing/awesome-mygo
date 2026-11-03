import { APPS, type App, hostOf, pad2 } from '@awesome-mygo/catalog';
import type { ReactNode } from 'react';

// macOS-style title bar: three traffic lights followed by a label (a host, a file name…).
export function WinBar({ label, size = 'md', className = '', children }: { label?: ReactNode; size?: 'sm' | 'md' | 'lg'; className?: string; children?: ReactNode }) {
	return (
		<span className={`winbar winbar-${size} ${className}`}>
			<span className='tl tl-r' />
			<span className='tl tl-y' />
			<span className='tl tl-g' />
			{label !== undefined && <span className='winbar-label'>{label}</span>}
			{children}
		</span>
	);
}

export interface AppView {
	app: App;
	index: number;
	num: string;
	host: string;
	initial: string;
	// Tile colour cycles through three styles by listing position.
	tone: 0 | 1 | 2;
}

export function appView(app: App): AppView {
	const index = APPS.indexOf(app);
	return { app, index, num: pad2(index + 1), host: hostOf(app.url), initial: app.name.charAt(0).toUpperCase(), tone: (index % 3) as 0 | 1 | 2 };
}

export function MonoTile({ view, size }: { view: AppView; size: 52 | 56 | 112 }) {
	return (
		<span className={`mono-tile mono-${size} tone-${view.tone}`} aria-hidden='true'>
			{view.initial}
		</span>
	);
}

export function KindTag({ app, label }: { app: App; label: string }) {
	return <span className={`kind-tag ${app.kind === 'web' ? 'kind-web' : 'kind-native'}`}>{label}</span>;
}

export function Logo() {
	return <img className='brand-mark' src='/icon-192.png' width={32} height={32} alt='' />;
}

const EAR_STROKE = { stroke: '#B8C1C9', strokeWidth: 1.2 };

// Docky, the bunny mascot. `variant` picks the pose used in each place of the design.
export function Docky({ variant, className }: { variant: 'peek' | 'laptop' | 'sleepy' | 'toast'; className?: string }) {
	if (variant === 'toast') {
		return (
			<svg aria-hidden='true' width='26' height='26' viewBox='20 6 160 160'>
				<g transform='rotate(-24 60 50)'>
					<ellipse cx='60' cy='50' rx='20' ry='28' fill='#DDE3E8' />
					<ellipse cx='60' cy='52' rx='11' ry='18' fill='#FFC9D2' />
				</g>
				<g transform='rotate(16 140 48)'>
					<ellipse cx='140' cy='48' rx='20' ry='28' fill='#DDE3E8' />
					<ellipse cx='140' cy='50' rx='11' ry='18' fill='#FFC9D2' />
				</g>
				<ellipse cx='100' cy='94' rx='50' ry='44' fill='#DDE3E8' />
				<path d='M78 90 q6 -7 12 0 M110 90 q6 -7 12 0' fill='none' stroke='#0B0D10' strokeWidth='5' strokeLinecap='round' />
				<ellipse cx='100' cy='104' rx='6' ry='4.4' fill='#FF8FA3' />
			</svg>
		);
	}
	if (variant === 'sleepy') {
		return (
			<svg aria-hidden='true' width='130' height='91' viewBox='0 0 200 140'>
				<g transform='rotate(-24 62 22)'>
					<ellipse cx='62' cy='22' rx='17' ry='23' fill='#DDE3E8' />
					<ellipse cx='62' cy='24' rx='9' ry='15' fill='#FFC9D2' />
				</g>
				<g transform='rotate(16 138 20)'>
					<ellipse cx='138' cy='20' rx='17' ry='23' fill='#DDE3E8' />
					<ellipse cx='138' cy='22' rx='9' ry='15' fill='#FFC9D2' />
				</g>
				<ellipse cx='100' cy='64' rx='44' ry='38' fill='#DDE3E8' />
				<path d='M79 58 q5 -5 10 0 M111 58 q5 -5 10 0' fill='none' stroke='#0B0D10' strokeWidth='3' strokeLinecap='round' />
				<ellipse cx='100' cy='70' rx='4.6' ry='3.3' fill='#FF8FA3' />
				<rect x='8' y='80' width='184' height='58' rx='14' fill='#171C22' stroke='#313A45' strokeWidth='1.4' />
				<circle cx='24' cy='94' r='3.4' fill='#FF5F57' />
				<circle cx='35' cy='94' r='3.4' fill='#FEBC2E' />
				<circle cx='46' cy='94' r='3.4' fill='#28C840' />
				<ellipse cx='78' cy='81' rx='10' ry='6.5' fill='#DDE3E8' />
				<ellipse cx='122' cy='81' rx='10' ry='6.5' fill='#DDE3E8' />
			</svg>
		);
	}
	const laptop = variant === 'laptop';
	return (
		<svg
			className={className}
			width={laptop ? 200 : 120}
			height={laptop ? 140 : 70}
			viewBox={laptop ? '0 0 200 140' : '20 -6 160 94'}
			role='img'
			aria-label='Docky'
		>
			<g transform='rotate(-24 62 22)'>
				<ellipse cx='62' cy='22' rx='17' ry='23' fill='#DDE3E8' {...EAR_STROKE} />
				<ellipse cx='62' cy='24' rx='9' ry='15' fill='#FFC9D2' />
			</g>
			<g transform='rotate(16 138 20)'>
				<ellipse cx='138' cy='20' rx='17' ry='23' fill='#DDE3E8' {...EAR_STROKE} />
				<ellipse cx='138' cy='22' rx='9' ry='15' fill='#FFC9D2' />
			</g>
			<ellipse cx='100' cy='64' rx='44' ry='38' fill='#DDE3E8' {...EAR_STROKE} />
			<ellipse cx='84' cy='58' rx='4.8' ry='6.2' fill='#0B0D10' />
			<ellipse cx='116' cy='58' rx='4.8' ry='6.2' fill='#0B0D10' />
			<circle cx='85.6' cy='55.8' r='1.7' fill='#FFFFFF' />
			<circle cx='117.6' cy='55.8' r='1.7' fill='#FFFFFF' />
			{!laptop && <circle cx='72' cy='72' r='6' fill='#FFB547' opacity='0.38' />}
			{!laptop && <circle cx='128' cy='72' r='6' fill='#FFB547' opacity='0.38' />}
			<ellipse cx='100' cy='70' rx='4.6' ry='3.3' fill='#FF8FA3' />
			<path d='M64 68 L46 64 M136 68 L154 64' stroke='#A3AFBA' strokeWidth='1.4' strokeLinecap='round' />
			{laptop && (
				<>
					<rect x='8' y='80' width='184' height='58' rx='14' fill='#171C22' stroke='#313A45' strokeWidth='1.4' />
					<circle cx='24' cy='94' r='3.4' fill='#FF5F57' />
					<circle cx='35' cy='94' r='3.4' fill='#FEBC2E' />
					<circle cx='46' cy='94' r='3.4' fill='#28C840' />
					<path d='M8 106 H192' stroke='#252C35' strokeWidth='1.2' />
					<rect x='24' y='116' width='68' height='7' rx='3.5' fill='#252C35' />
					<rect x='24' y='126' width='44' height='6' rx='3' fill='#1C2229' />
				</>
			)}
			<ellipse cx='78' cy='81' rx='10' ry='6.5' fill='#DDE3E8' {...EAR_STROKE} />
			<ellipse cx='122' cy='81' rx='10' ry='6.5' fill='#DDE3E8' {...EAR_STROKE} />
		</svg>
	);
}

export function SearchIcon({ size = 16, stroke = 'currentColor' }: { size?: number; stroke?: string }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={stroke} strokeWidth='2' strokeLinecap='round'>
			<circle cx='11' cy='11' r='7' />
			<path d='M20 20l-3.5-3.5' />
		</svg>
	);
}

export function CloseIcon({ size = 16 }: { size?: number }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
			<path d='M6 6l12 12M18 6L6 18' />
		</svg>
	);
}
