import assert from "node:assert/strict";
import test from "node:test";
import { randomIndex } from "../ui/reuse/random.js";

function samples(values) {
    let position = 0;
    return (buffer) => {
        assert.ok(position < values.length, "Unexpected extra random draw");
        buffer[0] = values[position++];
        return buffer;
    };
}

test("uniform sampling rejects the extra bucket and accepts every position", () => {
    for (let index = 0; index < 3; index++) {
        assert.equal(randomIndex(3, samples([0xffffffff, 3, index])), index);
    }
    for (const size of [2, 4, 8]) {
        const counts = Array(size).fill(0);
        for (let value = 0; value < 32; value++)
            counts[randomIndex(size, samples([value]))]++;
        assert.deepEqual(counts, Array(size).fill(32 / size));
    }
    assert.equal(randomIndex(2 ** 32, samples([0xffffffff])), 0xffffffff);
    assert.equal(
        randomIndex(1, () =>
            assert.fail("No entropy needed for a single position"),
        ),
        0,
    );
});

test("invalid sampling ranges fail before asking for entropy", () => {
    for (const size of [0, -1, 1.5, Infinity, NaN, 2 ** 32 + 1])
        assert.throws(
            () =>
                randomIndex(size, () =>
                    assert.fail("Invalid range must not draw"),
                ),
            RangeError,
        );
});
