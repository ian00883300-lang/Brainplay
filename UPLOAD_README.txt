BrainPlay v4.60 Phase 63 — GitHub Pages

正式入口：index.html

本版重點：
1. 7000 個英文詞條，六個學習階段，每個小單元最多 25 字。
2. 補齊生活基礎字，修正分級、釋義與用法，移除專業冷僻或不可靠項目。
3. 先看卡再練習、錯題重練、收藏篩選、1/3/7/14 天間隔複習。
4. 英文各模式支援慢速播放；無聲音時可以改成文字題。
5. 保留 500 個四級片語及原有其他遊戲，更新離線快取版號。

部署：
- index.html 與 sw.js 必須一起更新。
- 保留 site.webmanifest 與既有 PNG 圖示。
- tools/、tests/、data/、package.json 是開發與稽核資料；正式網站不需要執行 Node.js。
- educational_puzzle_games_v4_phase61.html 是歷史版本，不是新版入口。
- 詳細改良、分級依據、資料來源及測試方式請看 ENGLISH_PHASE63.md。
- 若主畫面捷徑仍顯示舊版，連線後重新整理，或關閉再開啟。
