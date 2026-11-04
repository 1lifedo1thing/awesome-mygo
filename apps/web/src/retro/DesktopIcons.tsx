import { APPS, DOCS, PLUGINS, STATE_SOLUTIONS, UI_LIBS } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Folder, PixelIcon } from './ui';

const label = 'px-text text-xs border border-transparent bg-paper px-1 leading-4 group-hover:bg-ink group-hover:text-yel';

function Icon({ art, name, count }: { art: ReactNode; name: string; count?: number }) {
	return (
		<>
			<span className='group-hover:brightness-[.72] group-hover:saturate-[1.2]'>{art}</span>
			<span className={label}>{name}</span>
			{count !== undefined && <span className='px-text text-xs leading-[14px] text-paper'>{count}</span>}
		</>
	);
}

// The desktop's icons: one folder per section with its item count, the docs page and the submit inbox.
export function DesktopIcons({ className }: { className: string }) {
	const t = useT();
	const { openSubmit } = useSite();
	const item = 'group flex w-[92px] flex-col items-center gap-1 text-center no-underline';
	return (
		<nav aria-label={t.a_cats} className={className}>
			<Link to='/showcase' className={item}>
				<Icon art={<Folder emblem='apps' color='blue' />} name={t.nav_showcase} count={APPS.length} />
			</Link>
			<Link to='/plugins' className={item}>
				<Icon art={<Folder emblem='plug' color='yellow' />} name={t.nav_plugins} count={PLUGINS.length} />
			</Link>
			<Link to='/ui' className={item}>
				<Icon art={<Folder emblem='ui' color='purple' />} name={t.nav_ui} count={UI_LIBS.length} />
			</Link>
			<Link to='/state' className={item}>
				<Icon art={<Folder emblem='state' color='green' />} name={t.nav_state} count={STATE_SOLUTIONS.length} />
			</Link>
			<Link to='/learn' className={item}>
				<Icon art={<PixelIcon name='page' scale={3} />} name={t.nav_learn} count={DOCS.length} />
			</Link>
			<button type='button' onClick={() => openSubmit()} className={`${item} cursor-pointer border-0 bg-transparent p-0`}>
				<Icon art={<PixelIcon name='inbox' scale={3} />} name={t.submit_short} />
			</button>
		</nav>
	);
}
