import Foundation
import CoreLocation
import CoreMotion
import UserNotifications
import WebKit

/// 🍠 地瓜球 DeGuaChill - iPhone 原生背景計步、背景移動喚醒與鎖螢幕種花引擎
/// 支援免費 Apple ID 簽名 (SideStore / AltStore)，無須付費 HealthKit Entitlement：
/// 1. CMPedometer：讀取 iPhone M 系列動作協同處理器步數，走路時即時觸發本地拔苗通知
/// 2. CLLocationManager：開啟 allowsBackgroundLocationUpdates，關螢幕放口袋每移動 10 公尺自動種花並同步至雙人雲端
/// 3. startMonitoringSignificantLocationChanges：平常沒開種花時，跨街區移動自動背景喚醒結算步數並跳出拔苗通知
@objc public class DeGuaBackgroundManager: NSObject, CLLocationManagerDelegate, WKScriptMessageHandler {
    public static let shared = DeGuaBackgroundManager()

    private let locationManager = CLLocationManager()
    private let pedometer = CMPedometer()
    private weak var webView: WKWebView?

    private var isPlanting: Bool = false
    private var petalColor: String = "yellow"
    private var remainingPetals: Int = 100
    private var playerId: String = "P1"
    private var syncEndpointUrl: String = ""
    private var roomCode: String = "DEGUA-520"
    private var plantingMultiplier: Double = 1.0

    private var lastPlantedLocation: CLLocation?
    private var lastStepCheckDate: Date = Date()

    struct TrackedSeedling: Codable {
        var id: String
        var title: String
        var placeName: String
        var currentSteps: Int
        var targetSteps: Int
        var notified: Bool
    }

    private var activeSeedlings: [TrackedSeedling] = []

    private override init() {
        super.init()
        setupLocationManager()
        loadPersistedState()
    }

    public func attach(to webView: WKWebView) {
        if self.webView === webView { return }
        self.webView = webView
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "DeGuaNative")
        webView.configuration.userContentController.add(self, name: "DeGuaNative")
        startHardwareStepTracking()
        syncTodayStepsFromMidnight()
        requestNativeSingleLocationIfAuthorized()
        if CLLocationManager.headingAvailable() {
            locationManager.startUpdatingHeading()
        }
    }

    private func syncTodayStepsFromMidnight() {
        guard CMPedometer.isStepCountingAvailable() else { return }
        let now = Date()
        let startOfToday = Calendar.current.startOfDay(for: now)
        pedometer.queryPedometerData(from: startOfToday, to: now) { [weak self] data, error in
            guard let self = self, error == nil, let pedData = data else { return }
            let todayTotal = pedData.numberOfSteps.intValue
            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(
                    "window.DeGuaNativeCallback && window.DeGuaNativeCallback.onNativeStepDelta && window.DeGuaNativeCallback.onNativeStepDelta(0, \(todayTotal));",
                    completionHandler: nil
                )
            }
        }
    }

    private func currentLocationAuthorizationStatus() -> CLAuthorizationStatus {
        if #available(iOS 14.0, *) {
            return locationManager.authorizationStatus
        }
        return CLLocationManager.authorizationStatus()
    }

    private func requestNativeSingleLocationIfAuthorized() {
        let status = currentLocationAuthorizationStatus()
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            locationManager.requestLocation()
            if CLLocationManager.significantLocationChangeMonitoringAvailable() {
                locationManager.startMonitoringSignificantLocationChanges()
            }
        }
    }

    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10.0 // 每移動 10 公尺觸發一次種花與步數檢查
        locationManager.headingFilter = 3.0 // 每轉動 3 度即時更新指南針方位
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
    }

    public func requestPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        let status = currentLocationAuthorizationStatus()
        if status == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        } else {
            if status == .authorizedWhenInUse {
                locationManager.requestAlwaysAuthorization()
            }
            requestNativeSingleLocationIfAuthorized()
        }
        // 啟動背景街區移動喚醒（即使未開啟種花，走動時 iOS 也會在背景喚醒本引擎檢查 CMPedometer 步數）
        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            locationManager.startMonitoringSignificantLocationChanges()
        }
        if CLLocationManager.headingAvailable() {
            locationManager.startUpdatingHeading()
        }
        startHardwareStepTracking()
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = currentLocationAuthorizationStatus()
        if status == .authorizedWhenInUse {
            locationManager.requestLocation()
            locationManager.requestAlwaysAuthorization()
        } else if status == .authorizedAlways {
            locationManager.requestLocation()
            if CLLocationManager.significantLocationChangeMonitoringAvailable() {
                locationManager.startMonitoringSignificantLocationChanges()
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if status == .authorizedWhenInUse {
            locationManager.requestLocation()
            locationManager.requestAlwaysAuthorization()
        } else if status == .authorizedAlways {
            locationManager.requestLocation()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Ignore transient CLError location lookup errors gracefully
    }

    // MARK: - CMPedometer 硬體計步監聽（不開畫面也能在背景算步數並跳通知）
    private func startHardwareStepTracking() {
        guard CMPedometer.isStepCountingAvailable() else { return }

        // 先補算上次檢查到現在的離線步數
        queryMissedHardwareSteps()

        // 啟動即時硬體步數串流
        pedometer.startUpdates(from: Date()) { [weak self] data, error in
            guard let self = self, error == nil, let pedData = data else { return }
            self.queryMissedHardwareSteps(latestTotal: pedData.numberOfSteps.intValue)
        }
    }

    private func queryMissedHardwareSteps(latestTotal: Int? = nil) {
        let now = Date()
        guard now.timeIntervalSince(lastStepCheckDate) >= 3.0 else { return }

        let startOfToday = Calendar.current.startOfDay(for: now)
        let effectiveFrom = lastStepCheckDate < startOfToday ? startOfToday : lastStepCheckDate

        pedometer.queryPedometerData(from: effectiveFrom, to: now) { [weak self] data, error in
            guard let self = self, error == nil, let pedData = data else { return }
            let delta = pedData.numberOfSteps.intValue
            self.lastStepCheckDate = now
            UserDefaults.standard.set(now, forKey: "dg_last_step_date")

            if delta > 0 {
                self.applyStepDeltaInBackground(deltaSteps: delta)
            } else {
                self.syncTodayStepsFromMidnight()
            }
        }
    }

    private func applyStepDeltaInBackground(deltaSteps: Int) {
        let effectiveDelta = max(1, Int( round(Double(deltaSteps) * plantingMultiplier) ))

        for i in 0..<activeSeedlings.count {
            if !activeSeedlings[i].notified {
                activeSeedlings[i].currentSteps += effectiveDelta
                if activeSeedlings[i].currentSteps >= activeSeedlings[i].targetSteps {
                    activeSeedlings[i].currentSteps = activeSeedlings[i].targetSteps
                    activeSeedlings[i].notified = true

                    // 步數達標！即使手機鎖螢幕在口袋裡，直接觸發 iPhone 本地推播通知！
                    fireNativeNotification(
                        id: "seedling_ready_\(activeSeedlings[i].id)",
                        title: "🍠 瓜糰已經炸熟囉！",
                        body: "在「\(activeSeedlings[i].placeName)」發現的【\(activeSeedlings[i].title)】已經走滿 \(activeSeedlings[i].targetSteps) 步，快打開油鍋用網勺撈起來！"
                    )
                }
            }
        }

        savePersistedState()

        let now = Date()
        let startOfToday = Calendar.current.startOfDay(for: now)
        pedometer.queryPedometerData(from: startOfToday, to: now) { [weak self] data, _ in
            let todayTotal = data?.numberOfSteps.intValue ?? 0
            DispatchQueue.main.async {
                self?.webView?.evaluateJavaScript(
                    "window.DeGuaNativeCallback && window.DeGuaNativeCallback.onNativeStepDelta && window.DeGuaNativeCallback.onNativeStepDelta(\(deltaSteps), \(todayTotal));",
                    completionHandler: nil
                )
            }
        }
    }

    // MARK: - CLLocationManager 鎖螢幕背景 GPS 種花、羅盤朝向與移動喚醒
    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard newHeading.headingAccuracy >= 0 else { return }
        let deg = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(
                "window.DeGuaNativeCallback && window.DeGuaNativeCallback.onNativeHeadingUpdate && window.DeGuaNativeCallback.onNativeHeadingUpdate(\(deg));",
                completionHandler: nil
            )
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last else { return }

        // 每次位置變動時，順便向 CMPedometer 查核最新步數（達成「走一走自動跳拔苗通知」）
        queryMissedHardwareSteps()

        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(
                "window.DeGuaNativeCallback && window.DeGuaNativeCallback.onNativeLocationUpdate && window.DeGuaNativeCallback.onNativeLocationUpdate(\(latest.coordinate.latitude), \(latest.coordinate.longitude));",
                completionHandler: nil
            )
        }

        guard isPlanting else { return }

        if let prev = lastPlantedLocation, latest.distance(from: prev) < 10.0 {
            return
        }

        guard remainingPetals > 0 else {
            stopBackgroundPlanting()
            fireNativeNotification(
                id: "petal_empty_\(Int(Date().timeIntervalSince1970))",
                title: "🌸 花瓣種完囉！",
                body: "袋子裡的花瓣已經全部種在散步路線上，已自動關閉背景 GPS 幫你省電！"
            )
            return
        }

        lastPlantedLocation = latest
        remainingPetals = max(0, remainingPetals - 2)
        plantFlowerCellInBackground(lat: latest.coordinate.latitude, lng: latest.coordinate.longitude)
    }

    private func plantFlowerCellInBackground(lat: Double, lng: Double) {
        let step = 0.0001
        let cLat = (lat / step).rounded() * step
        let cLng = (lng / step).rounded() * step
        let latStr = String(format: "%.5f", cLat)
        let lngStr = String(format: "%.5f", cLng)
        let gridId = "\(latStr)_\(lngStr)"
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)

        let cellDict: [String: Any] = [
            "gridId": gridId,
            "lat": Double(latStr) ?? lat,
            "lng": Double(lngStr) ?? lng,
            "color": petalColor,
            "count": 5,
            "plantedBy": playerId,
            "updatedAt": timestamp
        ]

        // 若有設定雙人 Firebase 雲端網址，在鎖螢幕背景直接 PATCH 到雲端地圖
        let cleanBase = syncEndpointUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanBase.hasPrefix("http"),
           let url = URL(string: "\(cleanBase)/rooms/\(roomCode)/flowers/\(gridId).json") {
            var req = URLRequest(url: url)
            req.httpMethod = "PUT"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONSerialization.data(withJSONObject: cellDict)
            URLSession.shared.dataTask(with: req).resume()
        }

        if let jsonData = try? JSONSerialization.data(withJSONObject: cellDict),
           let jsonStr = String(data: jsonData, encoding: .utf8) {
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.webView?.evaluateJavaScript(
                    "window.DeGuaNativeCallback && window.DeGuaNativeCallback.onNativeBackgroundFlowerPlanted && window.DeGuaNativeCallback.onNativeBackgroundFlowerPlanted(\(jsonStr), \(self.remainingPetals));",
                    completionHandler: nil
                )
            }
        }
    }

    private func startBackgroundPlanting() {
        requestPermissions()
        isPlanting = true
        plantingMultiplier = 1.2
        locationManager.startUpdatingLocation()
    }

    private func stopBackgroundPlanting() {
        isPlanting = false
        plantingMultiplier = 1.0
        locationManager.stopUpdatingLocation()
        if CLLocationManager.significantLocationChangeMonitoringAvailable() {
            locationManager.startMonitoringSignificantLocationChanges()
        }
    }

    // MARK: - 發送 iPhone 本地推播通知
    private func fireNativeNotification(id: String, title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let req = UNNotificationRequest(identifier: id, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
    }

    // MARK: - WKScriptMessageHandler (接收來自前端的同步指令)
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "requestPermissions":
            requestPermissions()

        case "requestLocation":
            let status = currentLocationAuthorizationStatus()
            if status == .notDetermined {
                requestPermissions()
            } else {
                requestNativeSingleLocationIfAuthorized()
            }

        case "fireLocalNotification":
            let id = (body["id"] as? String) ?? UUID().uuidString
            let title = (body["title"] as? String) ?? "🍠 地瓜球通知"
            let msg = (body["body"] as? String) ?? ""
            fireNativeNotification(id: id, title: title, body: msg)

        case "syncSeedlings":
            if let mult = body["plantingMultiplier"] as? Double {
                plantingMultiplier = mult
            }
            if let arr = body["seedlings"] as? [[String: Any]],
               let data = try? JSONSerialization.data(withJSONObject: arr),
               let decoded = try? JSONDecoder().decode([TrackedSeedling].self, from: data) {
                activeSeedlings = decoded
                savePersistedState()
            }

        case "setBackgroundPlanting":
            let shouldPlant = (body["isPlanting"] as? Bool) ?? false
            petalColor = (body["petalColor"] as? String) ?? "yellow"
            remainingPetals = (body["remainingPetals"] as? Int) ?? 0
            playerId = (body["playerId"] as? String) ?? "P1"
            syncEndpointUrl = (body["syncEndpointUrl"] as? String) ?? ""
            roomCode = (body["roomCode"] as? String) ?? "DEGUA-520"

            if shouldPlant {
                startBackgroundPlanting()
            } else {
                stopBackgroundPlanting()
            }

        default:
            break
        }
    }

    private func savePersistedState() {
        if let data = try? JSONEncoder().encode(activeSeedlings) {
            UserDefaults.standard.set(data, forKey: "dg_native_seedlings")
        }
    }

    private func loadPersistedState() {
        if let savedDate = UserDefaults.standard.object(forKey: "dg_last_step_date") as? Date {
            lastStepCheckDate = savedDate
        }
        if let data = UserDefaults.standard.data(forKey: "dg_native_seedlings"),
           let decoded = try? JSONDecoder().decode([TrackedSeedling].self, from: data) {
            activeSeedlings = decoded
        }
    }
}
