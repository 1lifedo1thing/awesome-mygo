// The Worker's bindings, as wrangler.jsonc and `wrangler secret put` define them. Only what the site reads is declared, rather than generating the whole runtime's types.
declare module 'cloudflare:workers' {
	export const env: {
		// The GitHub App that opens pull requests for visitors without a GitHub account, installed on yldm-tech/awesome-mygo. The key is the app's private key in PKCS#8 PEM.
		GITHUB_APP_ID?: string;
		GITHUB_APP_PRIVATE_KEY?: string;
		// Cloudflare Turnstile, which keeps scripts from submitting.
		TURNSTILE_SITE_KEY?: string;
		TURNSTILE_SECRET_KEY?: string;
		SUBMIT_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
	};
}
