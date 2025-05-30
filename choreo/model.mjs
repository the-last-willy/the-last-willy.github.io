export function normalizeSections(data) {
    let sections = [];

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

        sections.push({
            start,
            end,

            color: d.color,
            name: d.name,
        });
    }

    return sections;
}
