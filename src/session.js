const prompt = require('prompt-sync')();
const fetch = require('cross-fetch');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('os');
const cookie = require('cookie');

const sessionFilePath = path.join(os.homedir(), '.todo_session');
let token = null;

async function saveSession(token) {
    const handle = await fs.open(sessionFilePath, 'w');
    await handle.writeFile(token, 'utf-8');
    handle.close();
}

async function loadSession() {
    try {
        const handle = await fs.open(sessionFilePath, 'r');
        const token = await handle.readFile('utf-8');
        handle.close();
        return token;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

async function clearSession() {
    await fs.rm(sessionFilePath, { force: true });
}

async function startNewSession() {
    console.log('Enter your credentials:');
    const username = prompt('    username: ');
    const password = prompt.hide('    password: ');

    const response = await fetch('https://davidqz-todos.herokuapp.com/api/v1/users/sessions', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: username, password })
    });

    if (!response.ok) {
        return { ok: false, message: await response.json() };
    }

    const sessionCookie = cookie.parse(response.headers.get('set-cookie'));
    token = sessionCookie.session;
    await saveSession(token);

    return { ok: true, message: 'successfully started new session' };
}

module.exports.login = async function() {
    token = await loadSession();
    return token ? { ok: true, message: 'successfully resumed session from disk' } : await startNewSession();
};

module.exports.logout = async function() {
    await clearSession();
};

module.exports.fetch = function(path, options) {
    if (token) {
        if (!options) options = {};
        if (!options.headers) options.headers = {};

        options.headers.Cookie = `session=${token}`;
    }
    return fetch(path, options);
};
