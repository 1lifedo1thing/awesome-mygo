import type { Localized } from './lang';
import type { StringKey } from './strings';

// Data sources: fksune/awesome-mygo, the MyGo docs and mygo.egoist.dev.

export const MYGO_SITE = 'https://mygo.egoist.dev';
export const MYGO_SHOWCASE = 'https://mygo.egoist.dev/showcase';
export const LIST_REPO = 'https://github.com/fksune/awesome-mygo';
export const SPONSOR_URL = 'https://github.com/sponsors/egoist';
export const DOCS_BASE = 'https://github.com/egoist/mygo/blob/main/docs/';
export const BINDINGS_DOC = `${DOCS_BASE}bindings.md`;
export const PLUGINS_DOC = `${DOCS_BASE}plugins.md`;

export const ARTICLE = {
	title: 'Building a Desktop App with MyGo',
	site: 'azukiazusa.dev',
	url: 'https://azukiazusa.dev/en/blog/mygo-desktop-app/',
} as const;

export type AppKind = 'native' | 'web';

export interface App {
	slug: string;
	name: string;
	author: string;
	kind: AppKind;
	url: string;
	desc: Localized;
}

const N: AppKind = 'native';
const W: AppKind = 'web';

type AppRow = readonly [slug: string, name: string, author: string, kind: AppKind, url: string, desc: Localized];

// Listing order is the order of the upstream README.
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
];

export const APPS: readonly App[] = APP_ROWS.map(([slug, name, author, kind, url, desc]) => ({ slug, name, author, kind, url, desc }));

export function appBySlug(slug: string): App | undefined {
	return APPS.find((a) => a.slug === slug);
}

export type UiLibKey = 'theme' | 'retro';

export interface UiLib {
	name: string;
	author: string;
	key: UiLibKey;
	tagKey: StringKey;
	descKey: StringKey;
	repo: string;
	url: string;
}

export const UI_LIBS: readonly UiLib[] = [
	{ name: 'Onevra', author: 'ONEO', tagKey: 'tag_theme', key: 'theme', descKey: 'lib_onevra', repo: 'oneo-me/onevra', url: 'https://github.com/oneo-me/onevra' },
	{ name: 'mygo-platinum', author: 'Zhao Lei', tagKey: 'tag_retro', key: 'retro', descKey: 'lib_plat', repo: 'firede/mygo-platinum', url: 'https://github.com/firede/mygo-platinum' },
];

export interface Plugin {
	slug: string;
	mark: string;
	name: string;
	descKey: StringKey;
	tags: readonly string[];
	url: string;
}

export const PLUGINS: readonly Plugin[] = [
	{ slug: 'fetch', mark: 'Fx', name: 'Fetch', descKey: 'pl_fetch', tags: ['http', 'no-cors', 'stream'], url: `${DOCS_BASE}plugins/fetch.md` },
	{ slug: 'websocket', mark: 'Ws', name: 'WebSocket', descKey: 'pl_ws', tags: ['websocket', 'headers'], url: `${DOCS_BASE}plugins/websocket.md` },
	{ slug: 'updater', mark: 'Up', name: 'Updater', descKey: 'pl_up', tags: ['auto-update', 'ui'], url: `${DOCS_BASE}plugins/updater.md` },
];

// Listed in the community-plugins section once someone submits one.
export const COMMUNITY_PLUGINS: readonly Plugin[] = [];

// Listed in the state category once someone submits one.
export const STATE_SOLUTIONS: readonly { name: string; url: string }[] = [];

export interface Doc {
	title: string;
	url: string;
	desc: Localized;
}

const DOC_ROWS: readonly (readonly [title: string, file: string, desc: Localized])[] = [
	['Getting started', 'getting-started.md', ['安装工具，创建、开发与构建应用', '安裝工具，建立、開發與建置應用', 'Install the tools, then create, develop and build an app', 'ツールを入れて、アプリを作成・開発・ビルド', '도구 설치 후 앱 생성·개발·빌드']],
	['Calling Go from the frontend', 'bindings.md', ['绑定服务、通道、类型化事件与生成的 TS 客户端', '綁定服務、通道、型別化事件與產生的 TS 用戶端', 'Bound services, channels, typed events and the generated TS client', 'バインド、チャネル、型付きイベント、生成される TS クライアント', '바인딩, 채널, 타입 이벤트, 생성된 TS 클라이언트']],
	['Plugins', 'plugins.md', ['官方插件与编写自己的插件', '官方外掛與撰寫自己的外掛', 'Official plugins and writing your own', '公式プラグインと自作プラグイン', '공식 플러그인과 직접 만들기']],
	['The frontend', 'frontend.md', ['页面加载、mygo-runtime、自定义协议与标题栏', '頁面載入、mygo-runtime、自訂協定與標題列', 'Page loading, mygo-runtime, custom protocols and title bars', 'ページ読み込み、mygo-runtime、カスタムプロトコル、タイトルバー', '페이지 로딩, mygo-runtime, 커스텀 프로토콜, 타이틀 바']],
	['Windows', 'windows.md', ['创建与排列窗口、事件、导航、下载与打印', '建立與排列視窗、事件、導覽、下載與列印', 'Creating and arranging windows, events, navigation, downloads, printing', 'ウィンドウの作成と配置、イベント、ナビゲーション、ダウンロード、印刷', '창 생성·배치, 이벤트, 탐색, 다운로드, 인쇄']],
	['The application', 'app.md', ['生命周期、单实例、深链接、文件关联', '生命週期、單一實例、深層連結、檔案關聯', 'Lifecycle, single instance, deep links, file associations', 'ライフサイクル、単一インスタンス、ディープリンク、ファイル関連付け', '라이프사이클, 단일 인스턴스, 딥 링크, 파일 연결']],
	['Menus and the tray', 'menus.md', ['菜单与托盘', '選單與系統匣', 'Menus and the tray', 'メニューとトレイ', '메뉴와 트레이']],
	['Native APIs', 'native.md', ['对话框、通知、剪贴板、全局快捷键等', '對話框、通知、剪貼簿、全域快捷鍵等', 'Dialogs, notifications, clipboard, global shortcuts and more', 'ダイアログ、通知、クリップボード、グローバルショートカットなど', '대화상자, 알림, 클립보드, 전역 단축키 등']],
	['Building and distributing', 'distribution.md', ['打包、签名、安装器与磁盘镜像', '打包、簽章、安裝程式與磁碟映像', 'Packaging, signing, installers and disk images', 'パッケージ、署名、インストーラ、ディスクイメージ', '패키징, 서명, 설치 프로그램, 디스크 이미지']],
	['Auto-updates', 'updates.md', ['签名更新、增量更新与更新窗口', '簽章更新、增量更新與更新視窗', 'Signed updates, delta updates and an update window', '署名付き更新、差分更新、更新ウィンドウ', '서명된 업데이트, 델타 업데이트, 업데이트 창']],
	['GitHub Actions', 'github-actions.md', ['打 tag 自动构建、签名、公证并发布', '推送 tag 自動建置、簽章、公證並發布', 'Build, sign, notarize and publish on a tag push', 'タグの push でビルド・署名・公証・公開', '태그 푸시로 빌드·서명·공증·배포']],
	['Configuration', 'configuration.md', ['mygo.config.ts 或 mygo.json', 'mygo.config.ts 或 mygo.json', 'mygo.config.ts or mygo.json', 'mygo.config.ts または mygo.json', 'mygo.config.ts 또는 mygo.json']],
];

export const DOCS: readonly Doc[] = DOC_ROWS.map(([title, file, desc]) => ({ title, url: DOCS_BASE + file, desc }));

export type InstallTab = 'bun' | 'go';

export const INSTALL_CMDS: Record<InstallTab, string> = {
	bun: 'bunx mygo-cli init my-app',
	go: 'go run github.com/egoist/mygo/cmd/mygo@latest init my-app',
};

export const CLI_CMDS = ['bunx mygo-cli init my-app', 'mygo doctor'] as const;

export function hostOf(url: string): string {
	return url.replace('https://', '').replace(/\/$/, '');
}

export function pad2(n: number): string {
	return (n < 10 ? '0' : '') + n;
}
