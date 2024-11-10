// Initialize CodeMirror
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "xml",
    theme: "dracula",
    autoCloseTags: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 4,
    lineWrapping: true
});

// Set initial size
editor.setSize("100%", "100%");

let activeFolder = ''; // Track currently selected folder
const fileSystem = {
    files: {}, // Store file contents
    structure: {
        '/': [] // Root directory
    } // Store folder/file hierarchy
};

// Initialize default content for the base files
fileSystem.files['index.html'] = `<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Hello, World!</h1>
    <script src="script.js"><\/script>
</body>
</html>`;
fileSystem.files['styles.css'] = `body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f0f0f0;
}

h1 {
    color: #333;
    text-align: center;
}`;
fileSystem.files['script.js'] = `// JavaScript code
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded!');
});`;

// Initialize package.json with pre-installed libraries
fileSystem.files['package.json'] = JSON.stringify({
    "name": "web-editor-project",
    "version": "1.0.0",
    "description": "Web-based code editor project",
    "dependencies": {
        "lodash": "^4.17.21",
        "moment": "^2.29.4",
        "axios": "^1.3.4",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "vue": "^3.2.47",
        "jquery": "^3.6.4",
        "bootstrap": "^5.2.3",
        "tailwindcss": "^3.2.7",
        "three.js": "^0.150.1",
        "chart.js": "^4.2.1",
        "express": "^4.18.2",
        "socket.io": "^4.6.1"
    }
}, null, 2);

let currentFile = 'index.html';
let previewUpdateTimeout = null;

// Function to get available libraries from package.json
function getAvailableLibraries() {
    try {
        const packageJson = JSON.parse(fileSystem.files['package.json']);
        return packageJson.dependencies || {};
    } catch (error) {
        console.error('Error parsing package.json:', error);
        return {};
    }
}

// Function to add a new library to package.json
function addLibrary(name, version) {
    try {
        const packageJson = JSON.parse(fileSystem.files['package.json']);
        packageJson.dependencies[name] = version;
        fileSystem.files['package.json'] = JSON.stringify(packageJson, null, 2);
        return true;
    } catch (error) {
        console.error('Error updating package.json:', error);
        return false;
    }
}

// Function to handle library commands
function handleLibraryCommands(command) {
    const parts = command.split(' ');
    const action = parts[0];

    if (action === 'npm' || action === 'yarn') {
        if (parts[1] === 'list') {
            const libraries = getAvailableLibraries();
            return `Available libraries:\n${Object.entries(libraries)
                .map(([name, version]) => `${name}@${version}`)
                .join('\n')}`;
        } else if (parts[1] === 'add' && parts[2]) {
            const libName = parts[2];
            const version = parts[3] || 'latest';
            if (addLibrary(libName, version)) {
                return `Added ${libName}@${version} to package.json`;
            }
            return `Error adding ${libName}`;
        }
    }
    return null;
}

// Add change handler to editor for auto-preview
editor.on('change', () => {
    if (previewUpdateTimeout) {
        clearTimeout(previewUpdateTimeout);
    }
    previewUpdateTimeout = setTimeout(updatePreview, 1000);
    fileSystem.files[currentFile] = editor.getValue();
});

// Function to safely execute JavaScript in preview
function createSandboxedPreview(htmlContent, cssContent, jsContent) {
    const frame = document.getElementById("preview");
    const preview = frame.contentWindow.document;
    
    // Get available libraries for injection
    const libraries = getAvailableLibraries();
    const cdnScripts = Object.entries(libraries).map(([name, version]) => {
        // Add CDN links for common libraries
        const cdnMap = {
            'lodash': `https://cdnjs.cloudflare.com/ajax/libs/lodash/${version}/lodash.min.js`,
            'moment': `https://cdnjs.cloudflare.com/ajax/libs/moment.js/${version}/moment.min.js`,
            'jquery': `https://cdnjs.cloudflare.com/ajax/libs/jquery/${version}/jquery.min.js`,
            'bootstrap': `https://cdnjs.cloudflare.com/ajax/libs/bootstrap/${version}/js/bootstrap.min.js`,
            'chart.js': `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/${version}/chart.min.js`,
            'vue': `https://cdnjs.cloudflare.com/ajax/libs/vue/${version}/vue.min.js`,
            'react': `https://cdnjs.cloudflare.com/ajax/libs/react/${version}/umd/react.production.min.js`,
            'react-dom': `https://cdnjs.cloudflare.com/ajax/libs/react-dom/${version}/umd/react-dom.production.min.js`,
        };
        return cdnMap[name] ? `<script src="${cdnMap[name]}"></script>` : '';
    }).join('\n');
    
    preview.open();
    preview.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>${cssContent}</style>
            ${cdnScripts}
            <script>
                window.onerror = function(msg, url, line) {
                    console.error('Preview Error:', msg, 'Line:', line);
                    return true;
                };
            </script>
        </head>
        <body>
            ${htmlContent}
            <script>
                try {
                    ${jsContent}
                } catch(e) {
                    console.error('Script execution error:', e);
                }
            </script>
        </body>
        </html>
    `);
    preview.close();
}

// Function to update preview
function updatePreview() {
    const htmlContent = fileSystem.files['index.html'] || '';
    const cssContent = fileSystem.files['styles.css'] || '';
    const jsContent = fileSystem.files['script.js'] || '';

    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

    createSandboxedPreview(bodyContent, cssContent, jsContent);
}

// Terminal functionality
const terminalBtn = document.getElementById('terminalBtn');
const terminal = document.getElementById('terminal');
const mainContent = document.querySelector('.main-content');

terminalBtn.addEventListener('click', () => {
    terminal.classList.toggle('active');
    if (terminal.classList.contains('active')) {
        const input = terminal.querySelector('.terminal-input');
        input.focus();
    }
});

const fileTreeItems = document.querySelectorAll(".file-tree li");
fileTreeItems.forEach(file => {
    file.addEventListener("click", () => {
        const fileName = file.textContent;
        loadFile(fileName);
    });
});


// Handle terminal input
terminal.querySelector('.terminal-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const input = e.target;
        const command = input.value.trim();
        
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.innerHTML = `<span class="terminal-prompt">$</span><span>${command}</span>`;
        
        let output = document.createElement('div');
        const libraryOutput = handleLibraryCommands(command);
        
        if (libraryOutput !== null) {
            output.textContent = libraryOutput;
            output.style.color = '#4a90e2';
        } else {
            output.textContent = `Command executed: ${command}`;
            output.style.color = '#666';
        }
        output.style.marginLeft = '1rem';
        
        terminal.insertBefore(output, input.parentElement);
        terminal.insertBefore(line, input.parentElement);
        
        input.value = '';
    }
});

// Settings functionality
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const themeSelect = document.getElementById('themeSelect');
const fontColorPicker = document.getElementById('fontColorPicker');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

cancelSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

saveSettingsBtn.addEventListener('click', () => {
    const theme = themeSelect.value;
    const fontColor = fontColorPicker.value;
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--light', fontColor);
    
    localStorage.setItem('editorTheme', theme);
    localStorage.setItem('editorFontColor', fontColor);
    
    settingsModal.classList.remove('active');
});

// Load saved settings
const savedTheme = localStorage.getItem('editorTheme');
const savedFontColor = localStorage.getItem('editorFontColor');

if (savedTheme) {
    themeSelect.value = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
}

if (savedFontColor) {
    fontColorPicker.value = savedFontColor;
    document.documentElement.style.setProperty('--light', savedFontColor);
}

// Plugins functionality
const pluginsBtn = document.getElementById('pluginsBtn');
const pluginsModal = document.getElementById('pluginsModal');
const colorRandomizerSelect = document.getElementById('colorRandomizerSelect');
const cancelPluginsBtn = document.getElementById('cancelPluginsBtn');
const savePluginsBtn = document.getElementById('savePluginsBtn');
const randomColorPreview = document.getElementById('randomColorPreview');

pluginsBtn.addEventListener('click', () => {
    pluginsModal.classList.add('active');
});

cancelPluginsBtn.addEventListener('click', () => {
    pluginsModal.classList.remove('active');
});

function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
}

colorRandomizerSelect.addEventListener('change', () => {
    if (colorRandomizerSelect.value === 'enabled') {
        randomColorPreview.style.display = 'block';
        const randomColor = generateRandomColor();
        randomColorPreview.style.backgroundColor = randomColor;
    } else {
        randomColorPreview.style.display = 'none';
    }
});

savePluginsBtn.addEventListener('click', () => {
    if (colorRandomizerSelect.value === 'enabled') {
        const randomColor = randomColorPreview.style.backgroundColor;
        document.documentElement.style.setProperty('--primary', randomColor);
    }
    
    localStorage.setItem('colorRandomizer', colorRandomizerSelect.value);
    
    pluginsModal.classList.remove('active');
});

// Load saved plugin settings
const savedColorRandomizer = localStorage.getItem('colorRandomizer');
if (savedColorRandomizer) {
    colorRandomizerSelect.value = savedColorRandomizer;
    if (savedColorRandomizer === 'enabled') {
        randomColorPreview.style.display = 'block';
        randomColorPreview.style.backgroundColor = generateRandomColor();
    }
}

// Close plugins modal when clicking outside
pluginsModal.addEventListener('click', (e) => {
    if (e.target === pluginsModal) {
        pluginsModal.classList.remove('active');
    }
});

// Add console logging support in preview
const originalConsole = console;
const previewFrame = document.getElementById("preview");

previewFrame.contentWindow.console = {
    log: (...args) => {
        originalConsole.log('[Preview]:', ...args);
        const terminal = document.getElementById('terminal');
        if (terminal.classList.contains('active')) {
            const output = document.createElement('div');
            output.textContent = `[Console] ${args.join(' ')}`;
            output.style.color = '#4a90e2';
            output.style.marginLeft = '1rem';
            terminal.insertBefore(output, terminal.querySelector('.terminal-line'));
        }
    },
    error: (...args) => {
        originalConsole.error('[Preview]:', ...args);
        const terminal = document.getElementById('terminal');
        if (terminal.classList.contains('active')) {
            const output = document.createElement('div');
            output.textContent = `[Error] ${args.join(' ')}`;
            output.style.color = '#ff4444';
            output.style.marginLeft = '1rem';
            terminal.insertBefore(output, terminal.querySelector('.terminal-line'));
        }
    },
    warn: (...args) => {
        originalConsole.warn('[Preview]:', ...args);
    }
};

// Set initial content and trigger initial preview
document.addEventListener('DOMContentLoaded', () => {
    loadFile('index.html');
});