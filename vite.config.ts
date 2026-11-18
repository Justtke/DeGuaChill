import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'child_process';

/**
 * Windows 原生定位與「預設位置 (DefaultGeoposition)」橋接中介層
 * 解決桌機瀏覽器 (Edge/Chrome) 在無 Wi-Fi 網卡時忽略 Windows「預設位置」導致 navigator.geolocation 失敗的問題，
 * 直接透過 Windows WinRT (Windows.Devices.Geolocation.Geolocator) 讀取系統定位服務與預設位置！
 */
function windowsLocationBridgePlugin(): Plugin {
  return {
    name: 'windows-location-bridge',
    configureServer(server) {
      server.middlewares.use('/api/windows-location', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Devices.Geolocation.Geolocator,Windows.Devices.Geolocation,ContentType=WindowsRuntime]
$null = [Windows.Devices.Geolocation.Geoposition,Windows.Devices.Geolocation,ContentType=WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') })[0]
$g = New-Object Windows.Devices.Geolocation.Geolocator
$g.AllowFallbackToConsentlessPositions()
$op = $g.GetGeopositionAsync()
$task = $asTaskGeneric.MakeGenericMethod([Windows.Devices.Geolocation.Geoposition]).Invoke($null, @($op))
$task.Wait(4500) | Out-Null
if ($task.IsCompleted -and -not $task.IsFaulted) {
  $pos = $task.Result
  $lat = $pos.Coordinate.Point.Position.Latitude
  $lng = $pos.Coordinate.Point.Position.Longitude
  $src = $pos.Coordinate.PositionSource.ToString()
  Write-Output ("OK|" + $lat + "|" + $lng + "|" + $src)
} else {
  Write-Output ("ERR|" + $task.Exception.InnerException.GetType().Name)
}
        `.trim();

        execFile(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-Command', psScript],
          { timeout: 6000 },
          (err, stdout) => {
            const out = (stdout || '').trim();
            const match = out.match(/OK\|([0-9.-]+)\|([0-9.-]+)\|(\w+)/);
            if (match) {
              const lat = Number(match[1]);
              const lng = Number(match[2]);
              const source = match[3];
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                res.end(JSON.stringify({ ok: true, lat, lng, source }));
                return;
              }
            }

            const isDenied = out.includes('UnauthorizedAccessException');
            res.end(
              JSON.stringify({
                ok: false,
                reason: isDenied ? 'desktop_access_denied' : err ? err.message : out
              })
            );
          }
        );
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), windowsLocationBridgePlugin()],
  base: './',
  server: {
    port: 5173,
    host: true,
    allowedHosts: true
  }
});
