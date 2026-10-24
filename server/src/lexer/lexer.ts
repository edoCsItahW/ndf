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
 * @version 2.0
 * @date 2025/04/17 13:37
 * @desc 词法分析器（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 产出的令牌与 `NDF.g4` v2.0 的词法部分一一对应：
 * - 空白被跳过并折算成 `Token.preSpace`；换行产出 `NEWLINE`；注释产出 `COMMENT_LINE`/`COMMENT_BLOCK`；
 * - 只有硬关键字被分类成 `KW_*`，其余名字（含 `int`/`float3`/`RGB`/`MAP`/`LIST`）都是 `IDENTIFIER`；
 * - 数字：`123`、`0xFF00A8`、`3.14`、`53.`、`.127`；
 * - 字符串：单/双引号，**无转义**、不跨行；
 * - GUID：`{8-4-4-4-12}` 整体作为一个 `GUID` 令牌。
 * */
import { isDigit, isHexDigit, isIdentifierChar, isLetter, isWhiteSpace, Pos } from "../utils";
import { KEYWORDS, OPERATORS, Token, TokenCategory, TokenType, WHITESPACE_CHARS } from "./token";
import { IPos, Nullable, PartialLocalet } from "../types";
import { _SyntaxError } from "../expection";
import { Locale } from "../IDEHelper";


/** GUID 值：8-4-4-4-12 位十六进制（不含 `GUID:` 前缀） */
const GUID_PATTERN = /^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}/;

/** 可能组成双字符运算符的首字符 */
const TWO_CHAR_OPERATOR_HEADS = new Set(["<", ">", "=", "!"]);


/**
 * @class Lexer
 * @classDesc 词法分析器类
 * @property {string} src 源代码字符串
 * @property {_SyntaxError[]} errors 错误列表
 * */
export class Lexer {
    private pos: Pos = new Pos();

    errors: _SyntaxError[] = [];

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

        if (!tokens.length || tokens[tokens.length - 1].type !== TokenType.EOF)
            tokens.push(new Token(TokenType.EOF, this.pos.pos));

        return tokens;
    }

    next(): Token {
        const preSpace = this.skip();
        const start = this.pos.pos;

        if (!this.current)
            return new Token(TokenType.EOF, this.pos, "", TokenCategory.OTHER, preSpace);

        if (this.current === "\n") {
            this.pos.newline();
            return new Token(TokenType.NEWLINE, start, "\\n", TokenCategory.WHITESPACE, preSpace);
        }

        if (isLetter(this.current) || this.current === "_")
            return this.extractIdentifier(preSpace);

        if (isDigit(this.current) || (this.current === "." && !!this.peek() && isDigit(this.peek()!)))
            return this.extractNumber(preSpace);

        if (this.current === "\"" || this.current === "'")
            return this.extractString(preSpace);

        if (this.current === "{" && GUID_PATTERN.test(this.src.slice(this.pos.offset, this.pos.offset + 40)))
            return this.extractGuid(preSpace);

        if (this.current === "/") {
            if (this.peek() === "/")
                return this.extractLineComment(preSpace);
            else if (this.peek() === "*")
                return this.extractBlockComment("*/", preSpace);

            return this.extractOperator(preSpace);
        }

        if (this.current === "(" && this.peek() === "*")
            return this.extractBlockComment("*)", preSpace);

        if (OPERATORS.has(this.current))
            return this.extractOperator(preSpace);

        this.reportError(this.localet?.("NEL1") || "Invalid token", start, this.pos.pos);
        const tk = new Token(TokenType.UNKNOWN, this.pos, this.current, TokenCategory.INVALID, preSpace);
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
     * @summary 跳过空白字符（不含换行）
     * @returns {number} 跳过的字符数
     * */
    private skip(): number {
        let count = 0;

        while (this.inScope() && isWhiteSpace(this.current) && this.current !== "\n") {
            this.pos.next();
            count++;
        }

        return count;
    }

    /**
     * @method extractIdentifier
     * @summary 提取标识符，并按硬关键字表分类
     * @remarks 软关键字（内建类型名、容器名）保持 `IDENTIFIER`，由语法层按上下文识别
     * */
    private extractIdentifier(preSpace: number): Token {
        let value = "";
        const start = this.pos.pos;

        while (this.inScope() && isIdentifierChar(this.current)) {
            value += this.current;
            this.pos.next();
        }

        const keyword = KEYWORDS.get(value);

        return keyword !== undefined
            ? new Token(keyword, start, value, TokenCategory.KEYWORD, preSpace)
            : new Token(TokenType.IDENTIFIER, start, value, TokenCategory.OTHER, preSpace);
    }

    /**
     * @method extractNumber
     * @summary 提取数字：十进制整数、`0x` 十六进制整数、浮点数
     * @remarks 浮点允许省略整数部分（`.127`）或小数部分（`53.`），没有指数与十六进制浮点
     * */
    private extractNumber(preSpace: number): Token {
        const start = this.pos.pos;

        // 十六进制整数
        if (this.current === "0" && !!this.peek() && this.peek()!.toLowerCase() === "x") {
            this.pos.move(2);
            let value = "0x";

            while (this.inScope() && isHexDigit(this.current)) {
                value += this.current;
                this.pos.next();
            }

            return new Token(TokenType.INT, start, value === "0x" ? "0" : value, TokenCategory.LITERAL, preSpace);
        }

        let value = "";
        let isFloat = false;

        while (this.inScope() && isDigit(this.current)) {
            value += this.current;
            this.pos.next();
        }

        // 小数点后可以没有数字（`53.`）
        if (this.current === ".") {
            isFloat = true;
            value += ".";
            this.pos.next();

            while (this.inScope() && isDigit(this.current)) {
                value += this.current;
                this.pos.next();
            }
        }

        // 省略整数部分的形式（`.127`）
        if (!value.startsWith(".") && !value.length)
            value = "0";

        return new Token(
            isFloat ? TokenType.FLOAT : TokenType.INT,
            start, value, TokenCategory.LITERAL, preSpace
        );
    }

    /**
     * @method extractString
     * @summary 提取字符串字面量
     * @remarks 单/双引号均可；NDF 没有转义序列，因此字符串在遇到同种引号或行尾时结束
     * */
    private extractString(preSpace: number): Token {
        const quote = this.current;
        const start = this.pos.pos;
        let value = quote;
        this.pos.next();  // skip quote

        while (this.inScope() && this.current !== quote && this.current !== "\n") {
            if (WHITESPACE_CHARS.has(this.current))
                value += `\\${WHITESPACE_CHARS.get(this.current)!}`;
            else
                value += this.current;

            this.pos.next();
        }

        if (this.current === quote) {
            value += quote;
            this.pos.next();  // skip quote
        } else
            this.reportError(this.localet?.("NEL2") || "Unterminated string literal", start, this.pos.pos);

        return new Token(TokenType.STRING, start, value, TokenCategory.LITERAL, preSpace);
    }

    /**
     * @method extractGuid
     * @summary 提取 GUID 值 `{8-4-4-4-12}`
     * */
    private extractGuid(preSpace: number): Token {
        const start = this.pos.pos;
        const match = GUID_PATTERN.exec(this.src.slice(this.pos.offset, this.pos.offset + 40))!;

        this.pos.move(match[0].length);

        return new Token(TokenType.GUID, start, match[0], TokenCategory.LITERAL, preSpace);
    }

    /**
     * @method extractLineComment
     * @summary 提取行注释（`//` 与 `///`）
     * */
    private extractLineComment(preSpace: number): Token {
        let value = "";
        const start = this.pos.pos;

        while (this.inScope() && this.current !== "\n") {
            value += this.current;
            this.pos.next();
        }

        return new Token(TokenType.COMMENT_LINE, start, value, TokenCategory.COMMENT, preSpace);
    }

    /**
     * @method extractBlockComment
     * @summary 提取块注释（`/* *\/` 与 `(* *)`）
     * @param {string} terminator 结束标记
     * */
    private extractBlockComment(terminator: string, preSpace: number): Token {
        const start = this.pos.pos;
        let value = this.current + this.peek()!;
        this.pos.move(2);  // skip opener

        while (this.inScope() && !(this.current === terminator[0] && this.peek() === terminator[1])) {
            value += this.current;
            this.current === "\n" ? this.pos.newline() : this.pos.next();
        }

        if (this.inScope()) {
            value += this.current + this.peek()!;
            this.pos.move(2);
        } else
            this.reportError(this.localet?.("NEL2") || "Unterminated block comment", start, this.pos.pos);

        return new Token(TokenType.COMMENT_BLOCK, start, value, TokenCategory.COMMENT, preSpace);
    }

    /**
     * @method extractOperator
     * @summary 提取运算符（含 `<=`/`>=`/`==`/`!=` 等双字符运算符）
     * */
    private extractOperator(preSpace: number): Token {
        const start = this.pos.pos;
        const first = this.current;
        let value = first;

        if (TWO_CHAR_OPERATOR_HEADS.has(first) && !!this.peek()) {
            const merged = first + this.peek();

            if (OPERATORS.has(merged))
                value = merged;
        }

        const type = OPERATORS.get(value);

        if (type === undefined) {
            this.reportError(this.localet?.("NEL3") || "Invalid operator", start, this.pos.pos);
            this.pos.next();
            return new Token(TokenType.UNKNOWN, start, value, TokenCategory.INVALID, preSpace);
        }

        this.pos.move(value.length);
        return new Token(type, start, value, TokenCategory.OPERATOR, preSpace);
    }
}
