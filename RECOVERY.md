# やきゅつく3｜工作紀錄、GitHub 備份與重新啟動指引

> 更新：2026-10-19（台灣時間）。本文件是**唯一優先閱讀的交接入口**；後續延續作業直接更新本頁，詳細歷史變更再看 `CHANGELOG.md`。只屬於 PS2《プロ野球チームをつくろう！3／やきゅつく3》，**不得與 baseball-GM、族譜或其他 repository 混用**。

## 1. 正式位置與目前基準

- **正式程式庫：** https://github.com/mars0884-chu/yakyutsuku3
- **公開網站／PWA：** https://mars0884-chu.github.io/yakyutsuku3/
- **來源分支：** `main`；**網站產物分支：** `gh-pages`，由 `.github/workflows/pages.yml` 自動建置並**強制更新**，切勿直接在 `gh-pages` 修改正式原始碼。
- **目前應用版本：** `2026.10.12-r64`（`VERSION`、`app.js` 的 `APP_VERSION`、`sw.js` 的 `CACHE` 必須互相一致；本次只新增備份／文件，不升級應用版本）。
- **R64 來源基準：** `main` commit `7cbe4b59006a97bfe3bfb3e16472a7975d93d242`；本次保存的部署基準為 `gh-pages` commit `55e62fc2ed643413eea50df0e5bf3428471f0f42`。
- **最近部署驗證：** 2026-10-18 GitHub Actions「Build and publish Yakyutsuku3」及「pages build and deployment」皆顯示 success；實機操作仍須另外驗證。

## 2. 已備份內容與不能混淆的來源

| 保存位置 | 資料 | 注意事項 |
| --- | --- | --- |
| `main` 的 `app.js`、`index.html`、`styles.css`、`engine/`、`scripts/`、`sw.js`、`.github/workflows/` | 原始程式、固定版面辨識、UI、離線快取、建置／檢查腳本 | 主維護來源 |
| `main/data/players-seed.json` | 補充種子名單 | **不是**完整 3,767 人名冊 |
| `main/data/guides.json`、`data/guide-book.json`、`data/cheats.json`、`data/sources.json`、`data/research-status.json` | 攻略、日文原文／繁中整理、金手指、來源與核實狀態 | 不因整理而丟失原文或來源；詳看各資料本身 |
| `backup/r64/data/players.json`、`backup/r64/data/players-meta.json` | **2026-10-18 已部署的完整名冊快照：3,767 人、15 個來源頁** | 直接使用部署分支 Git blob 保存，非重新爬取；即使 Gamezukushi API 無法取得，仍可找回這版名冊 |
| `backup/r64/assets/` 與 `backup/r64/vendor/jszip.min.js` | 已發布遊戲封面、兩個 PWA PNG 圖示、JSZip 瀏覽器資源 | `main` 的一般程式建置未直接保有這些產物，因此額外保留一份 |
| `gh-pages` | 目前網站部署產物（含 `data/players.json`） | 每次建置會 `git push --force`，**長期保留請以 `main/backup/r64/` 為準** |

以上 `backup/r64/` 是**凍結備份**，不可當成日常自動更新的來源；新版本若需換快照，另作有日期／版本的新備份並核對人數。Git 歷史與 `CHANGELOG.md` 也是可回溯依據。

## 3. 核心功能、已完成事項

1. **查人與比較：** 目標完整 3,767 人；投手／野手分類，能力全欄展開，欄位標頭可切換排序。R64 解除舊四人上限，現最多同時比較 **20 位**，桌機箭頭、手機橫向滑動，固定能力名稱與姓名。
2. **批次找人：** 依遊戲 OFFICE MENU 固定版面做**瀏覽器本機影像／字形比對**，不把雲端 AI 介入辨識；先分析實際截圖列位及來源 ZIP 分組，再與球員名冊比對。跨頁重複列只在同來源群組去重，不能把 82 人憑空變 115 人。結果區分**確認／推定／候選**，沒有足夠像素證據不可強行升級；無法判定時列候選。不可以預先把測試圖片的人名寫死、用 AI 答案反灌或假稱通用高辨識率。
3. **攻略：** 由散落章節統合成**七個實用主題閱讀／搜尋**；`engine/guide-reading.js` 負責規則整理，`data/guide-book.json` 為保存底稿，日文原文與台灣繁體中文需同時保留。這是分類系統，不是真的編一本書。
4. **金手指：** PAR／XT／PCSX2 依原碼、來源、遊戲平台與可驗證程度分類。失效碼／歷史引用／未硬體實測者不可當成可靠可用碼。
5. **介面：** 桌機 Chrome/Edge、iPhone Edge/Safari（含書籤／主畫面 PWA）正常捲動、可縮放、可橫滑，避免單欄過寬或無意義空白；只用符合遊戲的封面／縮圖，不用其他專案圖像。
6. **離線：** `sw.js` + IndexedDB 保存完整名冊，下載失敗須保留舊名冊，不能用 seed 冒充完整最新版；PWA 安裝／更新走 HTTPS，`file://` 可能受 worker/WASM/CORS 限制。

## 4. 原始截圖實測紀錄（歷史驗收，**不是**未來名單保證）

2026-10-09 前後使用者提供 `444`、`66`、`777`、`封存` 多組 ZIP 的 R31 實機回報：

| 測試 | 原始有姓名列 → 去重列位 | 桌機結果 | 手機結果 |
| --- | --- | --- | --- |
| 四組合測 | 454 → 387（跨頁去重 67） | 確認 351／推定 31／候選 5 | 確認 347／推定 35／候選 5 |
| 單獨 `777` | 118 → 103（跨頁去重 15） | 確認 91／推定 10／候選 2 | 使用者回報相同數字 |

這些是**當時畫面統計**，不是逐名核對的真正準確率，也不是 R64 的新實機驗收。先前討論過的 `88`、`111` 人圖片及 `222.zip`、Claude Code 辨識參考程式等，**本次工作環境並未取得原始檔**，不能假設它們已在 GitHub 或可供重新實驗。未來以全新名單做盲測、人工逐名核對，才可以宣稱真實 90%+ 正確率。手機曾回報第二階段卡在 74% 和辨識落差，也不得因 CI smoke 測試通過就當作已徹底排除。

## 5. 來源追查與證據界線

- **名冊主來源：** Gamezukushi 的 15 個名冊頁（`scripts/refresh-data.mjs`），每一頁都有預期筆數檢查，總數必須是 **3,767**，否則建置停止，不以殘缺資料覆蓋網站。
- **攻略／資料來源：** 巴哈姆特（PS2 三代）、Gamezukushi、Wazap、舊日文攻略站、歷史論壇等；目前詳情以 `data/sources.json`、`data/research-status.json` 與 `CHANGELOG.md` 為準。
- 研究紀錄須嚴格分**已確認全文／可讀取、公開搜尋摘要、推測或玩家個案、只剩歷史引用、403／失效／尚不可取得、排除其他代別**。不可把「這次搜不到」寫成「不存在」。PS2 三代與 NDS／2003／DC／其他遊戲不可混用。
- 原文日文、繁體中文譯名、網址、逐項佐證盡量同時保存；本次備份作業**沒有聲稱重新挖乾淨公開網路**。

## 6. 停工／重新啟動時的最短路徑（給下一位維護者／AI）

1. **只開** `mars0884-chu/yakyutsuku3`，先讀本頁 → `README.md` → `CHANGELOG.md` → `data/research-status.json`／`data/sources.json`。不要讀錯 repository。
2. 先核對 `main`、`gh-pages`、`VERSION` 和 GitHub Actions 最新成功部署；**不要因使用者手機舊快取就判斷 GitHub 正式版未更新**。R64 比較上限為 20 人。
3. 名冊可先使用 `backup/r64/data/players.json` 核對 3,767 人及快照 metadata；若重新執行 `npm run refresh`，Gamezukushi 15 頁都必須各自通過精確筆數檢查，遇到失效來源**保留備份**，不可把 Seed 當完整版。
4. 以 `.github/workflows/pages.yml` 的 smoke tests 為程式回歸清單；關鍵入口是 `scripts/smoke-recognition.mjs`、`scripts/smoke-r31.mjs`、`scripts/smoke-r61.mjs`、`scripts/smoke-r62.mjs`、`scripts/smoke-r63.mjs`、`scripts/smoke-r64.mjs`。CI smoke 是必要但**不能取代桌機及 iPhone 實際截圖盲測**。
5. 影像主流程查 `engine/r18-batch.js`、`engine/geometry-fixed.js`、`engine/claude-align-r17.js`、`engine/claude-glyphs-16.json`；其他 R16/R17 舊程式可能只是歷史保留，不可誤把未啟用的檔案當正式辨識核心。
6. 前端查 `index.html`、`app.js`、`styles.css`、`engine/r64-layout.css`；攻略查 `engine/guide-reading.js`，金手指查 `data/cheats.json`。修改 PWA 需要同步版本、Service Worker 快取及離線檔案清單。
7. 修改後**先驗證再推送**，發布完成回報：做了什麼、還有哪些限制、版本、commit、GitHub Pages 網址、可下載或未能保存的檔案。勿要求非程式設計使用者手動貼程式或改 HTML。

## 7. 2026-10-19 本機清理／保存稽核

- 本次 ChatGPT 可操作工作環境：`/mnt/data`、`/home/oai/share` 均為空；亦未在本次可見 `/tmp` 淺層找到本專案 ZIP／目錄。**沒有可先備份再刪的本機工作檔，因而沒有實際刪除任何檔案。**
- 本次對話附件列表是空的。**舊對話中提過的截圖 ZIP、上傳原始檔、使用者桌機／手機 Downloads、照片、PWA 的 IndexedDB／快取、ChatGPT Library 等不在本次可刪除範圍，沒有宣稱已刪除或備份。**
- 已把當時 `gh-pages` 上、原本不在 `main` 的六項部署產物作凍結備份；全部保留原 Git blob 位元資料，未改寫原檔。
- 這次**只處理本專案 GitHub 的文件與備份**；不動其他任何 repo，不刪正式 `main`／`gh-pages` 的原碼／資料。

**重新開始的原則：** 以 GitHub `main` 為正式原始碼、`backup/r64/` 為可回收備份、`gh-pages` 為可變部署；以真實新圖盲測和來源可讀性為準，**不灌水、不混代、不假造已完成**。
