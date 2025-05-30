export class AudioHelpers {
    static async loadAsync(url) {
        return new Promise((resolve) => {
            let audio = new Audio(url)
            audio.addEventListener("canplaythrough", () => {
                resolve(audio)
            });
        });
    }
}

export function loopAnimationFrame(action) {
    let handle

    function loop() {
        action()
        handle = requestAnimationFrame(loop)
    }

    handle = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(handle)
}

export class Logger {
    log(msg, ...args) {
        console.log(msg, ...args)
    }
}
