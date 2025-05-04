// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file processor.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 17:47
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import {KEYWORDS, OPERATORS, Token, TokenCategory, TokenType} from "./token";
import {Nullable} from "../types";
import {unified} from "../utils";


export class Processor {
    private idx: number = 0;

    constructor(private tokens: Token[]) {
    }

    process(): Token[] {
        const result: Token[] = [];

        while (this.inScope()) {
            const tk = this.next();

            if (!tk)
                break;

            result.push(tk);
        }

        return result;
    }

    private get current(): Nullable<Token> {
        return this.tokens[this.idx];
    }

    private next(): Nullable<Token> {
        if (!this.current)  // Afterwards, all 'current' and 'advance' are not empty
            return undefined;

        if (this.current.category === TokenCategory.LITERAL)
            return this.procLiteral();
        else if (this.current.category === TokenCategory.OPERATOR)
            return this.procOperator();

        return this.advance();
    }

    private inScope(): boolean {
        return this.idx < this.tokens.length;
    }

    private advance(n: number = 1): Nullable<Token> {
        const tk = this.current;
        this.idx += n;
        return tk;
    }

    private procLiteral(): Token {
        const tk = this.advance()!;

        if (KEYWORDS.has(tk.value.toLowerCase()) && unified(tk.value)) {  // 由于Bool和bool会混淆关键字和标识符,所以需要大小写统一才视为关键字
            tk.type = KEYWORDS.get(tk.value.toLowerCase())!;
            tk.category = tk.value.toLowerCase() === 'div' ? TokenCategory.OPERATOR : TokenCategory.KEYWORD;
        }
        else if (tk.type === TokenType.UNKNOWN)
            tk.type = TokenType.IDENTIFIER;

        return tk;
    }

    private procOperator(): Token {
        const tk = this.advance()!;

        if (this.current && (tk.pos.column !== this.current?.pos.column - 1))  // 两个符号不是连在一起的(中间有空格), 则视为两个符号
            return tk;

        const merge = tk.value + (this.current?.value || '');

        if (OPERATORS.has(merge)) {
            tk.type = OPERATORS.get(merge)!;
            this.idx++;
        }

        return tk;
    }
}
