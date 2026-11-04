// The Worker's entry: TanStack Start's default handler (createStartHandler with the streaming renderer), with two permanent redirects in front of it that the router cannot give. Static assets (public/ and the client bundle) are served before the Worker runs and never reach this.
import { SITE_URL } from '@awesome-mygo/catalog';
import type { Register } from '@tanstack/react-router';
import { createServerEntry, createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

const handler = createStartHandler(defaultStreamHandler);
const SITE = new URL(SITE_URL);

export default createServerEntry<Register>({
	fetch(request, opts) {
		const url = new URL(request.url);
		// www.mygodock.dev (a custom domain of this Worker, wrangler.jsonc) serves nothing of its own: every path moves to the same path on the bare domain.
		if (url.hostname === `www.${SITE.hostname}`) return Response.redirect(`${SITE.origin}${url.pathname}${url.search}`, 301);
		// A path with a trailing slash goes to the one without it. The router does this too, but with a 307, which tells search engines the move is temporary; 308 is permanent and keeps the method, so a POST to /api/submit/ stays a POST.
		if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
			url.pathname = url.pathname.replace(/\/+$/, '') || '/';
			return Response.redirect(url.toString(), 308);
		}
		return handler(request, opts);
	},
});
