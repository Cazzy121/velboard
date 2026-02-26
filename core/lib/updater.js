/**
 * Auto-update system for Clawboard
 * 
 * Checks GitHub for new versions and supports git-based updates.
 * Provides version info for /api/version endpoint.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GITHUB_REPO = 'karthikeyan5/clawboard';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

let versionInfo = null;
let rootDirectory = null;

/**
 * Load version info from .version file
 * @param {string} rootDir - Dashboard root directory
 */
function loadVersion(rootDir) {
  rootDirectory = rootDir;
  const versionPath = path.join(rootDir, '.version');
  try {
    if (fs.existsSync(versionPath)) {
      versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    } else {
      versionInfo = {
        version: '2.1.0',
        installed_at: new Date().toISOString(),
        source: `github:${GITHUB_REPO}`
      };
      fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
    }
  } catch (err) {
    console.error('[Updater] Error reading .version:', err.message);
    versionInfo = { version: '2.1.0', error: 'Version file unreadable' };
  }
}

/**
 * Check for updates via GitHub releases API
 * @returns {Promise<object|null>} Update info or null if up to date
 */
async function checkUpdate() {
  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      https.get(GITHUB_API, {
        headers: { 'User-Agent': 'clawboard-updater', 'Accept': 'application/vnd.github.v3+json' }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) resolve(JSON.parse(body));
          else if (res.statusCode === 404) resolve(null); // no releases yet
          else reject(new Error(`GitHub API ${res.statusCode}`));
        });
      }).on('error', reject);
    });

    if (!data || !data.tag_name) return null;

    const latestVersion = data.tag_name.replace(/^v/, '');
    const currentVersion = (versionInfo && versionInfo.version) || '0.0.0';

    if (latestVersion !== currentVersion) {
      return {
        current: currentVersion,
        latest: latestVersion,
        url: data.html_url,
        published_at: data.published_at,
        notes: data.body
      };
    }

    return null;
  } catch (err) {
    console.error('[Updater] Check failed:', err.message);
    return null;
  }
}

/**
 * Apply update via git pull
 * @returns {Promise<boolean>} Success status
 */
async function applyUpdate() {
  if (!rootDirectory) throw new Error('Root directory not set');
  
  try {
    // Check if we're in a git repo
    const isGit = fs.existsSync(path.join(rootDirectory, '.git'));
    if (!isGit) {
      throw new Error('Not a git repository. Clone from GitHub to enable auto-updates.');
    }

    const result = execSync('git pull origin main', {
      cwd: rootDirectory,
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('[Updater] git pull result:', result.trim());

    // Reload version info
    loadVersion(rootDirectory);

    return true;
  } catch (err) {
    console.error('[Updater] Update failed:', err.message);
    throw err;
  }
}

/**
 * Get current version info
 * @returns {object} Version info object
 */
function getVersionInfo() {
  return {
    ...(versionInfo || { version: '2.1.0' }),
    source: `github:${GITHUB_REPO}`,
    repo: `https://github.com/${GITHUB_REPO}`
  };
}

module.exports = {
  loadVersion,
  checkUpdate,
  applyUpdate,
  getVersionInfo
};
