// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file ast.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 00:06
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { IPos, IType, Nullable } from "./other";
import { Token } from "../lexer";
import { Comment } from "../parser";


export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "div" | "|" | "&";


export type Node = ILeafNode | IInternalNode | Array<Node>;


export interface IAST {
    pos: IPos;
    type: IType;

    get nodeName(): string;

    toString(): string;

    toJSON(): object;
}


export interface ILeafNodeMark {
    value?: Token;
}


export interface IInternalNodeMark {
}


export interface ILeafNode extends IAST {
    get value(): string;

    marks: ILeafNodeMark;
}


export interface IInternalNode extends IAST {
    get children(): Node[];

    marks: IInternalNodeMark;
}


export interface IProgram extends IInternalNode {
    statements: IStatement[];
}


export interface ILeafStatement extends ILeafNode {
}


export interface IInternalStatement extends IInternalNode {
}


export type IStatement = ILeafStatement | IInternalStatement;


export interface IAssignMark {
    modifier?: Nullable<Token>;
    is?: Token;
}


export interface IAssignment extends IInternalStatement {
    modifier: Nullable<"export" | "private" | "public">;
    name: IIdentifier;
    value: IExpression;

    marks: IAssignMark;
}


export interface ITemplateDefMark {
    modifier?: Nullable<Token>;
    template?: Token;
    leftBracket?: Token;
    rightBracket?: Token;
    is?: Token;
    leftParen?: Token;
    rightParen?: Token;
}


export interface ITemplateDef extends IInternalStatement {
    modifier: Nullable<"private">;
    name: IIdentifier;
    comments1: IComment[];
    params: IParameterDecl[];
    comments2: IComment[];
    comments3: IComment[];
    extend: IIdentifier;
    comments4: IComment[];
    comments5: IComment[];
    members: IMemberAssign[];

    marks: ITemplateDefMark;
}


export interface IUnnamedObjMark {
    unnamed?: Token;
    leftParen?: Token;
    rightParen?: Token;
}


export interface IUnnamedObj extends IInternalStatement {
    blueprint: IIdentifier;
    comments1: IComment[];
    comments2: IComment[];
    args: IArgument[];

    marks: IUnnamedObjMark;
}


export interface IComment extends ILeafStatement {
    trailingNewLines: number;
}


export interface IFileImportComment extends IComment {
    path: string;
    items: string[];
}


export interface ILibImportComment extends IComment {
    items: string[];
}


export interface ICommonComment extends IComment {
    category: "doc" | "common";
}


export interface IParameterDeclMark {
    colonOrAssign?: Token;
    meybeComma?: Token;
}


export interface IParameterDecl extends IInternalNode {
    comments1: IComment[];
    name: IIdentifier;
    annotation: Nullable<ITypeRef>;
    default: Nullable<IExpression>;
    comments2: IComment[];

    marks: IParameterDeclMark;
}


export interface IMemberAssignMark {
    assignOrIs?: Token;
}


export interface IMemberAssign extends IInternalNode {
    name: IIdentifier;
    operator: "=" | "is";
    comments1: IComment[];
    value: IExpression;
    comments2: IComment[];

    marks: IMemberAssignMark;
}


export interface ILeafTypeRefMark extends ILeafNodeMark {
    meybeComma?: Token;
}


export interface IInternalTypeRefMark extends IInternalNodeMark {
    meybeComma?: Token;
}


export interface ILeafTypeRef extends ILeafNode {
    marks: ILeafTypeRefMark;
}


export interface IInternalTypeRef extends IInternalNode {
    marks: IInternalTypeRefMark;
}


export type ITypeRef = ILeafTypeRef | IInternalTypeRef;


export interface IBuiltinTypeMark extends ILeafTypeRefMark {
}


export interface IBuiltinType extends ILeafTypeRef {
    name: string;

    marks: IBuiltinTypeMark;
}


export interface IGenericTypeMark extends IInternalTypeRefMark {
    meybeMap?: Token;
    lt?: Token;
    gt?: Token;
}


export interface IGenericType extends IInternalTypeRef {
    name: IIdentifier;
    comments1: IComment[];
    typeParams: ITypeRef[];

    marks: IGenericTypeMark;
}


export interface ILeafExpressionMark extends ILeafNodeMark {
    meybeComma?: Token;
}


export interface IInternalExpressionMark extends IInternalNodeMark {
    meybeComma?: Token;
}


export interface ILeafExpression extends ILeafNode {
    trailingComments: IComment[];
    leadingComments: IComment[];

    marks: ILeafExpressionMark;
}


export interface IInternalExpression extends IInternalNode {
    trailingComments: IComment[];
    leadingComments: IComment[];

    marks: IInternalExpressionMark;
}


export type IExpression = ILeafExpression | IInternalExpression;


export interface IIdentifierMark extends ILeafExpressionMark {
    value?: Token;
}


export interface IIdentifier extends ILeafExpression {
    name: string;

    marks: IIdentifierMark;
}


export interface IUnaryExprMark extends IInternalExpressionMark {
    subOrNot?: Token;
}


export interface IUnaryExpr extends IInternalExpression {
    operator: "-" | "!";
    operand: IExpression;
}


export interface IBinaryExprMark extends IInternalExpressionMark {
    operator?: Token;
}


export interface IBinaryExpr extends IInternalExpression {
    left: IExpression;
    comments1: IComment[];
    operator: BinaryOperator;
    comments2: IComment[];
    right: IExpression;

    marks: IBinaryExprMark;
}


export interface ITernaryExprMark extends IInternalExpressionMark {
    question?: Token;
    colon?: Token;
}


export interface ITernaryExpr extends IInternalExpression {
    condition: IExpression;
    comments1: IComment[];
    comments2: IComment[];
    trueExpr: IExpression;
    comments3: IComment[];
    comments4: IComment[];
    falseExpr: IExpression;

    marks: ITernaryExprMark;
}


export interface ITemplateParamMark extends ILeafExpressionMark {
    lt?: Token;
    gt?: Token;
    value?: Token;
}


export interface ITemplateParam extends ILeafExpression {
    name: IIdentifier;

    marks: ITemplateParamMark;
}


export interface IObjectCallMark extends IInternalExpressionMark {
    leftParen?: Token;
    rightParen?: Token;
}


export interface IObjectCall extends IInternalExpression {
    blueprint: IIdentifier;
    comments1: IComment[];
    comments2: IComment[];
    args: IArgument[];

    marks: IObjectCallMark;
}


export interface IIndexAccessMark extends IInternalExpressionMark {
    leftBracket?: Token;
    rightBracket?: Token;
}


export interface IIndexAccess extends IInternalExpression {
    target: IExpression;
    index: IExpression;

    marks: IIndexAccessMark;
}


export interface IMemberAccessMark extends IInternalExpressionMark {
    div?: Token;
}


export interface IMemberAccess extends IInternalExpression {
    target: IExpression;
    property: IIdentifier;
}


export interface IParenthesisExprMark extends IInternalExpressionMark {
    leftParen?: Token;
    rightParen?: Token;
}


export interface IParenthesisExpr extends IInternalExpression {
    expr: IExpression;

    marks: IParenthesisExprMark;
}


export interface IReferenceMark extends ILeafExpressionMark {
    dollarOrTildeOrDot?: Token;
    div?: Token;
    value?: Token;
}


export interface IReference extends ILeafExpression {
    name: IIdentifier;

    marks: IReferenceMark;
}


export interface IGuidCallMark extends ILeafExpressionMark {
    colon?: Token;
    leftBrace?: Token;
    rightBrace?: Token;
    guid?: Token;
    value?: Token;
}


export interface IGuidCall extends ILeafExpression {
    uuid: string;

    marks: IGuidCallMark;
}


export interface IMapDefMark extends IInternalExpressionMark {
    map?: Token;
    leftBracket?: Token;
    rightBracket?: Token;
}


export interface IMapDef extends IInternalExpression {
    comments1: IComment[];
    pairs: IPair[];
    comments2: IComment[];

    marks: IMapDefMark;
}


export interface IPairMark extends IInternalExpressionMark {
    leftParen?: Token;
    rightParen?: Token;
    comma?: Token;
}


export interface IPair extends IInternalExpression {
    key: IExpression;
    value: IExpression;

    marks: IPairMark;
}


export interface IVectorDefMark extends IInternalExpressionMark {
    leftBracket?: Token;
    rightBracket?: Token;
}


export interface IVectorDef extends IInternalExpression {
    elements: IExpression[];
    comments1: IComment[];

    marks: IVectorDefMark;
}


export interface ITypeConstructorMark extends IInternalExpressionMark {
    leftBracket?: Token;
    rightBracket?: Token;
}


export interface ITypeConstructor extends IInternalExpression {
    name: IIdentifier;
    comments1: IComment[];
    args: IExpression[];

    marks: ITypeConstructorMark;
}


export interface IPropertyAssignMark extends IInternalExpressionMark {
    modifier?: Token;
    is?: Token;
}


export interface IPropertyAssignExpr extends IInternalExpression {
    modifier: Nullable<"private">;
    name: IIdentifier;
    value: IExpression;
    marks: IPropertyAssignMark;
}


export interface IArgumentMark extends IInternalNodeMark {
    modifier?: Token;
    colonOrAssignOrIs?: Token;
}


export interface IArgument extends IInternalNode {
    modifier: Nullable<"export" | "public">;
    name: IIdentifier;
    value: Nullable<IExpression>;
    operator: Nullable<"=" | "is">;
    annotation: Nullable<ITypeRef>;
    comments1: IComment[];

    marks: IArgumentMark;
}


export interface ILiteral extends ILeafExpression {
}


export interface IInteger extends ILiteral {
}


export interface IFloat extends ILiteral {
}


export interface IBoolean extends ILiteral {
    value: string;
}


export interface IStr extends ILiteral {
}


export interface INil extends ILiteral {
    value: "nil";
}
