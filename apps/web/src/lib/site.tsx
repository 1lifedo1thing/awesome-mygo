import { type EntryDraft, type RootSearch, type SubmitCat, appBySlug } from '@awesome-mygo/catalog';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// `plug:<slug>:go` and `plug:<slug>:npm` are a plugin card's setup lines.
export type CopyKey = 'cmd' | 'cmd0' | 'cmd1' | 'det' | 'line' | `plug:${string}`;

export interface SubmitForm extends EntryDraft {
	cat: SubmitCat;
	// Only used for showcase entries: whether the app draws native UI or shows a web frontend.
	mode: 'native' | 'web';
	// Whether the entry comes from the fields above or is pasted whole as JSON, and the pasted text.
	via: 'form' | 'json';
	json: string;
}

interface Site {
	palette: boolean;
	openPalette: () => void;
	closePalette: () => void;
	modal: boolean;
	openSubmit: (cat?: SubmitCat) => void;
	closeSubmit: () => void;
	form: SubmitForm;
	setFormField: <K extends keyof SubmitForm>(key: K, value: SubmitForm[K]) => void;
	copied: CopyKey | null;
	copy: (text: string, key: CopyKey) => void;
	// Slug of the app whose detail drawer is open, from `?app=`; null when closed or unknown.
	app: string | null;
	openApp: (slug: string) => void;
	closeApp: () => void;
}

const SiteContext = createContext<Site | null>(null);

export function useSite(): Site {
	const ctx = useContext(SiteContext);
	if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
	return ctx;
}

export function SiteProvider({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const router = useRouter();
	const search = useSearch({ strict: false }) as RootSearch;
	const app = search.app && appBySlug(search.app) ? search.app : null;

	const [palette, setPalette] = useState(false);
	const [modal, setModal] = useState(false);
	const [form, setForm] = useState<SubmitForm>({ cat: 'showcase', mode: 'native', name: '', author: '', url: '', repo: '', desc: '', via: 'form', json: '' });
	const [copied, setCopied] = useState<CopyKey | null>(null);
	const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	// True when the open drawer pushed its own history entry, so closing it can step back instead of stacking another entry.
	const pushedApp = useRef(false);

	useEffect(() => () => clearTimeout(copyTimer.current), []);

	const copy = useCallback((text: string, key: CopyKey) => {
		navigator.clipboard?.writeText(text).catch(() => {
			// Clipboard can be denied (insecure context, permissions); the toast still confirms the intent, as in the design.
		});
		setCopied(key);
		clearTimeout(copyTimer.current);
		copyTimer.current = setTimeout(() => setCopied(null), 1600);
	}, []);

	const openApp = useCallback(
		(slug: string) => {
			setPalette(false);
			setModal(false);
			const switching = app !== null;
			if (!switching) pushedApp.current = true;
			void navigate({ to: '.', search: (prev: RootSearch): RootSearch => ({ ...prev, app: slug }), replace: switching, resetScroll: false });
		},
		[app, navigate],
	);

	const closeApp = useCallback(() => {
		if (pushedApp.current) {
			pushedApp.current = false;
			router.history.back();
			return;
		}
		void navigate({ to: '.', search: (prev: RootSearch): RootSearch => ({ ...prev, app: undefined }), replace: true, resetScroll: false });
	}, [navigate, router]);

	// Back/forward or a link can drop `?app=` without going through closeApp.
	useEffect(() => {
		if (!app) pushedApp.current = false;
	}, [app]);

	const openPalette = useCallback(() => setPalette(true), []);

	const value = useMemo<Site>(
		() => ({
			palette,
			openPalette,
			closePalette: () => setPalette(false),
			modal,
			openSubmit: (cat) => {
				if (cat) setForm((f) => ({ ...f, cat }));
				setPalette(false);
				setModal(true);
				if (app) closeApp();
			},
			closeSubmit: () => setModal(false),
			form,
			setFormField: (key, val) => setForm((f) => ({ ...f, [key]: val })),
			copied,
			copy,
			app,
			openApp,
			closeApp,
		}),
		[palette, openPalette, modal, form, copied, copy, app, openApp, closeApp],
	);

	return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
