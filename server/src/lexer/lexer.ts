// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

/**
 * @file lexer.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 13:37
 * @desc 定义了Lexer类，用于将源代码字符串解析为Token数组。
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { isDigit, isHexDigit, isIdentifierChar, isLetter, isWhiteSpace, Pos } from "../utils";
import { OPERATORS, Token, TokenCategory, TokenType, WHITESPACE_CHARS } from "./token";
import { IPos, Nullable, PartialLocalet } from "../types";
import { _SyntaxError } from "../expection";
import { Locale } from "../IDEHelper";
import { methodDebug } from "../debug";


/**
 * @func lexerDebug
 * @summary 用于调试Lexer类的方法。
 * @desc 该方法用于打印Lexer类的方法调用信息。
 * @param {Lexer} obj - 要调试的Lexer对象。
 * @param {string} fnName - 要调试的方法名。
 * @remarks 一般配合methodDebug方法使用,而非手动调用
 * @see methodDebug
 * */
function lexerDebug(obj: Lexer, fnName: string) {
    if (obj.debug)
        console.log(`Lexer.${fnName}()`);
}


/**
 * @class Lexer
 * @classDesc 词法分析器类。
 * @desc 该类用于将源代码字符串解析为Token数组。
 * @property {string} src - 源代码字符串。
 * @property {Locale} locale - 语言环境。
 * @property {boolean} debug - 是否开启调试模式。
 * @property {_SyntaxError[]} errors - 错误列表。
 * */
export class Lexer {
    /**
     * @var pos
     * @summary 当前位置。
     * @private
     * */
    private pos: Pos = new Pos();
    /**
     * @var errors
     * @summary 错误列表
     * @desc 该属性用于存储解析过程中出现的错误。
     * @public
     * */
    errors: _SyntaxError[] = [];

    private reference: boolean = false;

    /**
     * @constructor
     * @param {string} src - 源代码字符串。
     * @param {Locale} [locale] - 语言环境。
     * @param {boolean} [debug=false] - debug模式。
     * */
    constructor(public readonly src: string, private readonly locale?: Locale, public debug: boolean = false) {
    }

    private get current(): string {
        return this.src[this.pos.offset];
    }

    private get localet(): Nullable<PartialLocalet> {
        return this.locale?.t.bind(this.locale, "lexer");
    }

    tokenize(): Token[] {
        const tokens: Token[] = [];
        while (this.inScope()) {
            const tk = this.next();

            if (this.debug)
                console.log("(Lexer): ", tk.toString());

            if (tk.type !== TokenType.EOF)
                tokens.push(tk);
        }

        if (tokens.length && tokens[tokens.length - 1].type !== TokenType.EOF)
            tokens.push(new Token(TokenType.EOF, this.pos.pos));

        return tokens;
    }

    next(): Token {
        const preSpace = this.skip();
        const start = this.pos.pos;

        const orgRef = this.reference && !!preSpace;
        this.reference = false;

        if (!this.current)
            return new Token(TokenType.EOF, this.pos, "", TokenCategory.OTHER, preSpace);

        if (this.current === "\n") {
            this.pos.newline();
            return new Token(TokenType.NEWLINE, start, "\\n", TokenCategory.WHITESPACE, preSpace);
        }

        if (isLetter(this.current)) {
            if (orgRef)
                this.reference = true;
            return this.extractIdentifier(preSpace);
        }

        if (isDigit(this.current) || (this.current === "." && this.peek() && isDigit(this.peek()!)))
            return this.extractNumber(preSpace);

        if (this.current === "\"" || this.current === "'")
            return this.extractString(preSpace);

        if (["$", "~", "."].includes(this.current))
            this.reference = true;

        if (this.current === "/") {
            if (orgRef) {
                this.reference = true;
                return this.extractOperator(preSpace);
            }

            if (this.peek() && this.peek()! === "/")  // Referecne may also have '//', but we have resolved and ruled it out
                return this.extractLineComment(preSpace);

            else if (this.peek() && this.peek()! === "*")
                return this.extractBlockComment(preSpace);

            return this.extractOperator(preSpace);
        }

        if (this.current === "(" && this.peek() && this.peek()! === "*")
            return this.extractBlockComment(preSpace);

        if (OPERATORS.has(this.current))
            return this.extractOperator(preSpace);

        this.reportError(this.localet?.("NEL1") || "Invalid token", start, this.pos.pos);
        const tk = new Token(TokenType.UNKNOWN, this.pos, "", TokenCategory.INVALID, preSpace);
        this.pos.next();
        return tk;
    }

    private reportError(msg: string, start: IPos, end: IPos) {
        this.errors.push(new _SyntaxError(msg, start, end));
    }

    private inScope(): boolean {
        return this.pos.offset < this.src.length;
    }

    private peek(n: number = 1): Nullable<string> {
        return this.src[this.pos.offset + n];
    }

    /**
     * @method skip
     * @summary 跳过空白字符。
     * @desc 该方法用于跳过空白字符，并返回跳过的字符数。
     * @returns {number} 跳过的字符数。
     * */
    private skip(): number {
        let count = 0;
        while (this.inScope() && isWhiteSpace(this.current) && this.current !== "\n") {
            this.pos.next();
            count++;
        }

        return count;
    }

    @methodDebug(lexerDebug)
    private extractIdentifier(preSpace: number): Token {
        let value = "";
        const start = this.pos.pos;

        while (this.inScope() && isIdentifierChar(this.current)) {
            value += this.current;
            this.pos.next();
        }

        return new Token(TokenType.UNKNOWN, start, value, TokenCategory.LITERAL, preSpace);
    }

    @methodDebug(lexerDebug)
    private extractNumber(preSpace: number): Token {
        let value = "";
        const start = this.pos.pos;
        let vaild = true;
        let type: "f" | "h" | "i" | "u" = "i";

        if (this.current === "0" && this.peek() && this.peek()!.toLowerCase() === "x") {  // hex number
            value += this.current + this.peek()!;
            this.pos.move(2);
            type = "h";
        }

        while (this.inScope() && ((type === "h" ? isHexDigit(this.current) : isDigit(this.current)) || this.current === ".")) {
            if (this.current === "." && type !== "h") {
                if (type === "f") break;  // already has a decimal point

                type = "f";
            }

            value += this.current;
            this.pos.next();
        }

        return new Token(
            type === "f" ? TokenType.FLOAT : TokenType.INT,
            start, value,
            vaild ? TokenCategory.LITERAL : TokenCategory.INVALID,
            preSpace
        );
    }

    @methodDebug(lexerDebug)
    private extractString(preSpace: number): Token {
        const quote = this.current;
        let value = quote;
        const start = this.pos.pos;
        this.pos.next();  // skip quote

        while (this.inScope() && this.current !== quote) {
            if (WHITESPACE_CHARS.has(this.current)) {
                value += `\\${WHITESPACE_CHARS.get(this.current)!}`;
                this.pos.next();  // In a string, '\' and 'n' are not considered spaces
            } else
                value += this.current;
            this.pos.next();
        }

        value += quote;
        this.pos.next();  // skip quote
        return new Token(TokenType.STRING, start, value, TokenCategory.LITERAL, preSpace);
    }

    @methodDebug(lexerDebug)
    private extractLineComment(preSpace: number): Token {
        let value = "//";
        const start = this.pos.pos;
        this.pos.move(2);  // skip //

        while (this.inScope() && this.current !== "\n") {
            value += this.current;
            this.pos.next();
        }

        return new Token(TokenType.COMMENT_LINE, start, value, TokenCategory.COMMENT, preSpace);
    }

    @methodDebug(lexerDebug)
    private extractBlockComment(preSpace: number): Token {
        let value = this.current + "*";
        const start = this.pos.pos;
        const comment = this.current === "/" ? "/" : ")";
        this.pos.move(2);  // skip /* or (*

        while (this.inScope() && !(this.current === "*" && this.peek() === comment)) {
            value += this.current;
            this.current === "\n" ? this.pos.newline() : this.pos.next();
        }

        value += this.current + this.peek()!;
        this.pos.move(2);  // skip */ or *)

        return new Token(TokenType.COMMENT_BLOCK, start, value, TokenCategory.COMMENT, preSpace);
    }

    @methodDebug(lexerDebug)
    private extractOperator(preSpace: number): Token {
        const start = this.pos.pos;

        let op: Token;

        if (OPERATORS.has(this.current))
            op = new Token(OPERATORS.get(this.current)!, start, this.current, TokenCategory.OPERATOR, preSpace);
        else {
            this.reportError(this.localet?.("NEL3") || "Invalid **operator**", start, this.pos.pos);
            op = new Token(TokenType.UNKNOWN, start, this.current, TokenCategory.INVALID, preSpace);
        }

        this.pos.next();  // skip operator

        return op;
    }
}
