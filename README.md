# 🍠 地瓜球 DeGuaChill — 雙人連線散步種花養成遊戲

專為兩個人設計、取代《Pikmin Bloom》的台式地瓜球走路養成與背景 GPS 種花遊戲！

## ✨ 已實作核心機制

1. **📱 iPhone 鎖螢幕背景計步 & 自動跳拔苗通知 (`ios-native/DeGuaBackgroundManager.swift`)**
   - 直接串接 iOS 底層 `CMPedometer`（M 系列動作協同處理器計步晶片）與 `CLLocationManager`（`allowsBackgroundLocationUpdates = true` + 街區移動喚醒 `startMonitoringSignificantLocationChanges`）。
   - **完全避開需年費 $99 美金的 HealthKit 限制**，使用免費 Apple ID（透過 SideStore / AltStore 安裝 `.ipa`）即可完整運作！
   - 手機放口袋走路，當花苗步數達標（例如 `1000 / 1000 步`）時，背景直接觸發 `UNUserNotificationCenter`，在 iPhone 鎖定畫面與 Apple Watch 震動跳出：**「🍠 地瓜球苗熟透可以拔囉！」**

2. **🌸 關螢幕背景 GPS 種花 + 雙人共創花海地圖 (`src/components/FlowerMap.tsx`)**
   - 按下「開始種花」後關螢幕放口袋，每移動 10 公尺自動在雙人共用地圖種下一叢花、扣減花瓣，並提供 **+20% 油鍋孵苗步數加速**。
   - 地圖支援顯示**另一位玩家的即時座標、種花狀態、附近的大地瓜花據點、野生巨大香菇**。

3. **📡 OpenStreetMap 真實台灣店家雷達 (`src/services/osmRadarService.ts`)**
   - 點擊「📡 地瓜雷達」，免費呼叫 Overpass API 掃描目前 GPS 方圓 220 公尺內的真實地圖標籤，掉落對應飾品的地瓜球苗：
     - 🧋 **手搖飲 / 咖啡店** ➔ 【手搖珍奶飾品】
     - 🥚 **7-11 / 全家便利商店** ➔ 【超商茶葉蛋飾品】
     - 🥖 **烘焙麵包店** ➔ 【酥脆菠蘿皮飾品】
     - 🍀 **公園綠地** ➔ 【四葉幸運草飾品】
     - 🚉 **捷運 / 火車站** ➔ 【列車長帽飾品】
     - 🏮 **餐廳 / 夜市小吃** ➔ 【夜市竹籤梅粉袋】

4. **🍠 六種地瓜球品種 & 餵糖水拔花瓣 & 4顆心解鎖飾品 (`src/components/DeGuaCharacter.tsx`)**
   - 收錄：**黃金地瓜球、紫心地瓜球、梅粉紅地瓜球、竹炭黑地瓜球、宇治抹茶球、起司爆漿巨球**。
   - 餵食【黃金麥芽糖水 / 紫薯蜜露 / 甘甜梅子粉 / 晨露糖水】讓頭頂地瓜葉開花，點擊拔花瓣並累積好感度，滿 4 顆心自動穿戴專屬店家飾品！

---

## 🚀 在電腦上立即啟動預覽與雙人測試

```bash
cd D:\app\DeGuaChill
npm install
npm run dev
```

* 打開瀏覽器進入 `http://localhost:5173`。
* 你可以開**兩個瀏覽器分頁**（一個在「雙人與明信片」切為 `P1`，另一個分頁切為 `P2`），在其中一邊種花或打蘑菇，另一邊的地圖會**即時同步出現對方種的花與寄來的明信片**！

---

## 📦 免買 Mac 打包成 iPhone `.ipa` 安裝進兩支 iPhone

1. 將 `D:\app\DeGuaChill` 推送到你的 GitHub 倉庫（公開或私密皆可）。
2. GitHub 上方的 **Actions** 標籤頁會自動觸發 `.github/workflows/build-ios-ipa.yml`（使用 GitHub 免費的雲端 macOS 電腦編譯）。
3. 編譯完成後下載 `DeGuaChill-iOS-IPA` 裡面的 **`DeGuaChill.ipa`**。
4. 兩支 iPhone 使用免費的 **SideStore** 或 **AltStore** 匯入 `DeGuaChill.ipa` 安裝，並在 iPhone「設定 ➔ DeGuaChill」將定位設為**「永遠」**、開啟**「動作與健身」**與**「通知」**即可放口袋散步種花！
