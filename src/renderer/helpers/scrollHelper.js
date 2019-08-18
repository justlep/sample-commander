/**
 * Scrolls the viewport smoothly to an element
 * @param {(string|HTMLElement)} idOrElem - the element or its id
 * @param {boolean} [smooth=true] - enabled smooth scrolling to the element
 * @param {boolean} [blockEnd=false] - if true, scroll such that the element's bottom is at the lower edge of the screen
 * @param {boolean} [preJumpIfFar=true] - if true and the target is "far" off the current viewport,
 *                                        the viewport will make a "hard-jump" to somewhere "near" the target area 
 *                                        before continuing with smooth scrolling
 * @param {string|HTMLElement} scrollableParentElemOrId - the scrollable parent container
 */
export function scrollToElement({idOrElem, smooth = true, preJumpIfFar = true, scrollableParentElemOrId = window}) {
    let elem = (typeof idOrElem === 'string') ? document.getElementById(idOrElem) : idOrElem,
        scrollOpts = {
            block: 'center'
        },
        scrollParent = (typeof scrollableParentElemOrId === 'string') ? 
                            document.querySelector(scrollableParentElemOrId) : scrollableParentElemOrId;

    if (!elem) {
        return;
    }
    if (!elem.scrollIntoView) {
        if (elem.scrollTo) {
            elem.scrollTo();
        }
        return;
    }
    if (smooth) {
        scrollOpts.behavior = 'smooth';
        
        if (preJumpIfFar && scrollParent) {
            let elemOffset = elem.offsetTop,
                scrollY = scrollParent.scrollTop,
                scrollParentHeight = scrollParent.getBoundingClientRect().height,
                scrollDiff = scrollY - elemOffset,
                diffInPages = Math.abs(scrollDiff) / scrollParentHeight;

            if (diffInPages > 2) {
                scrollParent.scrollTo(0, (scrollDiff < 0 ? -1 : 0.7) * scrollParentHeight + elemOffset);
            }
        }
    }
    elem.scrollIntoView(scrollOpts);
}
