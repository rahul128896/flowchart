/**
 * StorageManager - Handles saving and loading flowcharts from localStorage
 */
class StorageManager {
    constructor() {
        // Storage key for the list of saved flowcharts
        this.FLOWCHART_LIST_KEY = 'flowcharter_flowchart_list';
        
        // Prefix for individual flowchart storage keys
        this.FLOWCHART_PREFIX = 'flowcharter_flowchart_';
        
        // Initialize storage if needed
        this.initializeStorage();
    }
    
    /**
     * Initializes storage if it doesn't exist yet
     */
    initializeStorage() {
        if (!localStorage.getItem(this.FLOWCHART_LIST_KEY)) {
            localStorage.setItem(this.FLOWCHART_LIST_KEY, JSON.stringify([]));
        }
    }
    
    /**
     * Gets the list of saved flowcharts
     * @returns {Array} - List of flowchart names
     */
    getFlowchartList() {
        try {
            return JSON.parse(localStorage.getItem(this.FLOWCHART_LIST_KEY)) || [];
        } catch (error) {
            console.error('Error retrieving flowchart list:', error);
            return [];
        }
    }
    
    /**
     * Updates the list of saved flowcharts
     * @param {Array} list - New list of flowchart names
     */
    updateFlowchartList(list) {
        try {
            localStorage.setItem(this.FLOWCHART_LIST_KEY, JSON.stringify(list));
        } catch (error) {
            console.error('Error updating flowchart list:', error);
            throw new Error('Failed to update flowchart list');
        }
    }
    
    /**
     * Saves a flowchart to localStorage
     * @param {string} name - Name of the flowchart
     * @param {Object} data - Flowchart data
     */
    saveFlowchart(name, data) {
        try {
            // First, check if name exists in the list
            const list = this.getFlowchartList();
            if (!list.includes(name)) {
                list.push(name);
                this.updateFlowchartList(list);
            }
            
            // Then save the actual flowchart data
            localStorage.setItem(`${this.FLOWCHART_PREFIX}${name}`, JSON.stringify(data));
            
            return true;
        } catch (error) {
            console.error('Error saving flowchart:', error);
            
            // If storage quota is exceeded, provide a helpful message
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded. Try deleting some flowcharts first.');
            } else {
                throw new Error('Failed to save flowchart');
            }
        }
    }
    
    /**
     * Loads a flowchart from localStorage
     * @param {string} name - Name of the flowchart to load
     * @returns {Object} - Flowchart data
     */
    loadFlowchart(name) {
        try {
            const data = localStorage.getItem(`${this.FLOWCHART_PREFIX}${name}`);
            if (!data) {
                throw new Error(`Flowchart "${name}" not found`);
            }
            
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading flowchart:', error);
            throw new Error(`Failed to load flowchart: ${error.message}`);
        }
    }
    
    /**
     * Deletes a flowchart from localStorage
     * @param {string} name - Name of the flowchart to delete
     */
    deleteFlowchart(name) {
        try {
            // First, remove from the list
            const list = this.getFlowchartList();
            const index = list.indexOf(name);
            
            if (index > -1) {
                list.splice(index, 1);
                this.updateFlowchartList(list);
                
                // Then remove the actual data
                localStorage.removeItem(`${this.FLOWCHART_PREFIX}${name}`);
                return true;
            } else {
                throw new Error(`Flowchart "${name}" not found`);
            }
        } catch (error) {
            console.error('Error deleting flowchart:', error);
            throw new Error('Failed to delete flowchart');
        }
    }
    
    /**
     * Checks if the browser supports localStorage
     * @returns {boolean} - True if localStorage is supported
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Gets the total storage usage in bytes
     * @returns {number} - The total storage usage in bytes
     */
    getStorageUsage() {
        let totalBytes = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.FLOWCHART_PREFIX) || key === this.FLOWCHART_LIST_KEY) {
                totalBytes += localStorage.getItem(key).length * 2; // UTF-16 uses 2 bytes per character
            }
        }
        
        return totalBytes;
    }
    
    /**
     * Estimates the maximum storage available (typically 5MB for most browsers)
     * @returns {number} - The maximum storage in bytes
     */
    getMaxStorageAvailable() {
        // This is a rough estimate since browsers don't expose this information directly
        // Most browsers allocate 5MB per origin
        return 5 * 1024 * 1024;
    }
}
