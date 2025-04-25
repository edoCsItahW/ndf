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
import {IPos} from "./types";


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
function propertyGuard<This extends object, Value>(target: ClassAccessorDecoratorTarget<This, Value>, {kind, name}: ClassAccessorDecoratorContext): ClassAccessorDecoratorResult<This, Value> {
    if (kind === 'accessor') {
        const {get, set} = target;

        return {
            get(this: This): Value {
                return get.call(this) as Value;
            },

            set(this: This, value: Value) {
                throw new Error(`Cannot set property '${String(name)}' of ${this.constructor.name}`);
            }
        }
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
        return {line: this.line, column: this.column};
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
    return isLetter(char) || isDigit(char) || char === '_';
}

export function unified(identifier: string): boolean {
    return identifier === identifier.toUpperCase() || identifier === identifier.toLowerCase();
}
