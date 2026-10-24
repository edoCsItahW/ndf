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
 * @version 2.0
 * @date 2025/04/23 16:34
 * @desc 代码补全（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 补全依赖语法分析器写在令牌 `state.inferNext` 上的"下一步期望"，配合作用域符号表：
 * - 期望标识符时：给出作用域符号 + 软关键字（内建类型名、`MAP`/`LIST`/`List`/`PAIR`）；
 * - 光标紧跟 `/` 或 `.` 时：给出父对象的原型域成员（枚举/成员路径补全）；
 * - 其余情况：给出 `inferNext` 里的关键字与运算符。
 *
 * 另外修正了 v1 的位置推断：v1 只有在"光标正好落在某个令牌末尾"时才工作，
 * 这里改成"光标之前最后一个令牌"，因此空行、行尾与括号后都能补全。
 * */
import { ObjectType, Scope, TemplateType, Type, typeToStr } from "../parser";
import {
    BUILTIN_TYPE_NAMES,
    GENERIC_TYPE_NAMES,
    getCategory,
    INVERSE_KEYWORDS,
    INVERSE_OPERATORS,
    Token,
    TokenCategory,
    TokenType
} from "../lexer";
import { CompletionItem, CompletionKind, IPos, Nullable } from "../types";


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

    /** 光标之前最后一个令牌的下标（-1 表示光标在最前面） */
    private get idx(): number {
        if (this._idx !== undefined)
            return this._idx;

        let best = -1;

        for (let i = 0; i < this.tokens.length; i++) {
            const token = this.tokens[i];

            if (token.type === TokenType.EOF)
                break;

            const endColumn = token.pos.column + token.value.length;
            const before = token.pos.line < this.pos.line
                || (token.pos.line === this.pos.line && endColumn <= this.pos.column);

            if (before)
                best = i;
            else
                break;
        }

        return (this._idx = best);
    }

    /** 光标之前的令牌 */
    private get current(): Nullable<Token> {
        return this.idx >= 0 ? this.tokens[this.idx] : undefined;
    }

    /** 光标所在行的已输入前缀 */
    private get prefix(): string {
        const line = this.src.split("\n")[this.pos.line - 1] || "";
        const before = line.slice(0, this.pos.column - 1);

        return /[A-Za-z_][A-Za-z0-9_]*$/.exec(before)?.[0] ?? "";
    }

    /** 真正作为语法上下文的令牌：若光标处的标识符是正在输入的前缀，则取它之前的令牌 */
    private get context(): Nullable<Token> {
        const current = this.current;

        if (!current)
            return undefined;

        if (this.prefix && current.type === TokenType.IDENTIFIER && current.value === this.prefix)
            return this.tokens[this.idx - 1];

        return current;
    }

    provide(src: string, pos: IPos): CompletionItem[] {
        this.update(src, pos);

        const result: CompletionItem[] = [];
        const context = this.context;

        if (!context) {
            this.symbols(result);
            return result;
        }

        if (this.debug)
            console.log(`prefix: '${this.prefix}', context: ${context.toString()}`);

        // 成员/枚举路径补全：光标紧跟 `/` 或 `.`
        if (context.type === TokenType.DIV || context.type === TokenType.DOT) {
            const parent = this.tokens[this.idx - 2];

            if (parent && parent.type === TokenType.IDENTIFIER)
                this.members(parent.value, result);

            return result;
        }

        const infer = context.state.inferNext?.slice() ?? [];

        if (infer.includes(TokenType.IDENTIFIER)) {
            infer.splice(infer.indexOf(TokenType.IDENTIFIER), 1);
            this.symbols(result);
        }

        for (const type of infer) {
            const category = getCategory(type);
            const flag: "keyword" | "operator" = category === TokenCategory.KEYWORD ? "keyword" : "operator";
            const name = INVERSE_KEYWORDS.get(type) || INVERSE_OPERATORS.get(type) || "";

            if (name && name.startsWith(this.prefix))
                result.push({
                    label: name,
                    kind: this.getKind(type),
                    detail: "",
                    sortText: (flag === "keyword" ? "1" : "0") + name
                });
        }

        return result;
    }

    /** 作用域符号 + 软关键字 */
    private symbols(result: CompletionItem[]) {
        for (const [name, symbol] of this.scope.symbols)
            if (name.startsWith(this.prefix))
                result.push({
                    label: name,
                    kind: this.getKind(symbol.type),
                    detail: typeToStr(symbol.type),
                    sortText: "2" + name
                });

        for (const name of [...BUILTIN_TYPE_NAMES, ...GENERIC_TYPE_NAMES])
            if (name.startsWith(this.prefix))
                result.push({
                    label: name,
                    kind: CompletionKind.Keyword,
                    detail: BUILTIN_TYPE_NAMES.has(name) ? "builtin type" : "container",
                    sortText: "1" + name
                });
    }

    /** 父对象的原型域成员（`Enum/`、`Object.` 之后） */
    private members(parentName: string, result: CompletionItem[]) {
        const parent = this.scope.lookup(parentName);

        if (parent && (parent.type instanceof TemplateType || parent.type instanceof ObjectType)) {
            for (const [name, symbol] of parent.type.prototypeScope!.symbols)
                if (name.startsWith(this.prefix))
                    result.push({
                        label: name,
                        kind: this.getKind(symbol.type),
                        detail: typeToStr(symbol.type),
                        sortText: "0" + name
                    });
        }
    }

    update(src: string, pos: IPos): void;
    update(scope: Scope, tokens: Token[]): void;
    update(srcOrScope: string | Scope, posOrTokens: IPos | Token[]): void {
        if (typeof srcOrScope === "string" && !Array.isArray(posOrTokens)) {
            this.src = srcOrScope;
            this.pos = posOrTokens;
            this._idx = undefined;
        } else {
            this.scope = srcOrScope as Scope;
            this.tokens = posOrTokens as Token[];
            this._idx = undefined;
        }
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
