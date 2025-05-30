import {
    cloneElement,
    createContext,
    render
} from 'https://esm.sh/preact';

import {
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from 'https://esm.sh/preact/hooks'

import {Canvas, CanvasComponent, ClearCanvas} from './canvas.mjs'
import {html} from './html.mjs'
import {CurrentTimeline, TimelineContext, SectionTrack, TimeTrack} from './timeline.mjs'

import {DraggableArea, PlayButton, SeekBar} from "./controls.mjs"
import {AudioHelpers, loopAnimationFrame, Logger} from "./helpers.mjs"
import {AudioTimeManager, LinearMap, TimeInterval, TimeService} from "./logic.mjs"
import {normalizeSections} from "./model.mjs"


const CurrentTimeFactor = createContext()


export function App() {
    const [timeFactor, setTimeFactor] = useState(1)

    function update() {
        global.audioTimeManager.update()

        setTimeFactor(global.audioTimeManager.time.getFactor())

        let lastBeat = Math.floor(global.beatToTime.inverse(global.audioTimeManager.time.getPreviousTime()))
        let currentBeat = Math.floor(global.beatToTime.inverse(global.audioTimeManager.time.getCurrentTime()))

        if (Math.floor(lastBeat) !== currentBeat) {
            if (currentBeat % 8 === 7) {
                global.clapSound.currentTime = 0
                global.clapSound.play()
            }
        }
    }

    useEffect(() => {
        return loopAnimationFrame(update)
    })

    return html`
        <${CurrentTimeFactor} value=${timeFactor}>
            <${Canvas}>
                <${ClearCanvas}/>
                <${Timeline}>
                    <${TimeTrack} height="50px"/>
                    <${SectionTrack} height="50" beatToTime=${global.beatToTime} sections=${global.sections}/>
                    <div class="position-absolute bottom-0 start-0 w-100">
                        <${PlayerControls}/>
                    </div>
                </Timeline>
            </${Canvas}>
        </${CurrentTimeFactor}>
    `
}

function PlayerControls({onplay, onseek}) {
    const [_, update] = useState(0)

    const timeFactor = useContext(CurrentTimeFactor)
    const timeline = useContext(CurrentTimeline)

    onplay = () => {
        if (icon === 'pause') {
            global.audioTimeManager.pause()
        } else if (icon === 'play') {
            global.audioTimeManager.play()
        }
    }

    function onInput(e) {
        if (global.audioTimeManager.time.getFactor() > 0) {
            global.audioTimeManager.pause()
        }

        let newTime = Number(e.target.value)
        global.audioTimeManager.setTime(newTime)
    }

    let icon = timeFactor > 0 ? 'pause' : 'play'

    useEffect(() => {
        const interval = setInterval(() => update(i => i + 1), 10)
        return () => clearInterval(interval)
    }, [])

    return html`
        <div class="d-flex w-100 align-items-center p-2">
            <${PlayButton} icon=${icon} onClick=${onplay}></PlayButton>
            <div class="flex-grow-1">
                <${SeekBar} duration=${timeline.duration} time=${timeline.currentTime} onInput=${onInput}/>
            </div>
        </div>
    `
}

function Timeline({children}) {
    const ref = useRef()

    let timelineTime = new TimelineContext({})
    timelineTime.beatToTime = global.beatToTime

    function draw(ctx) {
        let t = global.audioTimeManager.time.getCurrentTime()
        timelineTime.currentTime = t
        timelineTime.startTime = t - 10
        timelineTime.endTime = t + 60

        const rect = ref.current.getBoundingClientRect()

        let x = timelineTime.normalize(global.audioTimeManager.time.getCurrentTime()) * rect.width

        ctx.save()

        ctx.beginPath()
        ctx.lineTo(x, rect.bottom)
        ctx.lineTo(x, rect.top)
        ctx.stroke()

        ctx.restore()
    }

    let onDragStart = () => {
        global.audioTimeManager.pause()
    }

    let onDrag = ({delta}) => {
        let w = ref.current.getBoundingClientRect().width
        let timePerPixel = timelineTime.duration() / w
        let dt = delta[0] * timePerPixel
        global.audioTimeManager.setTime(global.audioTimeManager.getTime() + dt)
    }

    return html`
        <div aria-label="timeline" ref=${ref}>
            <${CurrentTimeline.Provider} value=${timelineTime}>
                <${CanvasComponent} draw=${draw}>
                    <${DraggableArea} onDragStart=${onDragStart} onDrag=${onDrag}/>
                    ${children}
                </CanvasComponent>
            </${CurrentTimeline.Provider}>
        </div>
    `
}

const global = {}

document.addEventListener('DOMContentLoaded', async () => {
    let url = './choreos/shim-sham.json'
    let json = await fetch(url).then(res => res.json())

    global.music = await AudioHelpers.loadAsync('./choreos/shim-sham.mp3')
    global.music.play()

    global.beatToTime = new LinearMap(json.beats)
    global.sections = normalizeSections(json.structure)

    global.clapSound = await AudioHelpers.loadAsync('./sounds/dance-clap-241408.mp3')

    global.audioTimeManager = new AudioTimeManager({audio: global.music})

    render(html`
        <${App}/>`, document.body);
})
