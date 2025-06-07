// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file formatter.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/06/05 03:47
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { Optional } from "../types";
import { Assignment, AST, Comment, Program, Statement, TemplateDef } from "../parser";


class Formatter {
    private readonly config: FormatConfig;

    constructor(config: Partial<FormatConfig> = {}, private readonly ast: Program) {
        this.config = Object.assign(config, DEFAULT_FORMAT_CONFIG);
    }

    format(): string {
        const context : FormatContext = {
            currentLineLength: 0,
            indentLevel: 0,
            nestingDepth: 0,
            alignmentGroups: new Map()
        };

        return this.formatProgram(this.ast, context);
    }

    private formatProgram(node: Program, context: FormatContext): string {
        return node.statements.map(stmt => this.formatStatement(stmt, context)).join("\n");
    }

    private formatStatement(node: Statement, context: FormatContext): string {
        const mthName = `format${node.nodeName}`;

        if (mthName in this)
            return (this[mthName as keyof Formatter] as (node: AST, context: FormatContext) => string)(node, context);

        console.error(`Formatter for ${node.nodeName} not implemented`);
        return node.toString();
    }

    private formatAssignment(node: Assignment, context: FormatContext): string {
        const group = this.getGroup(node, context);

        if (this.config.alignConsecutiveAssignments.enabled)
            group.add(node.name.value, node);

        const whitespace = this.getWhitespace(context);

        return [
            node.modifier ? node.modifier + " " : "",
            this.formatIdentifier(node.name, context),
            whitespace,
            "is",
            this.formatExpression(node.value, context)
        ].join("");
    }

    private formatTemplateDef(node: TemplateDef, context: FormatContext): string {
        const newContext: FormatContext = { ...context, nestingDepth: context.nestingDepth + 1 };

        const whitespace = this.getWhitespace(newContext);

        const sperator = this.getSeparator();

        return [
            node.modifier ? node.modifier + " " : "",
            "template",
            this.formatIdentifier(node.name, newContext),
            sperator,
            this.formatContainer(node.comments1, newContext),
            '[',
            sperator,
            this.formatContainer(node.params, node.separatorComments1, newContext),
            ']',
            whitespace,
            this.formatContainer(node.comments2, newContext),

        ].join("");
    }

    // 获取相邻的赋值组
    private getGroup(node: AST, context: FormatContext): any {

    }

    // 获取对齐的空格
    private getWhitespace(context: FormatContext): string {

    }

    // 根据长度、配置决策该位置使用空格还是换行还是空串
    private getSeparator(length: number, context: FormatContext): string {

    }

    private trailingChar(str: string, char: string): string {
        if (str.length)
            return str + char;

        return "";
    }
}


const DEFAULT_FORMAT_CONFIG: FormatConfig = {
    columnLimit: 100,
    maxEmptyLinesToKeep: 2,
    alignAfterOpenBracket: "BlockIndent",
    alignConsecutiveAssignments: {
        enabled: true,
        acrossComments: true,
        acrossEmptyLines: true
    },
    alignContainerContents: "Left",
    alignOperands: "Align",
    alignTrailingComments: {
        kind: "Always",
        overEmptyLines: 1
    },
    allowShortObjectOnASingleLine: "Always",
    allowShortTemplateParamOnASingleLine: "Always",
    allowShortTemplateMemberOnASingleLine: "Always",
    allowShortVectorOnASingleLine: "Always",
    allowShortMapOnASingleLine: "Always",
    binPackArguments: true,
    braceWrapping: {
        afterTemplate: false,
        afterTemplateParamBracket: true,
        afterTemplateBludprint: false,
        afterTemplateMemberParen: true,
        afterObjectName: false,
        afterObjectPattern: true
    },
    breakBeforeTernaryOperators: true,
    bracedStyle: {
        parentheses: true,
        brackets: false,
        braces: true
    }
};


interface FormatContext {
    currentLineLength: number;
    indentLevel: number;
    nestingDepth: number;
    alignmentGroups: Map<string, string>;
}


interface FormatConfig {
    /**
     * @desc 列限制。为0时不限制列数。
     *
     * @default 100
     * */
    columnLimit: number;

    /**
     * @desc 指定最大空行数量
     *
     * @default 2
     * */
    maxEmptyLinesToKeep: number;

    /**
     * @desc 对于各种括号中的内容的对齐方式
     *
     * **可能的值**
     * - `"Align"`: 对齐起始括号上的参数
     *     ```
     *     obj is Object (prop1 = 1
     *                    prop2 = 2)
     *     ```
     *
     * - `"DontAlign"`: 不要对齐，而是使用ContinuationIndentWidth
     *     ```
     *     obj is Object (prop1 = 1
     *         prop2 = 2)
     *     ```
     *
     * - `"AlwaysBreak"`: 如果参数不适合单行，则始终在起始括号后中断
     *     ```
     *     obj is Object (
     *         prop1 = 1 prop2 = 2)
     *     ```
     *
     * - `"BlockIndent"`: 如果参数不适合单行，则始终在起始括号后中断。结束括号将放在新行上。
     *     ```
     *     obj is Object (
     *         prop1 = 1 prop2 = 2
     *     )
     *     ```
     *
     * @default "BlockIndent"
     * */
    alignAfterOpenBracket: "Align" | "DontAlign" | "AlwaysBreak" | "BlockIndent";

    /**
     * @desc 对于连续赋值的对齐方式
     *
     * @property enabled 是否启用对齐
     * */
    alignConsecutiveAssignments: {
        /**
         * @desc 是否启用对齐
         *
         * ```
         * a            is 1
         * someLongName is 2
         * b            is 3
         *
         * template T [
         *     a            : int,
         *     someLongName : float,
         *     b            : bool
         * ] is C (
         *     a            = 1
         *     someLongName = .2
         *     b            = true
         * )
         * ```
         *
         * @default true
         * */
        enabled: boolean;

        /**
         * @desc 是否跨空行对齐
         *
         * - `true`: 跨空行对齐
         * ```
         * a            is 1
         * someLongName is 2
         *
         * b            is 3
         * ```
         *
         * - `false`: 不跨空行对齐
         * ```
         * a            is 1
         * someLongName is 2
         *
         * b is 3
         * ```
         *
         * @default true
         * */
        acrossEmptyLines: boolean;

        /**
         * @desc 是否跨注释对齐
         *
         * - `true`: 跨注释对齐
         * ```
         * a            is 1
         * someLongName is 2
         * // comment 1
         * b            is 3
         * ```
         *
         * - `false`: 不跨注释对齐
         * ```
         * a            is 1
         * someLongName is 2
         * // comment 1
         * b is 3
         * ```
         *
         * @default true
         * */
        acrossComments: boolean;
    };

    /**
     * @desc 对于容器中的元素，将其对其成列
     *
     * **可能的值**
     * - `"Left"`: 左对齐
     *     ```
     *     map is Map [
     *         (1,   "one"        ),
     *         (520, "two"        ),
     *         (3,   "hello world")
     *     ]
     *     ```
     *
     * - `"Right"`: 右对齐
     *     ```
     *     map is Map [
     *         (  1,         "one"),
     *         (520,         "two"),
     *         (  3, "hello world")
     *     ]
     *     ```
     *
     * - `"None"`: 不对齐
     *
     * @default "Left"
     * */
    alignContainerContents: "Left" | "Right" | "None";

    /**
     * @desc 水平对齐二元和三元表达式中的操作数
     *
     * **可能的值**
     * - `"Align"`: 对齐操作数
     *     ```
     *     a is 1 +
     *          2
     *
     *     b is true ?
     *             1 :
     *             2
     *     ```
     *
     *    当breakBeforeBinaryOperators设置为true时，换行的操作符将与第一行的操作数对齐。
     *     ```
     *     a is 1
     *          + 2
     *
     *     b is true
     *          ? 1
     *          : 2
     *     ```
     *
     * - `"AlignAfterOperator"`: 水平对齐二元和三元表达式中的操作数。但换行的操作数与第一行的操作数对齐。
     *     ```
     *     a is 1
     *        + 2
     *
     *     b is true
     *        ? 1
     *        : 2
     *     ```
     *
     * @default "Align"
     * */
    alignOperands: "Align" | "AlignAfterOperator" | "DontAlign";

    /**
     * @desc 控制尾随注释的对齐方式
     * */
    alignTrailingComments: {
        /**
         * @desc 尾随注释的对齐方式
         *
         * **可能的值**
         * - `"Leave"`: 保持尾随注释不变
         *     ```
         *     a is 1  // comment 1
         *     b is 2       // comment 2
         *
         *     c is 31  // comment 3
         *     d is 42       // comment 4
         *     ```
         *
         * - `"Always"`: 对齐尾随注释
         *     ```
         *     a is 1  // comment 1
         *     b is 2  // comment 2
         *
         *     c is 31  // comment 3
         *     d is 42  // comment 4
         *     ```
         *
         * - `"Never"`: 不对齐尾随注释，但其它规则仍然有效
         *     ```
         *     a is 1  // comment 1
         *     b is 21  // comment 2
         *
         *     c is 31  // comment 3
         *     d is 421  // comment 4
         *     ```
         *
         * @default "Always"
         * */
        kind: "Leave" | "Always" | "Never";

        /**
         * @desc 指定跨多少空行进行对齐
         *
         * 当 {@link maxEmptyLinesToKeep} 和 OverEmptyLines 都设置为 2 时，格式如下:
         * ```
         * a is 1              // 所有
         *
         * b is "hello world"  // 注释都会
         *
         *
         * abcdef is True      // 对齐
         * ```
         *
         * 当 {@link maxEmptyLinesToKeep} 设置为 2 且 OverEmptyLines 设置为 1 时，格式如下:
         * ```
         * a is 1              // 这些
         * b is "hello world"  // 会对齐
         *
         * abcdef is True  // 但这个不会
         * ```
         *
         * @default 1
         * */
        overEmptyLines: number;
    };

    /**
     * @desc 允许短的Object放在一行上
     *
     * **可能的值**
     * - `"Never"`: 不将短的Object放在一行上
     *     ```
     *     emptyObj is Object (
     *     )
     *
     *     obj is Object (
     *         prop1 = 1
     *     )
     *     ```
     *
     * - `"Empty"`: 仅当Object为空时才将其放在一行上
     *     ```
     *     emptyObj is Object ()
     *
     *     obj is Object (
     *         prop1 = 1
     *     )
     *     ```
     *
     * - `"Always"`: 将所有短的Object放在一行上
     *     ```
     *     emptyObj is Object ()
     *
     *     obj is Object ( prop1 = 1 )
     *     ```
     *
     * @default "Always"
     * */
    allowShortObjectOnASingleLine: "Never" | "Empty" | "Always";

    /**
     * @desc 允许短的模板参数块放在一行上
     *
     * **可能的值**
     * - `"Never"`: 不将短的模板参数块放在一行上
     *     ```
     *     template Empty [
     *     ] is C ()
     *
     *     template T [
     *         a : int
     *     ] is C ()
     *     ```
     *
     * - `"Empty"`: 仅当模板参数块为空时才将其放在一行上
     *     ```
     *     template Empty [ ] is C ()
     *
     *     template T [
     *         a : int
     *     ] is C ()
     *     ```
     *
     * - `"Always"`: 将所有短的模板参数块放在一行上
     *     ```
     *     template Empty [ ] is C ()
     *
     *     template T [ a : int ] is C ()
     *     ```
     *
     * @default "Always"
     * */
    allowShortTemplateParamOnASingleLine: "Never" | "Empty" | "Always";

    /**
     * @desc 允许短的模板成员块放在一行上
     *
     * **可能的值**
     * - `"Never"`: 不将短的模板成员块放在一行上
     *     ```
     *     template Empty [] is C (
     *     )
     *
     *     template T [] is C (
     *         a = 1
     *     )
     *     ```
     *
     * - `"Empty"`: 仅当模板成员块为空时才将其放在一行上
     *     ```
     *     template Empty [] is C ()
     *
     *     template T [] is C (
     *         a = 1
     *     )
     *     ```
     *
     * - `"Always"`: 将所有短的模板成员块放在一行上
     *     ```
     *     template Empty [] is C ()
     *
     *     template T [] is C ( a = 1 )
     *     ```
     *
     * @default "Always"
     * */
    allowShortTemplateMemberOnASingleLine: "Never" | "Empty" | "Always";

    /**
     * @desc 允许短的数组放在一行上
     *
     * **可能的值**
     * - `"Never"`: 不将短的数组放在一行上
     *     ```
     *     emptyArr is [
     *     ]
     *
     *     arr is [
     *         1, 2, 3
     *     ]
     *     ```
     *
     * - `"Empty"`: 仅当数组为空时才将其放在一行上
     *     ```
     *     emptyArr is [ ]
     *
     *     arr is [
     *         1, 2, 3
     *     ]
     *     ```
     *
     * - `"Always"`: 将所有短的数组放在一行上
     *     ```
     *     emptyArr is [ ]
     *
     *     arr is [ 1, 2, 3 ]
     *     ```
     *
     * @default "Always"
     * */
    allowShortVectorOnASingleLine: "Never" | "Empty" | "Always";

    /**
     * @desc 允许短的Map放在一行上
     *
     * **可能的值**
     * - `"Never"`: 不将短的Map放在一行上
     *     ```
     *     emptyMap is Map [
     *     ]
     *
     *     map is Map [
     *         (1, "one"), (2, "two"), (3, "three")
     *     ]
     *     ```
     *
     * - `"Empty"`: 仅当Map为空时才将其放在一行上
     *     ```
     *     emptyMap is Map [ ]
     *
     *     map is Map [
     *         (1, "one"), (2, "two"), (3, "three")
     *     ]
     *     ```
     *
     * - `"Always"`: 将所有短的Map放在一行上
     *     ```
     *     emptyMap is Map [ ]
     *
     *     map is Map [ (1, "one"), (2, "two"), (3, "three") ]
     *     ```
     *
     * @default "Always"
     * */
    allowShortMapOnASingleLine: "Never" | "Empty" | "Always";

    /**
     * @desc 统一参数换行行为(对于对象块，模板参数块，模板成员块，数组，Map)
     *
     * **可能的值**
     * - `false`: 表示所有形参要么都在同一行，要么都给自一行
     *     ```
     *     longObj is Object (
     *         prop1 = 1
     *         prop2 = 2
     *     )
     *
     *     shortObj is Object ( prop1 = 1 )
     *     ```
     *
     * - `true`: 按{@link alignAfterOpenBracket}自动换行
     *     ```
     *     longObj is Object (prop1 = 1
     *                        prop2 = 2)
     *
     *
     *     shortObj is Object (prop1 = 1)
     *     ```
     *
     * @default true
     * */
    binPackArguments: boolean;

    /**
     * @desc 控制换行行为
     *
     * **使用示例**
     * ```
     * "braceWrapping": {
     *     "afterTemplate": true
     * }
     * ```
     *
     * @remarks 通常采用尾随换行的方式，即前一个令牌的尾随换行可能与后一个令牌的前置换行冲突，因此尽量给前一个令牌设置尾随换行来替换后一个令牌的前置换行。
     * */
    braceWrapping: {
        /**
         * @desc 控制是否在模板名称后换行
         *
         * - `true`: 在模板名称后换行
         *     ```
         *     template T
         *     [] is C ()
         *
         *     template T
         *     // 注释会自动换行
         *     [] is C ()
         *     ```
         *
         * - `false`: 不在模板名称后换行
         *     ```
         *     template T [] is C ()
         *
         *     template T // 注释会自动换行
         *     [] is C ()
         *     ```
         *
         * @default false
         * */
        afterTemplateName: boolean;

        /**
         * @desc 控制是否在模板参数块的结束中括号后换行
         *
         * - `true`: 在模板参数块的结束中括号后换行
         *     ```
         *     template T []
         *     is C ()
         *
         *     template T []
         *     // 注释会自动换行
         *     is C ()
         *     ```
         *
         * - `false`: 不在模板参数块的结束中括号后换行
         *     ```
         *     template T [] is C ()
         *
         *     template T [] // 注释会自动换行
         *     is C ()
         *     ```
         *
         * @default true
         * */
        afterTemplateParamBracket: boolean;

        /**
         * @desc 控制是否在模板蓝图后换行
         *
         * - `true`: 在模板蓝图后换行
         *     ```
         *     template T [] is C
         *     ()
         *
         *     template T [] is C
         *     // 注释会自动换行
         *     ()
         *     ```
         *
         * - `false`: 不在模板蓝图后换行
         *     ```
         *     template T [] is C ()
         *
         *     template T [] is C // 注释会自动换行
         *     ()
         *     ```
         *
         * @default false
         * */
        afterTemplateBludprint: boolean;

        /**
         * @desc 控制是否在模板成员块的起始括号后换行
         *
         * - `true`: 在模板成员块的起始括号后换行
         *     ```
         *     template T [] is C (
         *         a = 1 )
         *
         *     template T [] is C (
         *         // 注释会自动换行
         *         a = 1 )
         *     ```
         *
         * - `false`: 不在模板成员块的起始括号后换行
         *     ```
         *     template T [] is C ( a = 1 )
         *
         *     template T [] is C ( // 注释会自动换行
         *         a = 1 )
         *     ```
         *
         * @default true
         * */
        afterTemplateMemberParen: boolean;

        /**
         * @desc 控制是否在对象名称后换行
         *
         * - `true`: 在对象名称后换行
         *     ```
         *     obj is Object
         *     ( prop1 = 1 )
         *
         *     obj is Object
         *     // 注释会自动换行
         *     ( prop1 = 1 )
         *     ```
         *
         * - `false`: 不在对象名称后换行
         *     ```
         *     obj is Object ( prop1 = 1 )
         *
         *     obj is Object // 注释会自动换行
         *     ( prop1 = 1 )
         *     ```
         *
         * @default false
         * */
        afterObjectName: boolean;

        /**
         * @desc 控制是否在对象块的起始括号后换行
         *
         * - `true`: 在对象块的起始括号后换行
         *     ```
         *     obj is Object (
         *         prop1 = 1 )
         *
         *     obj is Object (
         *         // 注释会自动换行
         *         prop1 = 1 )
         *     ```
         *
         * - `false`: 不在对象块的起始括号后换行
         *     ```
         *     obj is Object ( prop1 = 1 )
         *
         *     obj is Object ( // 注释会自动换行
         *         prop1 = 1 )
         *     ```
         *
         * @default true
         * */
        afterObjectPattern: boolean;
    };

    /**
     * @desc 控制是否在三元运算符前换行
     *
     * - `true`: 在三元运算符前换行
     *     ```
     *     a is lllllllllllllllllllllllllllllongCondition
     *         ? 1
     *         : 2
     *     ```
     *
     * - `false`: 不在三元运算符前换行
     *     ```
     *     a is lllllllllllllllllllllllllllllongCondition ?
     *         1 :
     *         2
     *     ```
     *
     * @default true
     * */
    breakBeforeTernaryOperators: boolean;

    /**
     * @desc 控制括号是否与内容使用空格分隔
     * */
    bracedStyle: {
        /**
         * @desc 在括号和内容之间是否使用空格
         *
         * - `true`: 使用空格
         *     ```
         *     a is Object ( 1 + 2 )
         *     ```
         *
         * - `false`: 不使用空格
         *     ```
         *     a is Object(1+2)
         *     ```
         *
         * @default true
         * */
        parentheses: boolean;

        /**
         * @desc 在花括号和内容之间是否使用空格
         *
         * - `true`: 使用空格
         *     ```
         *     a is GUID:{ 12345678-1234-567812345678 }
         *     ```
         *
         * - `false`: 不使用空格
         *     ```
         *     a is GUID:{12345678-1234-567812345678}
         *     ```
         *
         * @default false
         * */
        brackets: boolean;

        /**
         * @desc 在中括号和内容之间是否使用空格
         *
         * - `true`: 使用空格
         *     ```
         *     a is [ 1, 2, 3 ]
         *     ```
         *
         * - `false`: 不使用空格
         *     ```
         *     a is [1,2,3]
         *     ```
         *
         * @default true
         * */
        braces: boolean;
    };

    // TODO: 长字符串是否应该换行？
}
