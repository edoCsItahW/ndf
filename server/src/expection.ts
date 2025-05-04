// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

/**
 * @file expection.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 12:47
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import {IPos} from "./types";


export abstract class NDFError extends Error {
    protected constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message);
    }

    get name(): string {
        return this.constructor.name;
    }

    get message(): string {
        return `[${this.name}]: ${this._message}`;
    }
}


export class _SyntaxError extends NDFError {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }

    get name(): string {
        return "SyntaxError";
    }

}

export class ParseError extends NDFError {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }
}

export class DefineError extends NDFError {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }
}

export class _TypeError extends NDFError {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }

    get name(): string {
        return "TypeError";
    }
}

export class ImportError extends NDFError {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }
}

export abstract class NDFWarning extends NDFError {
    protected constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }
}

export class ReferenceWarning extends NDFWarning {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }
}

export class NameWarning extends NDFWarning {
    constructor(protected _message: string, public start: IPos, public end: IPos) {
        super(_message, start, end);
    }
}
