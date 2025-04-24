/**
 * CanvasManager - Handles all canvas operations and rendering
 */
class CanvasManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.selectedItem = null;
        this.hoveredItem = null;
        this.mode = 'select'; // select, connect, delete
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.isPanning = false;
        this.isResizing = false;
        this.resizeDirection = null; // 'nw', 'ne', 'se', 'sw'
        this.startX = 0;
        this.startY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.connectionStartNode = null;
        this.currentFlowchartName = null;
        
        // Node counter for generating unique IDs
        this.nodeCounter = 0;
        this.edgeCounter = 0;
        
        // Callbacks
        this.onSelectionChange = null;
        this.onFlowchartChange = null;
        
        this.initEventListeners();
        this.startRenderLoop();
    }
    
    /**
     * Initializes all event listeners for canvas interaction
     */
    initEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    /**
     * Sets the current operation mode
     * @param {string} mode - The mode to set ('select', 'connect', 'delete')
     */
    setMode(mode) {
        this.mode = mode;
        if (mode !== 'connect') {
            this.connectionStartNode = null;
        }
        // When changing modes, clear selection
        this.selectItem(null);
    }
    
    /**
     * Resizes the canvas to fit its container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }
    
    /**
     * Starts the render loop for continuous rendering
     */
    startRenderLoop() {
        const animate = () => {
            this.render();
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    /**
     * Renders the entire flowchart
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations for pan and zoom
        this.ctx.save();
        this.ctx.translate(this.offsetX * this.scale, this.offsetY * this.scale);
        this.ctx.scale(this.scale, this.scale);
        
        // Draw grid (optional)
        this.drawGrid();
        
        // Draw edges first so they appear behind nodes
        this.edges.forEach(edge => this.drawEdge(edge));
        
        // Draw pending connection if in connect mode
        if (this.mode === 'connect' && this.connectionStartNode) {
            this.drawPendingConnection();
        }
        
        // Draw nodes
        this.nodes.forEach(node => this.drawNode(node));
        
        this.ctx.restore();
    }
    
    /**
     * Draws a grid on the canvas
     */
    drawGrid() {
        const gridSize = 20;
        const offsetX = this.offsetX % gridSize;
        const offsetY = this.offsetY % gridSize;
        
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx.lineWidth = 0.5;
        
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;
        
        // Draw vertical lines
        for (let x = offsetX; x < width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = offsetY; y < height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draws a node on the canvas
     * @param {Object} node - The node to draw
     */
    drawNode(node) {
        const nodeType = NodeTypes[node.nodeType];
        if (!nodeType) return;
        
        this.ctx.save();
        
        // Draw the node shape
        this.ctx.fillStyle = nodeType.color;
        this.ctx.strokeStyle = this.selectedItem && this.selectedItem.id === node.id && this.selectedItem.type === 'node' 
            ? '#ff0000' 
            : '#333333';
        this.ctx.lineWidth = this.selectedItem && this.selectedItem.id === node.id && this.selectedItem.type === 'node' 
            ? 2 
            : 1;
        
        nodeType.draw(this.ctx, node.x, node.y, node.width, node.height);
        
        // Draw the node text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Break text into lines if needed
        const maxWidth = node.width - 10;
        const lines = this.wrapText(node.text, maxWidth);
        
        const lineHeight = 14;
        const textY = node.y - ((lines.length - 1) * lineHeight / 2);
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, node.x, textY + index * lineHeight);
        });
        
        // Draw resize handles if the node is selected
        if (this.selectedItem && this.selectedItem.id === node.id && this.selectedItem.type === 'node') {
            const handleSize = 8;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 1;
            
            // North-West handle
            this.ctx.beginPath();
            this.ctx.rect(node.x - node.width/2 - handleSize/2, node.y - node.height/2 - handleSize/2, handleSize, handleSize);
            this.ctx.fill();
            this.ctx.stroke();
            
            // North-East handle
            this.ctx.beginPath();
            this.ctx.rect(node.x + node.width/2 - handleSize/2, node.y - node.height/2 - handleSize/2, handleSize, handleSize);
            this.ctx.fill();
            this.ctx.stroke();
            
            // South-East handle
            this.ctx.beginPath();
            this.ctx.rect(node.x + node.width/2 - handleSize/2, node.y + node.height/2 - handleSize/2, handleSize, handleSize);
            this.ctx.fill();
            this.ctx.stroke();
            
            // South-West handle
            this.ctx.beginPath();
            this.ctx.rect(node.x - node.width/2 - handleSize/2, node.y + node.height/2 - handleSize/2, handleSize, handleSize);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * Wraps text to fit within a given width
     * @param {string} text - The text to wrap
     * @param {number} maxWidth - The maximum width for the text
     * @returns {Array} - Array of lines
     */
    wrapText(text, maxWidth) {
        if (!text) return [''];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = this.ctx.measureText(currentLine + ' ' + word).width;
            
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        
        lines.push(currentLine);
        return lines;
    }
    
    /**
     * Draws an edge on the canvas
     * @param {Object} edge - The edge to draw
     */
    drawEdge(edge) {
        const sourceNode = this.nodes.find(node => node.id === edge.sourceId);
        const targetNode = this.nodes.find(node => node.id === edge.targetId);
        
        if (!sourceNode || !targetNode) return;
        
        const sourceType = NodeTypes[sourceNode.nodeType];
        const targetType = NodeTypes[targetNode.nodeType];
        
        if (!sourceType || !targetType) return;
        
        const { x: sourceX, y: sourceY } = sourceType.getConnectionPoint(sourceNode, targetNode);
        const { x: targetX, y: targetY } = targetType.getConnectionPoint(targetNode, sourceNode);
        
        this.ctx.save();
        
        this.ctx.strokeStyle = this.selectedItem && this.selectedItem.id === edge.id && this.selectedItem.type === 'edge' 
            ? '#ff0000' 
            : '#666666';
        this.ctx.lineWidth = this.selectedItem && this.selectedItem.id === edge.id && this.selectedItem.type === 'edge' 
            ? 2 
            : 1.5;
        
        // Draw the line
        this.ctx.beginPath();
        this.ctx.moveTo(sourceX, sourceY);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.stroke();
        
        // Draw the arrow
        this.drawArrow(sourceX, sourceY, targetX, targetY);
        
        // Draw the label
        if (edge.label) {
            const midX = (sourceX + targetX) / 2;
            const midY = (sourceY + targetY) / 2;
            
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Background for label
            const textWidth = this.ctx.measureText(edge.label).width + 6;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fillRect(midX - textWidth/2, midY - 8, textWidth, 16);
            
            this.ctx.fillStyle = '#333333';
            this.ctx.fillText(edge.label, midX, midY);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Draws an arrow head at the end of an edge
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Ending X coordinate
     * @param {number} toY - Ending Y coordinate
     */
    drawArrow(fromX, fromY, toX, toY) {
        const headLength = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Adjust arrowhead position to be a bit before the target point
        const adjustedToX = toX - 5 * Math.cos(angle);
        const adjustedToY = toY - 5 * Math.sin(angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(adjustedToX, adjustedToY);
        this.ctx.lineTo(
            adjustedToX - headLength * Math.cos(angle - Math.PI/6),
            adjustedToY - headLength * Math.sin(angle - Math.PI/6)
        );
        this.ctx.lineTo(
            adjustedToX - headLength * Math.cos(angle + Math.PI/6),
            adjustedToY - headLength * Math.sin(angle + Math.PI/6)
        );
        this.ctx.closePath();
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.fill();
    }
    
    /**
     * Draws a pending connection during connection mode
     */
    drawPendingConnection() {
        if (!this.connectionStartNode) return;
        
        const sourceNode = this.nodes.find(node => node.id === this.connectionStartNode);
        if (!sourceNode) return;
        
        const sourceType = NodeTypes[sourceNode.nodeType];
        if (!sourceType) return;
        
        // Get the mouse position if we're not over a node
        let targetX, targetY;
        
        if (this.hoveredItem && this.hoveredItem.type === 'node') {
            const targetNode = this.nodes.find(node => node.id === this.hoveredItem.id);
            if (!targetNode) return;
            
            const targetType = NodeTypes[targetNode.nodeType];
            if (!targetType) return;
            
            const targetPoint = targetType.getConnectionPoint(targetNode, sourceNode);
            targetX = targetPoint.x;
            targetY = targetPoint.y;
        } else {
            // If not hovering over a node, use the current mouse position
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = this.lastMouseX || (rect.left + rect.width / 2);
            const mouseY = this.lastMouseY || (rect.top + rect.height / 2);
            const coords = this.viewportToCanvas(mouseX, mouseY);
            targetX = coords.x;
            targetY = coords.y;
        }
        
        // Get starting point on source node
        const sourcePoint = sourceType.getConnectionPoint(
            sourceNode, 
            { x: targetX, y: targetY } // Use target coordinates directly
        );
        
        this.ctx.save();
        
        this.ctx.strokeStyle = this.hoveredItem && this.hoveredItem.type === 'node' ? '#999999' : '#ff0000';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([5, 3]);
        
        // Draw the dashed line
        this.ctx.beginPath();
        this.ctx.moveTo(sourcePoint.x, sourcePoint.y);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * Adds a new node to the flowchart
     * @param {string} nodeType - The type of node to add
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - The created node
     */
    addNode(nodeType, x, y) {
        if (!NodeTypes[nodeType]) return null;
        
        const node = {
            id: `node_${++this.nodeCounter}`,
            nodeType,
            x,
            y,
            width: NodeTypes[nodeType].defaultWidth,
            height: NodeTypes[nodeType].defaultHeight,
            text: nodeType.charAt(0).toUpperCase() + nodeType.slice(1)
        };
        
        this.nodes.push(node);
        
        if (this.onFlowchartChange) {
            this.onFlowchartChange();
        }
        
        return node;
    }
    
    /**
     * Adds a new edge connecting two nodes
     * @param {string} sourceId - ID of the source node
     * @param {string} targetId - ID of the target node
     * @returns {Object} - The created edge
     */
    addEdge(sourceId, targetId) {
        // Check if edge already exists
        const existingEdge = this.edges.find(
            edge => edge.sourceId === sourceId && edge.targetId === targetId
        );
        
        if (existingEdge) return null;
        
        const edge = {
            id: `edge_${++this.edgeCounter}`,
            sourceId,
            targetId,
            label: ''
        };
        
        this.edges.push(edge);
        
        if (this.onFlowchartChange) {
            this.onFlowchartChange();
        }
        
        return edge;
    }
    
    /**
     * Updates the text of a node
     * @param {string} nodeId - ID of the node to update
     * @param {string} text - New text
     */
    updateNodeText(nodeId, text) {
        const node = this.nodes.find(node => node.id === nodeId);
        if (node) {
            node.text = text;
            
            if (this.onFlowchartChange) {
                this.onFlowchartChange();
            }
        }
    }
    
    /**
     * Updates the label of an edge
     * @param {string} edgeId - ID of the edge to update
     * @param {string} label - New label
     */
    updateEdgeLabel(edgeId, label) {
        const edge = this.edges.find(edge => edge.id === edgeId);
        if (edge) {
            edge.label = label;
            
            if (this.onFlowchartChange) {
                this.onFlowchartChange();
            }
        }
    }
    
    /**
     * Deletes a node or edge
     * @param {Object} item - The item to delete
     */
    deleteItem(item) {
        if (!item) return;
        
        if (item.type === 'node') {
            // Remove the node
            this.nodes = this.nodes.filter(node => node.id !== item.id);
            
            // Remove any connected edges
            this.edges = this.edges.filter(
                edge => edge.sourceId !== item.id && edge.targetId !== item.id
            );
        } else if (item.type === 'edge') {
            // Remove the edge
            this.edges = this.edges.filter(edge => edge.id !== item.id);
        }
        
        this.selectItem(null);
        
        if (this.onFlowchartChange) {
            this.onFlowchartChange();
        }
    }
    
    /**
     * Selects a node or edge
     * @param {Object} item - The item to select
     */
    selectItem(item) {
        this.selectedItem = item;
        
        if (this.onSelectionChange) {
            this.onSelectionChange(item);
        }
    }
    
    /**
     * Gets the currently selected item
     * @returns {Object} - The selected item
     */
    getSelectedItem() {
        return this.selectedItem;
    }
    
    /**
     * Checks if a point is on a resize handle and returns the handle position
     * @param {Object} node - The node to check
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string|null} - The handle position ('nw', 'ne', 'se', 'sw') or null
     */
    getResizeHandleAt(node, x, y) {
        if (!node) return null;
        
        const handleSize = 8;
        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;
        const handleHalfSize = handleSize / 2;
        
        // Check NW handle
        if (Math.abs(x - (node.x - halfWidth - handleHalfSize)) <= handleHalfSize && 
            Math.abs(y - (node.y - halfHeight - handleHalfSize)) <= handleHalfSize) {
            return 'nw';
        }
        
        // Check NE handle
        if (Math.abs(x - (node.x + halfWidth - handleHalfSize)) <= handleHalfSize && 
            Math.abs(y - (node.y - halfHeight - handleHalfSize)) <= handleHalfSize) {
            return 'ne';
        }
        
        // Check SE handle
        if (Math.abs(x - (node.x + halfWidth - handleHalfSize)) <= handleHalfSize && 
            Math.abs(y - (node.y + halfHeight - handleHalfSize)) <= handleHalfSize) {
            return 'se';
        }
        
        // Check SW handle
        if (Math.abs(x - (node.x - halfWidth - handleHalfSize)) <= handleHalfSize && 
            Math.abs(y - (node.y + halfHeight - handleHalfSize)) <= handleHalfSize) {
            return 'sw';
        }
        
        return null;
    }
    
    /**
     * Gets the item at the given coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - The item at the coordinates
     */
    getItemAtPosition(x, y) {
        // Check for resize handles if a node is selected
        if (this.selectedItem && this.selectedItem.type === 'node') {
            const node = this.nodes.find(n => n.id === this.selectedItem.id);
            const handlePosition = this.getResizeHandleAt(node, x, y);
            
            if (handlePosition) {
                return { 
                    type: 'resize-handle', 
                    nodeId: node.id, 
                    position: handlePosition 
                };
            }
        }
        
        // Check nodes first (reverse order to get the top-most node)
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const nodeType = NodeTypes[node.nodeType];
            
            if (nodeType && nodeType.containsPoint(node, x, y)) {
                return { type: 'node', ...node };
            }
        }
        
        // Then check edges
        for (let i = this.edges.length - 1; i >= 0; i--) {
            const edge = this.edges[i];
            const sourceNode = this.nodes.find(node => node.id === edge.sourceId);
            const targetNode = this.nodes.find(node => node.id === edge.targetId);
            
            if (!sourceNode || !targetNode) continue;
            
            const sourceType = NodeTypes[sourceNode.nodeType];
            const targetType = NodeTypes[targetNode.nodeType];
            
            if (!sourceType || !targetType) continue;
            
            const { x: x1, y: y1 } = sourceType.getConnectionPoint(sourceNode, targetNode);
            const { x: x2, y: y2 } = targetType.getConnectionPoint(targetNode, sourceNode);
            
            // Check if the point is close to the edge
            if (this.isPointNearLine(x, y, x1, y1, x2, y2, 5)) {
                return { type: 'edge', ...edge };
            }
        }
        
        return null;
    }
    
    /**
     * Checks if a point is near a line
     * @param {number} px - Point X coordinate
     * @param {number} py - Point Y coordinate
     * @param {number} x1 - Line start X coordinate
     * @param {number} y1 - Line start Y coordinate
     * @param {number} x2 - Line end X coordinate
     * @param {number} y2 - Line end Y coordinate
     * @param {number} tolerance - Distance tolerance
     * @returns {boolean} - True if the point is near the line
     */
    isPointNearLine(px, py, x1, y1, x2, y2, tolerance) {
        // Calculate the distance from point to line
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy) < tolerance;
    }
    
    /**
     * Converts viewport coordinates to canvas coordinates
     * @param {number} clientX - X coordinate in viewport
     * @param {number} clientY - Y coordinate in viewport
     * @returns {Object} - Canvas coordinates
     */
    viewportToCanvas(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) / this.scale - this.offsetX;
        const y = (clientY - rect.top) / this.scale - this.offsetY;
        return { x, y };
    }
    
    /**
     * Zooms in the canvas
     */
    zoomIn() {
        this.scale *= 1.1;
        this.render();
    }
    
    /**
     * Zooms out the canvas
     */
    zoomOut() {
        this.scale *= 0.9;
        this.render();
    }
    
    /**
     * Resets the view to default
     */
    resetView() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
    }
    
    /**
     * Clears the flowchart
     */
    clear() {
        this.nodes = [];
        this.edges = [];
        this.selectedItem = null;
        this.hoveredItem = null;
        this.connectionStartNode = null;
        this.currentFlowchartName = null;
        this.nodeCounter = 0;
        this.edgeCounter = 0;
        
        if (this.onSelectionChange) {
            this.onSelectionChange(null);
        }
        
        if (this.onFlowchartChange) {
            this.onFlowchartChange();
        }
    }
    
    /**
     * Saves the current flowchart as data
     * @returns {Object} - Flowchart data
     */
    saveFlowchart() {
        return {
            nodes: [...this.nodes],
            edges: [...this.edges],
            nodeCounter: this.nodeCounter,
            edgeCounter: this.edgeCounter
        };
    }
    
    /**
     * Loads a flowchart from data
     * @param {Object} data - Flowchart data
     */
    loadFlowchart(data) {
        if (!data || !data.nodes || !data.edges) {
            throw new Error('Invalid flowchart data');
        }
        
        this.nodes = data.nodes;
        this.edges = data.edges;
        this.nodeCounter = data.nodeCounter || 0;
        this.edgeCounter = data.edgeCounter || 0;
        this.selectedItem = null;
        
        if (this.onSelectionChange) {
            this.onSelectionChange(null);
        }
        
        if (this.onFlowchartChange) {
            this.onFlowchartChange();
        }
    }
    
    /**
     * Exports the flowchart as a PNG image
     * @returns {string} - Data URL of the image
     */
    exportAsPNG() {
        // Create a temporary canvas to render the flowchart without ui elements
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Calculate the bounds of the flowchart
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            
            minX = Math.min(minX, node.x - halfWidth);
            minY = Math.min(minY, node.y - halfHeight);
            maxX = Math.max(maxX, node.x + halfWidth);
            maxY = Math.max(maxY, node.y + halfHeight);
        });
        
        // Add padding
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Set the canvas size
        const width = maxX - minX;
        const height = maxY - minY;
        
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Draw white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, width, height);
        
        // Set the transform to center the flowchart
        tempCtx.translate(-minX, -minY);
        
        // Draw edges
        this.edges.forEach(edge => {
            const sourceNode = this.nodes.find(node => node.id === edge.sourceId);
            const targetNode = this.nodes.find(node => node.id === edge.targetId);
            
            if (!sourceNode || !targetNode) return;
            
            const sourceType = NodeTypes[sourceNode.nodeType];
            const targetType = NodeTypes[targetNode.nodeType];
            
            if (!sourceType || !targetType) return;
            
            const { x: sourceX, y: sourceY } = sourceType.getConnectionPoint(sourceNode, targetNode);
            const { x: targetX, y: targetY } = targetType.getConnectionPoint(targetNode, sourceNode);
            
            tempCtx.strokeStyle = '#666666';
            tempCtx.lineWidth = 1.5;
            
            // Draw the line
            tempCtx.beginPath();
            tempCtx.moveTo(sourceX, sourceY);
            tempCtx.lineTo(targetX, targetY);
            tempCtx.stroke();
            
            // Draw the arrow
            const headLength = 10;
            const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
            
            const adjustedToX = targetX - 5 * Math.cos(angle);
            const adjustedToY = targetY - 5 * Math.sin(angle);
            
            tempCtx.beginPath();
            tempCtx.moveTo(adjustedToX, adjustedToY);
            tempCtx.lineTo(
                adjustedToX - headLength * Math.cos(angle - Math.PI/6),
                adjustedToY - headLength * Math.sin(angle - Math.PI/6)
            );
            tempCtx.lineTo(
                adjustedToX - headLength * Math.cos(angle + Math.PI/6),
                adjustedToY - headLength * Math.sin(angle + Math.PI/6)
            );
            tempCtx.closePath();
            tempCtx.fillStyle = tempCtx.strokeStyle;
            tempCtx.fill();
            
            // Draw the label
            if (edge.label) {
                const midX = (sourceX + targetX) / 2;
                const midY = (sourceY + targetY) / 2;
                
                tempCtx.fillStyle = '#333333';
                tempCtx.font = '11px Arial';
                tempCtx.textAlign = 'center';
                tempCtx.textBaseline = 'middle';
                
                // Background for label
                const textWidth = tempCtx.measureText(edge.label).width + 6;
                tempCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                tempCtx.fillRect(midX - textWidth/2, midY - 8, textWidth, 16);
                
                tempCtx.fillStyle = '#333333';
                tempCtx.fillText(edge.label, midX, midY);
            }
        });
        
        // Draw nodes
        this.nodes.forEach(node => {
            const nodeType = NodeTypes[node.nodeType];
            if (!nodeType) return;
            
            tempCtx.fillStyle = nodeType.color;
            tempCtx.strokeStyle = '#333333';
            tempCtx.lineWidth = 1;
            
            nodeType.draw(tempCtx, node.x, node.y, node.width, node.height);
            
            // Draw the node text
            tempCtx.fillStyle = '#ffffff';
            tempCtx.font = '12px Arial';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            
            // Break text into lines if needed
            const maxWidth = node.width - 10;
            const lines = this.wrapText(node.text, maxWidth);
            
            const lineHeight = 14;
            const textY = node.y - ((lines.length - 1) * lineHeight / 2);
            
            lines.forEach((line, index) => {
                tempCtx.fillText(line, node.x, textY + index * lineHeight);
            });
        });
        
        return tempCanvas.toDataURL('image/png');
    }
    
    // Event Handlers
    
    /**
     * Handles mouse down events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseDown(e) {
        const { x, y } = this.viewportToCanvas(e.clientX, e.clientY);
        this.startX = x;
        this.startY = y;
        
        const item = this.getItemAtPosition(x, y);
        
        if (this.mode === 'select') {
            if (item) {
                if (item.type === 'resize-handle') {
                    // Start resizing the node
                    this.isResizing = true;
                    this.resizeDirection = item.position;
                    
                    // Find the node being resized
                    const node = this.nodes.find(n => n.id === item.nodeId);
                    if (node) {
                        // Mark it as selected if not already
                        const nodeItem = { type: 'node', ...node };
                        if (!this.selectedItem || this.selectedItem.id !== node.id) {
                            this.selectItem(nodeItem);
                        }
                    }
                } else {
                    this.selectItem(item);
                    
                    if (item.type === 'node') {
                        this.isDragging = true;
                    }
                }
            } else {
                this.selectItem(null);
                this.isPanning = true;
                this.canvas.style.cursor = 'grabbing';
            }
        } else if (this.mode === 'connect') {
            if (item && item.type === 'node') {
                if (!this.connectionStartNode) {
                    // First node in connection
                    this.connectionStartNode = item.id;
                    this.canvas.style.cursor = 'crosshair';
                } else if (item.id !== this.connectionStartNode) {
                    // Second node in connection, different from the first
                    this.addEdge(this.connectionStartNode, item.id);
                    // Reset for next connection
                    this.connectionStartNode = null;
                    this.canvas.style.cursor = 'default';
                }
            }
        } else if (this.mode === 'delete') {
            if (item) {
                this.deleteItem(item);
            }
        }
    }
    
    /**
     * Handles mouse move events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseMove(e) {
        // Store mouse position for connection drawing
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        const { x, y } = this.viewportToCanvas(e.clientX, e.clientY);
        // Handle node dragging
        if (this.isDragging && this.selectedItem && this.selectedItem.type === 'node') {
            const node = this.nodes.find(node => node.id === this.selectedItem.id);
            if (node) {
                const dx = x - this.startX;
                const dy = y - this.startY;
                
                node.x += dx;
                node.y += dy;
                this.selectedItem.x = node.x;
                this.selectedItem.y = node.y;
                
                this.startX = x;
                this.startY = y;
                
                if (this.onFlowchartChange) {
                    this.onFlowchartChange();
                }
            }
        }
        // Handle node resizing
        else if (this.isResizing && this.selectedItem && this.selectedItem.type === 'node') {
            const node = this.nodes.find(node => node.id === this.selectedItem.id);
            if (node) {
                const dx = x - this.startX;
                const dy = y - this.startY;
                
                // Update node dimensions based on resize direction
                switch (this.resizeDirection) {
                    case 'nw':
                        node.width = Math.max(50, node.width - dx);
                        node.height = Math.max(30, node.height - dy);
                        node.x += dx / 2;
                        node.y += dy / 2;
                        break;
                    case 'ne':
                        node.width = Math.max(50, node.width + dx);
                        node.height = Math.max(30, node.height - dy);
                        node.x += dx / 2;
                        node.y += dy / 2;
                        break;
                    case 'se':
                        node.width = Math.max(50, node.width + dx);
                        node.height = Math.max(30, node.height + dy);
                        node.x += dx / 2;
                        node.y += dy / 2;
                        break;
                    case 'sw':
                        node.width = Math.max(50, node.width - dx);
                        node.height = Math.max(30, node.height + dy);
                        node.x += dx / 2;
                        node.y += dy / 2;
                        break;
                }
                
                // Update the selected item too
                this.selectedItem.x = node.x;
                this.selectedItem.y = node.y;
                this.selectedItem.width = node.width;
                this.selectedItem.height = node.height;
                
                this.startX = x;
                this.startY = y;
                
                if (this.onFlowchartChange) {
                    this.onFlowchartChange();
                }
            }
        }
        // Handle canvas panning
        else if (this.isPanning) {
            const dx = x - this.startX;
            const dy = y - this.startY;
            
            this.offsetX += dx;
            this.offsetY += dy;
            
            this.startX = x - dx;
            this.startY = y - dy;
        } 
        // Handle hover effects and pending connections
        else {
            const hoveredItem = this.getItemAtPosition(x, y);
            this.hoveredItem = hoveredItem;
            
            if (this.mode === 'connect' && this.connectionStartNode) {
                this.canvas.style.cursor = hoveredItem && hoveredItem.type === 'node' ? 'crosshair' : 'not-allowed';
            } else if (this.mode === 'delete') {
                this.canvas.style.cursor = hoveredItem ? 'no-drop' : 'default';
            } else {
                if (hoveredItem && hoveredItem.type === 'resize-handle') {
                    // Set appropriate cursor for resize handles
                    switch (hoveredItem.position) {
                        case 'nw': case 'se': this.canvas.style.cursor = 'nwse-resize'; break;
                        case 'ne': case 'sw': this.canvas.style.cursor = 'nesw-resize'; break;
                    }
                } else {
                    this.canvas.style.cursor = hoveredItem ? 'pointer' : 'grab';
                }
            }
        }
    }
    
    /**
     * Handles mouse up events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseUp(e) {
        // Handle connection creation
        if (this.mode === 'connect' && this.connectionStartNode && this.hoveredItem && 
            this.hoveredItem.type === 'node' && this.hoveredItem.id !== this.connectionStartNode) {
            this.addEdge(this.connectionStartNode, this.hoveredItem.id);
        }
        
        // Reset states
        this.isDragging = false;
        this.isPanning = false;
        this.isResizing = false;
        this.resizeDirection = null;
        this.canvas.style.cursor = 'default';
        
        if (this.mode !== 'connect') {
            this.connectionStartNode = null;
        }
    }
    
    /**
     * Handles wheel events for zooming
     * @param {WheelEvent} e - The wheel event
     */
    handleWheel(e) {
        e.preventDefault();
        
        const { x, y } = this.viewportToCanvas(e.clientX, e.clientY);
        
        // Zoom in or out
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        this.scale *= delta;
        
        // Adjust offset to zoom towards mouse position
        this.offsetX = x - (x - this.offsetX) * delta;
        this.offsetY = y - (y - this.offsetY) * delta;
    }
    
    /**
     * Handles touch start events
     * @param {TouchEvent} e - The touch event
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }
    
    /**
     * Handles touch move events
     * @param {TouchEvent} e - The touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }
    
    /**
     * Handles touch end events
     * @param {TouchEvent} e - The touch event
     */
    handleTouchEnd(e) {
        this.handleMouseUp(e);
    }
}
