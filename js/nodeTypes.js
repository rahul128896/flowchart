/**
 * NodeTypes - Defines different types of flowchart nodes
 * Each node type has specific rendering and interaction behavior
 */
const NodeTypes = {
    // Start node (oval shape)
    start: {
        color: '#2ecc71',
        defaultWidth: 100,
        defaultHeight: 50,
        
        // Draws the start node shape
        draw(ctx, x, y, width, height) {
            ctx.beginPath();
            ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        },
        
        // Checks if a point is inside the shape
        containsPoint(node, x, y) {
            const dx = (x - node.x) / (node.width / 2);
            const dy = (y - node.y) / (node.height / 2);
            return (dx * dx + dy * dy) <= 1;
        },
        
        // Gets the point where a connection should attach to this node
        getConnectionPoint(node, targetNode) {
            const angle = Math.atan2(targetNode.y - node.y, targetNode.x - node.x);
            return {
                x: node.x + (node.width / 2) * Math.cos(angle),
                y: node.y + (node.height / 2) * Math.sin(angle)
            };
        }
    },
    
    // Process node (rectangle shape)
    process: {
        color: '#3498db',
        defaultWidth: 120,
        defaultHeight: 60,
        
        // Draws the process node shape
        draw(ctx, x, y, width, height) {
            ctx.beginPath();
            ctx.rect(x - width / 2, y - height / 2, width, height);
            ctx.fill();
            ctx.stroke();
        },
        
        // Checks if a point is inside the shape
        containsPoint(node, x, y) {
            return Math.abs(x - node.x) <= node.width / 2 && 
                   Math.abs(y - node.y) <= node.height / 2;
        },
        
        // Gets the point where a connection should attach to this node
        getConnectionPoint(node, targetNode) {
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            
            // Calculate the angle between centers
            const dx = targetNode.x - node.x;
            const dy = targetNode.y - node.y;
            const angle = Math.atan2(dy, dx);
            
            // Determine which edge to connect to based on angle
            if (Math.abs(Math.tan(angle)) > node.height / node.width) {
                // Connect to top or bottom
                const y = dy > 0 ? node.y + halfHeight : node.y - halfHeight;
                const x = node.x + halfHeight * Math.tan(Math.PI / 2 - angle) * (dy > 0 ? 1 : -1);
                return { x, y };
            } else {
                // Connect to left or right
                const x = dx > 0 ? node.x + halfWidth : node.x - halfWidth;
                const y = node.y + halfWidth * Math.tan(angle) * (dx > 0 ? 1 : -1);
                return { x, y };
            }
        }
    },
    
    // Decision node (diamond shape)
    decision: {
        color: '#f39c12',
        defaultWidth: 120,
        defaultHeight: 80,
        
        // Draws the decision node shape
        draw(ctx, x, y, width, height) {
            ctx.beginPath();
            ctx.moveTo(x, y - height / 2);
            ctx.lineTo(x + width / 2, y);
            ctx.lineTo(x, y + height / 2);
            ctx.lineTo(x - width / 2, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        },
        
        // Checks if a point is inside the shape
        containsPoint(node, x, y) {
            const dx = Math.abs(x - node.x) / (node.width / 2);
            const dy = Math.abs(y - node.y) / (node.height / 2);
            return dx + dy <= 1;
        },
        
        // Gets the point where a connection should attach to this node
        getConnectionPoint(node, targetNode) {
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            
            // Calculate the angle between centers
            const dx = targetNode.x - node.x;
            const dy = targetNode.y - node.y;
            const angle = Math.atan2(dy, dx);
            
            // The diamond has 4 corners to connect to
            const tanAngle = Math.abs(Math.tan(angle));
            const tanRatio = halfHeight / halfWidth;
            
            let x, y;
            
            if (tanAngle < tanRatio) {
                // Connect to right or left
                x = dx > 0 ? node.x + halfWidth : node.x - halfWidth;
                y = node.y + (dy > 0 ? 1 : -1) * halfHeight * (1 - Math.abs(dx) / halfWidth);
            } else {
                // Connect to bottom or top
                y = dy > 0 ? node.y + halfHeight : node.y - halfHeight;
                x = node.x + (dx > 0 ? 1 : -1) * halfWidth * (1 - Math.abs(dy) / halfHeight);
            }
            
            return { x, y };
        }
    },
    
    // Input/Output node (parallelogram)
    input: {
        color: '#9b59b6',
        defaultWidth: 120,
        defaultHeight: 60,
        
        // Draws the input/output node shape
        draw(ctx, x, y, width, height) {
            const offset = width / 4;
            
            ctx.beginPath();
            ctx.moveTo(x - width / 2 + offset, y - height / 2);
            ctx.lineTo(x + width / 2 + offset, y - height / 2);
            ctx.lineTo(x + width / 2 - offset, y + height / 2);
            ctx.lineTo(x - width / 2 - offset, y + height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        },
        
        // Checks if a point is inside the shape
        containsPoint(node, x, y) {
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            const offset = node.width / 4;
            
            // Check if the point is within the bounding rectangle first
            if (Math.abs(y - node.y) > halfHeight) return false;
            
            // Calculate the x-coordinate of the parallelogram at the given y
            const relY = (y - node.y) / halfHeight;
            const leftX = node.x - halfWidth - offset * relY;
            const rightX = node.x + halfWidth - offset * relY;
            
            return x >= leftX && x <= rightX;
        },
        
        // Gets the point where a connection should attach to this node
        getConnectionPoint(node, targetNode) {
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            const offset = node.width / 4;
            
            // Calculate the angle between centers
            const dx = targetNode.x - node.x;
            const dy = targetNode.y - node.y;
            const angle = Math.atan2(dy, dx);
            
            // Determine which edge to connect to based on angle
            if (Math.abs(angle) > Math.PI * 3/4 || Math.abs(angle) < Math.PI / 4) {
                // Connect to left or right (with offset)
                const isRight = Math.abs(angle) < Math.PI / 4;
                const x = isRight ? node.x + halfWidth - offset : node.x - halfWidth - offset;
                const relY = Math.tan(angle) * halfWidth;
                const y = node.y + (isRight ? relY : -relY);
                return { x, y };
            } else {
                // Connect to top or bottom
                const isBottom = angle > 0;
                const y = isBottom ? node.y + halfHeight : node.y - halfHeight;
                const relX = halfHeight / Math.tan(isBottom ? angle : angle + Math.PI);
                const x = node.x + relX;
                return { x, y };
            }
        }
    },
    
    // End node (oval shape with different color)
    end: {
        color: '#e74c3c',
        defaultWidth: 100,
        defaultHeight: 50,
        
        // Draws the end node shape (same as start)
        draw(ctx, x, y, width, height) {
            ctx.beginPath();
            ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        },
        
        // Checks if a point is inside the shape (same as start)
        containsPoint(node, x, y) {
            const dx = (x - node.x) / (node.width / 2);
            const dy = (y - node.y) / (node.height / 2);
            return (dx * dx + dy * dy) <= 1;
        },
        
        // Gets the point where a connection should attach to this node (same as start)
        getConnectionPoint(node, targetNode) {
            const angle = Math.atan2(targetNode.y - node.y, targetNode.x - node.x);
            return {
                x: node.x + (node.width / 2) * Math.cos(angle),
                y: node.y + (node.height / 2) * Math.sin(angle)
            };
        }
    }
};
