// Library Manager for Code Editor
class LibraryManager {
    constructor() {
        this.libraries = null;
        this.loadedLibraries = new Set();
    }

    async initialize() {
        try {
            const response = await fetch('libraries.json');
            this.libraries = await response.json();
        } catch (error) {
            console.error('Failed to load libraries:', error);
        }
    }

    // Get all available libraries for a specific language
    getLibraries(language) {
        if (!this.libraries || !this.libraries[language]) {
            return [];
        }

        const result = [];
        const categories = this.libraries[language];

        for (const category in categories) {
            for (const lib in categories[category]) {
                result.push({
                    name: categories[category][lib].name,
                    version: categories[category][lib].version,
                    category: category,
                    id: lib
                });
            }
        }

        return result;
    }

    // Load a library into the preview
    async loadLibrary(language, category, libraryId) {
        const library = this.libraries[language]?.[category]?.[libraryId];
        if (!library) return null;

        if (library.cdnUrl) {
            // For frontend libraries with CDN
            if (!this.loadedLibraries.has(library.cdnUrl)) {
                await this.loadCDNLibrary(library.cdnUrl);
                this.loadedLibraries.add(library.cdnUrl);
            }
            return library;
        } else if (library.type === 'node' || library.type === 'pip') {
            // For backend libraries
            return this.getBoilerplateCode(library);
        }
    }

    // Load a CDN library into the preview
    async loadCDNLibrary(url) {
        const preview = document.getElementById('preview').contentWindow.document;
        
        if (url.endsWith('.css')) {
            const link = preview.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            preview.head.appendChild(link);
        } else {
            const script = preview.createElement('script');
            script.src = url;
            preview.head.appendChild(script);
            
            // Wait for script to load
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }
    }

    // Get boilerplate code for a library
    getBoilerplateCode(library) {
        return library.boilerplate || {};
    }

    // Create a new project with selected libraries
    createProject(selectedLibraries) {
        const project = {};

        selectedLibraries.forEach(lib => {
            const library = this.libraries[lib.language]?.[lib.category]?.[lib.id];
            if (library && library.boilerplate) {
                Object.entries(library.boilerplate).forEach(([filename, content]) => {
                    project[filename] = content;
                });
            }
        });

        return project;
    }

    // Get dependencies for a library
    getDependencies(language, category, libraryId) {
        const library = this.libraries[language]?.[category]?.[libraryId];
        return library?.dependencies || [];
    }
}

// Export the LibraryManager
export const libraryManager = new LibraryManager();