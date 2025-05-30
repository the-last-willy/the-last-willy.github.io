class Application {
    static async new() {
        const app = new Application();

        app.choreo = await fetch('./choreos/jump-session.json').then(res => res.json());

        app.player = await YoutubePlayer.load(app.choreo.youtubeId);

        app.beatToTime = new LinearMap(app.choreo["beats"]);

        app.clapAudio = await AudioHelpers.loadAsync('./sounds/dance-clap-241408.mp3');

        app.timeline = new TimelineWidget([20, 20], [0, 0]);

        app.timeChannel = new TimeTrackWidget(app.timeline, 50);
        app.timeline.tracks.push(app.timeChannel);

        app.structureTrack = new SectionTrackWidget(app.timeline, 50);
        app.structureTrack.setData(app.choreo['structure']);
        app.timeline.tracks.push(app.structureTrack);

        app.timeSlider = {value: 50};

        app.time = {
            origin: Date.now() / 1e3,
            offset: -1,
            last: Date.now() / 1e3,
            now: Date.now() / 1e3,
            factor: 1,
            update: null,
        };

        return app;
    }

    get ctx() {
        return app.canvas.getContext('2d');
    }

    getCurrentTime() {
        return this.time.factor * (this.time.now - this.time.origin) + this.time.offset;
    }

    setCurrentTime(t) {
        this.time.update = t;
    }

    setTimeFactor(x) {
        this.time.offset = this.getCurrentTime();
        this.time.origin = this.time.now = Date.now() / 1e3;
        this.time.factor = x;
    }

    getElapsedTime() {
        return this.time.now - this.time.last;
    }

    updateTime() {
        if (this.time.update !== null) {
            this.time.origin = this.time.now = Date.now() / 1e3;
            this.time.offset = this.time.update;

            this.time.update = null;
        }

        this.time.last = this.time.now;
        this.time.now = Date.now() / 1e3;
    }

    updatePlayer() {
        if (this.time.factor === 1) {
            if (0 <= this.getCurrentTime() && this.getCurrentTime() < this.player.getDuration()) {

                if (!this.player.isBusy) {

                    if (this.player.isCued()) {
                        console.log('starting player');
                        // seekTo also plays it
                        this.player.seekTo(this.getCurrentTime());
                    }
                    if (this.player.isPaused()) {
                        console.log('restarting player');
                        this.player.seekTo(this.getCurrentTime())
                            .then(() => this.player.play());
                    }

                    if (this.player.isPlaying() || this.player.isBuffering() || this.player.isCued() || this.player.isUnstarted()) {
                        // Synchronize time to video.
                        this.setCurrentTime(this.player.getTime());
                    }
                }
            }
        } else if (this.time.factor === 0) {
            if (this.player.isPlaying()) {
                this.player.pause();
            }
        } else {
            throw new Error('not supported');
        }
    }

    update() {
        ui.core.context({element: 'my-app'}, root => {
            this.updateTime();

            this.updatePlayer();

            app.timeSlider.value = this.getCurrentTime() / app.player.getDuration() * 100;
            app.timeline.startTime = this.getCurrentTime() - 10;
            app.timeline.endTime = this.getCurrentTime() + 30;

            let lastBeat = Math.floor(app.beatToTime.inverse(this.getCurrentTime() - this.getElapsedTime()));
            let currentBeat = Math.floor(app.beatToTime.inverse(this.getCurrentTime()));
            if (lastBeat !== currentBeat) {
                if (currentBeat % 8 === 7) {
                    console.log(currentBeat);
                    app.clapAudio.clapSound.currentTime = 0;
                    // app.clapAudio.clapSound.play();
                }
            }

            Gui.div({attributes: {id: 'my-app'}}, (root) => {
                let rect = root.getBoundingClientRect();

                Gui.canvasWithOverlay({
                    attributes: {
                        id: 'my-canvas',

                        width: rect.width,
                        height: rect.height,
                    }
                }, (canvas, overlay) => {
                    this.canvas = canvas;

                    let ctx = this.canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    Gui.timeline({
                        attributes: {
                            id: 'timeline',
                        },
                        content: (timeline) => {
                            app.timeline.rect = this.canvas.getBoundingClientRect();

                            HtmlInputs.drag({id: 'drag-input'}, {
                                dragstart: (state) => {
                                    this.setTimeFactor(0);
                                },
                                drag: (state) => {
                                    let timePerPixel = (app.timeline.endTime - app.timeline.startTime) / timeline.getBoundingClientRect().width;
                                    app.setCurrentTime(app.getCurrentTime() - state.delta[0] * timePerPixel)
                                },
                                dragend: (state) => {
                                },
                            });

                            Gui.track({
                                attributes: {
                                    id: 'time-track'
                                },
                                content: (track) => {
                                    this.timeChannel.rect = track.getBoundingClientRect();
                                }
                            });

                            Gui.track({
                                attributes: {
                                    id: 'section-track'
                                },
                                content: (track) => {
                                    this.structureTrack.rect = track.getBoundingClientRect();
                                }
                            });

                            this.timeline.draw(app.ctx);
                        }
                    });
                });

                this.controls();
            });
        });

        requestAnimationFrame(() => this.update());
    }

    controls() {
        Gui.div({
            attributes: {
                id: 'my-controls',

                style: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '50px',
                }
            }
        }, (controls) => {
            if (HtmlInputs.button({attributes: {id: 'play-button', textContent: 'Play', style: {background: 'transparent', border: 'none'}}})) {
                let button = document.getElementById('play-button');
                if (this.time.factor === 0) {
                    this.setTimeFactor(1);
                    button.innerHTML = '<i class="bi bi-pause-circle-fill" style="font-size: 40px">';
                } else {
                    this.setTimeFactor(0);
                    button.innerHTML = '<i class="bi bi-play-circle-fill" style="font-size: 40px">';
                }
            }

            let rangeValue = {value: this.getCurrentTime() * 100 / app.player.getDuration()};
            if (Gui.input({
                attributes: {
                    id: 'time-slider',
                    type: 'range',
                    step: 0.01,
                    style: {width: '100%'}
                }
            }, rangeValue)) {
                this.setCurrentTime(rangeValue.value / 100 * app.player.getDuration());
            }
        });
    }
}

class CanvasHelpers {

}

class Gui {
    static state = new Gui();

    constructor() {
        this.substates = {};
    }

    static canvasWithOverlay({attributes}, content) {
        Gui.element({tag: 'div', attributes}, (container) => {
            let canvas = Gui.element({
                tag: 'canvas',
                attributes: {
                    id: attributes.id + '-canvas',
                    height: attributes.height,
                    width: attributes.width
                }
            });

            Gui.element({
                tag: 'div',
                attributes: {
                    id: attributes.id + '-overlay',

                    style: {
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0,
                    }
                }
            }, (overlay) => content(canvas, overlay));
        });
    }

    static div({attributes}, content) {
        Gui.element({tag: 'div', attributes}, content);
    }

    // Returns whether the value was changed by user interaction.
    static input({attributes}, value) {
        let init = input => {
            // Create substate if it doesn't exist
            if (!(input.id in Gui.state.substates)) {
                Gui.state.substates[input.id] = {changed: false};
            }

            input.addEventListener('input', () => {
                Gui.state.substates[input.id].changed = true;
            });
        };

        let input = Gui.element({tag: 'input', attributes, init});

        if (input.value !== value.value) {
            if (Gui.state.substates[input.id].changed) {
                Gui.state.substates[input.id].changed = false;

                value.value = input.value;
                return true;
            } else {
                input.value = value.value;
                return false;
            }
        }

        return false;
    }

    static element({tag, attributes, init}, content = null) {
        if (!'id' in attributes)
            throw new Error('id required');

        content = content ?? (() => {
        });
        init = init ?? (() => {
        });

        let element = document.getElementById(attributes.id);

        if (element === null) {
            element = document.createElement(tag);
            Object.assign(element, attributes);

            for (let prop in attributes.style ?? []) {
                element.style[prop] = attributes.style[prop];
            }

            init(element);

            ui.core.getParent().appendChild(element);
        }

        ui.core.context({element}, content);

        return element;
    }

    static timeline({attributes, content}) {
        attributes ||= {};
        attributes.style ||= {};
        attributes.style.height ||= '100%';
        attributes.style.width ||= '100%';

        let content2 = (timeline) => {
            let rect = timeline.getBoundingClientRect();

            app.ctx.save();

            // app.ctx.beginPath();
            // app.ctx.rect(rect.x, rect.y, rect.width, rect.height);
            // app.ctx.clip();

            content(timeline);

            app.ctx.restore();
        };

        let timeline = Gui.element({tag: 'div', attributes}, content2);
        let rect = timeline.getBoundingClientRect();
        app.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    static track({attributes, content}) {
        attributes ||= {};
        attributes.style ||= {};
        attributes.style.width ||= '100%';
        attributes.style.height ||= '50px';

        let track = Gui.element({tag: 'div', attributes}, content);
        let rect = timeline.getBoundingClientRect();
        app.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
}

/**
 * Core services for HTML imgui.
 *
 * Dependencies: None (forbidden)
 */
class HtmlCore {
    constructor() {
        this.stack = [];
    }

    context({element}, content) {
        // If element is a string it is interpreted as an id.
        if (element instanceof String) {
            let id = element;
            element = document.getElementById(id);
            if (element === null) {
                throw new Error(`no element with id=${id}`);
            }
        }

        this.stack.push(element);

        content(element);

        this.stack.pop();
    }

    element({tag, attributes}, content) {
        Gui.element({tag, attributes}, content);
    }

    frame(content) {

    }

    getParent() {
        if (this.stack.length === 0) {
            throw new Error(`stack is empty`);
        }

        return this.stack.at(-1);
    }

    html({id}, text) {
        let element = document.getElementById(id);
        if (element !== null) {
            return element;
        }

        let parser = new DOMParser();
        let doc = parser.parseFromString(text, 'text/html');
        element = doc.body.firstChild;

        element.id = id;

        this.getParent().appendChild(element);
    }
}


class HtmlElements {

}

class HtmlInputs {
    static states = {};

    button({attributes}, content) {

    }

    static button({attributes}) {
        let btn = Gui.element({
            tag: 'button',
            attributes,
            init: btn => {
                // Create substate if it doesn't exist
                if (!(btn.id in Gui.state.substates)) {
                    Gui.state.substates[btn.id] = {clicked: false};
                }

                btn.addEventListener('click', () => {
                    Gui.state.substates[btn.id].clicked = true;
                });
            }
        });

        let substate = Gui.state.substates[btn.id];
        if (substate.clicked) {
            substate.clicked = false;
            return true;
        }

        return false;
    }

    static drag({id}, {dragstart, drag, dragend}) {
        let state = this._getOrCreateState(id, () => ({
            dragstart: false,
            drag: false,
            dragend: false,

            dragged: false,

            position: [0, 0],
            delta: [0, 0],
        }));

        let attributes = {
            id: id,
            style: {
                // background: 'repeating-linear-gradient(45deg, black, black 0.5px, transparent 1px, transparent 20px)',
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
            }
        };

        let init = (div) => {
            div.addEventListener('mousedown', event => {
                state.dragstart = true;
                state.dragged = true;
                state.position = [event.clientX, event.clientY];
                div.style.cursor = 'grabbing';
                // console.log('mousedown', event);
            });
            div.addEventListener('mousemove', event => {
                if (state.dragged) {
                    state.drag = true;
                    state.delta = [event.clientX - state.position[0], event.clientY - state.position[1]];
                    state.position = [event.clientX, event.clientY];
                }
            });
            div.addEventListener('mouseup', event => {
                state.dragend = true;
                state.dragged = false;
                state.delta = [0, 0];
                div.style.cursor = 'grab';
            });
        };

        Gui.element({tag: 'div', attributes, init});

        if (state.dragstart) {
            state.dragstart = false;

            if (dragstart) dragstart(state);
        }

        if (state.drag) {
            state.drag = false;

            if (drag) drag(state);
        }

        if (state.dragend) {
            state.dragend = false;

            if (dragend) dragend(state);
        }
    }

    static _getOrCreateState(id, create) {
        let state = HtmlInputs.states[id];
        if (state === undefined) {
            return HtmlInputs.states[id] = create();
        }
        return state;
    }
}

class ControlWidgets {
    constructor() {
        this.models = new Map();
    }

    static controls({id}, model) {
        Gui.div({
            attributes: {
                id: 'my-controls',

                style: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '50px',
                }
            }
        }, (controls) => {
            if (HtmlInputs.button({attributes: {id: 'play-button', textContent: 'Play'}})) {
                if (this.time.factor === 0) {
                    this.setTimeFactor(1);
                } else {
                    this.setTimeFactor(0);
                }
            }

            let rangeValue = {value: this.getCurrentTime() * 100 / app.player.getDuration()};
            if (Gui.input({
                attributes: {
                    id: 'time-slider',
                    type: 'range',
                    step: 0.01,
                    style: {width: '100%'}
                }
            }, rangeValue)) {
                this.setCurrentTime(rangeValue.value / 100 * app.player.getDuration());
            }
        });
    }

    playButton({id}, model, {click}) {
        let style = {
            background: 'transparent',
            border: 'none',
        };

        ui.inputs.button({attributes: {id, style}});
    }
}

class TimelineWidget {
    constructor([x, y], [w, h]) {
        this.rect = new DOMRect(x, y, w, h);

        this.startTime = 0;
        this.endTime = 0;

        this.tracks = [];
    }

    get duration() {
        return this.endTime - this.startTime;
    }

    draw(ctx) {
        for (let t of this.tracks) {
            t.draw(ctx);
        }

        this.drawCursor(app.ctx);

        ctx.save();

        ctx.strokeStyle = 'black';
        ctx.strokeRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        ctx.restore();
    }

    drawCursor(ctx) {
        let x = this.timeToX(app.getCurrentTime());

        ctx.save();

        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.moveTo(x, this.rect.top);
        ctx.lineTo(x, this.rect.bottom);
        ctx.stroke();

        ctx.restore();
    }

    xToTime(x) {
        let pixelToTime = new LinearMap([[0, this.startTime], [app.canvas.width, this.endTime]]);
        return pixelToTime.forward(x);
    }

    timeToX(t) {
        let pixelToTime = new LinearMap([[0, this.startTime], [app.canvas.width, this.endTime]]);
        return pixelToTime.inverse(t);
    }
}

class TrackWidget {
    constructor(timeline, height) {
        this.timeline = timeline;
        this.h = height;
    }

    timeToX(time) {
        return this.timeline.timeToX(time);
    }
}

class SectionTrackWidget extends TrackWidget {
    setData(data) {
        this.sections = [];

        let current = 0;
        for (let d of data) {
            let start, end;

            if ("start" in d) {
                start = d.start;
                current = d.start;
            } else {
                start = current;
            }

            if ("end" in d) {
                end = d.end;

            } else if ("duration" in d) {
                end = start + d.duration;
            } else {
                throw new Error("unknown duration");
            }

            current = end;

            this.sections.push({
                start,
                end,

                color: d.color,
                name: d.name,
            });
        }
    }

    draw(ctx) {
        ctx.save();

        for (let t of this.sections) {
            ctx.fillStyle = t.color;

            let t1 = this.timeToX(app.beatToTime.forward(t.start));
            let t2 = this.timeToX(app.beatToTime.forward(t.end));
            let w = t2 - t1;

            if (t.color !== undefined) {
                ctx.fillStyle = t.color;
            } else {
                ctx.fillStyle = 'white';
            }
            ctx.fillRect(t1, this.rect.y, w, this.rect.height);

            ctx.strokeStyle = "black";
            ctx.strokeRect(t1, this.rect.y, w, this.rect.height);

            ctx.font = "12px serif";
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.fillText(t.name, t1 + w / 2, (this.rect.top + this.rect.bottom) / 2);
        }

        ctx.restore();
    }
}

class TimeTrackWidget extends TrackWidget {
    draw(ctx) {
        ctx.save();

        let firstBeat = app.beatToTime.inverse(0);
        let lastBeat = app.beatToTime.inverse(app.timeline.endTime);

        let beatCount = lastBeat - firstBeat;

        let drawTimeLabel = function (x, y, time) {
            ctx.font = "12px serif";
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';

            let str = Math.floor(time / 60) + ':' + Math.floor(time % 60);
            ctx.fillText(str, x, y);
        }

        let drawTick = function (x, y, height) {
            ctx.beginPath();
            ctx.strokeStyle = 'black';
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - height);
            ctx.stroke();
        }

        // 8-bar sections
        for (let i = 0; i <= beatCount / 32; i++) {
            let time = app.beatToTime.forward(i * 32);
            let x = this.timeToX(time);

            drawTick(x, this.rect.bottom, 10);
            drawTimeLabel(x, this.rect.y + this.rect.height - 20, time);
        }

        // 2-bar phrases
        for (let i = 0; i <= beatCount / 8; i++) {
            if (i % 4 === 0)
                continue;

            let x = this.timeToX(app.beatToTime.forward(i * 8));

            drawTick(x, this.rect.bottom, 5);
        }

        drawTimeLabel(this.timeToX(0), this.rect.y + this.rect.height - 20, 0);
        drawTick(this.timeToX(0), this.rect.bottom, 10);

        ctx.restore();
    }
}

class YoutubePlayer {
    static async load(id) {
        return new Promise(resolve => {
            let instance;

            window.onYouTubeIframeAPIReady = function () {
                instance = new YT.Player('player', {
                    height: '390',
                    width: '640',
                    videoId: id,
                    playerVars: {
                        'playsinline': 1
                    },
                    events: {
                        onReady: onPlayerReady
                    }
                });
                instance.getIframe().style.display = 'none';
            }

            var tag = document.createElement('script');

            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            function onPlayerReady(event) {
                resolve(new YoutubePlayer(instance));
            }
        });
    }

    constructor(instance) {
        this.instance = instance;


        this.isBusy = false;

        this.logger = console.log;

        // removeEventListener doesn't work thus I'm wrapping listeners, so I can manage them properly

        this.onStateChange = () => {
        };
        this.instance.addEventListener('onStateChange', event => {
            let state = event.data;
            this._log(`state changed to ${YoutubePlayer.stateToString(state)}`);
            this.onStateChange(state);
        });
    }

    getDuration() {
        return this.instance.getDuration();
    }

    getTime() {
        return this.instance.getCurrentTime();
    }

    // TODO make it async, pause is not instantaneous
    pause() {
        this._log('pause()');

        this.instance.pauseVideo();

        this._log('pause() -- done');
    }

    async play() {
        this._log('play()');
        console.log(this.instance.getCurrentTime());

        return this._busyGuard(() => {
            return new Promise((resolve) => {
                this.onStateChange = state => {
                    if (state === YT.PlayerState.PLAYING) {
                        console.log(this.instance.getCurrentTime());
                        this._log('play() done');
                        this.onStateChange = () => {
                        };
                        resolve();
                    }
                };

                this.instance.playVideo();
                console.log(this.instance.getCurrentTime());
            });
        });
    }

    isBuffering() {
        return this.instance.getPlayerState() === 3;
    }

    isCued() {
        return this.instance.getPlayerState() === 5;
    }

    isPaused() {
        return this.instance.getPlayerState() === YT.PlayerState.PAUSED;
    }

    isPlaying() {
        return this.instance.getPlayerState() === 1;
    }

    isUnstarted() {
        return this.instance.getPlayerState() === -1;
    }

    async seekTo(time) {
        this._log('seekTo()');

        return this._busyGuard(() => {
            return new Promise((resolve) => {
                // Paused player remained paused.
                if (this.instance.getPlayerState() === YT.PlayerState.PAUSED) {
                    this._log('seekTo() done');
                    resolve();
                } else {
                    this.onStateChange = state => {
                        if (state === YT.PlayerState.PLAYING) {
                            this._log('seekTo() done');
                            console.log(this.instance.getCurrentTime());
                            this.onStateChange = () => {
                            };
                            resolve();
                        }
                    };
                }

                this.instance.seekTo(time);
                console.log(this.instance.getCurrentTime());
            });
        });
    }

    async _busyGuard(action) {
        if (this.isBusy) {
            throw new Error('player is busy');
        }

        this.isBusy = true;

        let promise = action();

        return promise.finally(() => this.isBusy = false);
    }

    _log(txt) {
        this.logger('YoutubePlayer:', txt);
    }

    stateString() {
        return YoutubePlayer.stateToString(this.instance.getPlayerState());
    }

    static stateToString(state) {
        switch (state) {
            case YT.PlayerState.BUFFERING:
                return 'BUFFERING';
            case YT.PlayerState.CUED:
                return 'CUED';
            case YT.PlayerState.ENDED:
                return 'ENDED';
            case YT.PlayerState.PAUSED:
                return 'PAUSED';
            case YT.PlayerState.PLAYING:
                return 'PLAYING';
            case YT.PlayerState.UNSTARTED:
                return 'UNSTARTED';
            default:
                throw new Error('unknown state');
        }
    }
}


const ui = {
    core: new HtmlCore(),
    inputs: new HtmlInputs(),
};

let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = await Application.new();
    app.update();
});
