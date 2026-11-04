import { CLI_CMDS, COMMUNITY_PLUGINS, PLUGINS, PLUGINS_DOC, type PluginSurface, fill, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { WinBar } from '../components/bits';
import { useLang, useT } from '../lib/lang';
import { tilt } from '../lib/motion';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/plugins')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/plugins', title: 'nav_plugins', desc: 'plug_p' }),
	component: PluginsPage,
});

function PluginsPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit, copy, copied } = useSite();
	const [surface, setSurface] = useState<'all' | 'web' | 'native'>('all');
	const surfLabel: Record<PluginSurface, string> = { web: t.surf_web, native: t.surf_native, both: t.surf_both };
	// A plugin for both kinds of window shows under either filter.
	const fits = (s: PluginSurface) => surface === 'all' || s === surface || s === 'both';
	const chips = [
		{ key: 'all' as const, label: `${t.all} · ${PLUGINS.length}` },
		{ key: 'web' as const, label: `${t.surf_web} · ${PLUGINS.filter((p) => p.surface !== 'native').length}` },
		{ key: 'native' as const, label: `${t.surf_native} · ${PLUGINS.filter((p) => p.surface !== 'web').length}` },
	];
	return (
		<section className='page enter gap-40'>
			<div className='stack-14'>
				<span className='kicker'>~/PLUGINS · {PLUGINS.length} OFFICIAL</span>
				<h1 className='page-h1'>{t.nav_plugins}</h1>
				<p className='page-p mw-720'>{t.plug_p}</p>
			</div>
			<div className='chips' role='group' aria-label={t.a_filter}>
				{chips.map((c) => (
					<button key={c.key} type='button' className='chip' onClick={() => setSurface(c.key)} aria-pressed={surface === c.key}>
						{c.label}
					</button>
				))}
			</div>
			<div className='plug-grid'>
				{PLUGINS.filter((p) => fits(p.surface)).map((p, k) => (
					<div key={p.slug} className={`rv d${k % 6} flex`}>
						<a className='tile plug' href={p.url} target='_blank' rel='noopener' {...tilt}>
							<span className='glare' aria-hidden='true' />
							<span className='plug-top'>
								<span className='mono-12 c-muted'>plugins/{p.slug}</span>
								<span className='official'>OFFICIAL</span>
							</span>
							<span className='plug-mark'>{p.mark}</span>
							<span className='plug-name'>
								{p.name} <span className={`surf surf-${p.surface}`}>{surfLabel[p.surface]}</span>
							</span>
							<span className='plug-desc'>{pick(p.desc, lang)}</span>
							<span className='plug-tags'>
								{p.tags.map((tg) => (
									<span key={tg} className='plug-tag'>
										{tg}
									</span>
								))}
								<span className='arrow plug-docs'>{t.docs_link}</span>
							</span>
						</a>
					</div>
				))}
			</div>
			<div className='rv cli'>
				<WinBar label='mygo-cli' size='md' className='panel-bar' />
				<div className='cli-body'>
					<div className='stack-8'>
						<h2 className='cli-h'>{t.tool_h}</h2>
						<p className='cli-p'>{t.tool_p}</p>
					</div>
					<div className='stack-8'>
						{CLI_CMDS.map((cmd, i) => {
							const key = i === 0 ? 'cmd0' : 'cmd1';
							return (
								<div key={cmd} className='cmd-row'>
									<span className='cmd-text'>
										<span className='c-cyan'>❯ </span>
										{cmd}
									</span>
									<button type='button' className='cmd-copy' onClick={() => copy(cmd, key)} aria-label={t.a_copy_cmd}>
										{copied === key ? t.copied : t.copy}
									</button>
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<div className='rv cta-dashed'>
				<div className='stack-6'>
					<h3 className='cta-h'>{fill(t.comm_h, { n: COMMUNITY_PLUGINS.length })}</h3>
					<p className='cta-p cta-p-15'>{t.comm_p}</p>
				</div>
				<div className='cta-acts'>
					<a className='btn-g btn-44 btn-outline' href={PLUGINS_DOC} target='_blank' rel='noopener'>
						{t.guide}
					</a>
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit('plugin')}>
						{t.sub_plugin}
					</button>
				</div>
			</div>
		</section>
	);
}
