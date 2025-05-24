// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file completion.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/23 16:34
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { ObjectType, Scope, TemplateType, Type, typeToStr } from "../parser";
import { getCategory, INVERSE_KEYWORDS, INVERSE_OPERATORS, Token, TokenCategory, TokenType } from "../lexer";
import { CompletionItem, CompletionKind, IPos, Nullable } from "../types";
import { enumToStr, isWhiteSpace } from "../utils";


export class Completion {
    private static _instance: Completion;
    private src: string = "";
    private pos: IPos = { line: -1, column: -1 };
    private _idx: Nullable<number>;

    constructor(private scope: Scope, private tokens: Token[], public debug: boolean = false) {
        if (Completion._instance)
            Completion._instance.update(scope, tokens);

        else
            Completion._instance = this;

        Completion._instance._idx = undefined;
        return Completion._instance;
    }

    get instance(): Completion {
        return Completion._instance;
    }

    private get idx(): number {
        if (this._idx === undefined)
            this._idx = this.tokens.findIndex((t, idx) => {
                    if (t.pos.line === this.pos.line && t.pos.column + t.value.length === this.pos.column)
                        return true;
                    else
                        this._idx = idx;
                }
            );

        return this._idx;
    }

    private get current(): Nullable<Token> {
        return this.tokens[this.idx];
    }

    private get prefix(): string {
        const line = this.src.split("\n")[this.pos.line - 1] || "";

        const lastWord = line.slice(0, this.pos.column - 1).split(" ").pop() || "";

        if (isWhiteSpace(lastWord) || lastWord === "")
            return "";

        return lastWord;
    }

    provide(src: string, pos: IPos): CompletionItem[] {
        this.update(src, pos);

        const result: CompletionItem[] = [];

        if (this.current === undefined)  // 几乎不，最少有EOF
            return result;

        let current = this.previous() || (this.prefix === "" ? this.current : this.tokens[this.tokens.length - 1]);  // 通过空格激活的补全

        if (this.debug) console.log(
            `prefix: '${this.prefix}'`,
            ", current: ", current.toString(),
            ", infer: ", current.state.inferNext?.map(t => enumToStr(TokenType, t))?.join(", ")
        );

        let infer = current.state.inferNext?.slice();

        if (this.current.type === TokenType.DIV && current.type === TokenType.IDENTIFIER) {  // 除号，开始成员补全

            const parent = this.scope.lookup(current.value);
            if (parent && (parent.type instanceof TemplateType || parent.type instanceof ObjectType)) {  // 父蓝图存在

                for (const [name, symbol] of parent.type.prototypeScope!.symbols)
                    if (name.startsWith(this.prefix) || this.current.type === TokenType.DIV)
                        result.push({
                            label: name,
                            kind: this.getKind(symbol.type),
                            detail: typeToStr(symbol.type),
                            sortText: "2" + name
                        });
            }

            return result;
        } else if (current.state.inferNext?.includes(TokenType.IDENTIFIER)) {
            infer?.splice(infer.indexOf(TokenType.IDENTIFIER), 1);

            for (const [name, symbol] of this.scope.symbols)
                if (name.startsWith(this.prefix))
                    result.push({
                        label: name,
                        kind: this.getKind(symbol.type),
                        detail: typeToStr(symbol.type),
                        sortText: "2" + name
                    });
        }

        for (const type of infer || []) {
            const category = getCategory(type);
            const flag: "keyword" | "operator" = category === TokenCategory.KEYWORD ? "keyword" : "operator";
            const name = INVERSE_KEYWORDS.get(type) || INVERSE_OPERATORS.get(type) || "";

            if (name.startsWith(this.prefix))
                result.push({
                    label: name,
                    kind: this.getKind(type),
                    detail: "",
                    sortText: (flag === "keyword" ? "1" : "0") + name
                });
        }

        return result;
    }

    update(src: string, pos: IPos): void;
    update(scope: Scope, tokens: Token[]): void;
    update(srcOrScope: string | Scope, posOrTokens: IPos | Token[]): void {
        if (typeof srcOrScope === "string" && !Array.isArray(posOrTokens)) {
            this.src = srcOrScope;
            this.pos = posOrTokens;
        } else {
            this.scope = srcOrScope as Scope;
            this.tokens = posOrTokens as Token[];
        }
    }

    private previous(n: number = 1): Nullable<Token> {
        return this.tokens[this.idx - n];
    }

    private getKind(type: Type): CompletionKind;
    private getKind(type: TokenType): CompletionKind;
    private getKind(type: TokenType | Type): CompletionKind {
        if (typeof type === "number") {
            const category = getCategory(type);

            if (type === TokenType.IDENTIFIER)
                return CompletionKind.Variable;

            switch (category) {
                case TokenCategory.KEYWORD:
                    return CompletionKind.Keyword;
                case TokenCategory.OPERATOR:
                    return CompletionKind.Operator;
                default:
                    return CompletionKind.Field;
            }
        } else if (type instanceof TemplateType)
            return CompletionKind.Template;

        else if (type instanceof ObjectType)
            return CompletionKind.Variable;

        else
            return CompletionKind.Field;
    }
}

