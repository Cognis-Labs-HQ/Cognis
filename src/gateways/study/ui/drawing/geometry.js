/**
 * Computes Drawing annotation placement and stroke similarity without UI state.
 * Public exports: annotationPosition chooses a clear label position; scoreStroke compares sampled stroke geometry.
 * @example const score = scoreStroke(inputPoints, expectedPoints);
 */

function distance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
}

function pathLength(points) {
    return points
        .slice(1)
        .reduce(
            (total, point, index) => total + distance(points[index], point),
            0,
        );
}

function distanceToSegment(point, start, end) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const lengthSquared = deltaX ** 2 + deltaY ** 2;
    if (!lengthSquared) return distance(point, start);
    const projection = Math.max(
        0,
        Math.min(
            1,
            ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
                lengthSquared,
        ),
    );
    return distance(point, {
        x: start.x + projection * deltaX,
        y: start.y + projection * deltaY,
    });
}

/**
 * @param {{x:number,y:number}} start Stroke origin in canvas coordinates.
 * @param {number} angle Stroke direction in radians.
 * @param {{width:number,height:number}} canvas Canvas bounds.
 * @param {{x:number,y:number}[]} occupied Existing annotation positions.
 * @param {{x:number,y:number}[][]} paths Existing stroke paths.
 * @returns {{x:number,y:number}|undefined} Best available annotation position inside the canvas.
 */
export function annotationPosition(start, angle, canvas, occupied, paths) {
    const directions = [
        angle - Math.PI / 2,
        angle + Math.PI / 2,
        angle + Math.PI,
        angle - (Math.PI * 3) / 4,
        angle + (Math.PI * 3) / 4,
        angle - Math.PI / 4,
        angle + Math.PI / 4,
        angle,
    ];
    const candidates = [18, 24, 30].flatMap((radius) =>
        directions.map((direction) => ({
            x: start.x + Math.cos(direction) * radius,
            y: start.y + Math.sin(direction) * radius,
        })),
    );
    const clearance = (candidate) =>
        Math.min(
            ...occupied.map((position) => distance(candidate, position) - 21),
            ...paths.flatMap((path) =>
                path
                    .slice(1)
                    .map(
                        (point, index) =>
                            distanceToSegment(candidate, path[index], point) -
                            12,
                    ),
            ),
        );
    const scoredCandidates = candidates
        .filter(
            ({ x: horizontalCoordinate, y: verticalCoordinate }) =>
                horizontalCoordinate >= 12 &&
                verticalCoordinate >= 12 &&
                horizontalCoordinate <= canvas.width - 12 &&
                verticalCoordinate <= canvas.height - 12,
        )
        .map((candidate, preference) => ({
            candidate,
            preference,
            clearance: clearance(candidate),
        }));
    return (
        scoredCandidates
            .filter(
                ({ clearance: candidateClearance }) => candidateClearance >= 0,
            )
            .sort((left, right) => left.preference - right.preference)[0]
            ?.candidate ??
        scoredCandidates.sort(
            (left, right) =>
                right.clearance - left.clearance ||
                left.preference - right.preference,
        )[0]?.candidate
    );
}

function resample(points, count = 48) {
    if (points.length < 2) return points;
    const total = pathLength(points);
    if (!total) return Array.from({ length: count }, () => points[0]);
    const result = [points[0]];
    let segment = 1;
    let traversed = 0;
    for (let sample = 1; sample < count - 1; sample += 1) {
        const target = (total * sample) / (count - 1);
        while (
            segment < points.length &&
            traversed + distance(points[segment - 1], points[segment]) < target
        ) {
            traversed += distance(points[segment - 1], points[segment]);
            segment += 1;
        }
        const end = points[Math.min(segment, points.length - 1)];
        const start = points[Math.max(0, segment - 1)];
        const length = Math.max(distance(start, end), Number.EPSILON);
        const ratio = Math.min(1, (target - traversed) / length);
        result.push({
            x: start.x + (end.x - start.x) * ratio,
            y: start.y + (end.y - start.y) * ratio,
        });
    }
    result.push(points.at(-1));
    return result;
}

/**
 * @param {{x:number,y:number}[]} input Authored stroke samples.
 * @param {{x:number,y:number}[]} expected Expected stroke samples.
 * @returns {number} Integer similarity score between zero and 100.
 */
export function scoreStroke(input, expected) {
    if (input.length < 2 || expected.length < 2) return 0;
    const sampledInput = resample(input);
    const sampledExpected = resample(expected);
    const rootMeanSquare = Math.sqrt(
        sampledInput.reduce(
            (sum, point, index) =>
                sum + distance(point, sampledExpected[index]) ** 2,
            0,
        ) / sampledInput.length,
    );
    const endpointError =
        distance(sampledInput[0], sampledExpected[0]) +
        distance(sampledInput.at(-1), sampledExpected.at(-1));
    const lengthRatio = Math.abs(
        Math.log(
            Math.max(pathLength(input), Number.EPSILON) /
                Math.max(pathLength(expected), Number.EPSILON),
        ),
    );
    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                100 -
                    rootMeanSquare * 180 -
                    endpointError * 45 -
                    lengthRatio * 18,
            ),
        ),
    );
}
