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


export type GeneralAST = ILeafNode | IInternalNode | Array<GeneralAST>;


export interface IAST {
    pos: IPos;
    type: IType;
    get nodeName(): string;
    toString(): string;
    toJSON(): object;
}

export type SeparatorComments = Array<Comment[]>;

export interface ILeafNode extends IAST {
    get value(): string;
}

export interface IInternalNode extends IAST {
    get children(): GeneralAST[];
}

export interface IProgram extends IInternalNode {
    statements: IStatement[];
}

export interface ILeafStatement extends ILeafNode {}

export interface IInternalStatement extends IInternalNode {
}

export type IStatement = ILeafStatement | IInternalStatement;

export interface IAssignMark {
    modifier?: Nullable<Token>;
    is?: Token;
}

export interface IAssignment extends IInternalStatement {
    modifier: Nullable<'export' | 'private' | 'public'>;
    name: IIdentifier;
    value: IExpression;
    marks: IAssignMark;
}

export interface ITemplateDefMark {
    modifier?: Nullable<Token>;
    template?: Token;
    is?: Token;
}

export interface ITemplateDef extends IInternalStatement {
    modifier: Nullable<'private'>;
    name: IIdentifier;
    params: IParameterDecl[];
    extend: IIdentifier;
    members: IMemberAssign[];
    marks: ITemplateDefMark;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
    pos3Comments: IComment[];
    pos4Comments: IComment[];

    separatorComments1: SeparatorComments;
    separatorComments2: SeparatorComments;
}

export interface IUnnamedObjMark {
    unnamed?: Token;
}

export interface IUnnamedObj extends IInternalStatement {
    blueprint: IIdentifier;
    args: IArgument[];
    marks: IUnnamedObjMark;

    pos1Comments: IComment[];

    separatorComments: SeparatorComments;
}

export interface ILeafComment extends ILeafStatement {
}

export interface IInternalComment extends IInternalStatement {}

export type IComment = ILeafComment | IInternalComment;

export interface IFileImportComment extends ILeafComment {
    path: string;
    items: string[];
}

export interface ILibImportComment extends ILeafComment {
    items: string[];
}

export interface ICommonComment extends ILeafComment {
    category: "doc" | "common";
}

export interface IParameterDecl extends IInternalNode {
    name: IIdentifier;
    annotation: Nullable<ITypeRef>;
    default: Nullable<IExpression>;

    pos1Comments: IComment[];
}

export interface IMemberAssignMark {
    operator?: Token;
}

export interface IMemberAssign extends IInternalNode {
    name: IIdentifier;
    operator: '=' | 'is';
    value: IExpression;
    marks: IMemberAssignMark;

    pos1Comments: IComment[];
}

export interface ILeafTypeRef extends ILeafNode {}

export interface IInternalTypeRef extends IInternalNode {}

export type ITypeRef = ILeafTypeRef | IInternalTypeRef;

export interface IBuiltinType extends ILeafTypeRef {
    name: string;
}

export interface IGenericType extends IInternalTypeRef {
    name: IIdentifier;
    typeParams: ITypeRef[];

    pos1Comments: IComment[];

    separatorComments: SeparatorComments;
}

export interface ILeafExpression extends ILeafNode {}

export interface IInternalExpression extends IInternalNode {}

export type IExpression = ILeafExpression | IInternalExpression;

export interface IIdentifier extends ILeafExpression {
    name: string;
}

export interface IUnaryExpr extends IInternalExpression {
    operator: '-' | '!';
    operand: IExpression;
}

export interface IBinaryExpr extends IInternalExpression{
    left: IExpression;
    operator: BinaryOperator;
    right: IExpression;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
}

export interface ITernaryExpr extends IInternalExpression {
    condition: IExpression;
    trueExpr: IExpression;
    falseExpr: IExpression;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
    pos3Comments: IComment[];
    pos4Comments: IComment[];
}

export interface ITemplateParam extends IInternalExpression {
    name: IIdentifier;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
}

export interface IObjectCall extends IInternalExpression {
    blueprint: IIdentifier;
    args: IArgument[];

    pos1Comments: IComment[];

    separatorComments: SeparatorComments;
}

export interface IIndexAccess extends IInternalExpression {
    target: IExpression;
    index: IExpression;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
}

export interface IMemberAccess extends IInternalExpression {
    target: IExpression;
    property: IIdentifier;
}

export interface IParenthesisExpr extends IInternalExpression {
    expr: IExpression;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
}

export interface IReference extends ILeafExpression {
    path: string;
}

export interface IGuidCall extends ILeafExpression {
    uuid: string;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
}

export interface IMapDefMark {
    map?: Token;
}

export interface IMapDef extends IInternalExpression {
    pairs: IPair[];
    marks: IMapDefMark;

    pos1Comments: IComment[];

    separatorComments: SeparatorComments;
}

export interface IPair extends IInternalExpression {
    key: IExpression;
    value: IExpression;

    pos1Comments: IComment[];
    pos2Comments: IComment[];
    pos3Comments: IComment[];
    pos4Comments: IComment[];
}

export interface IVectorDef extends IInternalExpression {
    elements: IExpression[];

    separatorComments: SeparatorComments;
}

export interface ITypeConstructor extends IInternalExpression {
    name: IIdentifier;
    args: IExpression[];

    pos1Comments: IComment[];

    separatorComments: SeparatorComments;
}

export interface IPropertyAssignMark {
    modifier?: Token;
}

export interface IPropertyAssignExpr extends IInternalExpression {
    modifier: Nullable<'private'>;
    name: IIdentifier;
    value: IExpression;
    marks: IPropertyAssignMark;
}

export interface IArgumentMMark {
    modifier?: Token;
    operator?: Token;
}

export interface IArgument extends IInternalNode {
    modifier: Nullable<'export' | 'public'>;
    name: IIdentifier;
    value: Nullable<IExpression>;
    operator: Nullable<'=' | 'is'>;
    annotation: Nullable<ITypeRef>;
    marks: IArgumentMMark;

    pos1Comments: IComment[];
}

export interface ILiteral extends ILeafExpression {
}

export interface IInteger extends ILiteral, ILeafNode {
}

export interface IFloat extends ILiteral, ILeafNode {
}

export interface IBoolean extends ILiteral, ILeafNode {
    value: string;
}

export interface IString extends ILiteral, ILeafNode {
}

export interface INil extends ILiteral, ILeafNode {
    value: 'nil'
}
