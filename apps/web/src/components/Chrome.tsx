import { SITE_REPO, SPONSOR_URL } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Docky, GitHubMark } from './bits';
import { NAV } from './Header';

export function Footer() {
	const t = useT();
	return (
		<footer className='ftr'>
			<div className='ftr-in'>
				<span aria-hidden='true' className='ftr-mark'>
					Awesome MyGo
				</span>
				<nav aria-label={t.a_site_nav} className='ftr-nav'>
					{NAV.map((n) => (
						<Link key={n.to} to={n.to}>
							{t[n.key]}
						</Link>
					))}
				</nav>
				<div className='ftr-row'>
					<span>{t.footer_l}</span>
					<span className='ftr-links'>
						<a href={SITE_REPO} target='_blank' rel='noopener' className='ftr-gh'>
							<GitHubMark size={14} />
							GitHub
						</a>
						<a href={SPONSOR_URL} target='_blank' rel='noopener'>
							{t.sponsor}
						</a>
					</span>
				</div>
			</div>
		</footer>
	);
}

export function BackToTop({ show }: { show: boolean }) {
	const t = useT();
	if (!show) return null;
	return (
		<button type='button' className='btn-g to-top fade' onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t.to_top}>
			<svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
				<path d='M12 19V5M5 12l7-7 7 7' />
			</svg>
		</button>
	);
}

export function Toast() {
	const { copied } = useSite();
	const t = useT();
	if (!copied) return null;
	return (
		<div role='status' className='toast enter'>
			<Docky variant='toast' />
			{t.toast}
		</div>
	);
}
