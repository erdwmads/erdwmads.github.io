# Codex移管用ハンドオフレポート

## 現在の確定状態

このレポートは、こちらで復元できた最近の修正パッケージ群と、そこから再構成できる現在の `research-graduation.html`、`assets/js/ambient-space.js`、`assets/css/style.css` を基準にまとめています。完全な旧対話ログそのものはここでは再生できないため、**コードから確認できる事実**と、**今回の保守の流れから高確度で推定できる運用ルール**を分けて書きます。確認元は主に `research-graduation.html`、`ambient-space.js`、`style.css`、および各 fix package の `PATCH_NOTE.txt` です。

もっとも重要な結論から言うと、**現在の安定状態として扱うべき基準線**は、実質的に次の積み重ねです。背景 ambient 系の安定基盤は `dust_pebble_random_respawn_fix` と `minimal_ambient_power_saver_fix` にあり、その上に Mission Log の lightbox 調整、モバイル無効化、Edge 回避の試行とロールバックを経て、最終的に **「FX トグルで標準は低消費電力・必要時のみ背景演出を描画」** という運用に落ち着いています。これは `ambient_fx_toggle_low_power_fix/PATCH_NOTE.txt` 8–15、`ambient_fx_toggle_stable_bottom_fix/PATCH_NOTE.txt` 6–10、`ambient_fx_toggle_lightmode_skin_fix/PATCH_NOTE.txt` 6–11 に一貫して現れています。

もし今回のパッチが会話順に適用されているなら、**現在の実働ロジック**はほぼ次の構成と見てよいです。HTML と ambient JS のベースは `ambient_fx_toggle_low_power_fix`、DOM 粒子ベース復帰の方針は `restore_dom_ambient_visibility_fix`、Mission Log のモバイル動作は `mobile_missionlog_no_lightbox_captions_fix`、そしてボタン位置と Light Mode の見た目は `ambient_fx_toggle_stable_bottom_fix` と `ambient_fx_toggle_lightmode_skin_fix` が上書きしています（`ambient_fx_toggle_low_power_fix/PATCH_NOTE.txt` 8–15、`restore_dom_ambient_visibility_fix/PATCH_NOTE.txt` 8–16、`mobile_missionlog_no_lightbox_captions_fix/PATCH_NOTE.txt` 8–14、`ambient_fx_toggle_stable_bottom_fix/PATCH_NOTE.txt` 6–10、`ambient_fx_toggle_lightmode_skin_fix/PATCH_NOTE.txt` 6–11）。

この「現在の基準線」を Codex に渡すなら、名前付き stable state としては次のように表現するのが安全です。**`ambient_fx_toggle_lightmode_skin` on top of `ambient_fx_toggle_stable_bottom` on top of `ambient_fx_toggle_low_power`, with DOM ambient restored and mobile Mission Log lightbox disabled.** これが今後の保守の出発点です。

## 実装の運転ロジック

### 研究ページの骨格

`research-graduation.html` は、GitHub Pages 向けの静的ページとして組まれており、ヘッダ、研究プロジェクト冒頭、上部ステータス 4 枚、Project Info、Mission Index、Mission Log 本文、Analytical Pathway、フッタ、そして複数の JS を読み込む構成です（`research-graduation.html` 46–127, 131–170, 173–436, 440–452）。  
Mission Log 系で**いちばん重要なのは 4 つのステータスカード**で、ここに `Latest update`、`Current stage`、`Current question`、`Next step` が並び、それぞれ `data-status-field` を持っています（`research-graduation.html` 87–107）。この構造自体が、後述する「1 つのログ entry から複数のページ領域へ情報を配る」設計思想の中心です。

Mission Index は `#mission-index` にあり、**Earliest first** で LOG 001 → LOG 006 のジャンプカードを持ちます（`research-graduation.html` 131–167）。一方で Mission Log 本体は `#mission-log` にあり、**Latest first** と明示され、実際に LOG 006 から下に並んでいます（`research-graduation.html` 173–240 ほか）。つまり、同じ entry 群が「索引では古い順」「本文では新しい順」に二重投影されているわけです。これは今もっともデータ駆動化の恩恵が大きい箇所です。

ページ末尾では `theme.js`、`ambient-space.js`、`research-coordinates.js`、`mission-index.js`、`mission-lightbox.js`、`mission-status-sync.js`、`interface-2046.js` を読み込んでいます（`research-graduation.html` 446–452）。つまり現在のサイトは完全な 1 ファイル完結ではなく、テーマ、ambient、Mission Log 補助、インターフェース演出が分かれています。ただし Mission Log のサムネイル preload と、モバイルでの lightbox 無効化だけは、後からの安定化パッチとして **inline script** で HTML 内に直接書かれています（`research-graduation.html` 454–711）。Codex に渡すべき大事な事実は、**いまの安定版は機能が分散しているが、Mission Log 関連の挙動には inline hotfix が残っている**という点です。

### テーマと先読み

ページ冒頭では CSS を読む前に `localStorage` の `mads-theme` をチェックし、`space` なら `data-theme="space"` と背景色を即時適用、そうでなければ Light を適用しています（`research-graduation.html` 8–25）。これはテーマのちらつきを防ぐための「先行適用」です。  
このため、Codex がテーマまわりを触るときは **初期テーマ決定ロジックを CSS 後ろに送らないこと**、`data-theme` と `data-theme-space` の両方が使われている前提を崩さないことが重要です（`research-graduation.html` 11–19、`style.css` 1849–1964）。

### Ambient 背景演出の現在仕様

`ambient-space.js` はいま **FX OFF を既定値にした低消費電力型**です。保存キーは `madsAmbientFxEnabled`、テーマ保存キーとは別です（`ambient-space.js` 3–16）。加えて `prefers-reduced-motion` が有効なら ambient は強制無効になります（`ambient-space.js` 5–12、`style.css` 2228–2235）。このため、現行サイトは「ユーザーの明示 opt-in があるときだけ背景演出を描く」という設計へ移っています。

FX ボタンそのものは HTML に直書きではなく、JS が `button.ambient-fx-toggle` を生成して `body` に append しています（`ambient-space.js` 35–59）。つまり Codex は **「このボタンは DOM 上で後付けされる」**ことを前提に CSS を書く必要があります。  
トグルが ON なら `.ambient-space-layer` を作り、OFF なら既存 layer を remove して `ambient-fx-disabled` クラスを `html` と `body` に付与します（`ambient-space.js` 28–33, 49–55, 76–90）。CSS 側でも `html.ambient-fx-disabled .ambient-space-layer` を `display:none` にしているので、OFF 時は「見えなくする」だけではなく、**レイヤー実体自体を消す**のが現行方針です（`style.css` 15747–15750）。

演出自体は canvas ではなく DOM 粒子です。`makeDust()` と `makePebble()` が `span` を作り、`spawnMeteor()` が一時的に流星 DOM を作ります（`ambient-space.js` 110–125, 147–160, 162–246）。金色率は **stardust 18%**、**meteor 7%** に固定されており、これは最近の保守で「絶対に維持したい演色比」として繰り返し守られた値です（`ambient-space.js` 69–74、`dust_pebble_random_respawn_fix/PATCH_NOTE.txt` 7–11、`minimal_ambient_power_saver_fix/PATCH_NOTE.txt` 9–17）。

粒子数と cadence は最小限の省電力化が入っています。デスクトップは dust 122、pebble 20、meteor interval 1900ms、モバイルは dust 88、pebble 14、meteor interval 2600ms です（`ambient-space.js` 248–269）。これも `minimal_ambient_power_saver_fix` の目的が「見た目を大きく変えずに熱を下げる」ことだったためで、**演出削除ではなく cadence と常時負荷の削減**という思想です（`minimal_ambient_power_saver_fix/PATCH_NOTE.txt` 9–17）。

さらに重要なのは、dust と pebble が**各 animation cycle ごとに完全に新しい viewport 座標へ再シードされる**ことです。これにより、消えた近くや元の位置にループ再出現する不自然さを避けています（`ambient-space.js` 92–108, 127–145、`dust_pebble_random_respawn_fix/PATCH_NOTE.txt` 7–10）。流星も「途中で消える」ような短距離フラッシュを避けるため、画面外から入り、画面外へ抜ける長距離ベクトルで、px/s ベースの上限付き速度制御をしています（`ambient-space.js` 170–245）。

CSS 側では ambient layer は `z-index:1`、ヘッダ・メイン・フッタは `z-index:3` です（`style.css` 2096–2110）。つまり背景演出は**背景画像より前、実コンテンツより後ろ**に置かれます。このレイヤー順は視覚安定性に直結するため、Codex が新しい fixed 要素を足すときはここを前提に重なり順を決めるべきです。

### Mission Log 画像とモバイル挙動

Mission Log 画像周辺は、今回の保守でかなり明確な方針が定まりました。  
まずデスクトップでは `mission-lightbox.js` を維持しつつ、**inline の preload helper** が lightbox 内のサムネイル strip を強制 hydrated します（`research-graduation.html` 455–608、`mission_lightbox_thumbnail_preload_fix/PATCH_NOTE.txt` 8–13）。これは blank thumbnail を防ぐための守りの実装で、`.mission-lightbox`、`.lightbox`、`.mission-gallery-lightbox` 以下の多様な selector を監視し、click 後の timeout と `MutationObserver` の両方で再 hydrated しています（`research-graduation.html` 527–599）。現在の安定版では少々防御的すぎる実装ですが、**「軽く書き直したらまた空白に戻る」リスクがある場所**として記憶させるべきです。

一方、モバイルまたは coarse pointer では、Mission Log の画像は**lightbox を開かず、その場の figure として扱う**のが現行仕様です（`mobile_missionlog_no_lightbox_captions_fix/PATCH_NOTE.txt` 8–14、`research-graduation.html` 613–711）。イベントは `click`、`dblclick`、`pointerdown`、`pointerup`、`touchstart`、`touchend`、`Enter`、`Space` まで capture phase で潰しており、もし既に開いた modal があれば強制的に閉じます（`research-graduation.html` 653–705）。  
CSS 側でも `.mobile-mission-lightbox-disabled` が付いた状態では、lightbox/root modal を `display:none` にし、figure の hover 用スキャンラインや開く UI affordance を消し、figcaption を常に visible にします（`style.css` 15593–15667）。これは単なるバグ修正ではなく、**「モバイルの Mission Log 画像はボタンではなく図版であるべき」**という UX 方針です。

画像 URL の作り方にも規則があります。各 `<img>` は Web 表示用には `images.weserv.nl` を通した webp/サイズ最適化 URL を `src` に持ち、デスクトップ full は `data-full-src="assets/img/..."`、モバイル full は `data-mobile-full-src="...w=1280..."` を持ちます（たとえば `research-graduation.html` 210–229, 276–277, 308–311, 373–380）。この **thumb / full / mobile-full の三層構造**は、後で JSON 化するときにもそのままフィールドとして保持した方がよいです。

## Mission Log のデータ意味論

### 現在の 1 entry が持っている意味

現在の Mission Log entry は、見た目以上に多くの意味を背負っています。代表例の LOG 006 を見ると、`article.mission-log-entry` 自体に次の `data-log-*` が埋め込まれています。`data-log-date`、`data-log-stage`、`data-log-question`、`data-log-next-step`、`data-log-latest-note`、`data-log-stage-note`、`data-log-question-note`、`data-log-next-note` です（`research-graduation.html` 178–186）。  
その上で同じ entry の本文側には、LOG 番号、SOL/date kicker、ページ表示タイトル、本文段落、写真群、タグ群、Mission Index に戻るリンクが別途存在します（`research-graduation.html` 187–240）。

つまり 1 entry は、少なくとも次の 4 面を同時に満たしています。

ひとつは、Mission Log 本文カードとしての面です。これはタイトル、本文段落、画像、タグです（`research-graduation.html` 189–239）。

ふたつめは、ページ上部のステータスカードのソースとしての面です。`Latest update`、`Current stage`、`Current question`、`Next step` の 4 面に必要な情報を `data-log-*` がすでに持っているためです（`research-graduation.html` 87–107, 178–186）。`mission-status-sync.js` の中身はここでは直接確認できませんが、命名から見ても、この `data-log-*` をトップのカードへ同期する役割である可能性が高いです。

みっつめは、Mission Index のソースとしての面です。現在は index 側の LOG/date が HTML に重複して手書きされていますが、本来は entry の `logNumber` と `date` から生成できる情報です（`research-graduation.html` 141–167 と 178–186 を比較）。

よっつめは、将来のホームや `research-log.html` に流すための「最新状態の短い抜粋ソース」としての面です。これは今回こちらで見えているコードでは完全確認できませんが、あなたが引用した Codex 側の要望と、ホームのスクリーンショットに見える `Current Focus` / `Current Question` / `Target Material` / `Methods` / `Target·Phase·Mode` の存在から、**同じ研究状態を複数面に投影したい**という要請はかなり明確です。

### entry ごとに保持すべきフィールド

今の HTML をそのまま正規化すると、1 entry が持つべきコア情報はこうなります。

- アイデンティティ: `logNumber`, `sol`, `date`, `slug`
- 表示タイトル: `title`
- 状態用短文: `latestNote`, `stage`, `stageNote`, `questionShort`, `questionNote`, `nextStep`, `nextNote`
- 本文: `bodyParagraphs[]`
- 画像: `figures[]` with `thumbSrc`, `fullSrc`, `mobileFullSrc`, `alt`, `caption`
- タグ: `tags[]`
- 必要なら人名・場所・装置などの抽出済みメタ

このうち、`questionShort` はプロジェクト全体でかなり一定です。LOG 001–005 ではほぼ「Dolomite in Orgueil CI1」が固定で、`questionNote` 側が科学的問いまたは進行中の技術的問いを補っています（`research-graduation.html` 181–186, 246–253, 291–299, 326–333, 358–365, 393–397）。このため Codex には、**短いラベルと長い問いを同じものとして扱わない**ルールを持たせるべきです。  
実務上は、`project.questionShort` は固定のまま、`entry.questionNote` だけを最新状況で更新する設計が扱いやすいです。

### 1 entry がどの画面領域に対応するか

ここは Codex に最初から明示しておくべきです。少なくとも研究ページ内部では、1 entry は以下へ対応します。

`entry.logNumber` と `entry.date` は Mission Index のジャンプカードになります。  
`entry.logNumber`、`entry.sol`、`entry.date`、`entry.title`、`entry.bodyParagraphs`、`entry.figures`、`entry.tags` は Mission Log 本文カードになります。  
`entry.latestNote` と `entry.date` は `Latest update` に入ります。  
`entry.stage` と `entry.stageNote` は `Current stage` に入ります。  
`entry.questionShort` と `entry.questionNote` は `Current question` に入ります。  
`entry.nextStep` と `entry.nextNote` は `Next step` に入ります（`research-graduation.html` 87–107, 178–240）。

そして、あなたが将来 Codex に持たせたい理想的な fan-out は、おそらくここから先です。ホームの `Current Focus` 概要、`research-log.html` 上の最新状態、画像 alt、図注、tags、next step、SOL/date/log number を、**同じ entry から自動生成したい**というのが、今回の quoted request の核心です。したがって Codex に渡すべき原則は、**「Mission Log 本文が一次ソースで、他ページは派生表示」ではなく、「構造化 entry が一次ソースで、Mission Log 本文を含む全ページが派生表示」**です。

### 推奨データ構造

いまの重複を最小化するなら、`content/mission-log.json` でも十分です。長期には `content/projects/orgueil-ci1-dolomite.json` のほうが拡張性がありますが、まずはあなたが quoted note で示した `content/mission-log.json` をそのまま採用して問題ありません。

```json
{
  "project": {
    "id": "orgueil-ci1-dolomite",
    "title": "Cosmomineralogical Study of Dolomite in the Orgueil CI1 Chondrite: Aqueous Alteration Processes and Material Evolution in a Primitive Asteroidal Parent Body",
    "themeLabels": {
      "archive": "Mission Log",
      "index": "Mission Index",
      "interface": "Interface 2046"
    },
    "questionShort": "Dolomite in Orgueil CI1",
    "questionLong": "What mineralogical conditions controlled dolomite formation in primitive CI1 chondritic material?",
    "targetMaterial": "Orgueil CI1 chondrite",
    "methods": ["SEM/EPMA", "single-grain XRD", "TEM"],
    "statusMode": "Research"
  },
  "entries": [
    {
      "logNumber": 6,
      "sol": 52,
      "date": "2026-06-01",
      "slug": "epocure-2-resin-embedding-and-demoulding",
      "title": "Epocure 2 resin embedding and demoulding",
      "latestNote": "A new CI chondrite resin-embedded sample was prepared with Buehler Epocure 2 at Waseda University and demoulded on 1 June 2026.",
      "stage": "Epocure 2 resin embedding and demoulding completed",
      "stageNote": "The sample was fixed in a rubber mould with Aron Alpha, embedded in mixed Epocure 2 resin, vacuum-impregnated, cured at room temperature in a clean area, and demoulded on 1 June.",
      "questionShort": "Dolomite in Orgueil CI1",
      "questionNote": "How can the embedded CI chondrite particles be cut and milled while minimising thermal effects on this temperature-sensitive material?",
      "nextStep": "Diamond wire saw cutting and ion milling preparation",
      "nextNote": "Diamond wire saw cutting is planned for 10 June under Associate Professor Taiga Okumura. Ion milling will be scheduled according to the arrival of liquid nitrogen for temperature control.",
      "bodyParagraphs": [
        "On 29 May 2026, ...",
        "The processed sample was then left ...",
        "The next planned operation is cutting ..."
      ],
      "tags": [
        "Epocure 2 resin",
        "Vacuum impregnation",
        "Rubber mould",
        "Aron Alpha",
        "Demoulding",
        "Diamond wire saw"
      ],
      "figures": [
        {
          "thumbSrc": "https://images.weserv.nl/?url=...&w=720&output=webp&q=70",
          "fullSrc": "assets/img/grad-log-20260601-01.jpg",
          "mobileFullSrc": "https://images.weserv.nl/?url=...&w=1280&output=webp&q=78",
          "alt": "Resin-embedded CI chondrite samples in the vacuum chamber",
          "caption": "Fig. 1 · Resin-embedded CI chondrite samples in the vacuum chamber; the left sample was prepared at The University Museum, The University of Tokyo, and the right sample was prepared at the Mineralogy Laboratory, Waseda University."
        }
      ]
    }
  ]
}
```

この構造は、いま HTML に重複しているトップの status cards、Mission Index、Mission Log card、画像メタデータを 1 つのソースに戻すためのものです（`research-graduation.html` 87–107, 131–167, 178–240）。

## 文章生成規則

### 言語とトーン

ここは Codex に最初から明文化した方がいいです。**オーナーとの会話は日本語で進めてよいが、サイト本文は現在英語で統一されている**、というのが実運用としてもっとも自然です。実際に `research-graduation.html` の Mission Log 本文、status cards、Project Info、Analytical Pathway は英語です（`research-graduation.html` 67–125, 189–239, 427–434）。  
したがって Codex は、ユーザーから中国語・日本語・英語で生の研究メモを受け取っても、**最終的なサイト用文面は英語で出力**するルールを持つべきです。ユーザーへの説明文書や提案は日本語で問題ありません。

Mission Log の文体は、観察できるログ群からかなり明確です。  
これは「論文本文」ほど硬くはないが、「個人日記」でもない、**一人称の lab archive prose** です。`I carried out`、`I decided to use`、`I plan to carry out` のような一人称を使い、日時、場所、材料、手順、結果、問題、次段階を順に述べます（たとえば `research-graduation.html` 191–208, 258–274, 299–305, 398–406）。  
誇張表現や感情語はほぼなく、装置名・材料名・粒子名・指導教員名・機関名が必要なときだけ具体的に出ます。つまりスタイルの芯は **「記録者の声を保った技術アーカイブ」**です。

### 1 本の生テキストを何本の entry に割るか

ここは旧対話ログが完全保存されていないので推定を含みますが、現在の Mission Log 構成から逆算すると、Codex の分割ルールは次で十分に再現性があります。

基本単位は **1 つの工程クラスター = 1 entry** です。  
同日中に行った操作と、その結果、問題、次の予定がひとつの流れをなすなら、1 entry にまとめます。LOG 005 が典型で、乾式研磨の実施、scratch 発生の問題認識、NASA 文書の参照、再含浸または再作製の意思決定までが 1 本にまとまっています（`research-graduation.html` 245–287）。

逆に、**工程の種類が変わる / 次段階が変わる / 写真セットが独立している / 研究の進行状態が一段進む**なら split すべきです。LOG 002 の埋め込み、LOG 003 の glass-slide mounting、LOG 004 の IsoMet cutting、LOG 005 の dry polishing は、それぞれ別工程として切られています（`research-graduation.html` 291–390）。

したがって、あなたが quoted した「今日は sample cutting、diamond wire saw、脆いので遅くした、次は ion milling、写真 2 枚」という入力なら、通常は **1 entry** です。cutting 実施・観察・次段階までが一つの工程で完結しているからです。  
もし同じ日に「cutting を終え、その後 EPMA マッピングまで開始した」なら、工程の相が異なるので 2 本に分ける方が読みやすいです。

### タイトル、本文、ステータス短文の作り方

タイトルは **「Mission Log 00N · 工程名」**です。表示上のログ番号はタイトルにも visible に入り、実際の HTML では `research-note-date` にも別に LOG 006 等が出ています（`research-graduation.html` 187–190, 254–257）。  
タイトルの語彙は scientific conclusion ではなく、**その日の主要操作や工程**を表すのが原則です。たとえば “Epocure 2 resin embedding and demoulding”, “Dry polishing and resin re-impregnation plan”, “Isomet cutting with ethanol cooling” のように、手順中心です（`research-graduation.html` 190, 257, 295）。

本文は現在 2〜3 段落が標準です。  
第 1 段落で **何を・どこで・何を使って行ったか**。  
第 2 段落で **結果・比較・問題・観察**。  
必要なら第 3 段落で **次の操作・制約・判断理由**。  
LOG 006 と LOG 005 がこの形をはっきり示しています（`research-graduation.html` 191–208, 258–274）。

status 短文は、本文から次のように切り出すとよいです。

`latestNote` は「その entry で起きた最新の事実」を 1 文でまとめたすでに完了した文。  
`stage` は「今どの工程相にいるか」を noun phrase または completed-state で短く。  
`stageNote` は stage の具体説明。  
`questionShort` は短い軸ラベルで、原則プロジェクト全体で安定。  
`questionNote` は今その工程で支配的な問い。科学的問いでも、技術的制約でもよい。  
`nextStep` は次に実行する行為を短く。  
`nextNote` は日程・装置・協力者・条件を含めた 1 文。  
この構造はすでに latest entry の `data-log-*` に完全に現れています（`research-graduation.html` 178–186）。

### 図注と alt text

図注フォーマットは非常に明確です。**各 entry の中で Fig. 1 から番号を振り直し、`Fig. N · ...` で始める**のが現行形式です（`research-graduation.html` 219, 229, 277, 309–311, 374–380）。  
図注は短い名詞句でもよいですが、必要な場合はセミコロンで補足情報を接続します。たとえば「左の試料は東大総合研究博物館、右は早大鉱物学研究室」といった識別情報は、Fig. 1 のキャプションに直接入っています（`research-graduation.html` 219）。

alt text は caption より少し素直な視覚記述で、**“image of” は不要**、場所や対象物を明確に書けば十分です。現在の alt は caption よりやや短めか同程度の説明です（たとえば `research-graduation.html` 212–229, 374–380）。  
Codex には、**caption は archive 表示用、alt はアクセシビリティ用**として別生成させる方がよいです。完全同文コピーより、alt の方がもう少し視覚的である方が自然です。

### tags の作り方

tags はおおむね 5〜7 個で、**材料、工程、問題、装置、相談先**などを短い名詞句で列挙しています（`research-graduation.html` 232–239, 279–285, 382–388, 408–414）。  
長文タグやセンテンスは避け、検索・俯瞰のためのラベルとして書くのがよいです。  
ルール化するなら、「材料 1–2、工程 2、問題または観察 1、補助項目 1–2」で自動生成すると、今のサイトらしい密度になります。

## 変更履歴と避けるべき地雷

### ここまでの保守で何が成功し、何が危険だったか

この保守の流れで最初に確立されたのは、ambient 粒子の**ランダム再出現と演色比の固定**です。`dust_pebble_random_respawn_fix` は dust と pebble を各 cycle で fresh random viewport position に再配置し、視覚的に harsh でない fade-reset にしています（`dust_pebble_random_respawn_fix/PATCH_NOTE.txt` 7–10）。これは「背景特効の見た目は保ちつつ、不自然な出現位置だけ直す」系の成功修正でした。

その次に `minimal_ambient_power_saver_fix` が入り、粒子数と cadence を落とし、ページ hidden 時に ambient work を pause する方針が明文化されました（`minimal_ambient_power_saver_fix/PATCH_NOTE.txt` 9–17）。ここでも大切なのは、**“effect removal” ではなく “smallest-change power reduction”** と明記されていることです。  
つまりオーナーは、「サイトの空気感は残したまま冷やす」ことを望んでおり、Codex も今後の最適化でこの思想を引き継ぐべきです。

Mission Log 側では、デスクトップ lightbox を維持しつつ blank thumbnail を補正する `mission_lightbox_thumbnail_preload_fix` が入り、その後にモバイル only で lightbox 自体をやめて inline captions を表示する `mobile_missionlog_no_lightbox_captions_fix` が入りました（`mission_lightbox_thumbnail_preload_fix/PATCH_NOTE.txt` 8–13、`mobile_missionlog_no_lightbox_captions_fix/PATCH_NOTE.txt` 8–14）。  
ここで UX 方針がかなりはっきりし、**デスクトップは archive/lightbox、モバイルは figure/caption** という二系統が固定されました。

### Edge 白ブロック問題の履歴

ここは Codex に必ず伝えるべき「地雷マップ」です。  
Edge 白ブロック問題に対しては、少なくとも三つの方向が試されました。

ひとつめは、Edge 専用の mask / observer 系です。これは `unstick_remove_edge_mask_fix` が「opening screen で lock する可能性のある Edge-only artifact mask and observer code を除去する」と明示しているので、**すでに失敗として学習済み**です（`unstick_remove_edge_mask_fix/PATCH_NOTE.txt` 7–18）。

ふたつめは、ブラウザが閉じる瞬間や blur 時に ambient を non-painting にして close-frame artifact を回避しようとする方法です。これは `desktop_edge_close_white_blocks_fix` の方針でしたが、最終的に動画確認で問題は残りました（`desktop_edge_close_white_blocks_fix/PATCH_NOTE.txt` 8–13）。つまり this path は **部分的 mitigation に留まり、根本解決ではなかった**と見なすべきです。

みっつめは、Microsoft Edge だけ ambient を DOM 粒子ではなく canvas fallback に切り替える案です。理屈としては compositor tile 問題の回避でしたが、実際には背景星屑・微隕石・流星が見えなくなるという退行が起きました。そのため `restore_dom_ambient_visibility_fix` によって DOM ambient へ戻されています（`edge_canvas_ambient_fallback_fix/PATCH_NOTE.txt` 8–15、`restore_dom_ambient_visibility_fix/PATCH_NOTE.txt` 8–16）。

この履歴から Codex が学ぶべきことは明快です。**Edge の closing artifact は、現時点では自動ハックで解かない方が安全**です。現行の実務的な解は、**FX toggle を default off にして、必要時だけユーザーが ambience を opt-in すること**です（`ambient_fx_toggle_low_power_fix/PATCH_NOTE.txt` 8–15）。  
もし将来 Edge 問題を再挑戦するなら、必ず別 branch でやり、次の 4 つを同時テストする必要があります。entry gate が固まらないこと、通常時に ambient が見えること、モバイル lightbox 無効化が壊れないこと、閉じる瞬間の白ブロックが本当に消えること。この 4 条件です。

### UI 配置についての教訓

FX ボタンの位置調整で明らかになったこともあります。  
上方 re-position は overlap 回避にはなっても、小ウィンドウで漂う問題が出たため、最終的には**右下 anchored だが既存の `Target / Phase / Mode` カードと上下でずらす**設計へ戻されています（`ambient_fx_toggle_stable_bottom_fix/PATCH_NOTE.txt` 6–10、`style.css` 15792–15835）。  
これは今後 floating UI を追加するときの一般ルールとして使えます。つまり、**viewport 高さ比で浮かせるのではなく、既存 UI カードとの相対クリアランスを bottom/right で固定する**ことです。

さらに Light Mode では、Space Mode と同じ濃色 capsule をそのまま使うと見た目が浮くため、FX ボタンに専用の pale glass / champagne skin が与えられています（`ambient_fx_toggle_lightmode_skin_fix/PATCH_NOTE.txt` 6–11、`style.css` 15847–15925）。  
このことからも、Codex は **Light/Space をただの色反転と捉えない**方がよいです。少なくとも有限個の UI パーツについては、モードごとに別 skin を持つのが現行デザイン哲学です。

## 今後の Codex 運用ルール

### Codex が守るべきコンテンツ運用原則

これを最初から渡しておくと、今後かなり楽になります。

第一に、**1 本の生メモから 1 つの構造化 entry を作り、その entry からサイト全体へ fan-out する**ことです。今の手書き HTML は status cards、Mission Index、Mission Log 本文の重複が大きく、さらにホームや `research-log.html` へも同じ状態を配りたい要望があるので、単一ソース化の効果が大きいです（`research-graduation.html` 87–107, 131–167, 178–240）。

第二に、**`Latest update` / `Current stage` / `Next step` は原則自動生成**でよいです。現在の HTML でも、それらに相当する情報は各 entry の `data-log-*` にすでに入っています（`research-graduation.html` 178–186）。  
ただし `Current question` だけは、短いラベルは project-level で固定、note は latest entry から更新、という二段モデルにしておくとブレにくいです。

第三に、**Mission Log の語り口は必ず維持**です。これは blog でもニュースでもなく、mission/archive/interface という語彙で束ねられた cosmic mineralogy の研究アーカイブです。したがって “Mission Log”, “Mission Index”, “SOL”, “Current Focus”, “Analytical Pathway”, “Interface 2046”, “Cosmic Mineralogy” といった命名体系は、なるべく保存対象と見なすべきです。  
要するに、このサイトは generic academic website ではなく、**“cosmic mineralogy archive dressed as a future research interface”** です。Codex が UI 文言を書き換えるときは、この世界観を崩さないのが最優先です。

### オーナーとの対話方式

最近のやり取りから見えているオーナーの好みも、かなり実務的です。Codex は今後、回答スタイル自体を最適化しておくとよいです。

まず、**変更は小さく、影響範囲を明示**することです。  
今回の保守では「何を直したか」だけでなく、「どのファイルを差し替えるか」「何を保ったか」「戻すならどの package か」が毎回はっきりしている時に運用が安定しました。したがって Git 運用に移るなら、zip package の代わりに**変更ファイル一覧、rollback commit、保持した挙動一覧**を毎回添えるべきです。

次に、**desktop/mobile と Light/Space を分けて説明**することです。Mission Log 画像でも FX ボタン配置でも、問題は特定 viewport / pointer / theme だけで発生しました。したがって「どの環境だけ変わるのか」を先に言う書き方が向いています。  
例として、モバイルでは lightbox を消すが desktop は維持、Light Mode だけ FX skin を変えるが Space Mode は不変、という粒度で説明するのが適切です（`mobile_missionlog_no_lightbox_captions_fix/PATCH_NOTE.txt` 8–14、`ambient_fx_toggle_lightmode_skin_fix/PATCH_NOTE.txt` 6–11）。

さらに、**バグ修正に redesign を混ぜない**ことです。  
今回の流れでは「最小限の変化で直す」がほぼ一貫した優先順位でした。Codex も今後、「この修正は no visual change か」「見た目に変化があるならどこだけか」を明示すると齟齬が減ります。

最後に、**ユーザーとの会話は日本語、サイトの生成物は英語**を基本にしてよいです。これは現行サイト本文の英語統一と、あなたの対話優先言語が日本語であることの両方に合っています。

### Codex に最初に持たせたいドキュメント

リポジトリに追加するなら、少なくとも次の 4 つがあると長期運用が安定します。

`docs/content-workflow.md`  
生メモから `entry` をどう切るか、どの画面へ fan-out するか、何を自動生成するかを書きます。

`docs/writing-style.md`  
Mission Log の文体、タイトル、本文段落構成、caption、alt、tags のルールを書きます。

`docs/ui-invariants.md`  
Mission Log / Interface 2046 / Space Mode / Light Mode / archive 語彙、Light/Space 別 skin、モバイル figure 原則など、壊してはいけない視覚・語彙規則を書きます。

`docs/perf-browser-watchlist.md`  
Edge 白ブロック問題の履歴、失敗した試行、現行の安全策、再挑戦時のテスト条件を書きます。`unstick_remove_edge_mask_fix`、`desktop_edge_close_white_blocks_fix`、`edge_canvas_ambient_fallback_fix`、`restore_dom_ambient_visibility_fix` の履歴はここに必ず残すべきです（各 `PATCH_NOTE.txt` の該当箇所参照）。

もしひとつだけ Codex に最初に覚えさせるなら、それはこれです。**このサイトは、見た目の世界観をほぼ変えずに、1 本の研究ログを複数面へ静かに配ることが本質であり、コード保守も同じく「小さく、戻せて、雰囲気を壊さない」ことが最優先**です。
