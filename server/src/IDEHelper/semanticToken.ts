// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file semanticToken.ts
 * @author edocsitahw
 * @version 2.0
 * @date 2025/05/08 01:12
 * @desc 语义令牌收集器（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 遍历 AST 产出 LSP 语义令牌。与 v1 的差异：
 * - `TypeRef` 统一处理（名字 / 泛型实参 / 注解实参）；
 * - 支持 `DefinitionExpr`、位置实参、`GUID` 字面量、多段引用；
 * - 额外遍历 `Program.comments`，让非语句层注释也能高亮。
 * */
import { Token } from "../lexer";
import {
    Argument,
    Assignment,
    AST,
    BinaryExpr,
    Bool,
    Comment,
    CommenComment,
    DefinitionExpr,
    Expression,
    FileImportComment,
    Float,
    GuidCall,
    Identifier,
    IndexAccess,
    Integer,
    LibImportComment,
    Literal,
    MapDef,
    MemberAccess,
    MemberAssign,
    Nil,
    ObjectCall,
    ObjectType,
    Pair,
    ParameterDecl,
    ParenthesisExpr,
    Program,
    Reference,
    Statement,
    Str,
    TemplateDef,
    TemplateParam,
    TemplateType,
    TernaryExpr,
    TypeAnnotation,
    TypeRef,
    UnaryExpr,
    UnnamedObj,
    VectorDef
} from "../parser";
import { IPos, Nullable } from "../types";
import { methodDebug } from "../debug";


export enum TokenLegend {
    // 分析type instanceof TemplateType还是ObjectType,如果未定义的则选Blueprint
    Template,
    Object,
    Blueprint,
    Variable,
    UUID,
    TemplateParam,
    Generic,
    String,
    Number,
    Keyword,
    Property,
    Reference,
    Comment,
    ImportComment
}


type ModifierType = InstanceType<typeof Assignment>["modifier"] | InstanceType<typeof TemplateDef>["modifier"];


export enum TokenModifier {
    // 语法修饰符
    Export,
    Private,
    Public,

    // 语义修饰符
    Declaration,
    Readonly,
}


interface ISemanticToken {
    line: number;
    start: number;
    length: number;
    type: number;
    modifierBits: number;
}


function semanticDebug(obj: SemanticCollector, fnName: string) {
    if (obj.debug)
        console.log(`[SemanticCollector] ${fnName}`);
}


export class SemanticCollector {
    private tokens: ISemanticToken[] = [];
    private latestPos: IPos = { line: 1, column: 1 };

    /** 待输出的注释（按源码顺序），在遍历过程中按位置插入 */
    private pendingComments: Comment[] = [];

    constructor(private readonly ast: Nullable<Program>, public debug: boolean = false) {
    }

    @methodDebug(semanticDebug)
    visit(): number[] {
        if (!this.ast)
            return [];

        let result: number[] = [];

        this.pendingComments = [...(this.ast.comments ?? [])]
            .sort((a, b) => a.pos.line - b.pos.line || a.pos.column - b.pos.column);

        this.visitProgram(this.ast);

        // 收尾：输出剩余注释
        while (this.pendingComments.length)
            this.emitComment(this.pendingComments.shift()!);

        this.tokens.forEach(token => result = result.concat(
            [token.line, token.start, token.length, token.type, 0]
        ));

        return result;
    }

    private visitProgram(node: Program) {
        // 语义令牌必须按源码顺序产出（相对行/列编码）；注释在 pushLeaf 中按位置插入
        node.statements.forEach(stmt => this.visitStatement(stmt));
    }

    /** 在输出 pos 位置的令牌前，先吐出所有位于它之前的注释 */
    private flushCommentsBefore(pos: IPos) {
        while (this.pendingComments.length) {
            const comment = this.pendingComments[0];

            if (comment.pos.line < pos.line || (comment.pos.line === pos.line && comment.pos.column <= pos.column))
                this.emitComment(this.pendingComments.shift()!);
            else
                return;
        }
    }

    private emitComment(comment: Comment) {
        const gap = this.getGap(comment.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: comment.value.length,
            type: comment.nodeName === "CommenComment" ? TokenLegend.Comment : TokenLegend.ImportComment,
            modifierBits: 0
        });

        this.latestPos = comment.pos;
    }

    private visitStatement(node: Statement) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: AST) => void)(node);

        console.warn(`No visitor method for ${node.nodeName} at visitStatement`);
    }

    private visitAssignment(node: Assignment) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.visitIdentifier(node.name, TokenLegend.Variable);

        if (node.marks.is?.value === "is")
            this.handleKeyword(node.marks.is);

        this.visitExpression(node.value);
    }

    private visitTemplateDef(node: TemplateDef) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.handleKeyword(node.marks.template!);

        this.visitIdentifier(node.name, TokenLegend.Template);

        node.params.forEach(param => this.visitParameterDecl(param));

        this.handleKeyword(node.marks.is!);

        this.visitTypeRef(node.extend);

        node.members.forEach(member => this.visitMemberAssign(member));
    }

    private visitUnnamedObj(node: UnnamedObj) {
        this.handleKeyword(node.marks.unnamed!);

        const type = node.blueprint.type instanceof TemplateType
            ? TokenLegend.Template
            : node.blueprint.type instanceof ObjectType
                ? TokenLegend.Object
                : TokenLegend.Blueprint;

        this.visitIdentifier(node.blueprint, type);

        node.args.forEach(arg => this.visitArgument(arg));
    }

    /** 统一处理 Program.comments 里的注释（普通注释 / 文档注释） */
    private visitCommentNode(node: Comment) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.Comment, 0);
    }

    private visitCommenComment(node: CommenComment) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.Comment, 0);
    }

    private visitFileImportComment(node: FileImportComment) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.ImportComment, 0);
    }

    private visitLibImportComment(node: LibImportComment) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.ImportComment, 0);
    }

    private visitParameterDecl(node: ParameterDecl) {
        this.visitIdentifier(node.name, TokenLegend.TemplateParam);

        if (node.annotation)
            this.visitTypeRef(node.annotation);

        if (node.default)
            this.visitExpression(node.default);
    }

    private visitMemberAssign(node: MemberAssign) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.visitIdentifier(node.name, TokenLegend.Property);

        if (node.operator === "is")
            this.handleKeyword(node.marks.assignOrIs!);

        this.visitExpression(node.value);
    }

    private visitTypeRef(node: TypeRef) {
        this.visitIdentifier(node.name, TokenLegend.Generic);

        node.typeArgs.forEach(arg => this.visitTypeRef(arg));
        node.annotations.forEach(annotation => this.visitTypeAnnotation(annotation));
    }

    private visitTypeAnnotation(node: TypeAnnotation) {
        if (node.name)
            this.visitIdentifier(node.name, TokenLegend.Property);

        if (node.annotation)
            this.visitTypeRef(node.annotation);

        if (node.value)
            this.visitExpression(node.value);
    }

    private visitExpression(node: Expression) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: Expression) => void)(node);

        console.warn(`No visitor method for ${node.nodeName} at visitExpression`);
    }

    private visitIdentifier(node: Identifier, type?: TokenLegend) {
        if (!type)
            type = node.type instanceof TemplateType
                ? TokenLegend.Template
                : node.type instanceof ObjectType
                    ? TokenLegend.Object
                    : TokenLegend.Variable;

        this.pushLeaf(node.pos, node.name.length, type, 0);
    }

    private visitTernaryExpr(node: TernaryExpr) {
        this.visitExpression(node.condition);
        this.visitExpression(node.trueExpr);
        this.visitExpression(node.falseExpr);
    }

    private visitBinaryExpr(node: BinaryExpr) {
        this.visitExpression(node.left);
        this.visitExpression(node.right);
    }

    private visitUnaryExpr(node: UnaryExpr) {
        this.visitExpression(node.operand);
    }

    private visitTemplateParam(node: TemplateParam) {
        this.visitIdentifier(node.name, TokenLegend.TemplateParam);
    }

    private visitObjectCall(node: ObjectCall) {
        const type = node.blueprint.type instanceof TemplateType
            ? TokenLegend.Template
            : node.blueprint.type instanceof ObjectType
                ? TokenLegend.Object
                : TokenLegend.Blueprint;

        this.visitIdentifier(node.blueprint, type);

        node.args.forEach(arg => this.visitArgument(arg));
    }

    private visitIndexAccess(node: IndexAccess) {
        this.visitExpression(node.target);
        node.args.forEach(arg => this.visitExpression(arg));
    }

    private visitMemberAccess(node: MemberAccess) {
        this.visitExpression(node.target);
        this.visitIdentifier(node.property, TokenLegend.Property);
    }

    private visitParenthesisExpr(node: ParenthesisExpr) {
        this.visitExpression(node.expr);

        if (node.second)
            this.visitExpression(node.second);
    }

    private visitReference(node: Reference) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.Reference, 0);
    }

    private visitGuidCall(node: GuidCall) {
        this.pushLeaf(node.pos, node.uuid.length, TokenLegend.UUID, this.modifierToBits([TokenModifier.Readonly]));
    }

    private visitMapDef(node: MapDef) {
        this.handleKeyword(node.marks.map!);
        node.pairs.forEach(pair => this.visitPair(pair));
    }

    private visitPair(node: Pair) {
        this.visitExpression(node.key);
        this.visitExpression(node.value);
    }

    private visitVectorDef(node: VectorDef) {
        node.elements.forEach(elem => this.visitExpression(elem));
    }

    private visitDefinitionExpr(node: DefinitionExpr) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.visitIdentifier(node.name, TokenLegend.Property);

        if (node.operator === "is")
            this.handleKeyword(node.marks.is!);

        this.visitExpression(node.value);
    }

    private visitArgument(node: Argument) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        if (node.positional) {
            if (node.value)
                this.visitExpression(node.value);

            return;
        }

        if (node.name)
            this.visitIdentifier(node.name, TokenLegend.Property);

        if (node.operator === "is" && node.marks.colonOrAssignOrIs)
            this.handleKeyword(node.marks.colonOrAssignOrIs);

        if (node.annotation)
            this.visitTypeRef(node.annotation);

        if (node.value)
            this.visitExpression(node.value);
    }

    private visitLiteral(node: Literal) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: Literal) => void)(node);

        console.warn(`No visitor method for ${node.nodeName} at visitLiteral`);
    }

    private visitStr(node: Str) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.String, this.modifierToBits([TokenModifier.Readonly]));
    }

    private visitInteger(node: Integer) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.Number, this.modifierToBits([TokenModifier.Readonly]));
    }

    private visitFloat(node: Float) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.Number, this.modifierToBits([TokenModifier.Readonly]));
    }

    private visitBool(node: Bool) {
        this.pushLeaf(node.pos, node.value.length, TokenLegend.Keyword, 0);
    }

    private visitNil(node: Nil) {
        this.pushLeaf(node.pos, 3, TokenLegend.Keyword, 0);
    }

    private handleKeyword(token: Token, isModifier: boolean = false) {
        this.pushLeaf(
            token.pos,
            token.value.length,
            TokenLegend.Keyword,
            isModifier ? this.modifierToBits([this.modifierToToken(token.value as ModifierType)!]) : 0
        );
    }

    private pushLeaf(pos: IPos, length: number, type: TokenLegend, modifierBits: number) {
        this.flushCommentsBefore(pos);

        const gap = this.getGap(pos);

        this.tokens.push({ line: gap.line, start: gap.column, length, type, modifierBits });

        this.latestPos = pos;
    }

    private modifierToBits(modifiers: TokenModifier[]): number {
        let bits = 0;

        for (const modifier of modifiers)
            bits |= 1 << modifier;

        return bits;
    }

    private modifierToToken(modifier: ModifierType): Nullable<TokenModifier> {
        switch (modifier) {
            case "export":
                return TokenModifier.Export;
            case "private":
                return TokenModifier.Private;
            case "public":
                return TokenModifier.Public;
            default:
                return undefined;
        }
    }

    private getGap(pos: IPos): IPos {
        const lineGap = pos.line - this.latestPos.line;

        return { line: lineGap, column: lineGap <= 0 ? pos.column - this.latestPos.column : pos.column - 1 };
    }
}



