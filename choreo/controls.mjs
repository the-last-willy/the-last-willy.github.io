import {
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from 'https://esm.sh/preact/hooks'

import {html} from "./html.mjs";


export function DraggableArea({onDragStart, onDrag, onDragEnd}) {
    const [state, setState] = useState({
        dragging: false,
        position: [0, 0],
    })

    const ref = useRef()

    function onPointerDown(e) {
        setState(s => ({
            ...s,
            dragging: true,
            position: [e.clientX, e.clientY],
        }))

        ref.current.style.cursor = "grabbing"

        onDragStart()
    }

    function onPointerMove(e) {
        if (state.dragging) {
            let [x, y] = [e.clientX, e.clientY]

            let dx = e.clientX - state.position[0]
            let dy = e.clientY - state.position[1]

            setState(s => ({...s, position: [x, y]}))

            onDrag({delta: [dx, dy]})
        }
    }

    function onPointerOut(e) {
        setState(s => ({...s, dragging: false}))

        ref.current.style.cursor = "grab"
    }

    function onPointerUp(e) {
        setState(s => ({...s, dragging: false}))

        ref.current.style.cursor = "grab"
    }



    let classes = "position-absolute start-0 top-0 w-100 h-100 striped"
    let style = "cursor: grab"

    return html`
        <div
                aria-label="draggable area"
                class=${classes}
                style=${style}

                onPointerDown=${onPointerDown}
                onPointerMove=${onPointerMove}
                onPointerOut=${onPointerOut}
                onPointerUp=${onPointerUp}
                
                ref=${ref}
        />
    `
}

export function PlayButton({icon, onClick}) {
    let htmlIcon

    if (icon === 'pause') {
        htmlIcon = html`<i class="bi bi-pause-circle-fill"></i>`
    } else if (icon === 'play') {
        htmlIcon = html`<i class="bi bi-play-circle-fill"></i>`
    } else {
        htmlIcon = html`<i class="bi bi-question-circle-fill"></i>`
    }

    return html`
        <button
                aria-label="play button"
                onClick=${onClick}
                style="background: transparent; border: none;"
        >
            ${htmlIcon}
        </button>
    `
}

export function SeekBar({time, duration, onChange, onInput}) {
    onChange ??= () => {}
    onInput ??= () => {}

    return html`
        <input
                type="range"

                max=${duration}
                step="0.1"
                value=${time}

                class="w-100"

                onChange=${onChange}
                onInput=${onInput}
        />
    `
}
