BrainPlay GitHub Pages 更新包

上傳方式：
1. 解壓縮本 ZIP。
2. 將解壓後的所有檔案直接上傳到 GitHub 儲存庫根目錄（與 index.html 同一層）。
3. 遇到同名檔案請全部覆蓋。
4. GitHub Pages 部署完成後等 1～10 分鐘。
5. 第一次測試請用無痕視窗打開網站；確認新版後，再用一般瀏覽器。
6. 若手機/平板主畫面仍顯示舊版，刪除舊主畫面捷徑後重新加入。

這一包已將 Service Worker 改為：
- index.html / 頁面：Network First（優先抓 GitHub 最新版）
- icon / manifest：快取並背景更新
- 啟動時主動檢查 sw.js 更新

請勿只上傳 index.html；本 ZIP 內的 sw.js、manifest、icon 都一起上傳。
