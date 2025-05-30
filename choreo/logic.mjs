export class LinearMap {
    constructor(series) {
        if (series.length < 2) {
            throw new Error("at least 2 points required");
        }

        this.series = [...series];
        this.series.sort((a, b) => a[0] - b[0]);

        for (let i = 1; i < series.length; i++) {
            if (this.series[i - 1][1] > this.series[i][1]) {
                console.log(series);
                throw new Error("not invertible");
            }
        }
    }

    forward(x) {
        let i;

        // Finds the first point after x
        for (i = 0; i < this.series.length; i++) {
            if (this.series[i][0] > x) {
                break;
            }
        }

        let prev, next;

        if (i === 0) {
            prev = i;
            next = i + 1;
        } else if (i === this.series.length) {
            prev = i - 2;
            next = i - 1;
        } else {
            prev = i - 1;
            next = i;
        }

        return LinearMap.interpolateX(this.series[prev], this.series[next], x);
    }

    inverse(y) {
        let i;

        // Finds the first point after x
        for (i = 0; i < this.series.length; i++) {
            if (this.series[i][1] > y) {
                break;
            }
        }

        let prev, next;

        if (i === 0) {
            prev = i;
            next = i + 1;
        } else if (i === this.series.length) {
            prev = i - 2;
            next = i - 1;
        } else {
            prev = i - 1;
            next = i;
        }

        return LinearMap.interpolateY(this.series[prev], this.series[next], y);
    }

    static interpolateX([x0, y0], [x1, y1], x) {
        return (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
    }

    static interpolateY([x0, y0], [x1, y1], y) {
        return this.interpolateX([y0, x0], [y1, x1], y);
    }
}

export class AudioTimeManager {
    constructor({audio}) {
        this.audio = audio
        this.time = new TimeService()
    }

    setCurrentTime(t) {

    }

    pause() {
        this.audio.pause()
        this.time.setFactor(0)
    }

    play() {
        this.time.setFactor(1)
        this.audio.currentTime = this.time.getCurrentTime()
        this.audio.play()
    }

    getDuration() {
        return this.audio.duration
    }

    getTime() {
        return this.time.getCurrentTime()
    }

    setTime(t) {
        this.time.setCurrentTime(t)
    }

    update() {
        if (this.time.getFactor() === 0) {
            // Audio is not playing, time is source of truth

            this.audio.currentTime = this.time.getCurrentTime()
            this.time.update()
        } else if (this.time.getFactor() === 1) {
            // Audio is playing, audio is source of truth

            this.time.setCurrentTime(this.audio.currentTime)
            this.time.update()
        } else {
            throw new Error('unsupported')
        }
    }
}

// TODO make it immutable
export class TimeService {
    constructor(params = {}) {
        this.factor = params?.factor ?? 1
        this.offset = params?.offset ?? 0
        this.set = params?.set ?? null

        this.last = this.now = this.origin = Date.now() / 1000;
    }

    getCurrentTime() {
        return this.factor * (this.now - this.origin) + this.offset;
    }

    setCurrentTime(t) {
        this.set = t;
    }

    getPreviousTime() {
        return this.factor * (this.last - this.origin) + this.offset;
    }

    setPreviousTime(t) {
        this.last = t + this.origin - this.offset;
    }

    getFactor() {
        return this.factor
    }

    setFactor(f) {
        this.offset = this.getCurrentTime()
        this.origin = this.now = Date.now() / 1000
        this.factor = f
    }

    update() {
        if (this.set !== null) {
            const t = this.getCurrentTime()

            this.now = this.origin = Date.now() / 1e3
            this.offset = this.set

            this.setPreviousTime(t);

            this.set = null;
        } else {
            this.last = this.now
            this.now = Date.now() / 1000
        }
    }
}

export class TimeInterval {
    constructor({before, factor, now, offset, origin}) {
        this.factor = factor ?? 1  // Number
        this.offset = offset ?? 0  // Time difference (s)

        this.now = now ?? TimeInterval.now()  // Timestamp (s)
        this.before = before ?? this.now  // Timestamp (s)
        this.origin = origin ?? this.now  // Timestamp (s)
    }

    get duration() {
        return this.factor * (this.now - this.before)
    }

    get previous() {
        return this.time - this.duration
    }

    get time() {
        return this.factor * (this.now - this.origin) + this.offset
    }

    contains(t) {
        return this.previous <= t && t <= this.time
    }

    // Doesn't change duration or time.
    withFactor(factor) {
        return new TimeInterval({
            ...this,
            before: this.now - this.duration / factor,
            factor,
            offset: this.time / (this.now - this.origin) * factor,
        })
    }

    withOffset(offset) {
        if (typeof (offset) === 'function')
            offset = offset(this.offset)

        return new TimeInterval({
            ...this,
            offset,
        })
    }

    toNow(now) {
        now ??= TimeInterval.now()

        return new TimeInterval({
            ...this,
            before: this.now,
            now,
        })
    }

    static now() {
        return Date.now() / 1000
    }
}
