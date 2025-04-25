// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

import {isDigit, isHexDigit, isIdentifierChar, isLetter, isWhiteSpace, Pos} from "../utils";
/**
 * @file lexer.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 13:37
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import {OPERATORS, Token, TokenCategory, TokenType, WHITESPACE_CHARS} from "./token";
import {_SyntaxError} from "../expection";
import {IPos, Nullable, PartialLocalet} from "../types";
import {methodDebug} from "../debug";
import { Locale } from "../IDEHelper";


function lexerDebug(obj: Lexer, fnName: string) {
    if (obj.debug)
        console.log(`Lexer.${fnName}()`);
}


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

        if (tokens.length && tokens[tokens.length - 1].type !== TokenType.EOF)
            tokens.push(new Token(TokenType.EOF, this.pos.pos));

        return tokens;
    }

    next(): Token {
        this.skip();
        const start = this.pos.pos;


        if (!this.current)
            return new Token(TokenType.EOF, this.pos);

        else if (this.current === '\n') {
            this.pos.newline();
            return new Token(TokenType.NEWLINE, start, '\\n');
        }

        else if (isLetter(this.current))
            return this.extractIdentifier();

        else if (isDigit(this.current) || (this.current === '.' && this.peek() && isDigit(this.peek()!)))
            return this.extractNumber();

        else if (this.current === '"' || this.current === "'")
            return this.extractString();

        else if (['$', '~', '.'].includes(this.current))
            return this.extractReference();

        else if (this.current === '/') {
            if (this.peek() && this.peek()! === '/')  // Referecne may also have '//', but we have resolved and ruled it out
                return this.extractLineComment();
            else if (this.peek() && this.peek()! === '*')
                return this.extractBlockComment();
            else
                return this.extractOperator();
        }

        else if (this.current === '(' && this.peek() && this.peek()! === '*')
            return this.extractBlockComment();

        else if (OPERATORS.has(this.current))
            return this.extractOperator();

        this.reportError(this.localet?.("NEL1") || "Invalid token", start, this.pos.pos);
        const tk = new Token(TokenType.UNKNOWN, this.pos, "", TokenCategory.INVALID);
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

    private skip() {
        while (this.inScope() && isWhiteSpace(this.current) && this.current !== '\n')
            this.pos.next();
    }

    @methodDebug(lexerDebug)
    private extractIdentifier(): Token {
        let value = "";
        const start = this.pos.pos;

        while (this.inScope() && isIdentifierChar(this.current)) {
            value += this.current;
            this.pos.next();
        }

        return new Token(TokenType.UNKNOWN, start, value, TokenCategory.LITERAL);
    }

    @methodDebug(lexerDebug)
    private extractNumber(): Token {
        let value = "";
        const start = this.pos.pos;
        let vaild = true;
        let type: 'f' | 'h' | 'i' | 'u' = 'i';

        if (this.current === '0' && this.peek() && this.peek()!.toLowerCase() === 'x') {  // hex number
            value += this.current + this.peek()!;
            this.pos.move(2);
            type = 'h';
        }

        while (this.inScope() && ((type === 'h' ? isHexDigit(this.current) : isDigit(this.current)) || this.current === '.')) {
            if (this.current === '.' && type !== 'h') {
                if (type === 'f') break;  // already has a decimal point

                type = 'f';
            }

            value += this.current;
            this.pos.next();
        }

        return new Token(type === 'f' ? TokenType.FLOAT : TokenType.INT, start, value, vaild ? TokenCategory.LITERAL : TokenCategory.INVALID);
    }

    @methodDebug(lexerDebug)
    private extractString(): Token {
        const quote = this.current;
        let value = quote;
        const start = this.pos.pos;
        this.pos.next();  // skip quote

        while (this.inScope() && this.current !== quote) {
            if (WHITESPACE_CHARS.has(this.current)) {
                value += `\\${WHITESPACE_CHARS.get(this.current)!}`;
                this.pos.next();  // In a string, '\' and 'n' are not considered spaces
            }
            else
                value += this.current;
            this.pos.next();
        }

        value += quote;
        this.pos.next();  // skip quote
        return new Token(TokenType.STRING, start, value, TokenCategory.LITERAL);
    }

    @methodDebug(lexerDebug)
    private extractReference(): Token {
        let value = this.current;
        const start = this.pos.pos;
        let valid = true;
        this.pos.next();  // skip $, ~ or .

        if (this.current !== '/') {
            this.reportError(this.localet?.("NEL2") || "Invalid **reference**", start, this.pos.pos);
            valid = false;
        }

        value += this.current;
        this.pos.next();  // skip /

        while (this.inScope() && (isIdentifierChar(this.current!) || this.current === '/')) {
            value += this.current;
            this.pos.next();
        }

        return new Token(TokenType.REFERENCE, start, value, valid ? TokenCategory.LITERAL : TokenCategory.INVALID);
    }

    @methodDebug(lexerDebug)
    private extractLineComment(): Token {
        let value = "//";
        const start = this.pos.pos;
        this.pos.move(2);  // skip //

        while (this.inScope() && this.current !== '\n') {
            value += this.current;
            this.pos.next();
        }

        return new Token(TokenType.COMMENT_LINE, start, value, TokenCategory.COMMENT);
    }

    @methodDebug(lexerDebug)
    private extractBlockComment(): Token {
        let value = this.current + "*";
        const start = this.pos.pos;
        const comment = this.current;
        this.pos.move(2);  // skip /* or (*

        while (this.inScope() && !(this.current === '*' && this.peek() === comment)) {
            value += this.current;
            this.current === '\n' ? this.pos.newline() : this.pos.next();
        }

        value += this.current + this.peek()!;
        this.pos.move(2);  // skip */ or *)

        return new Token(TokenType.COMMENT_BLOCK, start, value, TokenCategory.COMMENT);
    }

    @methodDebug(lexerDebug)
    private extractOperator(): Token {
        const start = this.pos.pos;

        let op: Token;

        if (OPERATORS.has(this.current))
            op = new Token(OPERATORS.get(this.current)!, start, this.current, TokenCategory.OPERATOR);
        else {
            this.reportError(this.localet?.("NEL3") || "Invalid **operator**", start, this.pos.pos);
            op = new Token(TokenType.UNKNOWN, start, this.current, TokenCategory.INVALID);
        }

        this.pos.next();  // skip operator

        return op;
    }
}
