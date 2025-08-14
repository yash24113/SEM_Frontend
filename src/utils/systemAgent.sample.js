// Sample Node script to collect local system metrics and send to backend
// Install deps: npm i systeminformation loudness node-fetch@2

const si = require('systeminformation');
const loudness = require('loudness');
const fetch = require('node-fetch');
const io = require('socket.io-client');

const API_BASE = process.env.SEM_API || 'http://localhost:5000';
const DEVICE_ID = process.env.SEM_DEVICE_ID || 'laptop-001';

async function collectAndSend() {
  try {
    const [battery, currentLoad, network, system, mem] = await Promise.all([
      si.battery().catch(() => ({})),
      si.currentLoad().catch(() => ({})),
      si.networkInterfaces().catch(() => ([])),
      si.system().catch(() => ({})),
      si.mem().catch(() => ({})),
    ]);

    // si.time() is synchronous in systeminformation
    let timeInfo = {};
    try {
      timeInfo = si.time();
    } catch (_) {}

    // volume: loudness returns 0..100 on most platforms; some return 0..1
    let volume = null;
    try {
      volume = await loudness.getVolume();
    } catch (_) {}
    let volumePercent = undefined;
    if (typeof volume === 'number') {
      volumePercent = volume <= 1 ? Math.round(volume * 100) : Math.round(volume);
      if (volumePercent < 0) volumePercent = 0;
      if (volumePercent > 100) volumePercent = 100;
    }

    // Brightness: not cross-platform in node; try Windows via wmic fallback
    let brightnessPercent;
    try {
      const { execSync } = require('child_process');
      const output = execSync('powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      const b = parseInt(output, 10);
      if (!isNaN(b)) brightnessPercent = b;
    } catch (_) {}

    const payload = {
      deviceId: DEVICE_ID,
      deviceManufacturer: system.manufacturer,
      deviceModel: system.model,
      batteryPercent: typeof battery.percent === 'number' ? Math.round(battery.percent) : undefined,
      isCharging: !!battery.isCharging,
      cpuLoadPercent: typeof currentLoad.currentload === 'number' ? Math.round(currentLoad.currentload) : undefined,
      uptimeSeconds: typeof timeInfo.uptime === 'number' ? timeInfo.uptime : undefined,
      memoryUsedPercent: typeof mem.used === 'number' && typeof mem.total === 'number' ? Math.round((mem.used / mem.total) * 100) : undefined,
      memoryTotalMB: typeof mem.total === 'number' ? Math.round(mem.total / (1024 * 1024)) : undefined,
      memoryFreeMB: typeof mem.free === 'number' ? Math.round(mem.free / (1024 * 1024)) : undefined,
      brightnessPercent,
      isOnline: Array.isArray(network) ? network.some(n => n.operstate === 'up') : undefined,
      networkType: Array.isArray(network) ? (network.find(n => n.operstate === 'up')?.type || '') : undefined,
      volumePercent,
    };

    await fetch(`${API_BASE}/api/system/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('system agent error:', err.message);
  }
}

// Socket register for targeted commands
let socket;
function ensureSocket() {
  try {
    if (!socket) {
      socket = io(API_BASE, { transports: ['websocket'] });
      socket.on('connect', () => {
        try { socket.emit('register-device', DEVICE_ID); } catch (_) {}
      });
      socket.on('agentCommand', async ({ command }) => {
        if (command === 'open-task-manager') {
          try {
            // Windows Task Manager
            const { exec } = require('child_process');
            exec('start taskmgr');
          } catch (e) {
            console.error('Failed to open task manager:', e.message);
          }
        }
        if (command === 'open-battery-settings') {
          try {
            const { exec } = require('child_process');
            exec('start ms-settings:batterysaver');
          } catch (e) {
            console.error('Failed to open battery settings:', e.message);
          }
        }
        if (command === 'open-brightness-settings') {
          try {
            const { exec } = require('child_process');
            exec('start ms-settings:display');
          } catch (e) {
            console.error('Failed to open display settings:', e.message);
          }
        }
        if (command === 'open-sound-settings') {
          try {
            const { exec } = require('child_process');
            exec('start ms-settings:sound');
          } catch (e) {
            console.error('Failed to open sound settings:', e.message);
          }
        }
        if (command === 'open-network-settings') {
          try {
            const { exec } = require('child_process');
            exec('start ms-settings:network');
          } catch (e) {
            console.error('Failed to open network settings:', e.message);
          }
        }
      });
    }
  } catch {}
}

// run every 30s
setInterval(() => { ensureSocket(); collectAndSend(); }, 30000);
ensureSocket();
collectAndSend();


