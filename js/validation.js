/**
 * ValidationEngine - Validates flowcharts and provides feedback
 */
class ValidationEngine {
    constructor(canvasManager, messagesContainer) {
        this.canvasManager = canvasManager;
        this.messagesContainer = messagesContainer;
        this.messages = [];
    }
    
    /**
     * Validates the current flowchart
     * Checks for:
     * - Missing start/end nodes
     * - Unconnected nodes
     * - Cycles (if not desired in certain nodes)
     */
    validateFlowchart() {
        this.clearMessages();
        
        const nodes = this.canvasManager.nodes;
        const edges = this.canvasManager.edges;
        
        // Check if there are any nodes
        if (nodes.length === 0) {
            return; // No nodes to validate
        }
        
        // Check for start node
        const startNodes = nodes.filter(node => node.nodeType === 'start');
        if (startNodes.length === 0) {
            this.addMessage('No start node found. Add a start node to your flowchart.');
        } else if (startNodes.length > 1) {
            this.addMessage('Multiple start nodes found. A flowchart should have only one start node.');
        }
        
        // Check for end node
        const endNodes = nodes.filter(node => node.nodeType === 'end');
        if (endNodes.length === 0) {
            this.addMessage('No end node found. Add an end node to your flowchart.');
        }
        
        // Check for unconnected nodes
        this.checkUnconnectedNodes(nodes, edges);
        
        // Check for cycles in the flowchart
        this.checkForCycles(nodes, edges);
        
        // Check for decision nodes without multiple outputs
        this.checkDecisionNodes(nodes, edges);
    }
    
    /**
     * Checks for nodes that have no connections
     * @param {Array} nodes - List of nodes
     * @param {Array} edges - List of edges
     */
    checkUnconnectedNodes(nodes, edges) {
        nodes.forEach(node => {
            // Skip checking end nodes for outgoing connections
            const isEndNode = node.nodeType === 'end';
            
            // Skip checking start nodes for incoming connections
            const isStartNode = node.nodeType === 'start';
            
            // Check for incoming connections
            const hasIncoming = isStartNode || edges.some(edge => edge.targetId === node.id);
            
            // Check for outgoing connections
            const hasOutgoing = isEndNode || edges.some(edge => edge.sourceId === node.id);
            
            if (!hasIncoming && !hasOutgoing) {
                this.addMessage(`Node "${node.text}" is completely disconnected.`);
            } else if (!hasIncoming) {
                this.addMessage(`Node "${node.text}" has no incoming connections.`);
            } else if (!hasOutgoing && !isEndNode) {
                this.addMessage(`Node "${node.text}" has no outgoing connections.`);
            }
        });
    }
    
    /**
     * Checks for cycles in the flowchart
     * @param {Array} nodes - List of nodes
     * @param {Array} edges - List of edges
     */
    checkForCycles(nodes, edges) {
        // Build adjacency list for the graph
        const graph = {};
        nodes.forEach(node => {
            graph[node.id] = [];
        });
        
        edges.forEach(edge => {
            if (graph[edge.sourceId]) {
                graph[edge.sourceId].push(edge.targetId);
            }
        });
        
        // DFS to detect cycles
        const visited = {};
        const recStack = {};
        let cycleFound = false;
        
        const dfs = (nodeId, path = []) => {
            // Mark current node as visited and add to recursion stack
            visited[nodeId] = true;
            recStack[nodeId] = true;
            path.push(nodeId);
            
            // Visit all adjacent vertices
            for (const neighbor of graph[nodeId]) {
                // If not visited, recurse
                if (!visited[neighbor]) {
                    if (dfs(neighbor, [...path])) {
                        return true;
                    }
                } 
                // If the neighbor is in recursion stack, we found a cycle
                else if (recStack[neighbor]) {
                    // Find the node in the cycle for better reporting
                    const cycleStart = path.indexOf(neighbor);
                    if (cycleStart !== -1) {
                        const cycle = path.slice(cycleStart).map(id => {
                            const node = nodes.find(n => n.id === id);
                            return node ? node.text : id;
                        });
                        
                        cycle.push(cycle[0]); // Add the start node again to complete the cycle
                        this.addMessage(`Cycle detected: ${cycle.join(' → ')}`);
                    } else {
                        this.addMessage('Cycle detected in the flowchart.');
                    }
                    cycleFound = true;
                    return true;
                }
            }
            
            // Remove node from recursion stack
            recStack[nodeId] = false;
            return false;
        };
        
        // Get start nodes again in this scope
        const localStartNodes = nodes.filter(node => node.nodeType === 'start');
        
        // Call DFS for each node to ensure we detect all cycles
        for (const startNode of localStartNodes) {
            if (!visited[startNode.id]) {
                dfs(startNode.id);
            }
        }
        
        // If no start nodes or we still have unvisited nodes, try other nodes
        if (localStartNodes.length === 0 || Object.keys(visited).length < nodes.length) {
            for (const node of nodes) {
                if (!visited[node.id]) {
                    dfs(node.id);
                }
            }
        }
        
        return cycleFound;
    }
    
    /**
     * Checks that decision nodes have multiple outgoing connections
     * @param {Array} nodes - List of nodes
     * @param {Array} edges - List of edges
     */
    checkDecisionNodes(nodes, edges) {
        const decisionNodes = nodes.filter(node => node.nodeType === 'decision');
        
        decisionNodes.forEach(node => {
            // Count outgoing connections
            const outgoingCount = edges.filter(edge => edge.sourceId === node.id).length;
            
            if (outgoingCount < 2) {
                this.addMessage(`Decision node "${node.text}" should have at least 2 outgoing paths.`);
            }
            
            // Check if outgoing connections have labels
            const outgoingEdges = edges.filter(edge => edge.sourceId === node.id);
            const unlabeledEdges = outgoingEdges.filter(edge => !edge.label);
            
            if (outgoingCount >= 2 && unlabeledEdges.length > 0) {
                this.addMessage(`Decision node "${node.text}" has ${unlabeledEdges.length} unlabeled outgoing paths.`);
            }
        });
    }
    
    /**
     * Adds a validation message to be displayed
     * @param {string} message - The message text
     */
    addMessage(message) {
        this.messages.push(message);
        this.renderMessages();
    }
    
    /**
     * Clears all validation messages
     */
    clearMessages() {
        this.messages = [];
        this.messagesContainer.innerHTML = '';
    }
    
    /**
     * Renders all validation messages
     */
    renderMessages() {
        this.messagesContainer.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = 'validation-message';
            messageElement.textContent = message;
            
            this.messagesContainer.appendChild(messageElement);
            
            // Auto-remove message after some time
            setTimeout(() => {
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    if (messageElement.parentNode === this.messagesContainer) {
                        this.messagesContainer.removeChild(messageElement);
                    }
                }, 300);
            }, 5000);
        });
    }
}
