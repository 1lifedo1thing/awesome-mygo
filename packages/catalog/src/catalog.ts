import { ABOUT } from './about';
import type { Localized } from './lang';
import type { StringKey } from './strings';

// Data sources: egoist/mygo (website/src/showcase.ts, docs/), fksune/awesome-mygo and each project's own README.

export const SITE_URL = 'https://mygodock.dev';
export const MYGO_SITE = 'https://mygo.egoist.dev';
export const MYGO_SHOWCASE = 'https://mygo.egoist.dev/showcase';
export const MYGO_REPO = 'https://github.com/egoist/mygo';
export const LIST_REPO = 'https://github.com/fksune/awesome-mygo';
// Apps are listed upstream in this file; showcase submissions go there as a pull request.
export const SHOWCASE_SOURCE = 'https://github.com/egoist/mygo/blob/main/website/src/showcase.ts';
export const SPONSOR_URL = 'https://github.com/sponsors/egoist';
export const DOCS_BASE = 'https://github.com/egoist/mygo/blob/main/docs/';
export const BINDINGS_DOC = `${DOCS_BASE}bindings.md`;
export const PLUGINS_DOC = `${DOCS_BASE}plugins.md`;
export const NATIVE_UI_DOCS = `${MYGO_SITE}/docs/ui`;

export const ARTICLE = {
	title: 'Building a Desktop App with MyGo',
	site: 'azukiazusa.dev',
	url: 'https://azukiazusa.dev/en/blog/mygo-desktop-app/',
} as const;

export const RESOURCES = [
	{ key: 'res_site', url: MYGO_SITE },
	{ key: 'res_docs', url: `${MYGO_SITE}/docs` },
	{ key: 'res_ui', url: NATIVE_UI_DOCS },
	{ key: 'res_examples', url: `${MYGO_REPO}/tree/main/examples` },
	{ key: 'res_bench', url: `${MYGO_SITE}/benchmarks` },
	{ key: 'res_releases', url: `${MYGO_REPO}/releases` },
] as const satisfies readonly { key: StringKey; url: string }[];

export type AppKind = 'native' | 'web';

export interface App {
	slug: string;
	name: string;
	author: string;
	kind: AppKind;
	url: string;
	// One line, for cards and search results.
	desc: Localized;
	// The full description, for the detail drawer.
	about: Localized;
	// Screenshot under /shots/, when the project provides one.
	image?: string;
	// The app's icon: its ai-logo avatar on the ai-logo CDN, its official icon under /icons/ when ai-logo has none or none that serves (MyGo Cloud Music's mark there had two stray edges from a crop bug in its tracing, fixed in ai-logo after v1.18.0), or none, for the letter tile.
	icon?: string;
}

const N: AppKind = 'native';
const W: AppKind = 'web';

type AppRow = readonly [slug: string, name: string, author: string, kind: AppKind, url: string, desc: Localized];

// Order: egoist/mygo's showcase.ts, then apps listed only in fksune/awesome-mygo.
const APP_ROWS: readonly AppRow[] = [
	['mixmusic', 'MixMusic', 'fzn0x', N, 'https://github.com/fzn0x/mixmusic', ['开源音乐播放器，可搜索 YouTube Music 与 Spotify。', '開源音樂播放器，可搜尋 YouTube Music 與 Spotify。', 'An open-source music player that searches YouTube Music and Spotify.', 'YouTube Music と Spotify を検索できるオープンソースの音楽プレーヤー。', 'YouTube Music과 Spotify를 검색하는 오픈소스 음악 플레이어.']],
	['pulse', 'Pulse', 'egoist', N, 'https://pulse.egoist.dev', ['适用于 Mac、Windows、Linux 的活动监视器。', '適用於 Mac、Windows、Linux 的活動監視器。', 'An activity monitor for Mac, Windows and Linux.', 'Mac・Windows・Linux 向けのアクティビティモニタ。', 'Mac, Windows, Linux용 활동 모니터.']],
	['kero', 'Kero', 'egoist', N, 'https://kero.sh', ['为编程 Agent 打造的终端，退出后会话仍保持运行。', '為程式設計 Agent 打造的終端機，退出後工作階段仍持續執行。', 'A terminal for coding agents, with sessions that keep running after you quit.', 'コーディングエージェント向けのターミナル。終了してもセッションが動き続けます。', '코딩 에이전트를 위한 터미널. 종료해도 세션이 계속 실행됩니다.']],
	['lorca', 'Lorca', 'egoist', N, 'https://lorca.app', ['电脑上的 AI 队友，聊天端到端加密同步。', '電腦上的 AI 隊友，聊天端對端加密同步。', 'AI teammates on your computer, with end-to-end encrypted chat sync.', 'PC 上の AI チームメイト。チャットはエンドツーエンド暗号化で同期。', '내 컴퓨터의 AI 팀원. 채팅은 종단간 암호화로 동기화됩니다.']],
	['mygo-cloudmusic', 'MyGo 云音乐', 'egoist', N, 'https://cloudmusic.egoist.dev', ['第三方网易云音乐客户端。', '第三方網易雲音樂用戶端。', 'A third-party NetEase Cloud Music client.', 'サードパーティ製の NetEase Cloud Music クライアント。', '서드파티 NetEase Cloud Music 클라이언트.']],
	['gorex', 'GoRex', 'egoist', N, 'https://github.com/egoist/gorex', ['Superlogical Rex 终端的复刻。', 'Superlogical Rex 終端機的復刻。', 'A replica of Superlogical’s Rex terminal.', 'Superlogical の Rex ターミナルの再現。', 'Superlogical Rex 터미널의 복제판.']],
	['godiff', 'Godiff', 'egoist', N, 'https://github.com/egoist/godiff', ['极简的 Git diff 查看与提交工具。', '極簡的 Git diff 檢視與提交工具。', 'A minimal Git diff viewer and committer.', 'ミニマルな Git の差分ビューア兼コミットツール。', '미니멀한 Git diff 뷰어 겸 커밋 도구.']],
	['2048', '2048', 'egoist', N, 'https://github.com/egoist/2048', ['2048 益智游戏，WebAssembly 版本也能在浏览器运行。', '2048 益智遊戲，WebAssembly 版本也能在瀏覽器執行。', 'The 2048 puzzle; its WebAssembly build also runs in the browser.', '2048 パズル。WebAssembly 版はブラウザでも動きます。', '2048 퍼즐. WebAssembly 빌드는 브라우저에서도 실행됩니다.']],
	['uma', 'Uma', 'egoist', N, 'https://github.com/egoist/uma', ['菜单栏应用，展示 Umami 账号下的网站与访客。', '選單列應用，顯示 Umami 帳號下的網站與訪客。', 'A menu bar app showing your Umami websites and visitors.', 'Umami アカウントのサイトと訪問者を表示するメニューバーアプリ。', 'Umami 계정의 사이트와 방문자를 보여주는 메뉴 막대 앱.']],
	['liubai', '留白 Liubai', 'echoVic', W, 'https://liubai.echovic.com', ['开源 Markdown 编辑与阅读器，macOS 版，Windows 测试中。', '開源 Markdown 編輯與閱讀器，macOS 版，Windows 測試中。', 'An open-source Markdown editor and reader for macOS, with a Windows beta.', 'オープンソースの Markdown エディタ兼リーダー。macOS 版、Windows はベータ。', '오픈소스 Markdown 편집기 겸 리더. macOS용이며 Windows는 베타.']],
	['clipnest', 'Clipnest', 'echoVic', W, 'https://clipnest.echovic.com', ['开源 Mac 剪贴板历史工具。', '開源 Mac 剪貼簿歷史工具。', 'An open-source clipboard history for Mac.', 'Mac 用のオープンソースのクリップボード履歴。', 'Mac용 오픈소스 클립보드 기록.']],
	['cleanzo', 'Cleanzo', 'echoVic', W, 'https://cleanzo.echovic.com', ['开源 macOS 磁盘清理工具。', '開源 macOS 磁碟清理工具。', 'An open-source disk cleaner for macOS.', 'macOS 用のオープンソースのディスククリーナー。', 'macOS용 오픈소스 디스크 정리 도구.']],
	['little-reef', '小海底 Little Reef', 'echoVic', W, 'https://reef.echovic.com', ['开源 Mac 专注计时器。', '開源 Mac 專注計時器。', 'An open-source focus timer for Mac.', 'Mac 用のオープンソースの集中タイマー。', 'Mac용 오픈소스 집중 타이머.']],
	['mytwig', 'MyTwig', 'HeroSizy', N, 'https://mytwig.herosizy.dev', ['适用于 macOS、Windows、Linux 的 Git 客户端。', '適用於 macOS、Windows、Linux 的 Git 用戶端。', 'A Git client for macOS, Windows and Linux.', 'macOS・Windows・Linux 向けの Git クライアント。', 'macOS, Windows, Linux용 Git 클라이언트.']],
	['godwit', 'Godwit', 'baranwang', N, 'https://godwit.email', ['开源、AI 原生的跨平台邮件客户端。', '開源、AI 原生的跨平台郵件用戶端。', 'An open-source, AI-native email client for macOS, Windows and Linux.', 'オープンソースで AI ネイティブなクロスプラットフォームのメールクライアント。', '오픈소스 AI 네이티브 크로스플랫폼 이메일 클라이언트.']],
	['video-downloader', 'Video-Downloader', 'Faizan', N, 'https://github.com/fazi-gondal/video-downloader-mygo', ['基于 Go、MyGo、yt-dlp 与 FFmpeg 的视频下载器。', '基於 Go、MyGo、yt-dlp 與 FFmpeg 的影片下載器。', 'A desktop video downloader built with Go, MyGo, yt-dlp and FFmpeg.', 'Go・MyGo・yt-dlp・FFmpeg で作られた動画ダウンローダー。', 'Go, MyGo, yt-dlp, FFmpeg로 만든 동영상 다운로더.']],
	['lumilo', 'Lumilo', 'kotuke', N, 'https://github.com/kotuke/lumilo', ['macOS 菜单栏面板，管理本地 LLM 引擎。', 'macOS 選單列面板，管理本機 LLM 引擎。', 'A macOS menu-bar panel for local LLM engines.', 'ローカル LLM エンジン用の macOS メニューバーパネル。', '로컬 LLM 엔진을 위한 macOS 메뉴 막대 패널.']],
	['tomoru', 'Tomoru', 'ACAne0320', N, 'https://tomoru.acane.dev', ['在 macOS 和 Windows 上为正在播放的任何内容实时显示双语字幕。', '在 macOS 與 Windows 上為正在播放的任何內容即時顯示雙語字幕。', 'Live bilingual subtitles for anything you watch on macOS and Windows.', 'macOS と Windows で、再生中のあらゆるものにリアルタイムの二か国語字幕を。', 'macOS와 Windows에서 재생 중인 모든 콘텐츠에 실시간 이중 언어 자막.']],
	['quaver-astra', 'Quaver Astra', 'Ne0W0r1d x Team Quaver', N, 'https://quaver.0w0.red', ['轻量、原生手感的 QQ 音乐客户端，从 Electron 迁移到 MyGo。', '輕量、原生手感的 QQ 音樂用戶端，從 Electron 遷移到 MyGo。', 'A lightweight, native-feeling QQ Music client, rebuilt from Electron on MyGo.', '軽量でネイティブな使い心地の QQ Music クライアント。Electron から MyGo へ移行。', 'Electron에서 MyGo로 옮긴 가볍고 네이티브한 QQ Music 클라이언트.']],
	['meiro', 'Meiro', 'elianiva', N, 'https://meiro.elianiva.com', ['精简的 YouTube Music 播放器，Material 3 Expressive 原生界面。', '精簡的 YouTube Music 播放器，Material 3 Expressive 原生介面。', 'YouTube Music without the bloat, in a native Material 3 Expressive player.', '余計なもののない YouTube Music。Material 3 Expressive のネイティブプレーヤー。', '군더더기 없는 YouTube Music, Material 3 Expressive 네이티브 플레이어.']],
	['repo-hopper', 'Repo Hopper', 'pteich', N, 'https://github.com/pteich/repo-hopper', ['Git 仓库版 Spotlight：一个快捷键搜索并打开本地仓库。', 'Git 倉庫版 Spotlight：一個快捷鍵搜尋並開啟本機倉庫。', 'Spotlight for your Git repositories: one shortcut to find and open any local repo.', 'Git リポジトリ版 Spotlight。ショートカット一つでローカルのリポジトリを検索して開く。', 'Git 저장소용 Spotlight: 단축키 하나로 로컬 저장소를 찾아 엽니다.']],
	['universal-s3-ui', 'Universal S3 UI', 'pteich', N, 'https://github.com/pteich/us3ui', ['轻量存储浏览器，支持 S3 兼容服务、SFTP 与 FTP/FTPS。', '輕量儲存瀏覽器，支援 S3 相容服務、SFTP 與 FTP/FTPS。', 'A lightweight storage browser for S3-compatible services, SFTP and FTP/FTPS.', 'S3 互換サービス・SFTP・FTP/FTPS 向けの軽量ストレージブラウザ。', 'S3 호환 서비스, SFTP, FTP/FTPS용 가벼운 스토리지 브라우저.']],
	['apigo', 'APIGo', 'younland', N, 'https://github.com/younland/apigo', ['原生 UI 绘制的跨平台接口调试工具，对标 Hoppscotch，完全离线。', '原生 UI 繪製的跨平台介面除錯工具，對標 Hoppscotch，完全離線。', 'A cross-platform API client drawn with native UI, in the vein of Hoppscotch, fully offline.', 'ネイティブ UI で描く Hoppscotch 風のクロスプラットフォーム API クライアント。完全オフライン。', '네이티브 UI로 그린 Hoppscotch 스타일의 크로스플랫폼 API 클라이언트, 완전 오프라인.']],
];

// Screenshots shipped in apps/web/public/shots/, from egoist/mygo website/public/showcase/ and each project's README.
const IMAGES: Record<string, string> = {
	mixmusic: 'mixmusic.webp',
	pulse: 'pulse.webp',
	gorex: 'gorex.webp',
	'2048': '2048.webp',
	liubai: 'liubai.webp',
	clipnest: 'clipnest.webp',
	cleanzo: 'cleanzo.webp',
	'little-reef': 'little-reef.webp',
	mytwig: 'mytwig.svg',
	godwit: 'godwit.webp',
	'video-downloader': 'video-downloader.webp',
	lumilo: 'lumilo.webp',
	tomoru: 'tomoru.webp',
	'quaver-astra': 'quaver-astra.webp',
	meiro: 'meiro.webp',
	'repo-hopper': 'repo-hopper.webp',
	'universal-s3-ui': 'universal-s3-ui.webp',
	apigo: 'apigo.webp',
};

const shot = (file: string | undefined) => (file ? `/shots/${file}` : undefined);

// Icons come from yldm-tech/ai-logo (its avatar renders), served by its CDN. Apps it does not list keep their official icon, normalised to the same size and corner, under apps/web/public/icons/.
export const AILOGO_CDN = 'https://ailogo.yldm.ai/avatar/';
const AILOGO_IDS: Record<string, string> = {
	mixmusic: 'mixmusic',
	pulse: 'pulse',
	kero: 'kero',
	lorca: 'lorca',
	gorex: 'gorex',
	godiff: 'godiff',
	liubai: 'liubai',
	clipnest: 'clipnest',
	cleanzo: 'cleanzo',
	'little-reef': 'littlereef',
	mytwig: 'mytwig',
	godwit: 'godwit',
	'video-downloader': 'videodownloadermygo',
	lumilo: 'lumilo',
	'quaver-astra': 'quaverastra',
	meiro: 'meiro',
	'universal-s3-ui': 'universals3ui',
	apigo: 'apigo',
};

// 2048 and Uma still ship the icon that `mygo init` draws for every new project (a ring on a blue-violet gradient), so the two would look identical and say nothing about either app: they keep the letter tile.
const NO_ICON = new Set(['2048', 'uma']);

const iconOf = (slug: string) => {
	if (NO_ICON.has(slug)) return undefined;
	return AILOGO_IDS[slug] ? `${AILOGO_CDN}${AILOGO_IDS[slug]}.webp` : `/icons/${slug}.webp`;
};

export const APPS: readonly App[] = APP_ROWS.map(([slug, name, author, kind, url, desc]) => {
	const about = ABOUT[slug];
	if (!about) throw new Error(`Missing ABOUT entry for app ${slug}`);
	return { slug, name, author, kind, url, desc, about, image: shot(IMAGES[slug]), icon: iconOf(slug) };
});

export function appBySlug(slug: string): App | undefined {
	return APPS.find((a) => a.slug === slug);
}

export type UiLibKey = 'theme' | 'retro' | 'icons';

export interface UiLib {
	name: string;
	author: string;
	key: UiLibKey;
	tagKey: StringKey;
	descKey: StringKey;
	repo: string;
	url: string;
	homepage?: string;
	image?: string;
}

export const UI_LIBS: readonly UiLib[] = [
	{ name: 'Onevra', author: 'ONEO', tagKey: 'tag_theme', key: 'theme', descKey: 'lib_onevra', repo: 'oneo-me/onevra', url: 'https://github.com/oneo-me/onevra', homepage: 'https://oneo-me.github.io/onevra/', image: shot('onevra.webp') },
	{ name: 'mygo-platinum', author: 'Zhao Lei', tagKey: 'tag_retro', key: 'retro', descKey: 'lib_plat', repo: 'firede/mygo-platinum', url: 'https://github.com/firede/mygo-platinum', homepage: 'https://mygo-platinum.firede.com', image: shot('mygo-platinum.webp') },
	{ name: 'AI Logo', author: 'yldm-tech', tagKey: 'tag_icons', key: 'icons', descKey: 'lib_ailogo', repo: 'yldm-tech/ai-logo', url: 'https://github.com/yldm-tech/ai-logo', homepage: 'https://ailogo.yldm.ai', image: shot('ailogo.webp') },
];

export interface StateSolution {
	name: string;
	author: string;
	desc: Localized;
	repo: string;
	url: string;
	homepage?: string;
	install: string;
	tags: readonly string[];
	image?: string;
}

export const STATE_SOLUTIONS: readonly StateSolution[] = [
	{
		name: 'Nodra',
		author: 'yldm-tech',
		desc: [
			'面向 Go 桌面应用的并发安全响应式状态库，为 MyGo 提供类似 Zustand 的使用体验，同时让状态与渲染器和持久化后端保持独立。',
			'面向 Go 桌面應用的並行安全響應式狀態庫，為 MyGo 提供類似 Zustand 的使用體驗，同時讓狀態與渲染器和持久化後端保持獨立。',
			'A concurrency-safe reactive state store for Go desktop applications. It provides Zustand-like ergonomics for MyGo apps while keeping state independent from the renderer and persistence backend.',
			'Go デスクトップアプリ向けの並行安全なリアクティブ状態ライブラリ。MyGo で Zustand に似た操作感を提供し、状態をレンダラーや永続化バックエンドから分離します。',
			'Go 데스크톱 애플리케이션을 위한 동시성 안전 반응형 상태 라이브러리. MyGo에서 Zustand와 비슷한 사용성을 제공하며 상태를 렌더러와 영속성 백엔드에서 분리합니다.',
		],
		repo: 'yldm-tech/nodra',
		url: 'https://github.com/yldm-tech/nodra',
		homepage: 'https://nodra.yldm.ai',
		install: 'go get github.com/yldm-tech/nodra@latest',
		tags: ['store', 'reactive', 'devtools'],
		image: shot('nodra.webp'),
	},
];

export type PluginSurface = 'web' | 'native' | 'both';

export interface Plugin {
	slug: string;
	mark: string;
	name: string;
	descKey: StringKey;
	// Which kind of window the plugin serves: web pages (a Go package plus an npm package), native UI (all Go), or both.
	surface: PluginSurface;
	tags: readonly string[];
	url: string;
}

// Order and grouping of docs/plugins.md.
export const PLUGINS: readonly Plugin[] = [
	{ slug: 'fetch', mark: 'Fx', name: 'Fetch', descKey: 'pl_fetch', surface: 'web', tags: ['http', 'no-cors', 'stream'], url: `${DOCS_BASE}plugins/fetch.md` },
	{ slug: 'websocket', mark: 'Ws', name: 'WebSocket', descKey: 'pl_ws', surface: 'web', tags: ['websocket', 'headers'], url: `${DOCS_BASE}plugins/websocket.md` },
	{ slug: 'sqlite', mark: 'Sq', name: 'SQLite', descKey: 'pl_sq', surface: 'web', tags: ['database', 'no-cgo'], url: `${DOCS_BASE}plugins/sqlite.md` },
	{ slug: 'watch', mark: 'Wa', name: 'Watch', descKey: 'pl_watch', surface: 'web', tags: ['files', 'events'], url: `${DOCS_BASE}plugins/watch.md` },
	{ slug: 'updater', mark: 'Up', name: 'Updater', descKey: 'pl_up', surface: 'both', tags: ['auto-update', 'sparkle'], url: `${DOCS_BASE}plugins/updater.md` },
	{ slug: 'terminal', mark: 'Tm', name: 'Terminal', descKey: 'pl_term', surface: 'native', tags: ['ghostty', 'pty'], url: `${DOCS_BASE}plugins/terminal.md` },
	{ slug: 'glass', mark: 'Gl', name: 'Glass', descKey: 'pl_glass', surface: 'native', tags: ['liquid-glass', 'shaders'], url: `${DOCS_BASE}plugins/glass.md` },
	{ slug: 'game', mark: 'Gm', name: 'Game', descKey: 'pl_game', surface: 'native', tags: ['game-loop', 'gamepad'], url: `${DOCS_BASE}plugins/game.md` },
	{ slug: 'loading', mark: 'Ld', name: 'Loading', descKey: 'pl_loading', surface: 'native', tags: ['spinners', 'animation'], url: `${DOCS_BASE}plugins/loading.md` },
	{ slug: 'automation', mark: 'Au', name: 'Automation', descKey: 'pl_auto', surface: 'both', tags: ['e2e', 'agents'], url: `${DOCS_BASE}plugins/automation.md` },
	{ slug: 'permissionflow', mark: 'Pf', name: 'PermissionFlow', descKey: 'pl_perm', surface: 'both', tags: ['permissions', 'macos'], url: `${DOCS_BASE}plugins/permissionflow.md` },
];

// Listed in the community-plugins section once someone submits one.
export const COMMUNITY_PLUGINS: readonly Plugin[] = [];

export interface Doc {
	title: string;
	url: string;
	desc: Localized;
}

// The guides of docs/README.md, in its order.
const DOC_ROWS: readonly (readonly [title: string, file: string, desc: Localized])[] = [
	['Getting started', 'getting-started.md', ['安装工具，创建、开发与构建应用，原生 UI 或 Web 前端皆可', '安裝工具，建立、開發與建置應用，原生 UI 或 Web 前端皆可', 'Install the tools, then create, develop and build an app, with native UI or a web frontend', 'ツールを入れて、ネイティブ UI か Web フロントエンドのアプリを作成・開発・ビルド', '도구 설치 후 네이티브 UI 또는 웹 프런트엔드 앱 생성·개발·빌드']],
	['Windows', 'windows.md', ['创建与排列窗口、事件、导航、下载与打印', '建立與排列視窗、事件、導覽、下載與列印', 'Creating and arranging windows, events, navigation, downloads, printing', 'ウィンドウの作成と配置、イベント、ナビゲーション、ダウンロード、印刷', '창 생성·배치, 이벤트, 탐색, 다운로드, 인쇄']],
	['The application', 'app.md', ['生命周期、单实例、深链接、文件关联、开机启动', '生命週期、單一實例、深層連結、檔案關聯、開機啟動', 'Lifecycle, single instance, deep links, file associations, starting at login', 'ライフサイクル、単一インスタンス、ディープリンク、ファイル関連付け、ログイン時起動', '라이프사이클, 단일 인스턴스, 딥 링크, 파일 연결, 로그인 시 실행']],
	['Menus and the tray', 'menus.md', ['应用、右键与 Dock 菜单，快捷键与托盘图标', '應用、右鍵與 Dock 選單，快捷鍵與系統匣圖示', 'Application, context and Dock menus, keyboard shortcuts and tray icons', 'アプリ・コンテキスト・Dock のメニュー、ショートカット、トレイアイコン', '앱·컨텍스트·Dock 메뉴, 단축키, 트레이 아이콘']],
	['Documents', 'documents.md', ['基于文档的应用：每个文件一个窗口、文件菜单、自动保存与崩溃恢复', '基於文件的應用：每個檔案一個視窗、檔案選單、自動儲存與當機復原', 'Document-based apps: a window per file, the File menu, autosave and crash recovery', 'ドキュメントベースのアプリ：ファイルごとのウィンドウ、ファイルメニュー、自動保存、クラッシュからの復旧', '문서 기반 앱: 파일마다 창, 파일 메뉴, 자동 저장, 충돌 복구']],
	['Languages', 'i18n.md', ['应用的多语言：ICU 消息目录、类型化的 Go 与 TS 函数、复数形式', '應用的多語言：ICU 訊息目錄、型別化的 Go 與 TS 函式、複數形式', 'The app’s languages: ICU message catalogs, typed Go and TS functions, plural forms', 'アプリの多言語化：ICU メッセージカタログ、型付きの Go と TS 関数、複数形', '앱 다국어: ICU 메시지 카탈로그, 타입이 있는 Go·TS 함수, 복수형']],
	['Desktop APIs', 'native.md', ['对话框、通知、剪贴板、深色模式、密钥、全局快捷键等', '對話框、通知、剪貼簿、深色模式、密鑰、全域快捷鍵等', 'Dialogs, notifications, clipboard, dark mode, secrets, global shortcuts and more', 'ダイアログ、通知、クリップボード、ダークモード、シークレット、グローバルショートカットなど', '대화상자, 알림, 클립보드, 다크 모드, 비밀 정보, 전역 단축키 등']],
	['Clipboard and drag data', 'data-transfer.md', ['多种表示、文件列表、自定义格式与延迟提供的数据', '多種表示、檔案清單、自訂格式與延遲提供的資料', 'Multiple representations, file lists, custom formats and lazy providers', '複数の表現、ファイルリスト、独自形式、遅延プロバイダ', '여러 표현, 파일 목록, 사용자 정의 형식, 지연 제공자']],
	['Audio', 'audio.md', ['音效、流式音乐与应用自生成的声音，在 Go 中混音', '音效、串流音樂與應用自產生的聲音，在 Go 中混音', 'Sound effects, streamed music and sound the app makes itself, mixed in Go', '効果音、ストリーミング音楽、アプリが生成する音を Go でミックス', '효과음, 스트리밍 음악, 앱이 만드는 소리를 Go에서 믹싱']],
	['Launchers', 'launchers.md', ['Spotlight、Raycast 式的启动器应用', 'Spotlight、Raycast 式的啟動器應用', 'Apps in the manner of Spotlight and Raycast, summoned by a shortcut', 'Spotlight や Raycast のような、ショートカットで呼び出すランチャー', 'Spotlight, Raycast처럼 단축키로 불러내는 런처 앱']],
	['Native UI', 'ui/README.md', ['视图、布局、输入、导航、无障碍，以及每个组件的文档', '視圖、版面、輸入、導覽、無障礙，以及每個元件的文件', 'Views, layout, input, navigation, accessibility, and a page per component', 'ビュー、レイアウト、入力、ナビゲーション、アクセシビリティとコンポーネントごとの解説', '뷰, 레이아웃, 입력, 탐색, 접근성과 컴포넌트별 문서']],
	['The frontend', 'frontend.md', ['页面加载、mygo-runtime、自定义协议与标题栏', '頁面載入、mygo-runtime、自訂協定與標題列', 'Page loading, mygo-runtime, custom protocols and title bars', 'ページ読み込み、mygo-runtime、カスタムプロトコル、タイトルバー', '페이지 로딩, mygo-runtime, 커스텀 프로토콜, 타이틀 바']],
	['Calling Go from the frontend', 'bindings.md', ['绑定服务、通道、类型化事件与生成的 TS 客户端', '綁定服務、通道、型別化事件與產生的 TS 用戶端', 'Bound services, channels, typed events and the generated TS client', 'バインド、チャネル、型付きイベント、生成される TS クライアント', '바인딩, 채널, 타입 이벤트, 생성된 TS 클라이언트']],
	['Plugins', 'plugins.md', ['官方插件与编写自己的插件', '官方外掛與撰寫自己的外掛', 'Official plugins and writing your own', '公式プラグインと自作プラグイン', '공식 플러그인과 직접 만들기']],
	['Building and distributing', 'distribution.md', ['打包、签名、安装器与磁盘镜像', '打包、簽章、安裝程式與磁碟映像', 'Packaging, signing, installers and disk images', 'パッケージ、署名、インストーラ、ディスクイメージ', '패키징, 서명, 설치 프로그램, 디스크 이미지']],
	['Auto-updates', 'updates.md', ['签名更新、增量更新与更新窗口', '簽章更新、增量更新與更新視窗', 'Signed updates, delta updates and an update window', '署名付き更新、差分更新、更新ウィンドウ', '서명된 업데이트, 델타 업데이트, 업데이트 창']],
	['GitHub Actions', 'github-actions.md', ['打 tag 自动构建、签名、公证并发布', '推送 tag 自動建置、簽章、公證並發布', 'Build, sign, notarize and publish on a tag push', 'タグの push でビルド・署名・公証・公開', '태그 푸시로 빌드·서명·공증·배포']],
	['Configuration', 'configuration.md', ['mygo.config.ts 或 mygo.json', 'mygo.config.ts 或 mygo.json', 'mygo.config.ts or mygo.json', 'mygo.config.ts または mygo.json', 'mygo.config.ts 또는 mygo.json']],
	['The mygo CLI', 'cli.md', ['mygo 命令行的命令与参数', 'mygo 命令列的指令與參數', 'Its commands and flags', 'コマンドとフラグ', '명령과 플래그']],
	['Architecture', 'architecture.md', ['MyGo 的内部实现与平台差异，面向贡献者', 'MyGo 的內部實作與平台差異，面向貢獻者', 'How MyGo works inside, for contributors, with platform differences', '貢献者向けの MyGo の内部構造とプラットフォーム差', '기여자를 위한 MyGo 내부 구조와 플랫폼별 차이']],
];

export const DOCS: readonly Doc[] = DOC_ROWS.map(([title, file, desc]) => ({ title, url: DOCS_BASE + file, desc }));

export type InstallTab = 'bun' | 'go' | 'native';

export const INSTALL_TABS: readonly { key: InstallTab; label: string }[] = [
	{ key: 'bun', label: 'bunx' },
	{ key: 'go', label: 'go run' },
	{ key: 'native', label: 'native' },
];

export const INSTALL_CMDS: Record<InstallTab, string> = {
	bun: 'bunx mygo-cli init my-app',
	go: 'go run github.com/egoist/mygo/cmd/mygo@latest init my-app',
	native: 'go run github.com/egoist/mygo/cmd/mygo@latest init -template native my-app',
};

export const CLI_CMDS = ['bunx mygo-cli init my-app', 'mygo doctor'] as const;

export function hostOf(url: string): string {
	return url.replace('https://', '').replace(/\/$/, '');
}

export function pad2(n: number): string {
	return (n < 10 ? '0' : '') + n;
}
