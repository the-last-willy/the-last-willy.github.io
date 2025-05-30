import {AudioHelpers, loopAnimationFrame} from "./helpers.mjs"
import {html} from './html.mjs'
import {TimeInterval} from "./logic.mjs"

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

import {
    effect,
    signal,
    useSignalEffect
} from 'https://esm.sh/@preact/signals';


const time = signal(new TimeInterval({}))


function App() {
    const eights = signal([0, 0, 0, 0, 0, 0, 0, 0])
    useSignalEffect(() => console.log(eights.value))
    const tempo = signal(120)

    let clap

    async function init() {
        clap = await AudioHelpers.loadAsync('./sounds/dance-clap-241408.mp3')
        clap.volume = 0.2

        return loopAnimationFrame(update)
    }

    function update() {
        time.value = time.value.toNow()

        let quarter = 60 / tempo.value
        let bar = 4 * quarter

        if (time.value.time > bar)
            time.value = time.value.withOffset(o => o - bar)

        let beats = eights.value
            .reduce((acc, x, i) => {
                if (x !== 0) {
                    return [...acc, i]
                }
                return acc
            }, [])
            .map(x => x / 2 * quarter)

        for (let b of beats) {
            if (time.value.contains(b)) {
                console.log(b)
                clap.play()
            }
        }
    }

    function onCheck(i) {
        return ev => {
            eights.value = eights.value.with(i, Number(ev.target.checked))
        }
    }

    useEffect(init)

    let checkboxes = []

    for (let i = 0; i < 8; i++) {
        let cb = onCheck(i)
        checkboxes.push(html`<input type="checkbox" value="" onChange=${cb}/>`)
    }

    return html`
        <input type="number" value="120"/>
        ${checkboxes}
    `
}

document.addEventListener('DOMContentLoaded', () => {
    render(html`
        <${App}></${App}>`, document.body)
})
