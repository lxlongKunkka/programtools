// Abstract interface / Base implementation for Camera/Canvas mapping

export default class MapCanvas {
    getMap() { throw new Error("Not implemented"); }

    getRenderer() { throw new Error("Not implemented"); }

    focus(map_x, map_y, focus_viewport) { throw new Error("Not implemented"); }

    isWithinPaintArea(sx, sy) { throw new Error("Not implemented"); }

    getViewportWidth() { throw new Error("Not implemented"); }

    getViewportHeight() { throw new Error("Not implemented"); }

    getXOnScreen(map_x) { throw new Error("Not implemented"); }

    getYOnScreen(map_y) { throw new Error("Not implemented"); }

    getCursorMapX() { throw new Error("Not implemented"); }

    getCursorMapY() { throw new Error("Not implemented"); }

    setOffsetX(offset_x) { throw new Error("Not implemented"); }

    setOffsetY(offset_y) { throw new Error("Not implemented"); }

    ts() { throw new Error("Not implemented"); }
}
