# R64 部署產物凍結備份

- 備份建立日：2026-10-19（台灣時間）。
- 原始 `gh-pages` commit：`55e62fc2ed643413eea50df0e5bf3428471f0f42`（2026-10-18 成功部署）。
- 備份目的：避免 `gh-pages` 後續強制部署或 Gamezukushi 主站暫時失效，使完整 3,767 人名冊與關鍵生成資產無法找回。
- `data/players.json`：3,767 人，原始部署 blob `fc20e948c8a56e356e90579f15e220a730442319`。
- `data/players-meta.json`：15 個來源，更新時間 `2026-10-18T20:54:12.388Z`。
- `assets/`：遊戲封面與兩張 PWA 圖示；`vendor/`：已部署的 JSZip。
- 這是原封不動的 Git blob 快照，並非新的正式版本或新 OCR 訓練樣本。
- 全部交接、未備份檔案及清理界線，見根目錄 [RECOVERY.md](../../RECOVERY.md)。
