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
 * @version 1.1
 * @date 2025/04/17 11:50
 * @desc 定义令牌相关类
 * @copyright CC BY-NC-SA 2024. All rights reserved.
 * */
import { IPos } from "../types";
import { enumToStr } from "../utils";


/**
 * @enum TokenType
 * @desc 令牌类型枚举
 * @property INT 整数
 * @property FLOAT 浮点数
 * @property STRING 字符串
 * @property REFERENCE 引用
 * @property IDENTIFIER 标识符
 * @property KW_INT 关键字int
 * @property KW_FLOAT 关键字float
 * @property KW_STRING 关键字string
 * @property KW_BOOL 关键字bool
 * @property KW_IS 关键字is
 * @property KW_EXPORT 关键字export
 * @property KW_NIL 关键字nil
 * @property KW_TRUE 关键字true
 * @property KW_FALSE 关键字false
 * @property KW_DIV 关键字div
 * @property KW_MAP 关键字map
 * @property KW_TEMPLATE 关键字template
 * @property KW_UNNAMED 关键字unnamed
 * @property KW_PRIVATE 关键字private
 * @property ADD 加
 * @property SUB 减
 * @property MUL 乘
 * @property DIV 除
 * @property MOD 模
 * @property QUESTION 问号
 * @property COLON 冒号
 * @property ASSIGN 赋值
 * @property BIN_OR 或
 * @property BIN_AND 与
 * @property LT 小于
 * @property GT 大于
 * @property LE 小于等于
 * @property GE 大于等于
 * @property EQ 等于
 * @property NE 不等于
 * @property NOT 非
 * @property LPAREN 左括号
 * @property RPAREN 右括号
 * @property LBRACE 左大括号
 * @property RBRACE 右大括号
 * @property LBRACKET 左中括号
 * @property RBRACKET 右中括号
 * @property COMMA 逗号
 * @property DOT 点
 * @property DOLLAR 美元符号
 * @property TILDE 波浪线
 * @property COMMENT_LINE 单行注释
 * @property COMMENT_BLOCK 块注释
 * @property NEWLINE 换行符
 * @property EOF 结束符
 * @property UNKNOWN 未知
 * @property ERROR 错误
 * */
export enum TokenType {
    /** 整数 */
    INT,
    /** 浮点数 */
    FLOAT,
    /** 字符串 */
    STRING,
    /** 引用 */
    REFERENCE,
    /** 标识符 */
    IDENTIFIER,

    /** 关键字int */
    KW_INT,
    /** 关键字float */
    KW_FLOAT,
    /** 关键字string */
    KW_STRING,
    /** 关键字bool */
    KW_BOOL,
    /** 关键字is */
    KW_IS,
    /** 关键字export */
    KW_EXPORT,
    /** 关键字nil */
    KW_NIL,
    /** 关键字true */
    KW_TRUE,
    /** 关键字false */
    KW_FALSE,
    /** 关键字div */
    KW_DIV,
    /** 关键字map */
    KW_MAP,
    /** 关键字template */
    KW_TEMPLATE,
    /** 关键字unnamed */
    KW_UNNAMED,
    /** 关键字private */
    KW_PRIVATE,
    /** 关键字public */
    KW_PUBLIC,

    /** 加(+) */
    ADD,
    /** 减(-) */
    SUB,
    /** 乘(*) */
    MUL,
    /** 除(/) */
    DIV,
    /** 模(%) */
    MOD,
    /** 问号(?) */
    QUESTION,
    /** 冒号(:) */
    COLON,
    /** 赋值(=) */
    ASSIGN,
    /** 或(|) */
    BIN_OR,
    /** 与(&) */
    BIN_AND,
    /** 小于(<) */
    LT,
    /** 大于(>) */
    GT,
    /** 小于等于(<=) */
    LE,
    /** 大于等于(>=) */
    GE,
    /** 等于(==) */
    EQ,
    /** 不等于(!=) */
    NE,
    /** 非(!) */
    NOT,

    /** 左括号(() */
    LPAREN,
    /** 右括号()) */
    RPAREN,
    /** 左大括号({) */
    LBRACE,
    /** 右大括号(}) */
    RBRACE,
    /** 左中括号([) */
    LBRACKET,
    /** 右中括号(]) */
    RBRACKET,
    /** 逗号(,) */
    COMMA,
    /** 点(.) */
    DOT,
    /** 美元符号($) */
    DOLLAR,
    /** 波浪线(~) */
    TILDE,

    /** 单行注释 */
    COMMENT_LINE,
    /** 块注释 */
    COMMENT_BLOCK,

    /** 换行符 */
    NEWLINE,
    /** 结束符 */
    EOF,
    /** 未知 */
    UNKNOWN,
    /** 错误 */
    ERROR
}


/**
 * @enum TokenCategory
 * @summary 令牌类别枚举
 * @property KEYWORD 关键字
 * @property OPERATOR 操作符
 * @property LITERAL 字面量
 * @property COMMENT 注释
 * @property WHITESPACE 空白字符
 * @property OTHER 其他
 * @property INVALID 无效
 * */
export enum TokenCategory {
    /** 关键字 */
    KEYWORD,
    /** 操作符 */
    OPERATOR,
    /** 字面量 */
    LITERAL,
    /** 注释 */
    COMMENT,
    /** 空白字符 */
    WHITESPACE,
    /** 其他 */
    OTHER,
    /** 无效 */
    INVALID
}


/**
 * @const {Map<string, TokenType>} OPERATORS
 * @summary 操作符映射表
 * @desc 用于将字符串形式的操作符映射到对应的令牌类型
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
    ["|", TokenType.BIN_OR],
    ["&", TokenType.BIN_AND],
    ["<", TokenType.LT],
    [">", TokenType.GT],
    ["<=", TokenType.LE],
    [">=", TokenType.GE],
    ["==", TokenType.EQ],
    ["!=", TokenType.NE],
    ["!", TokenType.NOT],
    ["(", TokenType.LPAREN],
    [")", TokenType.RPAREN],
    ["{", TokenType.LBRACE],
    ["}", TokenType.RBRACE],
    ["[", TokenType.LBRACKET],
    ["]", TokenType.RBRACKET],
    [",", TokenType.COMMA],
    [".", TokenType.DOT],
    ["$", TokenType.DOLLAR],
    ["~", TokenType.TILDE],
    ["div", TokenType.KW_DIV]
]);


/**
 * @const {Map<string, TokenType>} KEYWORDS
 * @summary 关键字映射表
 * @desc 用于将字符串形式的关键字映射到对应的令牌类型
 * */
export const KEYWORDS: Map<string, TokenType> = new Map([
    ["int", TokenType.KW_INT],
    ["float", TokenType.KW_FLOAT],
    ["string", TokenType.KW_STRING],
    ["bool", TokenType.KW_BOOL],
    ["is", TokenType.KW_IS],
    ["export", TokenType.KW_EXPORT],
    ["nil", TokenType.KW_NIL],
    ["true", TokenType.KW_TRUE],
    ["false", TokenType.KW_FALSE],
    ["div", TokenType.KW_DIV],
    ["map", TokenType.KW_MAP],
    ["template", TokenType.KW_TEMPLATE],
    ["unnamed", TokenType.KW_UNNAMED],
    ["private", TokenType.KW_PRIVATE],
    ["public", TokenType.KW_PUBLIC]
]);


/**
 * @const {Map<TokenType, string>} INVERSE_OPERATORS
 * @summary 反向操作符映射表
 * @desc 用于将令牌类型映射到对应的字符串形式的操作符
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
    [TokenType.BIN_OR, "|"],
    [TokenType.BIN_AND, "&"],
    [TokenType.LT, "<"],
    [TokenType.GT, ">"],
    [TokenType.LE, "<="],
    [TokenType.GE, ">="],
    [TokenType.EQ, "=="],
    [TokenType.NE, "!="],
    [TokenType.NOT, "!"],
    [TokenType.LPAREN, "("],
    [TokenType.RPAREN, ")"],
    [TokenType.LBRACE, "{"],
    [TokenType.RBRACE, "}"],
    [TokenType.LBRACKET, "["],
    [TokenType.RBRACKET, "]"],
    [TokenType.COMMA, ","],
    [TokenType.DOT, "."],
    [TokenType.DOLLAR, "$"],
    [TokenType.TILDE, "~"],
    [TokenType.KW_DIV, "div"]
]);


/**
 * @const {Map<TokenType, string>} INVERSE_KEYWORDS
 * @summary 反向关键字映射表
 * @desc 用于将令牌类型映射到对应的字符串形式的关键字
 * */
export const INVERSE_KEYWORDS = new Map<TokenType, string>([
    [TokenType.KW_INT, "int"],
    [TokenType.KW_FLOAT, "float"],
    [TokenType.KW_STRING, "string"],
    [TokenType.KW_BOOL, "bool"],
    [TokenType.KW_IS, "is"],
    [TokenType.KW_EXPORT, "export"],
    [TokenType.KW_NIL, "nil"],
    [TokenType.KW_TRUE, "true"],
    [TokenType.KW_FALSE, "false"],
    [TokenType.KW_DIV, "div"],
    [TokenType.KW_MAP, "MAP"],
    [TokenType.KW_TEMPLATE, "template"],
    [TokenType.KW_UNNAMED, "unnamed"],
    [TokenType.KW_PRIVATE, "private"],
    [TokenType.KW_PUBLIC, "public"]
]);


/**
 * @const {Map<string, string>} WHITESPACE_CHARS
 * @summary 空白字符映射表
 * @desc 用于将字符串形式的空白字符映射到对应的单字符形式
 * */
export const WHITESPACE_CHARS: Map<string, string> = new Map([
    ["\n", "n"],
    ["\r", "r"],
    ["\t", "t"],
    ["\b", "b"]
]);


/**
 * @class Token
 * @classdesc 令牌类
 * @property type {TokenType} 令牌类型
 * @property pos {IPos} 令牌位置
 * @property value {string} 令牌值
 * @property category {TokenCategory} 令牌类别
 * */
export class Token {
    /**
     * @constructor
     * @param {TokenType} type 令牌类型
     * @param {IPos} pos 令牌位置
     * @param {string} [value=''] 令牌值
     * @param {TokenCategory} [category=TokenCategory.OTHER] 令牌类别
     * */
    constructor(public type: TokenType, public pos: IPos, public value: string = "", public category: TokenCategory = TokenCategory.OTHER) {
    }

    toString(): string {
        return `<('${this.value}': ${enumToStr(TokenType, this.type)}) Token at ${this.pos.line}:${this.pos.column}>`;
    }
}
