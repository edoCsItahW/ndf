// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

/**
 * @file utils.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 12:47
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { IPos, IRadixNode, Nullable } from "./types";
import { Mutex } from "async-mutex";
import serializeJavascript = require("serialize-javascript");


/**
 * @func propertyGuard
 * @summary
 * @desc
 * @typeParam This
 * @typeParam Value
 * @param target
 * @param context
 * @returns
 * @example
 * class A {
 *     \@propertyGuard accessor x: number = 0;
 * }
 * */
function propertyGuard<This extends object, Value>(target: ClassAccessorDecoratorTarget<This, Value>, {
    kind,
    name
}: ClassAccessorDecoratorContext): ClassAccessorDecoratorResult<This, Value> {
    if (kind === "accessor") {
        const { get, set } = target;

        return {
            get(this: This): Value {
                return get.call(this) as Value;
            },

            set(this: This, value: Value) {
                throw new Error(`Cannot set property '${String(name)}' of ${this.constructor.name}`);
            }
        };
    }
    return target;
}


export class Pos {
    private _line: number = 1;
    private _column: number = 1;
    private _offset: number = 0;

    get line(): number {
        return this._line;
    }

    get column(): number {
        return this._column;
    }

    get offset(): number {
        return this._offset;
    }

    get pos(): IPos {
        return { line: this.line, column: this.column };
    }

    newline() {
        this._column = 1;
        this._line++;
        this._offset++;
    }

    next() {
        this._column++;
        this._offset++;
    }

    move(offset: number) {
        this._column += offset;
        this._offset += offset;
    }
}


export class Queue<T> {
    private mutex = new Mutex();
    private queue: T[] = [];
    private consumers: Array<(item: T) => void> = [];
    private producers: Array<() => void> = [];
    private maxSize: number;

    constructor(maxSize: number = Infinity) {
        if (maxSize <= 0)
            throw new Error("Queue max size must be greater than 0");

        this.maxSize = maxSize;
    }

    /**
     * 从队列中取出一个元素（阻塞）
     * 如果队列为空，则等待直到有元素可用
     */
    async get(): Promise<T> {
        const release = await this.mutex.acquire();

        try {
            if (this.queue.length > 0)
                return this.shiftAndNotify();

            return new Promise<T>(resolve => this.consumers.push(resolve));

        } finally {
            release();

        }
    }

    /**
     * 向队列中添加一个元素（阻塞）
     * 如果队列已满，则等待直到有空间可用
     */
    async put(item: T): Promise<void> {
        const release = await this.mutex.acquire();

        try {
            if (this.queue.length < this.maxSize)
                return this.pushAndNotify(item);

            await new Promise<void>(resolve => this.producers.push(resolve));

            this.pushAndNotify(item);

        } finally {
            release();

        }
    }

    /**
     * 非阻塞获取元素
     * @returns 元素或null（如果队列为空）
     */
    async getNoWait(): Promise<Nullable<T>> {
        const release = await this.mutex.acquire();

        try {
            if (this.queue.length === 0) return;

            return this.shiftAndNotify();

        } finally {
            release();

        }
    }

    /**
     * 非阻塞添加元素
     * @returns 是否添加成功
     */
    async putNoWait(item: T): Promise<boolean> {
        const release = await this.mutex.acquire();

        try {
            if (this.queue.length >= this.maxSize) return false;

            this.pushAndNotify(item);

            return true;

        } finally {

            release();
        }
    }

    /**
     * 获取队列当前大小
     */
    async size(): Promise<number> {
        const release = await this.mutex.acquire();

        try {
            return this.queue.length;

        } finally {
            release();

        }
    }

    /**
     * 检查队列是否为空
     */
    async empty(): Promise<boolean> {
        const size = await this.size();
        return size === 0;
    }

    private shiftAndNotify(): T {
        const item = this.queue.shift()!;

        if (this.producers.length > 0)
            this.producers.shift()?.();

        return item;
    }

    private pushAndNotify(item: T): void {
        this.queue.push(item);

        if (this.consumers.length > 0)
            this.consumers.shift()?.(item);

    }
}


class RadixNode<V> implements IRadixNode<V> {
    children = new Map<string, RadixNode<V>>();
    isEnd = false;
    value: Nullable<V>;

    constructor(value?: Nullable<V>) {
    }

    serialize(): string {
        const serializeNode = (node: RadixNode<V>): object => ({
            isEnd: node.isEnd,
            value: node.value,
            children: Array.from(node.children).reduce((acc, [key, child]) => {
                acc[key] = serializeNode(child);
                return acc;
            }, {} as Record<string, object>)
        });
        return JSON.stringify(serializeNode(this));
    }

    static deserialize<V>(json: string): RadixNode<V> {
        const parseNode = (obj: any): RadixNode<V> => {
            const node = new RadixNode<V>();
            node.isEnd = obj.isEnd;
            node.value = obj.value;
            Object.entries(obj.children || {}).forEach(([key, child]) => {
                node.children.set(key, parseNode(child));
            });
            return node;
        };
        return parseNode(JSON.parse(json));
    }

    static fromInterface<T>(obj: IRadixNode<T>): RadixNode<T> {
        const node = new RadixNode<T>();
        node.value = obj.value;
        node.isEnd = obj.isEnd;
        node.children = new Map(Object.entries(obj.children).map(([key, child]) => [key, RadixNode.fromInterface(child)]));
        return node;
    }
}


export class RadixTree<V> {
    private root: RadixNode<V> = new RadixNode<V>();

    insert(name: string, value: V) {
        let current = this.root;
        let i = 0;

        while (i < name.length) {
            let found = false;
            for (const [edge, child] of current.children) {
                const common = this.commonPrefix(name.slice(i), edge);

                if (common.length === 0) continue;

                // 完全匹配现有边
                if (common === edge) {
                    current = child;
                    i += edge.length;
                    found = true;
                    break;
                }

                // 分裂边逻辑
                const newNode = new RadixNode<V>();

                // 保留原节点所有属性
                newNode.isEnd = child.isEnd;
                newNode.value = child.value;

                // 处理剩余边
                const remainingEdge = edge.slice(common.length);
                newNode.children.set(remainingEdge, child);

                // 更新父节点
                current.children.delete(edge);
                current.children.set(common, newNode);
                current = newNode;
                i += common.length;

                // 处理新数据剩余部分
                const remainingName = name.slice(i);
                if (remainingName) {
                    const leafNode = new RadixNode<V>();
                    leafNode.isEnd = true;
                    leafNode.value = value;
                    current.children.set(remainingName, leafNode);
                } else {
                    current.isEnd = true;
                    current.value = value;
                }

                found = true;
                break;
            }

            if (!found) {
                const leafNode = new RadixNode<V>();
                leafNode.isEnd = true;
                leafNode.value = value;
                current.children.set(name.slice(i), leafNode);
                i = name.length;
            }
        }
    }

    search(name: string): Nullable<V> {
        let current = this.root;
        let i = 0;

        while (i < name.length) {
            let found = false;
            for (const edge of this.getEdgesWithPrefix(current.children, name[i])) {
                const child = current.children.get(edge)!;
                const common = this.commonPrefix(name.slice(i), edge);

                if (common.length === edge.length) {
                    current = child;
                    i += edge.length;
                    found = true;
                    break;
                }
            }

            if (!found) return undefined;
        }

        return current.isEnd ? current.value : undefined;
    }

    delete(name: string) {
        this._delete(this.root, name, 0);
    }

    private _delete(node: IRadixNode<V>, name: string, depth: number): boolean {
        if (depth === name.length) {
            if (!node.isEnd) return false;
            node.isEnd = false;
            return node.children.size === 0;
        }

        for (const [edge, child] of node.children) {
            const common = this.commonPrefix(name.slice(depth), edge);

            if (common.length === 0) continue;

            if (common.length < edge.length) return false; // 不完整匹配

            const shouldDelete = this._delete(child, name, depth + edge.length);
            if (shouldDelete) {
                node.children.delete(edge);
                // 合并单子节点
                if (node.children.size === 1 && !node.isEnd) {
                    const [onlyEdge, onlyChild] = node.children.entries().next().value!;
                    node.children.delete(onlyEdge);
                    node.children.set(edge + onlyEdge, onlyChild);
                }
            }
            return node.children.size === 0 && !node.isEnd;
        }
        return false;
    }

    private commonPrefix(str1: string, str2: string): string {
        let i = 0;

        while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
            i++;
        }
        return str1.slice(0, i);
    }

    private getEdgesWithPrefix(node: Map<string, IRadixNode<V>>, prefix: string): string[] {
        return Array.from(node.keys()).filter(k => k.startsWith(prefix[0]));
    }

    serialize(): string {
        return this.root.serialize();
    }

    static deserialize<T>(json: string): RadixTree<T> {
        const tree = new RadixTree<T>();
        tree.root = RadixNode.deserialize(json);
        return tree;
    }
}


export function enumToStr<T>(e: T, v: number): string {
    return (e as any)[v];
}

export function isDigit(char: string): boolean {
    return /[0-9]/.test(char);
}

export function isLetter(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
}

export function isHexDigit(char: string): boolean {
    return /[0-9a-fA-F]/.test(char);
}

export function isWhiteSpace(char: string): boolean {
    return /\s/.test(char);
}

export function isIdentifierChar(char: string): boolean {
    return isLetter(char) || isDigit(char) || char === "_";
}

export function unified(identifier: string): boolean {
    return identifier === identifier.toUpperCase() || identifier === identifier.toLowerCase();
}

export function isCapitalized(identifier: string): boolean {
    if (!identifier.length) return false;

    return identifier[0] === identifier[0].toUpperCase() && identifier.slice(1).toLowerCase() === identifier.slice(1).toLowerCase();
}

export function serialize(msg: any): string {
    return JSON.stringify(msg);
}

export function deserialize(msg: string): any {
    return JSON.parse(msg);
}

export function serializeSafe(msg: any): string {
    const handler = (value: any) => {
        if (typeof value === "function")
            if (value.__MODULE_MARKER__)
                return JSON.stringify({
                    __type: "MODULE_FUNCTION",
                    __path: value.__MODULE_PATH__,
                    __name: value.__FUNCTION_NAME__
                });
            else
                return serializeJavascript(value, { space: 4, isJSON: false, ignoreFunction: false });

        return value;
    };

    if (typeof msg === "object")
        return JSON.stringify(msg, (_, value) => handler(value));

    return handler(msg);
}

export function serializeFuncWarpper<T extends Function>(fn: T, fileName: string): T {
    return Object.assign(fn, {
        __MODULE_MARKER__: true,
        __MODULE_PATH__: fileName,
        __FUNCTION_NAME__: fn.name
    });
}

export function deserializeSafe(msg: string): any {
    if (msg.startsWith("{") && msg.endsWith("}")) {  // Object
        const obj = JSON.parse(msg, (_, value) => {
            if (typeof value === "string" && value.startsWith("{") && value.endsWith("}"))
                return deserializeSafe(value);

            return value;
        });

        if (obj.__type === "MODULE_FUNCTION")
            return require(obj.__path)[obj.__name];

        return obj;
    }

    try {
        const meybeFunc = eval(`(${msg})`);

        if (typeof meybeFunc === "function")
            return meybeFunc;

        return JSON.parse(msg);
    } catch (e) {
        return msg;
    }
}
