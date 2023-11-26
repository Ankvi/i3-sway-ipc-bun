import { describe, expect, test } from "bun:test";
import { Root } from "../../types/root";
import { findFocused, flatten } from "../windowDimming";
import { Content } from "../../types/content";

const getTreeData = await Bun.file(
    `${import.meta.dir}/testData/get_tree.json`,
).json<Root>();

describe("Window dimming tests", () => {
    describe("findFocused tests", async () => {
        test("Should find correct focused entry from test data", async () => {
            const expected = await Bun.file(`${import.meta.dir}/testData/expected_focused_node.json`).json<Content>();
            const focused = findFocused(getTreeData);
            expect(focused).toEqual(expected);
        });
    });

    describe("flatten tests", () => {
        test("flatten should return the correct number of containers", () => {
            const flattened = flatten(getTreeData);
            expect(flattened).toHaveLength(20);
        })
    })
});
