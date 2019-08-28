import {debounce} from 'lodash'

/**
 * A helper for selecting a number items by drawing a rectangle area around their HTML elements.
 * Limitations: 
 *  - the elements' container's `overflow-y` must not be 'auto' (instead overflow-y: scroll|hidden|visible)
 *  - the container must not scroll horizontally (overflow-x: hidden)
 *  - sizes of both container and selectable elements must not change during selection
 * 
 * @author Lennart Pegel
 * @link https://github.com/justlep/sample-commander  
 * @licence GPLv3
 */

const NON_REACTIVE_PROPS = Symbol();

const RECT_STATUS = {
    ACTIVE: { get isActive() { return true } },
    DONE: { get isDone() { return true } },
    CANCELLED: { get isCancelled() { return true } }
};

const AREA_STYLES = {
    display: 'none',
    background: '#829fb7',
    opacity: 0.3,
    position: 'fixed',
    overflow: 'hidden',
    top: 0,
    zIndex: 999,
};

const EMPTY_ARRAY = [];

export class RectSelectableItem {
    /**
     * @param {HTMLElement} elem
     * @param {string|number} itemId
     * @param {boolean} wasSelected - whether the item was already selected at the time of the RectSelectableItem's instantiation 
     */
    constructor(elem, itemId, wasSelected) {
        let rect = elem.getBoundingClientRect(),
            verticalScrollContainerOffset = elem.offsetParent.scrollTop;
        
        this.left = rect.left;
        this.right = rect.left + rect.width;
        this.top = rect.top + verticalScrollContainerOffset;
        this.bottom = rect.top + rect.height + verticalScrollContainerOffset;
        this.itemId = itemId;
        this.wasSelected = wasSelected;
        this.isSelected = wasSelected;
    }
}

export class RectSelector {
    
    static _createAreaElem() {
        let elem = document.createElement('div');
        elem.className = 'rectSelector__area';
        Object.assign(elem.style, AREA_STYLES);
        document.body.appendChild(elem);
        return elem;
    }
    
    constructor() {
        // (1) properties to be turned reactive by Vue when adding RectSelector to the SourcePanel's data
        /** @type {RECT_STATUS} */
        this.status = RECT_STATUS.DONE;
        this.isCtrlPressed = false;
        this.hasSelectableItems = false;
        this.hasChanged = 1;

        // (2) properties hidden from Vue's greediness...
        this[NON_REACTIVE_PROPS] = {
            onKey: e => {
                if (e.repeat) {
                    return;
                }
                if (e.keyCode === 27 && this.status.isActive) {
                    return this.setCancelled();
                }
                this.isCtrlPressed = e.ctrlKey;
                this.markChanged();
            },
            onMouseUp: () => this.setDone(),
            onMouseMove: e => this._onMouseMove(e),
            onContainerScroll: e => this._onMouseMove(e, false, true),
            areaElem: RectSelector._createAreaElem(),
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0,
            lastMouseX: 0,
            lastMouseY: 0,
            containerElem: null
        };
    }
    
    markChanged() {
        this.hasChanged++;  
    }
    
    setDone() {
        if (!this.status.isActive) {
            return;
        }
        this.status = RECT_STATUS.DONE;
        this._beforeOrAfterActivation();
    }
    
    setCancelled() {
        if (!this.status.isActive) {
            return;
        }
        this.status = RECT_STATUS.CANCELLED;
        this._beforeOrAfterActivation();
    }

    /**
     * @param {RectSelectableItem[]|null} items
     */
    setSelectableItems(items) {
        let hasItems = !!(items && items.length);
        this[NON_REACTIVE_PROPS].selectableItems = items;
        this.hasSelectableItems = hasItems;
        if (hasItems && this.status.isActive && !this.isCtrlPressed) {
            // soft-resetting the preliminary selection HERE if Ctrl wasn't pressed upon selection start, 
            // so it's still possible to restore the previous selection in case of cancel
            items.forEach(it => it.isSelected = false);
        }
    }

    /**
     * @type {RectSelectableItem[]}
     */
    get selectableItems() {
        return this[NON_REACTIVE_PROPS].selectableItems || EMPTY_ARRAY;
    }
    
    _beforeOrAfterActivation(isBefore) {
        let nonReactiveProps = this[NON_REACTIVE_PROPS],
            {containerElem} = nonReactiveProps,
            addOrRemoveEventListenerMethodName = isBefore ? 'addEventListener' : 'removeEventListener';

        document[addOrRemoveEventListenerMethodName]('keydown', nonReactiveProps.onKey);
        document[addOrRemoveEventListenerMethodName]('keyup', nonReactiveProps.onKey);
        document[addOrRemoveEventListenerMethodName]('mousemove', nonReactiveProps.onMouseMove);
        document[addOrRemoveEventListenerMethodName]('mouseup', nonReactiveProps.onMouseUp);
        containerElem[addOrRemoveEventListenerMethodName]('scroll', nonReactiveProps.onContainerScroll);
        nonReactiveProps.areaElem.style.display = isBefore ? 'block' : 'none';
    }

    /**
     * @param {HTMLElement} containerElem - the (vertically scrollable) container of selectable items
     * @param {MouseEvent} mouseEvent - the mouse event where selection started
     */
    activate({containerElem, mouseEvent}) {
        if (this.status.isActive || mouseEvent.button !== 0) {
            return;
        }
        let clickedXPosition = mouseEvent ? mouseEvent.pageX : -1,
            nonReactiveProps = this[NON_REACTIVE_PROPS],
            _containerRect = containerElem.getBoundingClientRect(),
            minX = _containerRect.x,
            maxX = _containerRect.x + containerElem.clientWidth, // clientWidth excludes the scrollbar
            minY = _containerRect.y,
            maxY = _containerRect.y + _containerRect.height;
        
        if (clickedXPosition > maxX) {
            return; // ignore click if it happened on the scrollbar
        }
        Object.assign(nonReactiveProps, {
            minX, minY, 
            maxX, maxY,
            containerElem
        });

        nonReactiveProps.onKey(mouseEvent);
        this._onMouseMove(mouseEvent, true);
        this._beforeOrAfterActivation(true);
        this.status = RECT_STATUS.ACTIVE;
    }
    
    _onMouseMove(e, isStart, useLastMousePosition) {
        e.preventDefault();
        let nrp = this[NON_REACTIVE_PROPS],
            containerScrollTop = nrp.containerElem.scrollTop,
            mouseX,
            mouseY,
            scrolledMouseY;

        if (useLastMousePosition) {
            mouseX = nrp.lastMouseX;
            mouseY = nrp.lastMouseY;
        } else {
            nrp.lastMouseX = ( mouseX = Math.max(nrp.minX, Math.min(e.clientX, nrp.maxX)) );
            nrp.lastMouseY = ( mouseY = Math.max(nrp.minY, Math.min(e.clientY, nrp.maxY)) );
        }
        
        scrolledMouseY = mouseY + containerScrollTop; 
        
        if (isStart) {
            nrp.startX = mouseX;
            nrp.startY = scrolledMouseY;
        } else if (mouseY <= nrp.minY + 3) {
            this._scrollContainer(true);
        } else if (mouseY >= nrp.maxY - 3) {
            this._scrollContainer(false);
        }

        let leftX = Math.min(nrp.startX, mouseX),
            rightX = Math.max(nrp.startX, mouseX),
            topY = Math.min(nrp.startY, scrolledMouseY),
            bottomY = Math.max(nrp.startY, scrolledMouseY),
            areaTopY = Math.max(nrp.minY, topY - containerScrollTop),
            areaBottomY = Math.min(nrp.maxY, bottomY - containerScrollTop),
            {isCtrlPressed} = this,
            areaStyle = nrp.areaElem.style;

        areaStyle.left = leftX + 'px';
        areaStyle.width = (rightX - leftX) + 'px';
        areaStyle.top = areaTopY + 'px';
        areaStyle.height = (areaBottomY - areaTopY) + 'px';

        for (let it of this.selectableItems) {
            let isOutside = it.bottom < topY || it.top > bottomY || it.right < leftX || it.left > rightX;
            it.isSelected = isOutside ? (isCtrlPressed && it.wasSelected) : (isCtrlPressed ? !it.wasSelected : true);
        }
        
        this.markChanged();
    }
}

/**
 * @param {boolean} [up]
 * @this {RectSelector}
 * @private
 */
RectSelector.prototype._scrollContainer = debounce(function(up) {
    let containerElem = this.status.isActive && this[NON_REACTIVE_PROPS].containerElem;
    if (containerElem) {
        if (up) {
            containerElem.scrollTop = Math.max(containerElem.scrollTop - 20, 0);
        } else {
            containerElem.scrollTop += 20;
        }
    }
}, 30, {leading: true});
