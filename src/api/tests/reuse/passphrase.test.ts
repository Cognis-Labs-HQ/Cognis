import assert from "node:assert/strict";
import test from "node:test";
import { generatePassphrase } from "../../reuse/passphrase.js";

test("generatePassphrase returns the requested number of lowercase words", () => {
    const passphrase = generatePassphrase({ words: 5 });

    assert.match(passphrase, /^[a-z]+(?:-[a-z]+){4}$/);
});

test("generatePassphrase supports separators and capitalization styles", () => {
    const uppercase = generatePassphrase({
        words: 3,
        separator: ".",
        capitalization: "uppercase",
    });
    const titlecase = generatePassphrase({
        words: 3,
        separator: " ",
        capitalization: "titlecase",
    });

    assert.match(uppercase, /^[A-Z]+(?:\.[A-Z]+){2}$/);
    assert.match(titlecase, /^[A-Z][a-z]+(?: [A-Z][a-z]+){2}$/);
});

test("generatePassphrase rejects invalid controls", () => {
    assert.throws(() => generatePassphrase({ words: 0 }), RangeError);
    assert.throws(() => generatePassphrase({ words: 129 }), RangeError);
    assert.throws(
        () => generatePassphrase({ words: 2, separator: "x".repeat(17) }),
        RangeError,
    );
    assert.throws(
        () =>
            generatePassphrase({
                words: 2,
                capitalization: "sentencecase" as never,
            }),
        TypeError,
    );
});
