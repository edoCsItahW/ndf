// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file semanticToken.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/05/08 01:12
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { Token } from "../lexer";
import {
    Argument,
    Assignment,
    AST,
    BinaryExpr,
    Bool,
    BuiltinType,
    CommenComment,
    Expression,
    FileImportComment,
    Float,
    GenericType,
    GuidCall,
    Identifier,
    IndexAccess,
    Integer, LibImportComment,
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
    PropertyAssignExpr,
    Reference,
    Statement,
    Str,
    TemplateDef,
    TemplateParam,
    TemplateType,
    TernaryExpr,
    TypeConstructor,
    TypeRef,
    UnaryExpr,
    UnnamedObj,
    VectorDef
} from "../parser";
import { IPos, Nullable } from "../types";
import { methodDebug, regexStack } from "../debug";
import { enumToStr } from "../utils";


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
    /**
     * @summary 行偏移量
     * @desc 相对于前一个行号的偏移量
     * @remarks 必须大于等于0
     * */
    line: number;

    /**
     * @summary 起始位置偏移量
     * @desc 相对于该行起始位置的字符偏移量
     * @remarks 同一行必须 ≥ 0，新行可 ≥ 0
     * */
    start: number;

    /**
     * @summary 令牌长度
     * @desc 令牌的字符长度
     * */
    length: number;

    /**
     * @summary 令牌类型
     * @desc 令牌类型在 legend.types 中的索引
     * @remarks 从0开始
     * */
    type: number;

    /**
     * @summary 修饰符位
     * @desc 修饰符的位掩码
     * @remarks 每个 bit 对应 legend.modifiers 中的一个修饰符,并且无论是语法修饰符还是语义修饰符都可以
     * @example 0b01
     * */
    modifierBits: number;
}


function semanticDebug(obj: SemanticCollector, fnName: string) {
    if (obj.debug)
        console.log(`[SemanticCollector] ${fnName}`);
}


export class SemanticCollector {
    private tokens: ISemanticToken[] = [];
    private latestPos: IPos = { line: 1, column: 1 };


    constructor(private readonly ast: Nullable<Program>, public debug: boolean = false) {
    }

    @methodDebug(semanticDebug)
    visit(): number[] {
        if (!this.ast)
            return [];

        let result: number[] = [];

        this.visitProgram(this.ast);

        this.tokens.forEach(token => result = result.concat(
            [token.line, token.start, token.length, token.type, 0]
        ));

        return result;
    }

    @methodDebug(semanticDebug)
    private visitProgram(node: Program) {
        node.statements.forEach(stmt => this.visitStatement(stmt));
    }

    @methodDebug(semanticDebug)
    private visitStatement(node: Statement) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: AST) => void)(node);

        else
            console.warn(`No visitor method for ${node.nodeName} at visitStatement`);
    }

    @methodDebug(semanticDebug)
    private visitAssignment(node: Assignment) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.visitIdentifier(node.name, TokenLegend.Variable);

        this.handleKeyword(node.marks.is!);

        this.visitExpression(node.value);
    }

    @methodDebug(semanticDebug)
    private visitTemplateDef(node: TemplateDef) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.handleKeyword(node.marks.template!);

        this.visitIdentifier(node.name, TokenLegend.Template);

        node.params.forEach(param => this.visitParameterDecl(param));

        this.handleKeyword(node.marks.is!);

        this.visitIdentifier(node.extend, TokenLegend.Template);

        node.members.forEach(member => this.visitMemberAssign(member));
    }

    @methodDebug(semanticDebug)
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

    @methodDebug(semanticDebug)
    private visitCommenComment(node: CommenComment) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.Comment,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitFileImportComment(node: FileImportComment) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.ImportComment,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitLibImportComment(node: LibImportComment) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.ImportComment,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    private visitParameterDecl(node: ParameterDecl) {
        this.visitIdentifier(node.name, TokenLegend.TemplateParam);

        if (node.annotation)
            this.visitTypeRef(node.annotation);

        if (node.default)
            this.visitExpression(node.default);
    }

    @methodDebug(semanticDebug)
    private visitMemberAssign(node: MemberAssign) {
        this.visitIdentifier(node.name, TokenLegend.Property);

        if (node.operator === "is")
            this.handleKeyword(node.marks.assignOrIs!);

        this.visitExpression(node.value);
    }

    @methodDebug(semanticDebug)
    private visitTypeRef(node: TypeRef) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: TypeRef) => void)(node);

        else
            console.warn(`No visitor method for ${node.nodeName} at visitTypeRef`);
    }

    @methodDebug(semanticDebug)
    private visitBuiltinType(node: BuiltinType) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.name.length,
            type: TokenLegend.Keyword,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitGenericType(node: GenericType) {
        this.visitIdentifier(node.name, TokenLegend.Generic);

        node.typeParams.forEach(typeParam => this.visitTypeRef(typeParam));
    }

    @methodDebug(semanticDebug)
    private visitExpression(node: Expression) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: Expression) => void)(node);

        else
            console.warn(`No visitor method for ${node.nodeName} at visitExpression`);
    }

    @methodDebug(semanticDebug)
    private visitIdentifier(node: Identifier, type: TokenLegend) {
        const gap = this.getGap(node.pos);

        if (!type)
            type = node.type instanceof TemplateType
                ? TokenLegend.Template
                 : node.type instanceof ObjectType
                    ? TokenLegend.Object
                     : TokenLegend.Variable;

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.name.length,
            type,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitTernaryExpr(node: TernaryExpr) {
        this.visitExpression(node.condition);

        this.visitExpression(node.trueExpr);

        this.visitExpression(node.falseExpr);
    }

    @methodDebug(semanticDebug)
    private visitBinaryExpr(node: BinaryExpr) {
        this.visitExpression(node.left);

        this.visitExpression(node.right);
    }

    @methodDebug(semanticDebug)
    private visitUnaryExpr(node: UnaryExpr) {
        this.visitExpression(node.operand);
    }

    @methodDebug(semanticDebug)
    private visitTemplateParam(node: TemplateParam) {
        this.visitIdentifier(node.name, TokenLegend.TemplateParam);
    }

    @methodDebug(semanticDebug)
    private visitObjectCall(node: ObjectCall) {
        const type = node.blueprint.type instanceof TemplateType
            ? TokenLegend.Template
            : node.blueprint.type instanceof ObjectType
                ? TokenLegend.Object
                : TokenLegend.Blueprint;

        this.visitIdentifier(node.blueprint, type);

        node.args.forEach(arg => this.visitArgument(arg));
    }

    @methodDebug(semanticDebug)
    private visitIndexAccess(node: IndexAccess) {
        this.visitExpression(node.target);

        this.visitExpression(node.index);
    }

    @methodDebug(semanticDebug)
    private visitMemberAccess(ndoe: MemberAccess) {
        this.visitExpression(ndoe.target);

        this.visitIdentifier(ndoe.property, TokenLegend.Property);
    }

    @methodDebug(semanticDebug)
    private visitParenthesisExpr(node: ParenthesisExpr) {
        this.visitExpression(node.expr);
    }

    @methodDebug(semanticDebug)
    private visitReference(node: Reference) {
        // TODO: 更详细处理
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.path.length,
            type: TokenLegend.Reference,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitGuidCall(node: GuidCall) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.uuid.length,
            type: TokenLegend.UUID,
            modifierBits: this.modifierToBits([TokenModifier.Readonly])
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitMapDef(node: MapDef) {
        this.handleKeyword(node.marks.map!);

        node.pairs.forEach(pair => this.visitPair(pair));
    }

    @methodDebug(semanticDebug)
    private visitPair(node: Pair) {
        this.visitExpression(node.key);

        this.visitExpression(node.value);
    }

    @methodDebug(semanticDebug)
    private visitVectorDef(node: VectorDef) {
        node.elements.forEach(elem => this.visitExpression(elem));
    }

    @methodDebug(semanticDebug)
    private visitTypeConstructor(node: TypeConstructor) {
        this.visitIdentifier(node.name, TokenLegend.Generic);

        node.args.forEach(arg => this.visitExpression(arg));
    }

    @methodDebug(semanticDebug)
    private visitPropertyAssignExpr(node: PropertyAssignExpr) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.visitIdentifier(node.name, TokenLegend.Property);

        this.visitExpression(node.value);
    }

    @methodDebug(semanticDebug)
    private visitArgument(node: Argument) {
        if (node.modifier)
            this.handleKeyword(node.marks.modifier!, true);

        this.visitIdentifier(node.name, TokenLegend.Property);

        if (node.operator === "is")
            this.handleKeyword(node.marks.operator!);

        if (node.annotation)
            this.visitTypeRef(node.annotation);
        else
            this.visitExpression(node.value!);
    }

    @methodDebug(semanticDebug)
    private visitLiteral(node: Literal) {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof SemanticCollector] as (node: Literal) => void)(node);

        else
            console.warn(`No visitor method for ${node.nodeName} at visitLiteral`);
    }

    @methodDebug(semanticDebug)
    private visitStr(node: Str) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.String,
            modifierBits: this.modifierToBits([TokenModifier.Readonly])
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitInteger(node: Integer) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.Number,
            modifierBits: this.modifierToBits([TokenModifier.Readonly])
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitFloat(node: Float) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.Number,
            modifierBits: this.modifierToBits([TokenModifier.Readonly])
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitBool(node: Bool) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: node.value.length,
            type: TokenLegend.Keyword,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private visitNil(node: Nil) {
        const gap = this.getGap(node.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: 3,
            type: TokenLegend.Keyword,
            modifierBits: 0
        });

        this.latestPos = node.pos;
    }

    @methodDebug(semanticDebug)
    private handleKeyword(token: Token, isModifier: boolean = false) {
        const gap = this.getGap(token.pos);

        this.tokens.push({
            line: gap.line,
            start: gap.column,
            length: token.value.length,
            type: TokenLegend.Keyword,
            modifierBits: isModifier ? this.modifierToBits([this.modifierToToken(token.value as ModifierType)!]) : 0
        });

        this.latestPos = token.pos;
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
