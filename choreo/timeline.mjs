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

import {html} from "./html.mjs";
import {CanvasComponent} from "./canvas.mjs";


export const CurrentTimeline = createContext()


export class TimelineContext {
    constructor({currentTime, startTime, endTime}) {
        this.currentTime = currentTime ?? 0
        this.startTime = startTime ?? 0
        this.endTime = endTime ?? 0

        this.beatToTime = null
    }

    duration() {
        return this.endTime - this.startTime
    }

    normalize(t) {
        return (t - this.startTime) / this.duration()
    }
}


export function TimelineTrack({children, height}) {
    if (height === undefined) {
        throw new Error('height is required')
    }

    let style = {
        height: `${height}px`
    }

    return html`
        <div
                aria-label="timeline track"
                style=${style}
        >
            ${children}
        </div>
    `
}

export function SectionTrack({height, sections}) {
    const ref = useRef()

    const timeline = useContext(CurrentTimeline)

    function timeToX(t) {
        const rect = ref.current.getBoundingClientRect()
        return timeline.normalize(t) * rect.width
    }

    function draw(ctx) {
        ctx.save()

        const rect = ref.current.getBoundingClientRect()

        function drawSection(x1, x2, label, color) {
            ctx.fillStyle = color
            ctx.fillRect(x1, rect.top, x2 - x1, rect.height)

            ctx.strokeStyle = 'black'
            ctx.lineWidth = 1.5
            ctx.strokeRect(x1, rect.top, x2 - x1, rect.height)

            let xmid = (x1 + x2) / 2
            let ymid = (rect.bottom + rect.top) / 2

            ctx.textAlign = 'center'
            ctx.fillStyle = 'black'
            ctx.font = "12px serif"
            ctx.fillText(label, xmid, ymid)
        }

        for (let s of sections) {
            let t1 = timeline.beatToTime.forward(s.start)
            let t2 = timeline.beatToTime.forward(s.end)
            let x1 = timeToX(t1)
            let x2 = timeToX(t2)
            drawSection(x1, x2, s.name, s.color || 'white')
        }

        ctx.restore()
    }

    return html`
        <div ref=${ref} aria-label="section track">
            <${TimelineTrack} height=${height}>
                <${CanvasComponent} draw=${draw}/>
            </TimelineTrack>
        </div>
    `
}

export function TimeTrack({height}) {
    const ref = useRef()

    const timeline = useContext(CurrentTimeline)

    function draw(ctx) {
        const rect = ref.current.getBoundingClientRect()

        for (let b = 0; b < 1000; ++b) {
            if (b % 32 === 0) {
                let t = timeline.beatToTime.forward(b)
                let x = timeline.normalize(t) * rect.width
                drawTick(ctx, x, rect.bottom, 10)
                drawTimeLabel(ctx, x, rect.bottom - 20, t)
            } else if (b % 8 === 0) {
                let t = timeline.beatToTime.forward(b)
                let x = timeline.normalize(t) * rect.width
                drawTick(ctx, x, rect.bottom, 5)
            }
        }
    }

    function drawTick(ctx, x, y, height) {
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y - height)
        ctx.lineWidth = '2'
        ctx.stroke()
    }

    function drawTimeLabel(ctx, x, y, time) {
        let minutes = Math.floor(time / 60)
        let seconds = String(Math.floor(time % 60)).padStart(2, '0')

        let label = `${minutes}:${seconds}`
        ctx.font = "12px serif"
        ctx.fillText(label, x, y)
    }

    return html`
        <div ref=${ref} aria-label="time track">
            <${TimelineTrack} height=50>
                <${CanvasComponent} draw=${draw}/>
            </TimelineTrack>
        </div>
    `
}