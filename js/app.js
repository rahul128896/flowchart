/**
 * FlowCharter - Main Application
 * 
 * This is the main entry point that initializes the application
 * and connects all components.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the canvas manager
    const canvas = document.getElementById('flowchartCanvas');
    const canvasManager = new CanvasManager(canvas);
    
    // Initialize validation engine
    const validationEngine = new ValidationEngine(
        canvasManager,
        document.getElementById('validationMessages')
    );

    // Initialize storage manager
    const storageManager = new StorageManager();
    
    // Setup UI interactions
    setupUIInteractions(canvasManager, storageManager, validationEngine);
    
    // Adjust canvas size on window resize
    window.addEventListener('resize', () => {
        canvasManager.resizeCanvas();
    });
    
    // Initial canvas resize to fit container
    canvasManager.resizeCanvas();
});

/**
 * Sets up all UI interactions for the application
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {StorageManager} storageManager - The storage manager instance
 * @param {ValidationEngine} validationEngine - The validation engine instance
 */
function setupUIInteractions(canvasManager, storageManager, validationEngine) {
    // Tool buttons
    const selectBtn = document.getElementById('selectBtn');
    const connectBtn = document.getElementById('connectBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    // File operation buttons
    const newBtn = document.getElementById('newBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    // View control buttons
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    
    // Properties panel elements
    const propertiesPanel = document.getElementById('propertiesPanel');
    const nodeProperties = document.getElementById('nodeProperties');
    const edgeProperties = document.getElementById('edgeProperties');
    const noSelection = document.getElementById('noSelection');
    const nodeText = document.getElementById('nodeText');
    const edgeText = document.getElementById('edgeText');
    
    // Modals
    const saveModal = document.getElementById('saveModal');
    const loadModal = document.getElementById('loadModal');
    const closeButtons = document.querySelectorAll('.close');
    const flowchartName = document.getElementById('flowchartName');
    const confirmSaveBtn = document.getElementById('confirmSaveBtn');
    const savedFlowcharts = document.getElementById('savedFlowcharts');
    
    // Node palette
    const nodeItems = document.querySelectorAll('.node-item');

    // Tool selection
    selectBtn.addEventListener('click', () => {
        setActiveTool(selectBtn);
        canvasManager.setMode('select');
    });
    
    connectBtn.addEventListener('click', () => {
        setActiveTool(connectBtn);
        canvasManager.setMode('connect');
    });
    
    deleteBtn.addEventListener('click', () => {
        setActiveTool(deleteBtn);
        canvasManager.setMode('delete');
    });
    
    function setActiveTool(activeBtn) {
        [selectBtn, connectBtn, deleteBtn].forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }
    
    // File operations
    newBtn.addEventListener('click', () => {
        if (confirm('Create a new flowchart? Any unsaved changes will be lost.')) {
            canvasManager.clear();
            validationEngine.clearMessages();
        }
    });
    
    saveBtn.addEventListener('click', () => {
        openModal(saveModal);
        if (canvasManager.currentFlowchartName) {
            flowchartName.value = canvasManager.currentFlowchartName;
        } else {
            flowchartName.value = `Flowchart ${new Date().toLocaleString()}`;
        }
    });
    
    loadBtn.addEventListener('click', () => {
        openModal(loadModal);
        populateSavedFlowcharts();
    });
    
    exportBtn.addEventListener('click', () => {
        const dataURL = canvasManager.exportAsPNG();
        const link = document.createElement('a');
        link.download = `${canvasManager.currentFlowchartName || 'flowchart'}.png`;
        link.href = dataURL;
        link.click();
    });
    
    // View controls
    zoomInBtn.addEventListener('click', () => canvasManager.zoomIn());
    zoomOutBtn.addEventListener('click', () => canvasManager.zoomOut());
    resetViewBtn.addEventListener('click', () => canvasManager.resetView());
    
    // Properties panel
    canvasManager.onSelectionChange = (selectedItem) => {
        if (!selectedItem) {
            nodeProperties.classList.add('hidden');
            edgeProperties.classList.add('hidden');
            noSelection.classList.remove('hidden');
            return;
        }
        
        noSelection.classList.add('hidden');
        
        if (selectedItem.type === 'node') {
            nodeProperties.classList.remove('hidden');
            edgeProperties.classList.add('hidden');
            nodeText.value = selectedItem.text || '';
        } else if (selectedItem.type === 'edge') {
            nodeProperties.classList.add('hidden');
            edgeProperties.classList.remove('hidden');
            edgeText.value = selectedItem.label || '';
        }
    };
    
    nodeText.addEventListener('input', () => {
        const selected = canvasManager.getSelectedItem();
        if (selected && selected.type === 'node') {
            canvasManager.updateNodeText(selected.id, nodeText.value);
        }
    });
    
    edgeText.addEventListener('input', () => {
        const selected = canvasManager.getSelectedItem();
        if (selected && selected.type === 'edge') {
            canvasManager.updateEdgeLabel(selected.id, edgeText.value);
        }
    });
    
    // Modal operations
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            saveModal.style.display = 'none';
            loadModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === saveModal) saveModal.style.display = 'none';
        if (e.target === loadModal) loadModal.style.display = 'none';
    });
    
    confirmSaveBtn.addEventListener('click', () => {
        const name = flowchartName.value.trim();
        if (name) {
            const flowchartData = canvasManager.saveFlowchart();
            storageManager.saveFlowchart(name, flowchartData);
            canvasManager.currentFlowchartName = name;
            saveModal.style.display = 'none';
            alert(`Flowchart "${name}" saved successfully!`);
        } else {
            alert('Please enter a name for your flowchart.');
        }
    });
    
    function populateSavedFlowcharts() {
        savedFlowcharts.innerHTML = '';
        const flowcharts = storageManager.getFlowchartList();
        
        if (flowcharts.length === 0) {
            savedFlowcharts.innerHTML = '<p class="muted-text">No saved flowcharts found.</p>';
            return;
        }
        
        flowcharts.forEach(name => {
            const item = document.createElement('div');
            item.className = 'flowchart-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete';
            
            item.appendChild(nameSpan);
            item.appendChild(deleteBtn);
            
            nameSpan.addEventListener('click', () => {
                try {
                    const data = storageManager.loadFlowchart(name);
                    canvasManager.loadFlowchart(data);
                    canvasManager.currentFlowchartName = name;
                    loadModal.style.display = 'none';
                    validationEngine.validateFlowchart();
                } catch (error) {
                    alert(`Error loading flowchart: ${error.message}`);
                }
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete flowchart "${name}"?`)) {
                    storageManager.deleteFlowchart(name);
                    populateSavedFlowcharts();
                }
            });
            
            savedFlowcharts.appendChild(item);
        });
    }
    
    function openModal(modal) {
        modal.style.display = 'flex';
    }
    
    // Node palette drag and drop
    nodeItems.forEach(nodeItem => {
        nodeItem.addEventListener('dragstart', (e) => {
            const nodeType = nodeItem.getAttribute('data-node-type');
            e.dataTransfer.setData('text/plain', nodeType);
        });
    });
    
    const flowchartCanvas = document.getElementById('flowchartCanvas');
    
    flowchartCanvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
    });
    
    flowchartCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('text/plain');
        if (nodeType) {
            const rect = flowchartCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / canvasManager.scale - canvasManager.offsetX;
            const y = (e.clientY - rect.top) / canvasManager.scale - canvasManager.offsetY;
            
            canvasManager.addNode(nodeType, x, y);
            validationEngine.validateFlowchart();
        }
    });
    
    // When changes happen to the flowchart, validate it
    canvasManager.onFlowchartChange = () => {
        validationEngine.validateFlowchart();
    };
}
