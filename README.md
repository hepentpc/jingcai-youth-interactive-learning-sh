# 經彩青春 SET｜高中篇（國際青年女性高峰會）

本專案以 [hepentpc/jingcai-youth-interactive-learning-jh](https://github.com/hepentpc/jingcai-youth-interactive-learning-jh) 的互動劇場及排版架構為基礎，將高中篇正式劇本《經彩青春Set-高中篇》移植為獨立 GitHub Pages 教材。

## 教材與玩法

- 劇本16頁：第1幕高峰會開場、第2至15幕為7題選擇題及7幕知識回饋，第16幕通關。網頁額外設有操作首頁。
- 人物：思婷、立宏、馬拉拉（主持人以開場臺詞出現，不另設人物角色）。
- 7題三選一；答錯可重試，答對才解鎖下一幕。知識徽章會標示各幕真正的發話者。
- 可返回上一幕、重新開始、恢復同一瀏覽器分頁暫存進度、複製通關密碼。
- 通關碼：**5280**（象徵528國際月經日）。
- **圖片尚未提供**：所有角色均顯示「角色圖片預留區」，不沿用國中圖片。
- 主要支援桌上型及手機瀏覽器，完全靜態網站，不需 API 金鑰或後端服務。

## 網址及啟用

原始碼：https://github.com/kaoelvmpvm/jingcai-youth-interactive-learning-sh

Pages 預定網址：https://kaoelvmpvm.github.io/jingcai-youth-interactive-learning-sh/

首次部署請到 Settings → Pages → Build and deployment，Source 選擇 **GitHub Actions**。接著到 Actions 執行 Deploy senior-high SET to GitHub Pages；之後 main 分支更新即可自動部署。此處的預定網址並不代表 Pages 已經啟用成功。

## 檔案及未來圖片匯入

- `data/scenes.js`：高中篇所有題目、標準答案、原稿臺詞、7段知識回饋及通關文字。
- `data/presence.js`：每幕人物與場景。
- `data/character-poses.js`：預留圖代碼 SH_ST01 / SH_LH01 / SH_ML01。
- `data/character-assets.js`：圖像來源設定，現在 `ready:false`。
- `assets/style.css`：延續國中版主視覺，調整三人站位與高峰會場景。
- `assets/app.js`：使用者互動與進度控制。
- `tests/scenes.test.cjs`：劇本、答題、圖片缺省與UI一致性測試。

未來完成角色圖片後可放入 `assets/characters/`，並在 `data/character-assets.js` 的 `files` 依代碼指定路徑，將 `ready` 改為 `true`。角色尺寸及替換流程可於後續製作圖片時再細化。目前不設定任何高中角色圖，不複製國中版的17張圖片與匯入壓縮檔。

本地測試：`node --test tests/scenes.test.cjs`。

## 劇本核對提示

製作時按使用者提供的Word保留7題原始選項與原稿解說，並保留原稿中的「免證明生理假」等用語；法規與醫學內容未在此版另行更動。原稿第1頁標題出現「關站」二字，本網站首頁依主題改呈「國際青年女性高峰會」，未將可能的誤植作為網頁標題。
