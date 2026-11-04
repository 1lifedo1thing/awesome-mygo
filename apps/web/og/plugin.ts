// Builds each app's share card (card.ts) into the client output as /og/<slug>.png, from the catalog of the same build, so an app the submission bot adds gets its card on the deploy that adds it. `vite dev` renders a card on request instead.
import { join } from 'node:path';
import { APPS, appBySlug } from '@awesome-mygo/catalog';
import type { Plugin } from 'vite';
import { appCardPath } from '../src/lib/seo';
import { renderCard } from './card';

export function ogCards(): Plugin {
	let paths = { publicDir: '', fontDir: '' };
	return {
		name: 'awesome-mygo:og-cards',
		configResolved(config) {
			paths = { publicDir: config.publicDir, fontDir: join(config.root, 'og/fonts') };
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const slug = req.url?.match(/^\/og\/([a-z0-9-]+)\.png(?:\?|$)/)?.[1];
				const app = slug ? appBySlug(slug) : undefined;
				if (!app) return next();
				renderCard(app, paths).then((png) => {
					res.setHeader('Content-Type', 'image/png');
					res.setHeader('Cache-Control', 'no-store');
					res.end(png);
				}, next);
			});
		},
		async generateBundle() {
			// The client environment's output is what Workers serves as static assets.
			if (this.environment.name !== 'client') return;
			const cards = await Promise.all(APPS.map(async (app) => ({ app, png: await renderCard(app, paths) })));
			for (const { app, png } of cards) this.emitFile({ type: 'asset', fileName: appCardPath(app.slug).slice(1), source: png });
		},
	};
}
