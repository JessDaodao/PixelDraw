import {
    canvas,
    socket,
    state
} from './config.js';
import { requestRender } from './canvas.js';

function applyInertia() {
    const fixedScale = state.scale;
    const boardWidth = state.BOARD_WIDTH * fixedScale;
    const boardHeight = state.BOARD_HEIGHT * fixedScale;
    const maxOffsetX = window.innerWidth * 0.3;
    const maxOffsetY = window.innerHeight * 0.3;
    const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
    const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
    
    const nextOffsetX = state.offsetX + state.velocityX;
    const nextOffsetY = state.offsetY + state.velocityY;
    
    let hitBoundaryX = false;
    let hitBoundaryY = false;
    
    if (boardWidth < window.innerWidth) {
        if (nextOffsetX !== (window.innerWidth - boardWidth) / 2) {
            hitBoundaryX = true;
            state.offsetX = (window.innerWidth - boardWidth) / 2;
        }
    } else {
        if (nextOffsetX > maxOffsetX) {
            hitBoundaryX = true;
            state.offsetX = maxOffsetX;
        } else if (nextOffsetX < minOffsetX) {
            hitBoundaryX = true;
            state.offsetX = minOffsetX;
        }
    }
    
    if (boardHeight < window.innerHeight) {
        if (nextOffsetY !== (window.innerHeight - boardHeight) / 2) {
            hitBoundaryY = true;
            state.offsetY = (window.innerHeight - boardHeight) / 2;
        }
    } else {
        if (nextOffsetY > maxOffsetY) {
            hitBoundaryY = true;
            state.offsetY = maxOffsetY;
        } else if (nextOffsetY < minOffsetY) {
            hitBoundaryY = true;
            state.offsetY = minOffsetY;
        }
    }
    
    if (!hitBoundaryX) {
        state.offsetX = nextOffsetX;
    }
    if (!hitBoundaryY) {
        state.offsetY = nextOffsetY;
    }
    
    if (hitBoundaryX) {
        state.velocityX = 0;
    }
    if (hitBoundaryY) {
        state.velocityY = 0;
    }
    
    if (Math.abs(state.velocityX) < state.minVelocity && Math.abs(state.velocityY) < state.minVelocity) {
        state.inertiaAnimationId = null;
        snapToBounds();
        return;
    }
    
    state.velocityX *= state.friction;
    state.velocityY *= state.friction;
    requestRender();
    state.inertiaAnimationId = requestAnimationFrame(applyInertia);
}

function snapToBounds() {
    const fixedScale = state.scale;
    const boardWidth = state.BOARD_WIDTH * fixedScale;
    const boardHeight = state.BOARD_HEIGHT * fixedScale;
    const maxOffsetX = window.innerWidth * 0.3;
    const maxOffsetY = window.innerHeight * 0.3;
    const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
    const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
    let targetOffsetX = state.offsetX;
    let targetOffsetY = state.offsetY;
    let needsSnap = false;
    if (boardWidth < window.innerWidth) {
        const centerX = (window.innerWidth - boardWidth) / 2;
        if (state.offsetX !== centerX) {
            targetOffsetX = centerX;
            needsSnap = true;
        }
    } else {
        if (state.offsetX > maxOffsetX) {
            targetOffsetX = maxOffsetX;
            needsSnap = true;
        } else if (state.offsetX < minOffsetX) {
            targetOffsetX = minOffsetX;
            needsSnap = true;
        }
    }
    if (boardHeight < window.innerHeight) {
        const centerY = (window.innerHeight - boardHeight) / 2;
        if (state.offsetY !== centerY) {
            targetOffsetY = centerY;
            needsSnap = true;
        }
    } else {
        if (state.offsetY > maxOffsetY) {
            targetOffsetY = maxOffsetY;
            needsSnap = true;
        } else if (state.offsetY < minOffsetY) {
            targetOffsetY = minOffsetY;
            needsSnap = true;
        }
    }
    if (needsSnap) {
        if (state.inertiaAnimationId) {
            cancelAnimationFrame(state.inertiaAnimationId);
            state.inertiaAnimationId = null;
        }
        const startX = state.offsetX;
        const startY = state.offsetY;
        const startTime = performance.now();
        const duration = 300;
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            state.offsetX = startX + (targetOffsetX - startX) * easedProgress;
            state.offsetY = startY + (targetOffsetY - startY) * easedProgress;
            requestRender();
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                state.isAnimating = false;
            }
        }
        state.isAnimating = true;
        requestAnimationFrame(animate);
    }
}

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    };
}

function initViewport() {
    canvas.addEventListener('wheel', (e) => {
        if (state.isDragging) {
            return;
        }
        e.preventDefault();
        const zoomSpeed = 0.005;
        const rawDelta = -e.deltaY;
        const zoomFactor = Math.exp(rawDelta * zoomSpeed);
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const currentScale = state.scale;
        const currentOffsetX = state.offsetX;
        const currentOffsetY = state.offsetY;
        let newScale = currentScale * zoomFactor;
        newScale = Math.min(Math.max(newScale, state.MIN_ZOOM), state.MAX_ZOOM);
        if (newScale === currentScale) {
            return;
        }
        const zoomRatio = newScale / currentScale;
        const newOffsetX = mouseX - (mouseX - currentOffsetX) * zoomRatio;
        const newOffsetY = mouseY - (mouseY - currentOffsetY) * zoomRatio;
        if (state.zoomAnimationId) {
            const elapsed = performance.now() - state.zoomStartTime;
            const progress = Math.min(elapsed / 150, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 2);
            state.scale = state.zoomStartScale + (state.zoomTargetScale - state.zoomStartScale) * easedProgress;
            state.offsetX = state.zoomStartOffsetX + (state.zoomTargetOffsetX - state.zoomStartOffsetX) * easedProgress;
            state.offsetY = state.zoomStartOffsetY + (state.zoomTargetOffsetY - state.zoomStartOffsetY) * easedProgress;
            state.zoomStartScale = state.scale;
            state.zoomStartOffsetX = state.offsetX;
            state.zoomStartOffsetY = state.offsetY;
        } else {
            state.zoomStartScale = currentScale;
            state.zoomStartOffsetX = currentOffsetX;
            state.zoomStartOffsetY = currentOffsetY;
        }
        state.zoomTargetScale = newScale;
        state.zoomTargetOffsetX = newOffsetX;
        state.zoomTargetOffsetY = newOffsetY;
        state.zoomStartTime = performance.now();
        function animate() {
            const elapsed = performance.now() - state.zoomStartTime;
            const duration = 150;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 2);
            state.scale = state.zoomStartScale + (state.zoomTargetScale - state.zoomStartScale) * easedProgress;
            state.offsetX = state.zoomStartOffsetX + (state.zoomTargetOffsetX - state.zoomStartOffsetX) * easedProgress;
            state.offsetY = state.zoomStartOffsetY + (state.zoomTargetOffsetY - state.zoomStartOffsetY) * easedProgress;
            requestRender();
            if (progress < 1) {
                state.zoomAnimationId = requestAnimationFrame(animate);
            } else {
                state.zoomAnimationId = null;
                snapToBounds();
            }
        }
        if (!state.zoomAnimationId) {
            state.zoomAnimationId = requestAnimationFrame(animate);
        }
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.isAdminMode && state.currentTool === 'brush') {
                state.isDrawing = true;
                const worldX = Math.floor((e.clientX - state.offsetX) / state.scale);
                const worldY = Math.floor((e.clientY - state.offsetY) / state.scale);
                if (worldX >= 0 && worldX < state.BOARD_WIDTH && worldY >= 0 && worldY < state.BOARD_HEIGHT) {
                    const drawColor = state.isEraserSelected ? '#FFFFFF' : state.selectedColor;
                    if (state.board[worldY] && state.board[worldY][worldX] !== drawColor) {
                        socket.emit('draw-pixel', { x: worldX, y: worldY, color: drawColor });
                    }
                }
            } else {
                const worldX = Math.floor((e.clientX - state.offsetX) / state.scale);
                const worldY = Math.floor((e.clientY - state.offsetY) / state.scale);
                if (worldX >= 0 && worldX < state.BOARD_WIDTH && worldY >= 0 && worldY < state.BOARD_HEIGHT) {
                    const drawColor = state.isEraserSelected ? '#FFFFFF' : state.selectedColor;
                    if (state.board[worldY] && state.board[worldY][worldX] === drawColor) {
                        return;
                    }
                    socket.emit('draw-pixel', { x: worldX, y: worldY, color: drawColor });
                }
            }
        } else if (e.button === 1) {
            state.isDragging = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.velocityX = 0;
            state.velocityY = 0;
            state.lastMoveTime = performance.now();
            if (state.inertiaAnimationId) {
                cancelAnimationFrame(state.inertiaAnimationId);
                state.inertiaAnimationId = null;
            }
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (state.isDrawing && state.isAdminMode && state.currentTool === 'brush') {
            const worldX = Math.floor((e.clientX - state.offsetX) / state.scale);
            const worldY = Math.floor((e.clientY - state.offsetY) / state.scale);
            if (worldX >= 0 && worldX < state.BOARD_WIDTH && worldY >= 0 && worldY < state.BOARD_HEIGHT) {
                const drawColor = state.isEraserSelected ? '#FFFFFF' : state.selectedColor;
                if (state.board[worldY] && state.board[worldY][worldX] !== drawColor) {
                    socket.emit('draw-pixel', { x: worldX, y: worldY, color: drawColor });
                }
            }
        } else if (state.isDragging) {
            const currentTime = performance.now();
            const deltaTime = currentTime - state.lastMoveTime;
            const deltaX = e.clientX - state.lastMousePos.x;
            const deltaY = e.clientY - state.lastMousePos.y;
            
            const fixedScale = state.scale;
            const boardWidth = state.BOARD_WIDTH * fixedScale;
            const boardHeight = state.BOARD_HEIGHT * fixedScale;
            const maxOffsetX = window.innerWidth * 0.3;
            const maxOffsetY = window.innerHeight * 0.3;
            const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
            const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
            
            let elasticFactorX = 1;
            let elasticFactorY = 1;
            const elasticStrength = 0.15;
            
            if (boardWidth < window.innerWidth) {
                const centerX = (window.innerWidth - boardWidth) / 2;
                const nextOffsetX = state.offsetX + deltaX;
                if (nextOffsetX > centerX) {
                    const excess = nextOffsetX - centerX;
                    elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                } else if (nextOffsetX < centerX) {
                    const excess = centerX - nextOffsetX;
                    elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                }
            } else {
                const nextOffsetX = state.offsetX + deltaX;
                if (nextOffsetX > maxOffsetX) {
                    const excess = nextOffsetX - maxOffsetX;
                    elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                } else if (nextOffsetX < minOffsetX) {
                    const excess = minOffsetX - nextOffsetX;
                    elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                }
            }
            
            if (boardHeight < window.innerHeight) {
                const centerY = (window.innerHeight - boardHeight) / 2;
                const nextOffsetY = state.offsetY + deltaY;
                if (nextOffsetY > centerY) {
                    const excess = nextOffsetY - centerY;
                    elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                } else if (nextOffsetY < centerY) {
                    const excess = centerY - nextOffsetY;
                    elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                }
            } else {
                const nextOffsetY = state.offsetY + deltaY;
                if (nextOffsetY > maxOffsetY) {
                    const excess = nextOffsetY - maxOffsetY;
                    elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                } else if (nextOffsetY < minOffsetY) {
                    const excess = minOffsetY - nextOffsetY;
                    elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                }
            }
            
            state.offsetX += deltaX * elasticFactorX;
            state.offsetY += deltaY * elasticFactorY;
            
            if (deltaTime > 0) {
                state.velocityX = deltaX / deltaTime * 16;
                state.velocityY = deltaY / deltaTime * 16;
            }
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.lastMoveTime = currentTime;
            requestRender();
        } else {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                const worldX = Math.floor((e.clientX - state.offsetX) / state.scale);
                const worldY = Math.floor((e.clientY - state.offsetY) / state.scale);
                if (worldX >= 0 && worldX < state.BOARD_WIDTH && worldY >= 0 && worldY < state.BOARD_HEIGHT) {
                    state.hoverPixel = { x: worldX, y: worldY };
                } else {
                    state.hoverPixel = null;
                }
                requestRender();
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isDrawing) {
            state.isDrawing = false;
        }
        if (state.isDragging) {
            state.isDragging = false;
            
            const fixedScale = state.scale;
            const boardWidth = state.BOARD_WIDTH * fixedScale;
            const boardHeight = state.BOARD_HEIGHT * fixedScale;
            const maxOffsetX = window.innerWidth * 0.3;
            const maxOffsetY = window.innerHeight * 0.3;
            const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
            const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
            
            let outOfBounds = false;
            if (boardWidth < window.innerWidth) {
                if (state.offsetX !== (window.innerWidth - boardWidth) / 2) {
                    outOfBounds = true;
                }
            } else {
                if (state.offsetX > maxOffsetX || state.offsetX < minOffsetX) {
                    outOfBounds = true;
                }
            }
            if (boardHeight < window.innerHeight) {
                if (state.offsetY !== (window.innerHeight - boardHeight) / 2) {
                    outOfBounds = true;
                }
            } else {
                if (state.offsetY > maxOffsetY || state.offsetY < minOffsetY) {
                    outOfBounds = true;
                }
            }
            
            if (outOfBounds) {
                snapToBounds();
            } else if (Math.abs(state.velocityX) >= state.minVelocity || Math.abs(state.velocityY) >= state.minVelocity) {
                state.inertiaAnimationId = requestAnimationFrame(applyInertia);
            }
        }
    });

    canvas.addEventListener('mouseleave', () => {
        state.hoverPixel = null;
        requestRender();
    });

    canvas.oncontextmenu = (e) => e.preventDefault();

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            state.isPinching = true;
            state.wasPinching = true;
            state.initialPinchDistance = getTouchDistance(e.touches);
            state.initialScale = state.scale;
            state.initialTouchCenter = getTouchCenter(e.touches);
            state.initialOffset = { x: state.offsetX, y: state.offsetY };
            state.velocityX = 0;
            state.velocityY = 0;
            if (state.inertiaAnimationId) {
                cancelAnimationFrame(state.inertiaAnimationId);
                state.inertiaAnimationId = null;
            }
        } else if (e.touches.length === 1) {
            state.touchStartTime = Date.now();
            state.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            state.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            state.lastMoveTime = performance.now();
            state.velocityX = 0;
            state.velocityY = 0;
            state.isTouchDragging = false;
            if (state.inertiaAnimationId) {
                cancelAnimationFrame(state.inertiaAnimationId);
                state.inertiaAnimationId = null;
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && state.isPinching) {
            const currentDistance = getTouchDistance(e.touches);
            const currentCenter = getTouchCenter(e.touches);
            if (state.initialPinchDistance > 0) {
                const zoomFactor = currentDistance / state.initialPinchDistance;
                let newScale = state.initialScale * zoomFactor;
                newScale = Math.min(Math.max(newScale, state.MIN_ZOOM), state.MAX_ZOOM);
                const scaleChange = newScale / state.initialScale;
                state.offsetX = currentCenter.x - (state.initialTouchCenter.x - state.initialOffset.x) * scaleChange;
                state.offsetY = currentCenter.y - (state.initialTouchCenter.y - state.initialOffset.y) * scaleChange;
                state.scale = newScale;
                requestRender();
            }
        } else if (e.touches.length === 1) {
            const moveDistance = Math.sqrt(
                Math.pow(e.touches[0].clientX - state.touchStartPos.x, 2) +
                Math.pow(e.touches[0].clientY - state.touchStartPos.y, 2)
            );
            if (moveDistance > 10) {
                state.isTouchDragging = true;
                const currentTime = performance.now();
                const deltaTime = currentTime - state.lastMoveTime;
                const dx = e.touches[0].clientX - state.lastTouchPos.x;
                const dy = e.touches[0].clientY - state.lastTouchPos.y;
                
                const fixedScale = state.scale;
                const boardWidth = state.BOARD_WIDTH * fixedScale;
                const boardHeight = state.BOARD_HEIGHT * fixedScale;
                const maxOffsetX = window.innerWidth * 0.3;
                const maxOffsetY = window.innerHeight * 0.3;
                const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
                const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
                
                let elasticFactorX = 1;
                let elasticFactorY = 1;
                const elasticStrength = 0.15;
                
                if (boardWidth < window.innerWidth) {
                    const centerX = (window.innerWidth - boardWidth) / 2;
                    const nextOffsetX = state.offsetX + dx;
                    if (nextOffsetX > centerX) {
                        const excess = nextOffsetX - centerX;
                        elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                    } else if (nextOffsetX < centerX) {
                        const excess = centerX - nextOffsetX;
                        elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                    }
                } else {
                    const nextOffsetX = state.offsetX + dx;
                    if (nextOffsetX > maxOffsetX) {
                        const excess = nextOffsetX - maxOffsetX;
                        elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                    } else if (nextOffsetX < minOffsetX) {
                        const excess = minOffsetX - nextOffsetX;
                        elasticFactorX = 1 - Math.min(excess * elasticStrength, 0.8);
                    }
                }
                
                if (boardHeight < window.innerHeight) {
                    const centerY = (window.innerHeight - boardHeight) / 2;
                    const nextOffsetY = state.offsetY + dy;
                    if (nextOffsetY > centerY) {
                        const excess = nextOffsetY - centerY;
                        elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                    } else if (nextOffsetY < centerY) {
                        const excess = centerY - nextOffsetY;
                        elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                    }
                } else {
                    const nextOffsetY = state.offsetY + dy;
                    if (nextOffsetY > maxOffsetY) {
                        const excess = nextOffsetY - maxOffsetY;
                        elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                    } else if (nextOffsetY < minOffsetY) {
                        const excess = minOffsetY - nextOffsetY;
                        elasticFactorY = 1 - Math.min(excess * elasticStrength, 0.8);
                    }
                }
                
                state.offsetX += dx * elasticFactorX;
                state.offsetY += dy * elasticFactorY;
                
                if (deltaTime > 0) {
                    state.velocityX = dx / deltaTime * 16;
                    state.velocityY = dy / deltaTime * 16;
                }
                state.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                state.lastMoveTime = currentTime;
                requestRender();
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (e.touches.length === 0) {
            if (state.isPinching) {
                state.isPinching = false;
                state.initialPinchDistance = 0;
                snapToBounds();
            } else if (!state.wasPinching && !state.isTouchDragging && Date.now() - state.touchStartTime < 300) {
                if (state.isAdminMode && state.currentTool === 'brush') {
                    const worldX = Math.floor((state.touchStartPos.x - state.offsetX) / state.scale);
                    const worldY = Math.floor((state.touchStartPos.y - state.offsetY) / state.scale);
                    if (worldX >= 0 && worldX < state.BOARD_WIDTH && worldY >= 0 && worldY < state.BOARD_HEIGHT) {
                        const drawColor = state.isEraserSelected ? '#FFFFFF' : state.selectedColor;
                        if (state.board[worldY] && state.board[worldY][worldX] !== drawColor) {
                            socket.emit('draw-pixel', { x: worldX, y: worldY, color: drawColor });
                        }
                    }
                } else {
                    const worldX = Math.floor((state.touchStartPos.x - state.offsetX) / state.scale);
                    const worldY = Math.floor((state.touchStartPos.y - state.offsetY) / state.scale);
                    if (worldX >= 0 && worldX < state.BOARD_WIDTH && worldY >= 0 && worldY < state.BOARD_HEIGHT) {
                        const drawColor = state.isEraserSelected ? '#FFFFFF' : state.selectedColor;
                        if (state.board[worldY] && state.board[worldY][worldX] === drawColor) {
                            return;
                        }
                        socket.emit('draw-pixel', { x: worldX, y: worldY, color: drawColor });
                    }
                }
            }
            if (state.isTouchDragging) {
                state.isTouchDragging = false;
                
                const fixedScale = state.scale;
                const boardWidth = state.BOARD_WIDTH * fixedScale;
                const boardHeight = state.BOARD_HEIGHT * fixedScale;
                const maxOffsetX = window.innerWidth * 0.3;
                const maxOffsetY = window.innerHeight * 0.3;
                const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
                const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
                
                let outOfBounds = false;
                if (boardWidth < window.innerWidth) {
                    if (state.offsetX !== (window.innerWidth - boardWidth) / 2) {
                        outOfBounds = true;
                    }
                } else {
                    if (state.offsetX > maxOffsetX || state.offsetX < minOffsetX) {
                        outOfBounds = true;
                    }
                }
                if (boardHeight < window.innerHeight) {
                    if (state.offsetY !== (window.innerHeight - boardHeight) / 2) {
                        outOfBounds = true;
                    }
                } else {
                    if (state.offsetY > maxOffsetY || state.offsetY < minOffsetY) {
                        outOfBounds = true;
                    }
                }
                
                if (outOfBounds) {
                    snapToBounds();
                } else if (Math.abs(state.velocityX) >= state.minVelocity || Math.abs(state.velocityY) >= state.minVelocity) {
                    state.inertiaAnimationId = requestAnimationFrame(applyInertia);
                }
            }
            state.wasPinching = false;
        } else if (e.touches.length === 1) {
            state.isPinching = false;
            state.initialPinchDistance = 0;
            state.touchStartTime = Date.now();
            state.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            state.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            state.isTouchDragging = false;
        }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        state.isPinching = false;
        state.initialPinchDistance = 0;
        if (state.isTouchDragging) {
            state.isTouchDragging = false;
            
            const fixedScale = state.scale;
            const boardWidth = state.BOARD_WIDTH * fixedScale;
            const boardHeight = state.BOARD_HEIGHT * fixedScale;
            const maxOffsetX = window.innerWidth * 0.3;
            const maxOffsetY = window.innerHeight * 0.3;
            const minOffsetX = window.innerWidth - boardWidth - maxOffsetX;
            const minOffsetY = window.innerHeight - boardHeight - maxOffsetY;
            
            let outOfBounds = false;
            if (boardWidth < window.innerWidth) {
                if (state.offsetX !== (window.innerWidth - boardWidth) / 2) {
                    outOfBounds = true;
                }
            } else {
                if (state.offsetX > maxOffsetX || state.offsetX < minOffsetX) {
                    outOfBounds = true;
                }
            }
            if (boardHeight < window.innerHeight) {
                if (state.offsetY !== (window.innerHeight - boardHeight) / 2) {
                    outOfBounds = true;
                }
            } else {
                if (state.offsetY > maxOffsetY || state.offsetY < minOffsetY) {
                    outOfBounds = true;
                }
            }
            
            if (outOfBounds) {
                snapToBounds();
            } else if (Math.abs(state.velocityX) >= state.minVelocity || Math.abs(state.velocityY) >= state.minVelocity) {
                state.inertiaAnimationId = requestAnimationFrame(applyInertia);
            }
        }
    }, { passive: false });
}

export { initViewport, applyInertia, snapToBounds, getTouchDistance, getTouchCenter };
