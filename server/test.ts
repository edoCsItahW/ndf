/*
 * Copyright (c) 2025. All rights reserved.
 * This source code is licensed under the CC BY-NC-SA
 * (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
 * This software is protected by copyright law. Reproduction, distribution, or use for commercial
 * purposes is prohibited without the author's permission. If you have any questions or require
 * permission, please contact the author: 2207150234@st.sziit.edu.cn
 */

/**
 * @file test.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/26 19:43
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import { Lexer, Processor, TokenType } from "./src/lexer";
import * as fs from "fs";
import * as path from "path";
import { Analyser, Parser } from "./src/parser";
//import { enumToStr, RadixTree } from "./src/utils";

const src = fs.readFileSync(path.join(__dirname, "test.ndf"), "utf-8");

const lexer = new Lexer(src);
const tokens = new Processor(lexer.tokenize()).process();

//for (const token of tokens)
//    console.log(token.toString());

const parser = new Parser(tokens, undefined, false, true);
const program = parser.parse();

//for (const error of parser.errors)
//    console.log(error.toString());

console.log(JSON.stringify(program.toJSON()));

//const analyser = new Analyser(program);
//const scope = analyser.analyze();
//
////for (const token of tokens)
////    console.log(token.toString(), ", 下一个应为: ", token.state.inferNext?.map((t) => enumToStr(TokenType, t)).join(", "))
//
//for (const error of analyser.errors)
//    console.log(error.toString());




//class FormatterEngine {
//    constructor(
//        private config: FormatConfig,
//        private ast: ASTNode
//    ) {}
//
//    format(): string {
//        const context: FormattingContext = {
//            currentLineLength: 0,
//            indentLevel: 0,
//            nestingDepth: 0,
//            alignmentGroups: new Map(),
//            config: this.config
//        };
//
//        return this.formatNode(this.ast, context);
//    }
//
//    private formatNode(node: ASTNode, context: FormattingContext): string {
//        const nodeType = node.constructor.name;
//        const formatter = this.getFormatterForNode(nodeType);
//        return formatter(node, context);
//    }
//
//    private getFormatterForNode(nodeType: string): (node: ASTNode, context: FormattingContext) => string {
//        const formatters: Record<string, Function> = {
//            'Assignment': this.formatAssignment.bind(this),
//            'TemplateDef': this.formatTemplateDef.bind(this),
//            'UnnamedObj': this.formatUnnamedObj.bind(this),
//            'FileImportComment': this.formatFileImportComment.bind(this)
//            // 其他节点类型的格式化器...
//        };
//
//        return formatters[nodeType] || this.formatDefault.bind(this);
//    }
//
//    // 默认格式化器
//    private formatDefault(node: ASTNode, context: FormattingContext): string {
//        return node.toString();
//    }
//
//    // 赋值语句格式化
//    private formatAssignment(node: Assignment, context: FormattingContext): string {
//        const alignmentGroup = this.getAlignmentGroup(node, context);
//        const assignmentOp = this.config.overrides?.Assignment?.operator || " is ";
//
//        // 处理对齐
//        if (this.config.alignConsecutiveAssignments.enabled) {
//            alignmentGroup.addElement(node.name.toString(), node);
//        }
//
//        const formattedName = this.formatNode(node.name, context);
//        const formattedValue = this.formatNode(node.value, context);
//
//        // 应用空白策略
//        const whitespace = this.determineWhitespace(context);
//
//        return [
//            node.modifier ? `${node.modifier} ` : "",
//            formattedName,
//            whitespace.beforeOperator,
//            assignmentOp,
//            whitespace.afterOperator,
//            formattedValue
//        ].join("");
//    }
//
//    // 模板定义格式化
//    private formatTemplateDef(node: TemplateDef, context: FormattingContext): string {
//        const braceWrapping = this.config.braceWrapping;
//        const newContext = {...context, nestingDepth: context.nestingDepth + 1};
//
//        // 处理模板参数
//        const paramsFormat = this.formatContainer(
//            node.params,
//            '[',
//            ']',
//            ',',
//            newContext,
//            this.config.allowShortTemplateParamOnASingleLine
//        );
//
//        // 处理模板成员
//        const membersFormat = this.formatContainer(
//            node.members,
//            '(',
//            ')',
//            '',
//            newContext,
//            this.config.allowShortTemplateArgOnASingleLine
//        );
//
//        // 构建结果
//        const parts: string[] = [];
//
//        // 模板关键字后换行处理
//        parts.push(node.modifier ? `${node.modifier} ` : "");
//        parts.push("template ");
//        parts.push(this.formatNode(node.name, context));
//
//        if (braceWrapping.afterTemplate) {
//            parts.push("\n" + this.getIndent(newContext));
//        }
//
//        // 模板参数
//        parts.push(paramsFormat);
//
//        // 模板参数结束括号后换行
//        if (braceWrapping.afterTemplateParamBracket) {
//            parts.push("\n" + this.getIndent(newContext));
//        } else {
//            parts.push(" ");
//        }
//
//        // 蓝图关键字
//        parts.push("is ");
//        parts.push(this.formatNode(node.extend, context));
//
//        // 蓝图后换行
//        if (braceWrapping.afterTemplateBludprint) {
//            parts.push("\n" + this.getIndent(newContext));
//        }
//
//        // 模板成员
//        parts.push(membersFormat);
//
//        return parts.join("");
//    }
//
//    // 容器格式化通用方法
//    private formatContainer(
//        items: ASTNode[],
//        openBracket: string,
//        closeBracket: string,
//        separator: string,
//        context: FormattingContext,
//        allowShort: "Never" | "Empty" | "Always"
//    ): string {
//        // 空容器处理
//        if (items.length === 0) {
//            if (allowShort === "Never") return `${openBracket}\n${closeBracket}`;
//            if (allowShort === "Empty") return `${openBracket} ${closeBracket}`;
//            return `${openBracket}${closeBracket}`;
//        }
//
//        // 短容器处理
//        const estimatedLength = this.estimateContainerLength(items, separator, openBracket, closeBracket);
//        if (allowShort === "Always" && estimatedLength <= this.config.columnLimit) {
//            return `${openBracket} ${items.map(item => this.formatNode(item, context)).join(`${separator} `)} ${closeBracket}`;
//        }
//
//        // 根据配置选择对齐方式
//        let formattedItems: string[];
//        switch (this.config.alignAfterOpenBracket) {
//            case "Align":
//                formattedItems = this.formatItemsWithAlignment(items, context, separator);
//                break;
//            case "DontAlign":
//                formattedItems = this.formatItemsWithIndent(items, context, separator);
//                break;
//            case "AlwaysBreak":
//                formattedItems = items.map(item => this.formatNode(item, context));
//                return `${openBracket}\n${this.getIndent(context)}${formattedItems.join(`\n${this.getIndent(context)}`)}\n${this.getIndent(context)}${closeBracket}`;
//                case "BlockIndent":
//                formattedItems = items.map(item => this.formatNode(item, context));
//                return `${openBracket}\n${this.getIndent(context)}${formattedItems.join(`\n${this.getIndent(context)}`)}\n${this.getIndent(context)}${closeBracket}`;
//            default:
//                formattedItems = items.map(item => this.formatNode(item, context));
//            }
//
//        return `${openBracket}${formattedItems.join(separator)}${closeBracket}`;
//    }
//
//    // 辅助方法：确定空白策略
//    private determineWhitespace(context: FormattingContext): {
//        beforeOperator: string,
//        afterOperator: string
//    } {
//        const config = this.config.overrides?.Assignment;
//
//        return {
//            beforeOperator: config?.spaceAroundOperator ? " " : "",
//            afterOperator: config?.spaceAroundOperator ? " " : ""
//        };
//    }
//
//    // 辅助方法：获取缩进
//    private getIndent(context: FormattingContext): string {
//        const indentSize = this.config.indentation?.size || 4;
//        const useTabs = this.config.indentation?.useTabs || false;
//        const indentLevel = context.nestingDepth + context.indentLevel;
//
//        if (useTabs) {
//            return '\t'.repeat(indentLevel);
//        }
//        return ' '.repeat(indentSize * indentLevel);
//    }
//
//    // 辅助方法：估算容器长度
//    private estimateContainerLength(
//        items: ASTNode[],
//        separator: string,
//        openBracket: string,
//        closeBracket: string
//    ): number {
//        let length = openBracket.length + closeBracket.length;
//
//        for (const item of items) {
//            // 简化估算 - 实际实现需要更精确
//            length += item.toString().length + separator.length;
//        }
//
//        return length;
//    }
//}
//
//class AlignmentProcessor {
//    private groups: Map<string, AlignmentGroup> = new Map();
//
//    addToGroup(groupId: string, element: ASTNode, content: string) {
//        if (!this.groups.has(groupId)) {
//            this.groups.set(groupId, new AlignmentGroup());
//        }
//        this.groups.get(groupId)!.addElement(element, content);
//    }
//
//    processGroups(): void {
//        for (const group of this.groups.values()) {
//            group.alignElements();
//        }
//    }
//
//    getAlignedContent(element: ASTNode): string | null {
//        for (const group of this.groups.values()) {
//            const content = group.getAlignedContent(element);
//            if (content) return content;
//        }
//        return null;
//    }
//}
//
//class AlignmentGroup {
//    private elements: Array<{element: ASTNode, original: string}> = [];
//    private maxLength = 0;
//    private alignedContent: Map<ASTNode, string> = new Map();
//
//    addElement(element: ASTNode, content: string): void {
//        this.elements.push({element, original: content});
//        if (content.length > this.maxLength) {
//            this.maxLength = content.length;
//        }
//    }
//
//    alignElements(): void {
//        for (const {element, original} of this.elements) {
//            const padding = ' '.repeat(this.maxLength - original.length);
//            this.alignedContent.set(element, original + padding);
//        }
//    }
//
//    getAlignedContent(element: ASTNode): string | null {
//        return this.alignedContent.get(element) || null;
//    }
//}
//
//interface FormattingContext {
//    currentLineLength: number;
//    indentLevel: number;
//    nestingDepth: number;
//    config: FormatConfig;
//    alignmentGroups: Map<string, AlignmentGroup>;
//    parentNode?: ASTNode;
//}
//
//class ContextManager {
//    private currentContext: FormattingContext;
//
//    constructor(config: FormatConfig) {
//        this.currentContext = {
//            currentLineLength: 0,
//            indentLevel: 0,
//            nestingDepth: 0,
//            config,
//            alignmentGroups: new Map()
//        };
//    }
//
//    enterScope(nodeType: string): void {
//        this.currentContext = {
//            ...this.currentContext,
//            indentLevel: this.currentContext.indentLevel + 1,
//            nestingDepth: this.currentContext.nestingDepth + 1,
//            parentNode: undefined // 实际实现中会设置
//        };
//    }
//
//    exitScope(): void {
//        // 处理对齐组
//        this.processAlignmentGroups();
//
//        // 恢复上一级上下文
//        this.currentContext = {
//            ...this.currentContext,
//            indentLevel: Math.max(0, this.currentContext.indentLevel - 1),
//            nestingDepth: Math.max(0, this.currentContext.nestingDepth - 1)
//        };
//    }
//
//    private processAlignmentGroups(): void {
//        for (const group of this.currentContext.alignmentGroups.values()) {
//            group.alignElements();
//        }
//    }
//
//    getContext(): FormattingContext {
//        return this.currentContext;
//    }
//
//    updateLineLength(addition: number): void {
//        this.currentContext.currentLineLength += addition;
//
//        // 检查是否超过列限制
//        if (this.currentContext.currentLineLength > this.currentContext.config.columnLimit) {
//            // 触发换行策略
//            this.handleLineOverflow();
//        }
//    }
//
//    private handleLineOverflow(): void {
//        // 根据配置决定如何处理超出行
//        // 可能触发换行、缩小字体等策略
//    }
//}
//
//class CommentFormatter {
//    formatComment(comment: Comment, context: FormattingContext): string {
//        if (comment instanceof FileImportComment) {
//            return this.formatFileImportComment(comment, context);
//        }
//
//        // 其他注释类型处理...
//        return comment.toString();
//    }
//
//    private formatFileImportComment(comment: FileImportComment, context: FormattingContext): string {
//        const config = context.config.nodeSpecific?.FileImportComment;
//        const quote = config?.importPathQuotes === "double" ? '"' : "'";
//
//        return [
//            comment.leadingWhitespace,
//            "/// from ",
//            quote,
//            comment.path,
//            quote,
//            " import ",
//            this.formatImportItems(comment.items, context)
//        ].join("");
//    }
//
//    private formatImportItems(items: string[], context: FormattingContext): string {
//        const itemsPerLine = context.config.nodeSpecific?.FileImportComment?.importItemsPerLine || 3;
//
//        if (items.length <= itemsPerLine) {
//            return items.join(", ");
//        }
//
//        // 多行格式化导入项
//        const lines: string[] = [];
//        for (let i = 0; i < items.length; i += itemsPerLine) {
//            const lineItems = items.slice(i, i + itemsPerLine);
//            lines.push(lineItems.join(", "));
//        }
//
//        const indent = this.getIndent(context);
//        return lines.join(",\n" + indent);
//    }
//
//    private getIndent(context: FormattingContext): string {
//        const indentSize = context.config.indentation?.size || 4;
//        return ' '.repeat(indentSize * (context.indentLevel + 1));
//    }
//
//    formatTrailingComment(comment: Comment, context: FormattingContext): string {
//        const config = context.config.alignTrailingComments;
//
//        if (config.kind === "Never") {
//            return comment.toString();
//        }
//
//        // 对齐尾随注释
//        const currentColumn = context.currentLineLength;
//        const targetColumn = this.calculateCommentColumn(context);
//
//        if (currentColumn >= targetColumn && config.kind === "Always") {
//            return ' '.repeat(targetColumn - currentColumn) + comment.toString();
//        }
//
//        return ' ' + comment.toString(); // 至少保留一个空格
//    }
//
//    private calculateCommentColumn(context: FormattingContext): number {
//        // 根据上下文计算注释应该对齐到的列
//        // 考虑嵌套深度、配置等
//        const baseColumn = 40; // 示例值
//        return baseColumn + (context.nestingDepth * 10);
//    }
//}
