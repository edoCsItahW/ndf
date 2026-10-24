// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

/**
 * @file token.ts
 * @author edocsitahw
 * @version 2.0
 * @date 2025/04/17 11:50
 * @desc 定义令牌相关类（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 与 v1 的核心差异（对应 NDF.g4 v2.0）：
 * 1. **只有硬关键字是关键字**：`export/is/template/unnamed/nil/private/public/true/false/True/False/div`。
 *    内建类型名（`int/float3/RGB/...`）与容器名（`MAP/LIST/List/PAIR`）是"软关键字"，
 *    一律按 `IDENTIFIER` 产出，由语法/语义层按上下文判定——因此它们也可以当标识符用
 *    （语料实例：`RGB is 2`）。
 * 2. 新增 `GUID` 字面量令牌（`{8-4-4-4-12}` 十六进制），`GUID:{…}` 由语法层识别。
 * 3. 整数支持 `0x` 十六进制；浮点支持 `53.` 与 `.127` 两种省略写法。
 * 4. `/` 不再是除法运算符（v2 只有 `div`），它是命名空间/枚举路径分隔符，令牌仍叫 `DIV` 以兼容既有代码。
 * */
import { IPos, TokenState } from "../types";
import { enumToStr } from "../utils";


/**
 * @enum TokenType
 * @desc 令牌类型枚举（v2）
 * */
export enum TokenType {
    /** 整数（十进制或 0x 十六进制） */
    INT,
    /** 浮点数（`1.5`、`53.`、`.127`） */
    FLOAT,
    /** 字符串（单引号或双引号，无转义） */
    STRING,
    /** GUID 值 `{8-4-4-4-12}` */
    GUID,
    /** 标识符（含内建类型名等软关键字） */
    IDENTIFIER,

    /* ---------------- 硬关键字 ---------------- */
    KW_EXPORT,
    KW_IS,
    KW_TEMPLATE,
    KW_UNNAMED,
    KW_NIL,
    KW_PRIVATE,
    KW_PUBLIC,
    KW_TRUE,
    KW_FALSE,
    KW_DIV,

    /* ---------------- 运算符与分隔符 ---------------- */
    ADD,
    SUB,
    MUL,
    DIV,
    MOD,
    QUESTION,
    COLON,
    ASSIGN,
    BIN_OR,
    BIN_AND,
    LT,
    GT,
    LE,
    GE,
    EQ,
    NE,
    NOT,

    LPAREN,
    RPAREN,
    LBRACE,
    RBRACE,
    LBRACKET,
    RBRACKET,
    COMMA,
    SEMICOLON,
    DOT,
    DOLLAR,
    TILDE,

    /* ---------------- 注释与布局 ---------------- */
    COMMENT_LINE,
    COMMENT_BLOCK,
    NEWLINE,

    EOF,
    UNKNOWN,
    ERROR
}


/**
 * @enum TokenCategory
 * @desc 令牌类别枚举
 * */
export enum TokenCategory {
    KEYWORD,
    OPERATOR,
    LITERAL,
    COMMENT,
    WHITESPACE,
    OTHER,
    INVALID
}


/**
 * @const OPERATORS
 * @desc 运算符映射表（单字符与双字符）
 * */
export const OPERATORS: Map<string, TokenType> = new Map([
    ["+", TokenType.ADD],
    ["-", TokenType.SUB],
    ["*", TokenType.MUL],
    ["/", TokenType.DIV],
    ["%", TokenType.MOD],
    ["?", TokenType.QUESTION],
    [":", TokenType.COLON],
    ["=", TokenType.ASSIGN],
    ["==", TokenType.EQ],
    ["!=", TokenType.NE],
    ["|", TokenType.BIN_OR],
    ["&", TokenType.BIN_AND],
    ["<", TokenType.LT],
    [">", TokenType.GT],
    ["<=", TokenType.LE],
    [">=", TokenType.GE],
    ["!", TokenType.NOT],
    ["(", TokenType.LPAREN],
    [")", TokenType.RPAREN],
    ["{", TokenType.LBRACE],
    ["}", TokenType.RBRACE],
    ["[", TokenType.LBRACKET],
    ["]", TokenType.RBRACKET],
    [",", TokenType.COMMA],
    [";", TokenType.SEMICOLON],
    [".", TokenType.DOT],
    ["$", TokenType.DOLLAR],
    ["~", TokenType.TILDE]
]);


/**
 * @const KEYWORDS
 * @desc **硬关键字**映射表。软关键字不在此表中（见 {@link BUILTIN_TYPE_NAMES}）。
 * @remarks `div` 是唯一以关键字形式出现的运算符。
 * */
export const KEYWORDS: Map<string, TokenType> = new Map([
    ["export", TokenType.KW_EXPORT],
    ["is", TokenType.KW_IS],
    ["template", TokenType.KW_TEMPLATE],
    ["unnamed", TokenType.KW_UNNAMED],
    ["nil", TokenType.KW_NIL],
    ["private", TokenType.KW_PRIVATE],
    ["public", TokenType.KW_PUBLIC],
    ["true", TokenType.KW_TRUE],
    ["false", TokenType.KW_FALSE],
    ["True", TokenType.KW_TRUE],
    ["False", TokenType.KW_FALSE],
    ["div", TokenType.KW_DIV]
]);


/**
 * @const BUILTIN_TYPE_NAMES
 * @desc 内建类型名（软关键字）。它们按 `IDENTIFIER` 产出，语法层用于识别类型引用，
 * 语义层用于推导内建类型。语料中出现的全部内建类型名都在此集合中。
 * */
export const BUILTIN_TYPE_NAMES: Set<string> = new Set([
    "int", "integer", "int2", "int3", "int4",
    "float", "single", "float2", "float3", "float4",
    "string", "bool", "boolean", "color", "RGB", "RGBA"
]);


/**
 * @const GENERIC_TYPE_NAMES
 * @desc 容器/泛型名（软关键字）：`LIST<T>`、`List<T>`、`PAIR<A,B>`、`MAP<K,V>`。
 * */
export const GENERIC_TYPE_NAMES: Set<string> = new Set(["LIST", "List", "PAIR", "MAP"]);


/**
 * @const INVERSE_OPERATORS
 * @desc 反向运算符映射表（用于补全与格式化）
 * */
export const INVERSE_OPERATORS = new Map<TokenType, string>([
    [TokenType.ADD, "+"],
    [TokenType.SUB, "-"],
    [TokenType.MUL, "*"],
    [TokenType.DIV, "/"],
    [TokenType.MOD, "%"],
    [TokenType.QUESTION, "?"],
    [TokenType.COLON, ":"],
    [TokenType.ASSIGN, "="],
    [TokenType.EQ, "=="],
    [TokenType.NE, "!="],
    [TokenType.BIN_OR, "|"],
    [TokenType.BIN_AND, "&"],
    [TokenType.LT, "<"],
    [TokenType.GT, ">"],
    [TokenType.LE, "<="],
    [TokenType.GE, ">="],
    [TokenType.NOT, "!"],
    [TokenType.LPAREN, "("],
    [TokenType.RPAREN, ")"],
    [TokenType.LBRACE, "{"],
    [TokenType.RBRACE, "}"],
    [TokenType.LBRACKET, "["],
    [TokenType.RBRACKET, "]"],
    [TokenType.COMMA, ","],
    [TokenType.SEMICOLON, ";"],
    [TokenType.DOT, "."],
    [TokenType.DOLLAR, "$"],
    [TokenType.TILDE, "~"],
    [TokenType.KW_DIV, "div"]
]);


/**
 * @const INVERSE_KEYWORDS
 * @desc 反向关键字映射表
 * */
export const INVERSE_KEYWORDS = new Map<TokenType, string>([
    [TokenType.KW_EXPORT, "export"],
    [TokenType.KW_IS, "is"],
    [TokenType.KW_TEMPLATE, "template"],
    [TokenType.KW_UNNAMED, "unnamed"],
    [TokenType.KW_NIL, "nil"],
    [TokenType.KW_PRIVATE, "private"],
    [TokenType.KW_PUBLIC, "public"],
    [TokenType.KW_TRUE, "true"],
    [TokenType.KW_FALSE, "false"],
    [TokenType.KW_DIV, "div"]
]);


/**
 * @const WHITESPACE_CHARS
 * @desc 空白字符映射表（内部仍用转义形式保存换行，格式化器依赖它）
 * */
export const WHITESPACE_CHARS: Map<string, string> = new Map([
    ["\n", "n"],
    ["\r", "r"],
    ["\t", "t"],
    ["\b", "b"]
]);


export function getCategory(type: TokenType): TokenCategory {
    switch (type) {
        case TokenType.INT:
        case TokenType.FLOAT:
        case TokenType.STRING:
        case TokenType.GUID:
            return TokenCategory.LITERAL;
        case TokenType.KW_EXPORT:
        case TokenType.KW_IS:
        case TokenType.KW_TEMPLATE:
        case TokenType.KW_UNNAMED:
        case TokenType.KW_NIL:
        case TokenType.KW_PRIVATE:
        case TokenType.KW_PUBLIC:
        case TokenType.KW_TRUE:
        case TokenType.KW_FALSE:
        case TokenType.KW_DIV:
            return TokenCategory.KEYWORD;
        case TokenType.ADD:
        case TokenType.SUB:
        case TokenType.MUL:
        case TokenType.DIV:
        case TokenType.MOD:
        case TokenType.QUESTION:
        case TokenType.COLON:
        case TokenType.ASSIGN:
        case TokenType.BIN_OR:
        case TokenType.BIN_AND:
        case TokenType.LT:
        case TokenType.GT:
        case TokenType.LE:
        case TokenType.GE:
        case TokenType.EQ:
        case TokenType.NE:
        case TokenType.NOT:
        case TokenType.LPAREN:
        case TokenType.RPAREN:
        case TokenType.LBRACE:
        case TokenType.RBRACE:
        case TokenType.LBRACKET:
        case TokenType.RBRACKET:
        case TokenType.COMMA:
        case TokenType.SEMICOLON:
        case TokenType.DOT:
        case TokenType.DOLLAR:
        case TokenType.TILDE:
            return TokenCategory.OPERATOR;
        case TokenType.COMMENT_BLOCK:
        case TokenType.COMMENT_LINE:
            return TokenCategory.COMMENT;
        case TokenType.NEWLINE:
            return TokenCategory.WHITESPACE;
        case TokenType.IDENTIFIER:
        case TokenType.EOF:
            return TokenCategory.OTHER;
        case TokenType.UNKNOWN:
        case TokenType.ERROR:
            return TokenCategory.INVALID;
    }
}


/**
 * @class Token
 * @classdesc 令牌类
 * @property {TokenType} type 令牌类型
 * @property {IPos} pos 令牌位置
 * @property {string} value 令牌值
 * @property {TokenCategory} category 令牌类别
 * @property {number} preSpace 前置空白字符数
 * */
export class Token {
    state: TokenState = {
        stmtStart: false
    };

    /**
     * @constructor
     * @param {TokenType} type 令牌类型
     * @param {IPos} pos 令牌位置
     * @param {string} [value=''] 令牌值
     * @param {TokenCategory} [category=TokenCategory.OTHER] 令牌类别
     * @param {number} [preSpace=0] 前置空白字符数
     * */
    constructor(
        public type: TokenType,
        public pos: IPos,
        public value: string = "",
        public category: TokenCategory = TokenCategory.OTHER,
        public preSpace: number = 0
    ) {
    }

    toString(): string {
        return `<('${this.value}': ${enumToStr(TokenType, this.type)}) Token at ${this.pos.line}:${this.pos.column}>`;
    }

    get length(): number {
        return this.value.length + this.preSpace;
    }
}
