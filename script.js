/**
 * ProNexaX — pages/search/script.js
 * 試合検索ページ（STEP1: ダミーデータ + localStorage 仮保存）
 *
 * ─────────────────────────────────────────────────────────────────
 * 【ファイル構成】
 *  § DATA    ダミーデータ定義（STEP2: Firestore/API に差し替え）
 *  § STATE   アプリ状態管理（APP_STATE + アクセサー / ミューテーター）
 *  § STORAGE localStorage 仮保存（STEP2: Firestore 接続時に移行）
 *  § 2  カテゴリチップ描画
 *  § 3  条件フィルター描画
 *  § 4  クイックアクセスカード描画
 *  § 5  大会カード描画（tournamentCardHTML / renderTournamentList）
 *  § 6  フィルタリング・ソートロジック（applyFiltersAndRender）
 *  § 7  Bottom Sheet 開閉制御（openBottomSheet / closeBottomSheet）
 *  § 8  Bottom Sheet コンテンツ描画（renderBottomSheetContent）
 *  § 8.5 カレンダー追加・お気に入り操作（handleCalendarAdd / toggleFav）
 *  § 9  開催地フィルター Bottom Sheet
 *  § 10 検索バー・ソートタブ イベント接続
 *  § 11 初期化（init）
 *
 * ─────────────────────────────────────────────────────────────────
 * 【本体統合時に使う主要関数一覧】
 *  init()                    ページ初期化（localStorage 復元 → 全描画）
 *  renderTournamentList(arr) 大会カードリスト描画
 *  applyFiltersAndRender()   フィルター適用 + リスト再描画
 *  openBottomSheet(id)       大会詳細 BS を開く
 *  closeBottomSheet()        大会詳細 BS を閉じる
 *  handleCalendarAdd(id)     カレンダー追加（カード↔BS 双方向同期）
 *  toggleFav(id)             お気に入りトグル（カード↔BS 双方向同期）
 *  setFavorited(id, bool)    お気に入り状態を設定（STEP2: Firestore write）
 *  setAdded(id)              カレンダー追加状態を設定（STEP2: Firestore write）
 *  getStateSnapshot()        現在の状態スナップショット取得
 *  clearSearchState()        状態を完全リセット（デバッグ用）
 *
 * 【コンソールから使えるデバッグコマンド】
 *  getStateSnapshot()        → 現在の APP_STATE をオブジェクトで返す
 *  clearSearchState()        → 状態・localStorage を全リセットして再描画
 *
 * ─────────────────────────────────────────────────────────────────
 * 【STEP2 移行時の注意】
 *  - "STEP2:" コメントが付いた箇所が Firestore/API 接続ポイント
 *  - DUMMY_TOURNAMENTS → Firestore コレクション "tournaments" に差し替え
 *  - saveStateToLocalStorage / loadStateFromLocalStorage → Firestore 読み書きへ移行
 *  - タブバーのページ遷移 → 本体ルーター / Capacitor navigation に差し替え
 */

'use strict';

/* ================================================================
   § DATA  ダミーデータ定義
   ─ STEP2: Firestore コレクション "tournaments" のドキュメント構造に合わせて
     DUMMY_TOURNAMENTS を差し替える。フィールド名は本体 TOURNAMENTS_FLAT と統一。
   ================================================================ */

/**
 * 大会ダミーデータ（5件）
 *
 * 各フィールドの説明:
 *  id              大会ID（Firestore doc ID に合わせる）
 *  cat             カテゴリ: jgto / lpga / qt / mini / open / student / abroad
 *  gender          mens / womens
 *  region          domestic / overseas
 *  area            地方キー（AREA_REGIONS.key と対応）
 *  status          open（募集中）/ near（締切間近）/ closed（締切済）/ live（開催中）
 *  addedToCalendar UI 一時状態（STEP2: Firestore から読み込む）
 *  favorited       UI 一時状態（STEP2: Firestore から読み込む）
 */
const DUMMY_TOURNAMENTS = [
  {
    id: 'jgto-2025-001',
    name: '日本ゴルフツアー選手権 森ビルカップ Shishido Hills',
    cat: 'jgto',
    gender: 'mens',
    region: 'domestic',
    area: 'kanto',
    prefecture: 'ibaraki',
    course: '宍戸ヒルズCC（西コース）',
    start: '2025-06-05',
    end: '2025-06-08',
    entryDeadline: '2025-05-20',
    cancelDeadline: '2025-05-27',
    prize: '2億円',
    prizeWinner: '4,000万円',
    entryFee: '50,000円',
    practiceRoundFee: '15,000円',
    entryMethod: 'JGTO公式サイト・事前申請',
    qualification: 'JGTO会員・シードランキング上位',
    capacity: '120名',
    organizer: '日本ゴルフツアー機構（JGTO）',
    status: 'open',
    emoji: '🏆',
    tags: ['メジャー', 'JGTOポイント'],
    addedToCalendar: false,
    favorited: false,
  },
  {
    id: 'open-2025-001',
    name: '関東オープンゴルフ選手権競技',
    cat: 'open',
    gender: 'mens',
    region: 'domestic',
    area: 'kanto',
    prefecture: 'chiba',
    course: '我孫子GC',
    start: '2025-05-22',
    end: '2025-05-24',
    entryDeadline: '2025-05-12',
    cancelDeadline: '2025-05-16',
    prize: '3,000万円',
    prizeWinner: '500万円',
    entryFee: '30,000円',
    practiceRoundFee: '8,000円',
    entryMethod: '関東ゴルフ連盟申請書',
    qualification: 'プロゴルファー・アマチュア（ハンデ2以内）',
    capacity: '80名',
    organizer: '関東ゴルフ連盟',
    status: 'near',
    emoji: '⛳',
    tags: ['関東', '競技'],
    addedToCalendar: false,
    favorited: false,
  },
  {
    id: 'lpga-2025-001',
    name: 'ニッポンハム レディスクラシック',
    cat: 'lpga',
    gender: 'womens',
    region: 'domestic',
    area: 'hokkaido',
    prefecture: 'hokkaido',
    course: '北広島クラブ',
    start: '2025-06-12',
    end: '2025-06-15',
    entryDeadline: '2025-05-30',
    cancelDeadline: '2025-06-05',
    prize: '1億2,000万円',
    prizeWinner: '2,160万円',
    entryFee: '40,000円',
    practiceRoundFee: '12,000円',
    entryMethod: 'JLPGA公式サイト',
    qualification: 'JLPGA会員・ランキング上位',
    capacity: '96名',
    organizer: '日本女子プロゴルフ協会（JLPGA）',
    status: 'open',
    emoji: '🌸',
    tags: ['女子ツアー', 'メディア放映'],
    addedToCalendar: false,
    favorited: false,
  },
  {
    id: 'qt-2025-001',
    name: 'JGTO QTファイナル 2025',
    cat: 'qt',
    gender: 'mens',
    region: 'domestic',
    area: 'tokai',
    prefecture: 'aichi',
    course: '中部クラシックCC',
    start: '2025-11-10',
    end: '2025-11-14',
    entryDeadline: '2025-10-15',
    cancelDeadline: '2025-10-22',
    prize: '—',
    prizeWinner: '—',
    entryFee: '60,000円',
    practiceRoundFee: '20,000円',
    entryMethod: 'JGTO公式サイト・予選通過者のみ',
    qualification: 'QT 1〜3次予選通過者',
    capacity: '150名',
    organizer: '日本ゴルフツアー機構（JGTO）',
    status: 'open',
    emoji: '🎯',
    tags: ['QT', 'シード権'],
    addedToCalendar: false,
    favorited: false,
  },
  {
    id: 'mini-2025-001',
    name: 'Future Tour 第3戦 関東大会',
    cat: 'mini',
    gender: 'mens',
    region: 'domestic',
    area: 'kanto',
    prefecture: 'kanagawa',
    course: '川崎国際生田緑地GC',
    start: '2025-05-26',
    end: '2025-05-27',
    entryDeadline: '2025-05-14',
    cancelDeadline: '2025-05-19',
    prize: '150万円',
    prizeWinner: '50万円',
    entryFee: '18,000円',
    practiceRoundFee: '5,000円',
    entryMethod: 'Future Tour公式LINE',
    qualification: 'プロ・アマ（ハンデ5以内）',
    capacity: '48名',
    organizer: 'Future Tour運営委員会',
    status: 'near',
    emoji: '🌱',
    tags: ['ミニツアー', '初参加歓迎'],
    addedToCalendar: false,
    favorited: false,
  },
];

/* ================================================================
   § STATE  アプリ状態管理オブジェクト
   ─ 散在していた let 変数をここに集約。状態の読み書きは必ず
     アクセサー / ミューテーター関数を通して行う。
   ─ STEP2: Firestore 接続時は、ミューテーター内の "STEP2:" コメント
     箇所に Firestore への書き込みを追加するだけでよい。
   ================================================================ */

/**
 * アプリ全体の状態オブジェクト（シングルトン）
 *
 * ─ フィルター / 検索 ─────────────────────────────────────────────
 *   selectedCategory  : カテゴリチップの選択値（'all' / 'jgto' / ...）
 *   activeFilters     : 条件フィルターの Set（'fav' / 'near' / 'area' / ...）
 *   selectedArea      : 開催地フィルターの確定値（AREA_REGIONS.key）
 *   searchQuery       : 検索ボックスの入力文字列
 *   sortKey           : ソート種別（'recommend' / 'date' / 'deadline' / 'new'）
 *
 * ─ UI 表示状態（localStorage には保存しない） ──────────────────────
 *   selectedTournamentId : BS に表示中の大会ID（閉じたら null に戻す）
 *   bsOpen               : 大会詳細 BS の開閉フラグ
 *   areaSheetOpen        : 開催地 BS の開閉フラグ
 *
 * ─ 永続化対象（localStorage / STEP2: Firestore） ───────────────────
 *   favorites        : お気に入り登録済み大会IDの Set
 *   addedToCalendar  : カレンダー追加済み大会IDの Set
 */
const APP_STATE = {
  selectedCategory:     'all',
  activeFilters:        new Set(),
  selectedArea:         'all',
  searchQuery:          '',
  sortKey:              'recommend',

  selectedTournamentId: null,
  bsOpen:               false,
  areaSheetOpen:        false,

  favorites:            new Set(),
  addedToCalendar:      new Set(),
};


/* ── STATE アクセサー（読み取り専用）────────────────────────────── */

/** @param {string} id - 大会ID  @returns {boolean} お気に入り登録済みか */
function isFavorited(id) {
  return APP_STATE.favorites.has(id);
}

/** @param {string} id - 大会ID  @returns {boolean} カレンダー追加済みか */
function isAdded(id) {
  return APP_STATE.addedToCalendar.has(id);
}

/** Bottom Sheet に表示中の大会オブジェクトを返す（未選択なら null） */
function getSelectedTournament() {
  return DUMMY_TOURNAMENTS.find(t => t.id === APP_STATE.selectedTournamentId) || null;
}


/* ── STATE ミューテーター（書き込み）────────────────────────────── */

/**
 * お気に入り状態を更新する
 * ─ APP_STATE.favorites と DUMMY_TOURNAMENTS[].favorited を同時に更新。
 * ─ 変更後は localStorage に自動保存する。
 *
 * STEP2: Firestore にお気に入り状態を保存
 *   db.collection('users').doc(userId)
 *     .collection('favorites').doc(id).set({ active: value })
 *
 * @param {string}  id    - 大会ID
 * @param {boolean} value - true: 登録 / false: 解除
 */
function setFavorited(id, value) {
  value ? APP_STATE.favorites.add(id) : APP_STATE.favorites.delete(id);
  const t = DUMMY_TOURNAMENTS.find(x => x.id === id);
  if (t) t.favorited = !!value;
  saveStateToLocalStorage();
}

/**
 * カレンダー追加状態を更新する（追加のみ、取り消し不可）
 * ─ APP_STATE.addedToCalendar と DUMMY_TOURNAMENTS[].addedToCalendar を更新。
 * ─ 変更後は localStorage に自動保存する。
 *
 * STEP2: Firestore にカレンダー追加状態を保存
 *   db.collection('users').doc(userId)
 *     .collection('calendar').doc(id).set({ added: true, addedAt: serverTimestamp() })
 *
 * @param {string} id - 大会ID
 */
function setAdded(id) {
  APP_STATE.addedToCalendar.add(id);
  const t = DUMMY_TOURNAMENTS.find(x => x.id === id);
  if (t) t.addedToCalendar = true;
  saveStateToLocalStorage();
}

/**
 * 現在の APP_STATE を純粋なオブジェクト（Set → Array 変換済み）で返す
 * ─ デバッグ用: コンソールで `getStateSnapshot()` と呼ぶ
 * ─ STEP2: Firestore 初期書き込み時のペイロードとして利用可能
 */
function getStateSnapshot() {
  return {
    selectedCategory:     APP_STATE.selectedCategory,
    activeFilters:        [...APP_STATE.activeFilters],
    selectedArea:         APP_STATE.selectedArea,
    searchQuery:          APP_STATE.searchQuery,
    sortKey:              APP_STATE.sortKey,
    selectedTournamentId: APP_STATE.selectedTournamentId,
    favorites:            [...APP_STATE.favorites],
    addedToCalendar:      [...APP_STATE.addedToCalendar],
  };
}


/* ================================================================
   § STORAGE  localStorage 仮保存（STEP2: Firestore 接続前の動作確認用）
   ─ 保存対象: favorites / addedToCalendar / selectedCategory /
               activeFilters / selectedArea / searchQuery
   ─ 非保存 : sortKey / bsOpen / areaSheetOpen / selectedTournamentId
              （UI 一時状態なのでページ遷移ごとにリセットしてよい）
   ─ Set 型は JSON.stringify 不可のため、保存時は Array に変換する。
   ─ STEP2: この節の3関数を Firestore の読み書きに置き換える。
   ================================================================ */

/** localStorage のキー（バージョンアップ時は末尾の番号を上げる） */
const STORAGE_KEY = 'pronexax_search_state_v1';

/**
 * APP_STATE を localStorage に保存する
 * ─ setFavorited / setAdded / applyFiltersAndRender から自動で呼ばれる。
 * ─ プライベートブラウズなど localStorage が使えない環境でも動作を継続。
 *
 * STEP2: Firestore への書き込みに移行する場合はこの関数を削除し、
 *   各ミューテーター内の STEP2 コメントに Firestore write を記述する。
 */
function saveStateToLocalStorage() {
  try {
    const data = {
      favorites:        Array.from(APP_STATE.favorites),
      addedToCalendar:  Array.from(APP_STATE.addedToCalendar),
      selectedCategory: APP_STATE.selectedCategory,
      activeFilters:    Array.from(APP_STATE.activeFilters),
      selectedArea:     APP_STATE.selectedArea,
      searchQuery:      APP_STATE.searchQuery,
      _savedAt:         new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[ProNexaX] localStorage 保存失敗:', e);
  }
}

/**
 * localStorage から APP_STATE を復元する
 * ─ init() の冒頭で呼ばれる。
 * ─ Array → Set に変換して APP_STATE に反映。
 * ─ DUMMY_TOURNAMENTS の favorited / addedToCalendar も同期
 *   （UI 描画が t.favorited を直接参照するため）。
 *
 * STEP2: Firestore から保存済み状態を復元する場合は下記に差し替え:
 *   const snap = await db.collection('users').doc(userId).get();
 *   const data = snap.data();
 *   APP_STATE.favorites       = new Set(data.favorites      || []);
 *   APP_STATE.addedToCalendar = new Set(data.addedToCalendar|| []);
 *   // ... 以降同様
 *
 * @returns {boolean} 保存データが見つかり復元できた場合 true
 */
function loadStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const saved = JSON.parse(raw);

    // Set に変換して APP_STATE に反映
    APP_STATE.favorites        = new Set(saved.favorites       || []);
    APP_STATE.addedToCalendar  = new Set(saved.addedToCalendar || []);
    APP_STATE.selectedCategory = saved.selectedCategory        || 'all';
    APP_STATE.activeFilters    = new Set(saved.activeFilters   || []);
    APP_STATE.selectedArea     = saved.selectedArea            || 'all';
    APP_STATE.searchQuery      = saved.searchQuery             || '';

    // DUMMY_TOURNAMENTS のデータフィールドにも同期
    // （UI レンダリングが t.favorited / t.addedToCalendar を直接参照するため）
    DUMMY_TOURNAMENTS.forEach(t => {
      t.favorited       = APP_STATE.favorites.has(t.id);
      t.addedToCalendar = APP_STATE.addedToCalendar.has(t.id);
    });

    console.log(
      `[ProNexaX] 💾 状態を復元 (保存時刻: ${saved._savedAt || '—'})`,
      getStateSnapshot()
    );
    return true;
  } catch (e) {
    console.warn('[ProNexaX] localStorage 復元失敗:', e);
    return false;
  }
}

/**
 * アプリ状態を完全リセットする（デバッグ用）
 * ─ localStorage を削除し、APP_STATE と DUMMY_TOURNAMENTS を初期値に戻す。
 * ─ ブラウザコンソールから `clearSearchState()` で呼び出せる。
 *
 * STEP2: Firestore のユーザーデータも合わせて削除する場合は
 *   db.collection('users').doc(userId).delete() などを追加する。
 */
function clearSearchState() {
  localStorage.removeItem(STORAGE_KEY);

  APP_STATE.favorites        = new Set();
  APP_STATE.addedToCalendar  = new Set();
  APP_STATE.selectedCategory = 'all';
  APP_STATE.activeFilters    = new Set();
  APP_STATE.selectedArea     = 'all';
  APP_STATE.searchQuery      = '';
  APP_STATE.sortKey          = 'recommend';

  DUMMY_TOURNAMENTS.forEach(t => {
    t.favorited       = false;
    t.addedToCalendar = false;
  });

  const si = document.getElementById('search-input');
  if (si) si.value = '';

  console.log('[ProNexaX] 🗑️ 状態をリセットしました');
  init();
}

/*
 * デバッグ用グローバル公開
 * ─ コンソールから直接呼べるように window に登録する。
 * ─ 本番ビルドでは除去してもよい。
 */
window.getStateSnapshot = getStateSnapshot;
window.clearSearchState = clearSearchState;


/**
 * カテゴリチップ定義
 */
const CATEGORIES = [
  { key: 'all',    label: 'すべて',    icon: '🔍' },
  { key: 'jgto',  label: '男子ツアー', icon: '🏌️' },
  { key: 'lpga',  label: '女子ツアー', icon: '🌸' },
  { key: 'qt',    label: 'QT',        icon: '🎯' },
  { key: 'mini',  label: 'ミニツアー', icon: '🌱' },
  { key: 'open',  label: 'オープン',   icon: '⛳' },
  { key: 'student',label: '学生',      icon: '🎓' },
  { key: 'abroad', label: '海外',      icon: '✈️' },
];

/**
 * 条件フィルター定義
 */
const CONDITIONS = [
  { key: 'fav',        label: '❤ お気に入り', icon: null, isFav: true },
  { key: 'recruiting', label: '募集中のみ',    icon: null },
  { key: 'near',       label: '締切間近',      icon: null },
  { key: 'thisweek',   label: '今週開催',      icon: null },
  { key: 'nextmonth',  label: '来月開催',      icon: null },
  { key: 'area',       label: '開催地',        icon: '📍' },
  { key: 'reset',      label: 'リセット',      icon: '↺', isReset: true },
];

/**
 * クイックアクセスカード定義
 */
// SVG 線画アイコン（iOS SF Symbols 風 / stroke-based）
const _QC_ICONS = {
  // 締切間近: 時計
  near: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`,
  // 今週開催: 旗
  thisweek: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  // 来月開催: カレンダー
  nextmonth: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  // 人気大会: 星
  popular: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  // 遠征おすすめ: 飛行機
  travel: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
};

const QUICK_CARDS = [
  { key: 'near',      label: '締切間近',    icon: _QC_ICONS.near,      count: 7,  colorClass: 'qc-red'    },
  { key: 'thisweek',  label: '今週開催',    icon: _QC_ICONS.thisweek,  count: 5,  colorClass: 'qc-amber'  },
  { key: 'nextmonth', label: '来月開催',    icon: _QC_ICONS.nextmonth, count: 12, colorClass: 'qc-blue'   },
  { key: 'popular',   label: '人気大会',    icon: _QC_ICONS.popular,   count: 10, colorClass: 'qc-green'  },
  { key: 'travel',    label: '遠征おすすめ', icon: _QC_ICONS.travel,    count: 8,  colorClass: 'qc-purple' },
];


/* ================================================================
   § 2  カテゴリチップ描画
   ─ APP_STATE.selectedCategory を読み書きする。
   ─ 同じチップを再タップすると 'all' に戻る（トグル解除）。
   ================================================================ */

function renderCategoryChips() {
  const container = document.getElementById('category-chips');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <button
      class="s-chip${cat.key === APP_STATE.selectedCategory ? ' active' : ''}"
      data-cat="${cat.key}"
      aria-pressed="${cat.key === APP_STATE.selectedCategory}"
    >
      <span class="s-chip-icon">${cat.icon}</span>
      ${cat.label}
    </button>
  `).join('');

  // イベントバインド
  container.querySelectorAll('.s-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = APP_STATE.selectedCategory;
      APP_STATE.selectedCategory = btn.dataset.cat;

      // 同じチップを再タップで全解除
      if (prev === APP_STATE.selectedCategory && APP_STATE.selectedCategory !== 'all') {
        APP_STATE.selectedCategory = 'all';
      }

      renderCategoryChips();
      scrollActiveChipIntoView();
      applyFiltersAndRender();
    });
  });
}

/**
 * アクティブなチップをスクロール領域内に収める
 * 左右に少しパディングを確保する
 */
function scrollActiveChipIntoView() {
  const container = document.getElementById('category-chips');
  if (!container) return;
  const activeBtn = container.querySelector('.s-chip.active');
  if (!activeBtn) return;

  // スムーズスクロールで中央付近に
  const containerRect = container.getBoundingClientRect();
  const btnRect       = activeBtn.getBoundingClientRect();
  const scrollLeft    = container.scrollLeft;
  const targetScroll  = scrollLeft + (btnRect.left - containerRect.left)
                        - containerRect.width / 2 + btnRect.width / 2;

  container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
}


/* ================================================================
   § 3  条件フィルター描画
   ─ APP_STATE.activeFilters（Set）を読み書きする。
   ─ 「開催地」チップは openAreaSheet() を呼んでシートを開く。
   ─ 「リセット」チップは activeFilters / selectedArea を全クリア。
   ================================================================ */

function renderConditionFilters() {
  const container = document.getElementById('condition-filters');
  if (!container) return;

  container.innerHTML = CONDITIONS.map(cond => {
    const isActive = APP_STATE.activeFilters.has(cond.key);

    // 「開催地」チップ: 選択中エリア名を表示
    let label = cond.label;
    let extraClass = '';
    if (cond.key === 'area') {
      if (APP_STATE.selectedArea && APP_STATE.selectedArea !== 'all') {
        const region = AREA_REGIONS.find(r => r.key === APP_STATE.selectedArea);
        if (region) {
          label = `📍 ${region.label}`;
          extraClass = ' has-area-label';
        }
      } else {
        label = `📍 ${cond.label}`;
      }
    }

    return `
      <button
        class="s-filter-chip${cond.isReset ? ' reset' : ''}${isActive ? ' active' : ''}${extraClass}"
        data-cond="${cond.key}"
        aria-pressed="${isActive}"
      >
        ${label}
      </button>
    `;
  }).join('');

  container.querySelectorAll('.s-filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.cond;

      // リセット
      if (key === 'reset') {
        APP_STATE.activeFilters.clear();
        APP_STATE.selectedArea = 'all';
        renderConditionFilters();
        applyFiltersAndRender();
        return;
      }

      // 「開催地」→ エリアシートを開く
      if (key === 'area') {
        openAreaSheet();
        return;
      }

      // その他の条件トグル
      if (APP_STATE.activeFilters.has(key)) {
        APP_STATE.activeFilters.delete(key);
      } else {
        APP_STATE.activeFilters.add(key);
      }
      renderConditionFilters();
      applyFiltersAndRender();
    });
  });
}


/* ================================================================
   § 4  クイックアクセスカード描画
   ================================================================ */

function renderQuickCards() {
  const container = document.getElementById('quick-cards');
  if (!container) return;

  container.innerHTML = QUICK_CARDS.map(card => `
    <div class="s-quick-card ${card.colorClass}" data-quick="${card.key}" role="button" tabindex="0">
      <div class="s-quick-icon">${card.icon}</div>
      <span class="s-quick-label">${card.label}</span>
      <span class="s-quick-count">${card.count}件</span>
    </div>
  `).join('');

  container.querySelectorAll('.s-quick-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.quick;
      // クイックアクセスタップ → 対応するフィルターを適用
      APP_STATE.activeFilters.clear();
      if (key !== 'popular' && key !== 'travel') {
        APP_STATE.activeFilters.add(key);
      }
      renderConditionFilters();
      applyFiltersAndRender();
      // 大会リストまでスクロール
      const listSection = document.querySelector('.s-list-section');
      if (listSection) {
        listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}


/* ================================================================
   § 5  大会カード描画
   ================================================================ */

/**
 * 募集状況バッジHTML
 */
function statusBadgeHTML(t) {
  if (t.status === 'near') {
    return `<span class="tc-status-badge tc-status-near">🔥 締切間近</span>`;
  }
  if (t.status === 'open') {
    return `<span class="tc-status-badge tc-status-open">✓ 募集中</span>`;
  }
  return `<span class="tc-status-badge tc-status-closed">締切済</span>`;
}

/**
 * 性別バッジHTML
 */
function genderBadgeHTML(gender) {
  if (gender === 'mens')   return `<span class="tc-badge badge-gender-m">男子</span>`;
  if (gender === 'womens') return `<span class="tc-badge badge-gender-f">女子</span>`;
  return '';
}

/**
 * カテゴリー日本語名
 */
function catLabel(key) {
  const found = CATEGORIES.find(c => c.key === key);
  return found ? found.label : key;
}

/**
 * エリアキーを日本語ラベルに変換
 * AREA_REGIONS は § 最下部で定義されているが、呼び出しは初期化後なので問題なし
 */
function areaLabelFromKey(key) {
  if (!key) return '—';
  const r = AREA_REGIONS.find(r => r.key === key || (r.areas && r.areas.includes(key)));
  return r ? r.label : key;
}

/**
 * 日付フォーマット (YYYY-MM-DD → M/D)
 */
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 日付フォーマット (YYYY-MM-DD → YYYY年M月D日)
 */
function fmtDateLong(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 曜日付き短い日付 (YYYY-MM-DD → M月D日(曜))
 */
function fmtDateWithDay(str) {
  if (!str) return '—';
  const days = ['日','月','火','水','木','金','土'];
  const d = new Date(str);
  if (isNaN(d)) return str;
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
}

/**
 * カテゴリ別プレースホルダー背景グラデーション
 */
function catPlaceholderBg(cat) {
  const map = {
    jgto:    'linear-gradient(140deg, #1A5C38 0%, #2D8A55 100%)',
    lpga:    'linear-gradient(140deg, #7A1A5C 0%, #B04A8A 100%)',
    qt:      'linear-gradient(140deg, #1A3A6B 0%, #2E62AA 100%)',
    mini:    'linear-gradient(140deg, #2D6A4F 0%, #52B788 100%)',
    open:    'linear-gradient(140deg, #6B3A1A 0%, #AA6030 100%)',
    student: 'linear-gradient(140deg, #4A3A7A 0%, #7060AA 100%)',
    abroad:  'linear-gradient(140deg, #1A3A5C 0%, #2E70AA 100%)',
  };
  return map[cat] || 'linear-gradient(140deg, #2A2A3A 0%, #4A4A5A 100%)';
}

/**
 * 締切日までの緊急度クラスを返す
 */
function deadlineUrgencyClass(deadline) {
  if (!deadline) return 'deadline-normal';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(deadline);
  const days  = Math.ceil((d - today) / 86400000);
  if (days < 0)   return 'deadline-closed';
  if (days <= 5)  return 'deadline-urgent';
  if (days <= 14) return 'deadline-warning';
  return 'deadline-normal';
}

/**
 * 「あとN日」テキストを返す
 */
function daysUntilDeadline(deadline) {
  if (!deadline) return '—';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(deadline);
  const days  = Math.ceil((d - today) / 86400000);
  if (days < 0)   return '締切済';
  if (days === 0) return '本日締切！';
  if (days === 1) return '明日締切';
  if (days <= 5)  return `あと${days}日！`;
  return `あと${days}日`;
}

/**
 * カード用ステータスピル HTML（⑦ 募集状況 — フッター行で表示）
 * Bottom Sheet の statusBadgeHTML とは独立。
 */
function statusPillHTML(t) {
  if (t.status === 'near')   return `<span class="tc-status-pill tc-status-near">🔥 締切間近</span>`;
  if (t.status === 'open')   return `<span class="tc-status-pill tc-status-open">✓ 募集中</span>`;
  if (t.status === 'live')   return `<span class="tc-status-pill tc-status-live">● 開催中</span>`;
  return `<span class="tc-status-pill tc-status-closed">締切済</span>`;
}

/**
 * 締切ストリップ用アイコン（urgencyClass に応じて）
 */
function deadlineIcon(urgencyClass) {
  if (urgencyClass === 'deadline-urgent')  return '🔥';
  if (urgencyClass === 'deadline-warning') return '⏰';
  if (urgencyClass === 'deadline-closed')  return '—';
  return '📅';
}

/**
 * 大会カード1件のHTML
 *
 * 情報優先順位（上から）:
 *  ① 締切     → tc-deadline-strip（全幅・カラー背景・左アクセントボーダー）
 *  ② 開催日   → tc-date-bar（大会名より上・緑で目立つ）
 *  ③ 大会名   → tc-name
 *  ④ 開催地   → tc-venue-line（独立行）
 *  ⑤ 賞金総額 → tc-info-grid 左
 *  ⑥ 出場資格 → tc-info-grid 右
 *  ⑦ 募集状況 → tc-footer-row 左のステータスピル
 */
function tournamentCardHTML(t) {
  const urgencyClass = deadlineUrgencyClass(t.entryDeadline);
  const daysLabel    = daysUntilDeadline(t.entryDeadline);
  const dlIcon       = deadlineIcon(urgencyClass);
  const bgStyle      = catPlaceholderBg(t.cat);
  const qualShort    = t.qualification.length > 18
    ? t.qualification.slice(0, 18) + '…'
    : t.qualification;

  return `
    <article
      class="s-tournament-card"
      data-id="${t.id}"
      role="button"
      tabindex="0"
      aria-label="${t.name} 詳細を見る"
    >
      <!-- ── 画像エリア ── -->
      <div class="tc-image-wrap" style="background: ${bgStyle};">
        <div class="tc-image-placeholder">${t.emoji}</div>
        <div class="tc-image-overlay"></div>
        <!-- 左下: カテゴリ + 性別バッジ -->
        <div class="tc-img-badges-bottom">
          <span class="tc-badge badge-cat">${catLabel(t.cat)}</span>
          ${genderBadgeHTML(t.gender)}
        </div>
        <!-- 右上: お気に入りボタン（未登録=outline / 登録済=filled red） -->
        <button
          class="tc-fav-btn${t.favorited ? ' active' : ''}"
          data-id="${t.id}"
          aria-label="${t.favorited ? 'お気に入り解除' : 'お気に入り登録'}"
          onclick="event.stopPropagation(); toggleFav('${t.id}')"
        >
          ${t.favorited
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="#FF3B30" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
          }
        </button>
      </div>

      <!-- ── コンテンツ ── -->
      <div class="tc-content">

        <!-- ① 締切（全幅ストリップ・左ボーダーアクセント） -->
        <div class="tc-deadline-strip ${urgencyClass}">
          <div class="tc-dl-left">
            <span class="tc-dl-icon">${dlIcon}</span>
            <span class="tc-dl-date ${urgencyClass}">締切 ${fmtDateWithDay(t.entryDeadline)}</span>
          </div>
          <span class="tc-dl-days ${urgencyClass}">${daysLabel}</span>
        </div>

        <!-- ② 開催日（大会名より上・緑・目立つ） -->
        <div class="tc-date-bar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
          </svg>
          ${fmtDateWithDay(t.start)} 〜 ${fmtDateWithDay(t.end)}
        </div>

        <!-- ③ 大会名 -->
        <h3 class="tc-name">${t.name}</h3>

        <!-- ④ 開催地（独立行） -->
        <div class="tc-venue-line">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          ${t.course}
        </div>

        <!-- ⑤ 賞金総額 / ⑥ 出場資格 -->
        <div class="tc-info-grid">
          <div class="tc-info-item">
            <p class="tc-info-label">賞金総額</p>
            <p class="tc-info-value highlight">${t.prize}</p>
          </div>
          <div class="tc-info-item">
            <p class="tc-info-label">出場資格</p>
            <p class="tc-info-value">${qualShort}</p>
          </div>
        </div>

        <!-- ⑦ 募集状況（左）+ カレンダーに追加（右・単独主CTA） -->
        <div class="tc-footer-row">
          ${statusPillHTML(t)}
          <button
            class="tc-btn tc-btn-add${t.addedToCalendar ? ' added' : ''}"
            data-id="${t.id}"
            onclick="event.stopPropagation(); handleCalendarAdd('${t.id}')"
            aria-label="カレンダーに追加"
          >
            ${t.addedToCalendar
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 追加済み`
              : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg> カレンダーに追加`
            }
          </button>
        </div>

      </div>
    </article>
  `;
}

/**
 * 大会リスト全体を描画
 */
function renderTournamentList(tournaments) {
  const container = document.getElementById('tournament-list');
  if (!container) return;

  if (tournaments.length === 0) {
    container.innerHTML = `
      <div class="s-empty">
        <div class="s-empty-icon">🔍</div>
        <p class="s-empty-title">該当する大会がありません</p>
        <p class="s-empty-sub">フィルターを変更してもう一度お試しください</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tournaments.map(tournamentCardHTML).join('');

  // ── カード全体タップでBottomSheetを開く
  // tappingクラスで押し込みフィードバック → 少し待ってからシートを開く
  container.querySelectorAll('.s-tournament-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // ボタン直タップの場合はカードイベントをスキップ（ボタン側で処理）
      if (e.target.closest('.tc-btn') || e.target.closest('.tc-fav-btn')) return;

      const id = card.dataset.id;

      // タップフィードバック: 押し込みアニメーション
      card.classList.add('tapping');
      setTimeout(() => {
        card.classList.remove('tapping');
        openBottomSheet(id);
      }, 90); // 90ms後にシートが出る → 自然な連続感
    });
  });
}


/* ================================================================
   § 6  フィルタリング・ソートロジック
   ─ カテゴリ / 検索ワード / 条件フィルター / 開催地 / ソートを
     APP_STATE から読み取ってリストをフィルタリング・再描画する。
   ─ 状態変化のたびに saveStateToLocalStorage() を呼んで自動保存。
   ================================================================ */

/**
 * フィルター・ソートを適用してカードリストを再描画する
 * ─ 既にカードが表示されている場合はフェードアウト → 更新 → フェードイン。
 * ─ 初回（カードがない）は即座に描画する。
 * ─ カテゴリ / 条件フィルター / 検索バー / ソートタブが変化した際に呼ぶ。
 */
function applyFiltersAndRender() {
  saveStateToLocalStorage(); // 💾 フィルター・検索変更を自動保存
  const list = document.getElementById('tournament-list');
  const hasExisting = list && list.querySelector('.s-tournament-card, .s-empty');

  if (hasExisting) {
    // ── フェードアウト → 更新 → フェードイン ──
    list.classList.add('fading-out');
    setTimeout(() => {
      _buildFilteredResult();
      list.classList.remove('fading-out');
    }, 180);
  } else {
    // 初回描画: フェードなしで即描画
    _buildFilteredResult();
  }
}

/**
 * 実際のフィルタリング + renderTournamentList 呼び出し
 * applyFiltersAndRender の内部実装を分離
 */
function _buildFilteredResult() {
  let result = [...DUMMY_TOURNAMENTS];

  // ── カテゴリフィルター ──
  if (APP_STATE.selectedCategory !== 'all') {
    result = result.filter(t => t.cat === APP_STATE.selectedCategory);
  }

  // ── 検索クエリ ──
  if (APP_STATE.searchQuery.trim()) {
    const q = APP_STATE.searchQuery.trim().toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.organizer.toLowerCase().includes(q) ||
      t.course.toLowerCase().includes(q)
    );
  }

  // ── 条件フィルター ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneWeekLater   = new Date(today); oneWeekLater.setDate(today.getDate() + 7);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd   = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  // お気に入りフィルター
  if (APP_STATE.activeFilters.has('fav')) {
    result = result.filter(t => t.favorited);
  }

  if (APP_STATE.activeFilters.has('recruiting')) {
    result = result.filter(t => t.status === 'open' || t.status === 'near');
  }
  if (APP_STATE.activeFilters.has('near')) {
    result = result.filter(t => t.status === 'near');
  }
  if (APP_STATE.activeFilters.has('thisweek')) {
    result = result.filter(t => {
      const s = new Date(t.start);
      return s >= today && s <= oneWeekLater;
    });
  }
  if (APP_STATE.activeFilters.has('nextmonth')) {
    result = result.filter(t => {
      const s = new Date(t.start);
      return s >= nextMonthStart && s <= nextMonthEnd;
    });
  }

  // ── 開催地フィルター ──
  if (APP_STATE.activeFilters.has('area') && APP_STATE.selectedArea && APP_STATE.selectedArea !== 'all') {
    const region = AREA_REGIONS.find(r => r.key === APP_STATE.selectedArea);
    if (region && region.areas.length > 0) {
      result = result.filter(t =>
        region.areas.includes(t.area) ||
        region.areas.includes(t.prefecture)
      );
    }
  }

  // ── ソート ──
  result = sortTournaments(result, APP_STATE.sortKey);

  renderTournamentList(result);
}

function sortTournaments(arr, sortKey) {
  const sorted = [...arr];
  switch (sortKey) {
    case 'date':
      sorted.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
      break;
    case 'deadline':
      sorted.sort((a, b) => (a.entryDeadline < b.entryDeadline ? -1 : a.entryDeadline > b.entryDeadline ? 1 : 0));
      break;
    case 'new':
      sorted.reverse(); // 新着 = 配列末尾が新しい想定
      break;
    case 'recommend':
    default:
      // おすすめ: 締切間近を優先
      sorted.sort((a, b) => {
        const score = (t) => (t.status === 'near' ? 10 : 0);
        return score(b) - score(a);
      });
      break;
  }
  return sorted;
}


/* ================================================================
   § 7  Bottom Sheet 開閉制御
   ─ iOS Maps / Apple Music 風の spring アニメーション
     (cubic-bezier(0.32, 0.72, 0, 1)) で開閉する。
   ─ openBottomSheet(id)  : カードタップ時に呼ぶ
   ─ closeBottomSheet()   : 閉じるボタン / 背景タップ / Esc / スワイプで呼ぶ
   ─ APP_STATE.bsOpen / selectedTournamentId を読み書きする。
   ================================================================ */

let _bsCloseTimer = null;    // 閉じアニメーション完了待ちタイマー

const bsOverlay = document.getElementById('bs-overlay');
const bsSheet   = document.getElementById('bs-sheet');
const scrollArea = document.getElementById('scroll-area');

/**
 * Bottom Sheet を開く
 * - カードタップ時に呼ばれる
 * - コンテンツ描画 → 2フレーム後にクラス付与（CSSトランジション起点）
 */
function openBottomSheet(id) {
  if (APP_STATE.bsOpen) return;          // 既に開いている場合はスキップ
  const t = DUMMY_TOURNAMENTS.find(x => x.id === id);
  if (!t) return;

  // --- 1. 状態更新 ---
  APP_STATE.selectedTournamentId = id;
  APP_STATE.bsOpen = true;
  if (_bsCloseTimer) { clearTimeout(_bsCloseTimer); _bsCloseTimer = null; }

  // --- 2. コンテンツ描画（表示前に済ませておく） ---
  renderBottomSheetContent(t);

  // --- 3. aria 制御 ---
  bsSheet.removeAttribute('aria-hidden');
  bsSheet.setAttribute('aria-modal', 'true');
  bsOverlay.setAttribute('aria-hidden', 'false');

  // --- 4. メインコンテンツのスクロール固定（位置ずれ防止） ---
  scrollArea.style.overflow = 'hidden';
  scrollArea.style.touchAction = 'none';

  // --- 5. 2フレーム後にクラス付与 → CSS transition 起動 ---
  //    1フレームだとブラウザが初期状態を認識できないことがある
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bsOverlay.classList.add('open');
      bsSheet.classList.add('open');
    });
  });

  // --- 6. 開いたあとフォーカスを閉じるボタンへ（アクセシビリティ） ---
  const closeBtn = document.getElementById('bs-close-btn');
  if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 460);
}

/**
 * Bottom Sheet を閉じる
 * - クラスを外す → CSSトランジション（同じspring）で閉じる
 * - transition終了後にスクロール禁止を解除
 */
function closeBottomSheet() {
  if (!APP_STATE.bsOpen) return;
  APP_STATE.bsOpen = false;

  // --- 1. クラスを外すと CSSトランジションで閉じる ---
  bsOverlay.classList.remove('open');
  bsSheet.classList.remove('open');

  // --- 2. aria ---
  bsSheet.setAttribute('aria-hidden', 'true');
  bsOverlay.setAttribute('aria-hidden', 'true');

  // --- 3. トランジション終了後（~480ms）にスクロール復元 ---
  _bsCloseTimer = setTimeout(() => {
    scrollArea.style.overflow = '';
    scrollArea.style.touchAction = '';
    APP_STATE.selectedTournamentId = null;
    _bsCloseTimer = null;
  }, 480);
}

// ── イベント接続 ──

// 閉じるボタン
document.getElementById('bs-close-btn').addEventListener('click', closeBottomSheet);

// 背景暗幕タップで閉じる
bsOverlay.addEventListener('click', closeBottomSheet);

// Escキーで閉じる（デスクトップ確認用）
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && APP_STATE.bsOpen) closeBottomSheet();
});

// ── スワイプダウン（簡易実装）
// ドラッグハンドルを下へ引っ張ると閉じる
;(function initSwipeDown() {
  const handle = document.querySelector('.bs-handle-wrap');
  if (!handle) return;

  let startY = 0;
  let startTime = 0;
  let isDragging = false;

  handle.addEventListener('touchstart', e => {
    if (!APP_STATE.bsOpen) return;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    isDragging = true;
  }, { passive: true });

  handle.addEventListener('touchmove', e => {
    if (!isDragging || !APP_STATE.bsOpen) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      // ドラッグ距離に応じてシートを追随させる（フォロースルー感）
      bsSheet.style.transition = 'none';
      bsSheet.style.transform = `translateX(-50%) translateY(${dy}px)`;
    }
  }, { passive: true });

  handle.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startTime;
    const velocity = dy / dt; // px/ms

    // 80px以上下に引くか、速い下スワイプ（>0.5px/ms）で閉じる
    if (dy > 80 || velocity > 0.5) {
      bsSheet.style.transition = '';
      bsSheet.style.transform = '';
      closeBottomSheet();
    } else {
      // 途中まで引いてリリース → 元に戻す
      bsSheet.style.transition = 'transform .32s cubic-bezier(0.32, 0.72, 0, 1)';
      bsSheet.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(() => {
        bsSheet.style.transition = '';
        bsSheet.style.transform = '';
      }, 340);
    }
  }, { passive: true });
})();


/* ================================================================
   § 8  Bottom Sheet コンテンツ描画
   ─ bsBody.innerHTML を毎回全書き換えする方式（サブID 個別更新は廃止）。
   ─ 6ブロック構成: 基本情報 / 賞金 / 費用 / 出場条件 / 運営 / スケジュール
   ─ 描画後に _syncBSAddBtn / _syncBSFavBtn でフッター・ヘッダーを同期。
   ─ BSヘッダーのお気に入りボタンは cloneNode で重複リスナーをリセット。
   ================================================================ */

function renderBottomSheetContent(t) {
  const bsBody = document.getElementById('bs-body');
  if (!bsBody) return;

  // ヘッダータイトル
  document.getElementById('bs-header-title').textContent = '大会詳細';

  // ── urgency計算 ──
  const urgencyClass = deadlineUrgencyClass(t.entryDeadline);
  const daysLabel    = daysUntilDeadline(t.entryDeadline);
  const dlIcon       = deadlineIcon(urgencyClass);

  // 締切日テキスト色クラス（urgentなら赤、warningならオレンジ）
  const deadlineValueClass =
    urgencyClass === 'deadline-urgent'  ? 'urgent'  :
    urgencyClass === 'deadline-warning' ? 'warning' : '';

  // ── スケジュール4項目 ──
  const schedItems = [
    { date: t.entryDeadline,  label: 'エントリー締切', cls: 'date-deadline' },
    { date: t.cancelDeadline, label: 'キャンセル締切', cls: 'date-cancel'   },
    { date: t.start,          label: '競技開始',       cls: ''              },
    { date: t.end,            label: '競技最終日',     cls: ''              },
  ];

  // ── bs-body 全体をinnerHTML方式で再構築 ──
  bsBody.innerHTML = `

    <!-- ▌画像エリア: カテゴリ色グラデ + バッジ2箇所 -->
    <div class="bs-image-wrap" style="background:${catPlaceholderBg(t.cat)};">
      <div class="bs-image-placeholder">${t.emoji}</div>
      <div class="bs-image-overlay"></div>

      <!-- 右上: 締切urgencyバッジ -->
      <div class="bs-img-urgency-badge ${urgencyClass}">
        ${dlIcon} ${daysLabel}
      </div>

      <!-- 左下: カテゴリ / 性別 / 募集状況 -->
      <div class="bs-image-badges">
        <span class="tc-badge badge-cat">${catLabel(t.cat)}</span>
        ${genderBadgeHTML(t.gender)}
        ${statusBadgeHTML(t)}
      </div>
    </div>

    <!-- ▌スクロールコンテンツ -->
    <div class="bs-scroll-content">

      <!-- 大会名 -->
      <h2 class="bs-name">${t.name}</h2>

      <!-- 締切urgencyストリップ -->
      <div class="bs-deadline-strip ${urgencyClass}">
        <div class="bs-dl-left">
          <span class="bs-dl-icon">${dlIcon}</span>
          <span class="bs-dl-date ${urgencyClass}">締切 ${fmtDateWithDay(t.entryDeadline)}</span>
        </div>
        <span class="bs-dl-days ${urgencyClass}">${daysLabel}</span>
      </div>

      <!-- ━━ Block 1: 基本情報 ━━ -->
      <div class="bs-info-card">
        <p class="bs-info-card-title">📅 基本情報</p>
        <div class="bs-card-item">
          <p class="bs-card-label">開催期間</p>
          <p class="bs-card-value highlight">${fmtDateWithDay(t.start)} 〜 ${fmtDateWithDay(t.end)}</p>
        </div>
        <div class="bs-card-item border-top">
          <p class="bs-card-label">エントリー締切</p>
          <p class="bs-card-value${deadlineValueClass ? ' ' + deadlineValueClass : ''}">${fmtDateWithDay(t.entryDeadline)}</p>
        </div>
        <div class="bs-card-item border-top">
          <p class="bs-card-label">会場</p>
          <p class="bs-card-value">${t.course}</p>
        </div>
        <div class="bs-card-item border-top">
          <p class="bs-card-label">開催地</p>
          <p class="bs-card-value">${areaLabelFromKey(t.area)}</p>
        </div>
      </div>

      <!-- ━━ Block 2: 賞金情報 ━━ -->
      <div class="bs-info-card">
        <p class="bs-info-card-title">🏆 賞金情報</p>
        <div class="bs-info-card-grid">
          <div class="bs-card-item">
            <p class="bs-card-label">賞金総額</p>
            <p class="bs-card-value highlight">${t.prize}</p>
          </div>
          <div class="bs-card-item">
            <p class="bs-card-label">優勝賞金</p>
            <p class="bs-card-value highlight">${t.prizeWinner}</p>
          </div>
        </div>
      </div>

      <!-- ━━ Block 3: 費用情報 ━━ -->
      <div class="bs-info-card">
        <p class="bs-info-card-title">💴 費用情報</p>
        <div class="bs-info-card-grid">
          <div class="bs-card-item">
            <p class="bs-card-label">エントリー費</p>
            <p class="bs-card-value">${t.entryFee}</p>
          </div>
          <div class="bs-card-item">
            <p class="bs-card-label">プレーフィー</p>
            <p class="bs-card-value">${t.practiceRoundFee}</p>
          </div>
        </div>
      </div>

      <!-- ━━ Block 4: 出場条件 ━━ -->
      <div class="bs-info-card">
        <p class="bs-info-card-title">📋 出場条件</p>
        <div class="bs-card-item">
          <p class="bs-card-label">出場資格</p>
          <p class="bs-card-value sm">${t.qualification}</p>
        </div>
        <div class="bs-card-item border-top">
          <p class="bs-card-label">募集人数</p>
          <p class="bs-card-value">${t.capacity}</p>
        </div>
      </div>

      <!-- ━━ Block 5: 運営情報 ━━ -->
      <div class="bs-info-card">
        <p class="bs-info-card-title">🏢 運営情報</p>
        <div class="bs-card-item">
          <p class="bs-card-label">主催</p>
          <p class="bs-card-value sm">${t.organizer}</p>
        </div>
        <div class="bs-card-item border-top">
          <p class="bs-card-label">申込方法</p>
          <p class="bs-card-value sm">${t.entryMethod}</p>
        </div>
      </div>

      <!-- ━━ Block 6: スケジュール ━━ -->
      <p class="bs-section-title">スケジュール</p>
      <div class="bs-info-card">
        ${schedItems.map(item => `
          <div class="bs-schedule-item">
            <span class="bs-sched-date${item.cls ? ' ' + item.cls : ''}">${fmtDateWithDay(item.date)}</span>
            <span class="bs-sched-label">${item.label}</span>
          </div>
        `).join('')}
      </div>

      <div style="height:6px;"></div>
    </div>
  `;

  // スクロールをトップへリセット
  bsBody.scrollTop = 0;

  // 固定フッター「カレンダーに追加」ボタン状態を同期
  _syncBSAddBtn(t);

  // BSヘッダー「お気に入り」ボタン状態を同期
  _syncBSFavBtn(t);

  // BSヘッダーのお気に入りボタンにクリックイベントを付与
  const bsFavBtn = document.getElementById('bs-fav-btn');
  if (bsFavBtn) {
    // 重複登録防止: oldListener を置き換え
    const newHandler = () => toggleFav(t.id);
    bsFavBtn.replaceWith(bsFavBtn.cloneNode(true)); // イベントリセット
    const freshBtn = document.getElementById('bs-fav-btn');
    _syncBSFavBtn(t); // クローン後に再同期
    if (freshBtn) freshBtn.addEventListener('click', newHandler);
  }
}

/**
 * 固定フッターの「カレンダーに追加」ボタン状態を同期
 * （innerHTML書き換え後でもフッターは DOM固定なので安全）
 */
function _syncBSAddBtn(t) {
  const addBtn = document.getElementById('bs-cta-add');
  if (!addBtn) return;
  if (t && t.addedToCalendar) {
    addBtn.classList.add('added');
    addBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      追加済み
    `;
  } else {
    addBtn.classList.remove('added');
    addBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="12" y1="14" x2="12" y2="18"/>
        <line x1="10" y1="16" x2="14" y2="16"/>
      </svg>
      カレンダーに追加
    `;
  }
}

// BS フッター「詳細を見る」ボタン
// STEP2: t.officialUrl などを用意し、window.open(t.officialUrl, '_blank') に差し替える
document.getElementById('bs-cta-detail').addEventListener('click', () => {
  const t = DUMMY_TOURNAMENTS.find(x => x.id === APP_STATE.selectedTournamentId);
  if (!t) return;
  alert(`「${t.name}」の公式サイト連携は STEP2 で実装予定です。`);
});

document.getElementById('bs-cta-add').addEventListener('click', () => {
  if (!APP_STATE.selectedTournamentId) return;
  // handleCalendarAdd が内部でカード↔BS両方を同期
  handleCalendarAdd(APP_STATE.selectedTournamentId);
});


/* ================================================================
   § 8.5  カレンダー追加・お気に入り操作
   ─ カード側・BS側どちらからタップされても双方が同期する。
   ─ DOM query（.tc-btn-add[data-id] / .tc-fav-btn[data-id]）で
     カードボタンを直接更新し、_syncBS* でBS固定フッター / ヘッダーも更新。
   ─ 状態変更後は setFavorited / setAdded 経由で自動的に localStorage に保存。
   ================================================================ */

/**
 * カレンダーに追加する
 * ─ 追加済み（isAdded(id) === true）なら何もしない。
 * ─ setAdded() → カードボタン更新 → BS フッター更新 → トースト表示。
 *
 * STEP2: Firestore にカレンダーイベントを書き込む場合は下記に追加:
 *   db.collection('users').doc(userId).collection('calendar')
 *     .doc(id).set({ added: true, addedAt: serverTimestamp() })
 *   CalendarKit / Capacitor Calendar Plugin への連携もここで行う。
 */
function handleCalendarAdd(id) {
  const t = DUMMY_TOURNAMENTS.find(x => x.id === id);
  if (!t || isAdded(id)) return;  // 追加済みなら何もしない

  // setAdded が APP_STATE.addedToCalendar と t.addedToCalendar の両方を更新
  setAdded(id);

  // 追加済み共通HTML
  const addedInnerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.8"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg> 追加済み
  `;

  // ── カードボタンをDOM queryで直接更新 ──
  // （カード側・BS側どちらからタップされても確実に更新）
  const cardBtn = document.querySelector(`.tc-btn-add[data-id="${id}"]`);
  if (cardBtn) {
    cardBtn.classList.add('added');
    cardBtn.innerHTML = addedInnerHTML;
    cardBtn.style.cssText = '';  // インラインスタイルリセット
  }

  // ── BS固定フッターボタンを同期 ──
  _syncBSAddBtn(t);

  console.log(`[ProNexaX] ✅ カレンダー追加: ${t.name} (id: ${t.id})`);
  showToast(`「${t.name}」をカレンダーに追加しました`);
}

/**
 * お気に入りをトグルする
 * ─ setFavorited() で APP_STATE / DUMMY_TOURNAMENTS / localStorage を更新。
 * ─ DOM query でカードのハートボタンを直接更新し、BS ヘッダーも同期。
 * ─ お気に入りフィルター中に解除した場合はリストを再描画して除去。
 *
 * STEP2: setFavorited() 内の STEP2 コメント箇所に Firestore write を追加する。
 */
function toggleFav(id) {
  const t = DUMMY_TOURNAMENTS.find(x => x.id === id);
  if (!t) return;

  // setFavorited が APP_STATE.favorites と t.favorited の両方を更新
  setFavorited(id, !isFavorited(id));

  // SVG共通定義
  const heartFilled  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="#FF3B30" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  const heartOutline = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

  // ── カード上のハートボタンを更新 ──
  const cardFavBtn = document.querySelector(`.tc-fav-btn[data-id="${id}"]`);
  if (cardFavBtn) {
    if (t.favorited) {
      cardFavBtn.classList.add('active');
      cardFavBtn.innerHTML = heartFilled;
      cardFavBtn.setAttribute('aria-label', 'お気に入り解除');
      // iOS spring pop アニメーション
      cardFavBtn.classList.remove('fav-pop');
      void cardFavBtn.offsetWidth; // reflow でアニメリセット
      cardFavBtn.classList.add('fav-pop');
    } else {
      cardFavBtn.classList.remove('active');
      cardFavBtn.innerHTML = heartOutline;
      cardFavBtn.setAttribute('aria-label', 'お気に入り登録');
    }
  }

  // ── BSヘッダーのハートボタンを同期 ──
  _syncBSFavBtn(t);

  // ── お気に入りフィルター中なら外れた大会はリストから消える ──
  if (!t.favorited && APP_STATE.activeFilters.has('fav')) {
    applyFiltersAndRender();
  }

  // ── ログ ──
  console.log(`[ProNexaX] ${t.favorited ? '❤️' : '🤍'} お気に入り${t.favorited ? '登録' : '解除'}: ${t.name}`);
}

/**
 * BSヘッダーのお気に入りボタン状態を同期
 */
function _syncBSFavBtn(t) {
  const bsFavBtn = document.getElementById('bs-fav-btn');
  if (!bsFavBtn) return;

  if (t && t.favorited) {
    bsFavBtn.classList.add('active');
    bsFavBtn.setAttribute('aria-label', 'お気に入り解除');
    bsFavBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FF3B30" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  } else {
    bsFavBtn.classList.remove('active');
    bsFavBtn.setAttribute('aria-label', 'お気に入り登録');
    bsFavBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  }
}


/* ================================================================
   § トースト通知（軽量実装）
   ================================================================ */

function showToast(message) {
  // 既存のトーストを削除
  const existing = document.getElementById('pnx-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'pnx-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    left: '50%',
    bottom: `calc(var(--tab-height, 56px) + env(safe-area-inset-bottom, 0px) + 12px)`,
    transform: 'translateX(-50%)',
    background: 'rgba(30,30,30,.88)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    padding: '10px 18px',
    borderRadius: '22px',
    zIndex: '9999',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(0,0,0,.24)',
    opacity: '0',
    transition: 'opacity .22s ease',
    pointerEvents: 'none',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}


/* ================================================================
   § 9  開催地フィルター Bottom Sheet + 下部タブバー
   ─ 開催地 BS は大会詳細 BS より低い z-index（490/491）で競合しない。
   ─ _pendingAreaKey: シート内での未確定選択（「適用」前の一時状態）。
   ─ 「適用」タップで APP_STATE.selectedArea を確定し applyFiltersAndRender を呼ぶ。
   ================================================================ */

/**
 * エリア（地方）マスター
 * ─ key: APP_STATE.selectedArea / DUMMY_TOURNAMENTS[].area と対応する。
 * ─ STEP2: 本体 AREA_FILTERS と統一する場合は key 名を合わせてリネームする。
 */
const AREA_REGIONS = [
  { key: 'all',      label: 'すべての地域', icon: '🗾',  areas: [] },
  { key: 'hokkaido', label: '北海道',        icon: '🐻',  areas: ['hokkaido'] },
  { key: 'tohoku',   label: '東北',           icon: '🍎',  areas: ['aomori','iwate','miyagi','akita','yamagata','fukushima'] },
  { key: 'kanto',    label: '関東',           icon: '🗼',  areas: ['kanto','tokyo','kanagawa','saitama','chiba','ibaraki','tochigi','gunma'] },
  { key: 'chubu',    label: '中部・北陸',     icon: '🗻',  areas: ['tokai','chubu','niigata','toyama','ishikawa','fukui','nagano','yamanashi','shizuoka','aichi','gifu','mie'] },
  { key: 'kinki',    label: '近畿',           icon: '🏯',  areas: ['kinki','osaka','kyoto','hyogo','nara','shiga','wakayama'] },
  { key: 'chugoku',  label: '中国',           icon: '⛩️',  areas: ['tottori','shimane','okayama','hiroshima','yamaguchi'] },
  { key: 'shikoku',  label: '四国',           icon: '🌊',  areas: ['tokushima','kagawa','ehime','kochi'] },
  { key: 'kyushu',   label: '九州・沖縄',     icon: '🌺',  areas: ['kyushu','fukuoka','saga','nagasaki','kumamoto','oita','miyazaki','kagoshima','okinawa'] },
];

let _pendingAreaKey = 'all';       // エリアシート内の未確定選択（「適用」前の UI 一時状態）

const areaOverlay = document.getElementById('area-overlay');
const areaSheet   = document.getElementById('area-sheet');
let _areaIsOpen   = false;

/**
 * 開催地シートを開く
 */
function openAreaSheet() {
  if (_areaIsOpen) return;

  // 大会詳細シートが開いていたら先に閉じる
  if (APP_STATE.bsOpen) closeBottomSheet();

  _areaIsOpen = true;
  _pendingAreaKey = APP_STATE.selectedArea;  // 現在の確定値をプレビュー用にコピー

  renderAreaGrid();

  areaSheet.removeAttribute('aria-hidden');
  areaOverlay.setAttribute('aria-hidden', 'false');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      areaOverlay.classList.add('open');
      areaSheet.classList.add('open');
    });
  });

  // 背景スクロール固定
  scrollArea.style.overflow = 'hidden';
  scrollArea.style.touchAction = 'none';
}

/**
 * 開催地シートを閉じる（キャンセル）
 */
function closeAreaSheet() {
  if (!_areaIsOpen) return;
  _areaIsOpen = false;

  areaOverlay.classList.remove('open');
  areaSheet.classList.remove('open');
  areaSheet.setAttribute('aria-hidden', 'true');
  areaOverlay.setAttribute('aria-hidden', 'true');

  setTimeout(() => {
    scrollArea.style.overflow = '';
    scrollArea.style.touchAction = '';
  }, 440);
}

/**
 * 開催地グリッドを描画
 */
function renderAreaGrid() {
  const grid = document.getElementById('area-grid');
  if (!grid) return;

  grid.innerHTML = AREA_REGIONS.map(region => `
    <button
      class="area-btn${region.key === 'all' ? ' all-areas' : ''}${_pendingAreaKey === region.key ? ' active' : ''}"
      data-area="${region.key}"
      aria-pressed="${_pendingAreaKey === region.key}"
    >
      <span class="area-btn-icon">${region.icon}</span>
      <span class="area-btn-label">${region.label}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.area-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _pendingAreaKey = btn.dataset.area;
      // グリッド内のアクティブを即切替（confirmする前でも見た目を更新）
      grid.querySelectorAll('.area-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.area === _pendingAreaKey);
        b.setAttribute('aria-pressed', b.dataset.area === _pendingAreaKey);
      });
    });
  });
}

// 「この地域で絞り込む」ボタン
document.getElementById('area-apply-btn')?.addEventListener('click', () => {
  APP_STATE.selectedArea = _pendingAreaKey;

  // 開催地フィルターのアクティブ状態を更新
  if (APP_STATE.selectedArea === 'all') {
    APP_STATE.activeFilters.delete('area');
  } else {
    APP_STATE.activeFilters.add('area');
  }

  closeAreaSheet();
  renderConditionFilters();
  applyFiltersAndRender();
});

// 「リセット」ボタン
document.getElementById('area-reset-btn')?.addEventListener('click', () => {
  _pendingAreaKey = 'all';
  renderAreaGrid();
});

// 背景タップで閉じる
areaOverlay.addEventListener('click', closeAreaSheet);

// 閉じるボタン
document.getElementById('area-close-btn')?.addEventListener('click', closeAreaSheet);

// 下部タブバー: 各タブのページ遷移
// STEP2: 本体アプリのルーター / Capacitor Navigation に差し替える
document.querySelectorAll('.tab-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (page === 'search') return; // 試合タブ = 現在のページ
    showToast(`「${btn.querySelector('.tab-label')?.textContent || page}」は本体アプリで開きます`);
  });
});

// 中央Pロゴタップ
const tabPLogo = document.getElementById('tab-p-logo');
if (tabPLogo) {
  tabPLogo.addEventListener('click', () => {
    showToast('注目ページは開発中です');
  });
  tabPLogo.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tabPLogo.click();
    }
  });
}


/* ================================================================
   § 10 検索バー・ソートタブ イベント接続
   ─ 入力値を APP_STATE.searchQuery に反映し applyFiltersAndRender() を呼ぶ。
   ─ 検索はデバウンス 220ms（タイプ中の連続発火を防止）。
   ================================================================ */

// 検索バー入力
const searchInput = document.getElementById('search-input');
if (searchInput) {
  let searchTimer = null;
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      APP_STATE.searchQuery = e.target.value;
      applyFiltersAndRender();
    }, 220); // デバウンス
  });
}

// ソートタブ
document.getElementById('sort-tabs')?.querySelectorAll('.s-sort-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.s-sort-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    APP_STATE.sortKey = tab.dataset.sort;
    applyFiltersAndRender();
  });
});

// 詳細フィルターボタン（ヘッダー右のスライダーアイコン）
// STEP2: 詳細フィルターシート（フル Bottom Sheet）を開く処理に差し替える
document.getElementById('btn-filter')?.addEventListener('click', () => {
  showToast('詳細フィルターは STEP2 で実装予定です');
});


/* ================================================================
   § 11 初期化
   ─ localStorage から前回の状態を復元してから全描画する。
   ─ DOMContentLoaded 前後どちらでも安全に呼べる。
   ─ STEP2: loadStateFromLocalStorage() を Firestore 読み込みに置き換える。
   ================================================================ */

/**
 * ページ初期化
 * ─ 実行順序:
 *   1. loadStateFromLocalStorage()   前回の状態を APP_STATE に復元
 *   2. 検索バーの value を APP_STATE.searchQuery に合わせて復元
 *   3. renderCategoryChips()         復元済み selectedCategory でチップ描画
 *   4. renderConditionFilters()      復元済み activeFilters でフィルター描画
 *   5. renderQuickCards()            クイックアクセスカード描画
 *   6. applyFiltersAndRender()       復元状態で大会リスト描画
 *
 * STEP2: 本体統合時はこの関数を router の onPageEnter / componentDidMount に移植する。
 */
function init() {
  const restored = loadStateFromLocalStorage();

  if (restored && APP_STATE.searchQuery) {
    const si = document.getElementById('search-input');
    if (si) si.value = APP_STATE.searchQuery;
  }

  renderCategoryChips();
  renderConditionFilters();
  renderQuickCards();
  applyFiltersAndRender();
}

// DOMContentLoaded 後に初期化（すでに ready なら即実行）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ─── End of pages/search/script.js ─── */
