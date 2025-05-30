import {
    createContext,
} from 'https://esm.sh/preact'

import {
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from 'https://esm.sh/preact/hooks'

import {loopAnimationFrame} from "./helpers.mjs"

import {html} from './html.mjs'


export const CurrentCanvas = createContext()


export class CanvasContext {
    constructor({ref}) {
        this.drawFunctions = []
        this.ref = ref
    }

    addDrawFunction(fn) {
        this.drawFunctions.push(fn)
    }

    removeDrawFunction(fn) {
        this.drawFunctions.splice(this.drawFunctions.indexOf(fn), 1)
    }

    draw() {
        const ctx = this.getContext()
        for (let draw of this.drawFunctions)
            draw(ctx)
    }

    getContext() {
        return this.ref.current.getContext('2d')
    }

    getRect() {
        return this.ref.current.getBoundingClientRect()
    }
}


export function Canvas({children}) {
    const canvasRef = useRef()
    const containerRef = useRef()

    const context = new CanvasContext({ref: canvasRef})

    useLayoutEffect(() => {
        loopAnimationFrame(() => context.draw())
        const rect = containerRef.current.getBoundingClientRect()
        console.log(rect)
        canvasRef.current.width = rect.width
        canvasRef.constructor.height = rect.height
    })

    return html`
        <${CurrentCanvas.Provider} value=${context}>
            <div
                    aria-label="canvas container"
                    class="d-inline-block w-100 h-100"
                    style="position: relative"
                    
                    ref=${containerRef}
            >
                <canvas class="d-block" ref=${canvasRef} width="1000" height="500"></canvas>
                <div class="canvas-overlay w-100 h-100" style="position: absolute; top: 0; left: 0;">
                    ${children}
                </div>
            </div>
        </${CurrentCanvas.Provider}>
    `
}

export function CanvasComponent({children, draw}) {
    const canvas = useContext(CurrentCanvas)

    useLayoutEffect(() => {
        canvas.addDrawFunction(draw)
        return () => canvas.removeDrawFunction(draw)
    })

    return html`
        ${children}
    `
}

export function ClearCanvas() {
    const canvas = useContext(CurrentCanvas)

    function draw(ctx) {
        const rect = canvas.getRect()
        ctx.clearRect(rect.x, rect.y, rect.width, rect.height)
    }

    return html`
        <${CanvasComponent} draw=${draw}/>`
}
