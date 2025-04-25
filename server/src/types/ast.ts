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
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import { IPos, IType, Nullable } from "./other";


export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "div" | "|" | "&";


export type GeneralAST = ILeafNode | IInternalNode | Array<GeneralAST>;


export interface IAST {
    pos: IPos;
    type: IType;
    get nodeName(): string;
    toString(): string;
    toJSON(): object;
}

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

export interface IAssignment extends IInternalStatement {
    modifier: Nullable<'private' | 'export'>;
    name: IIdentifier;
    value: IExpression;
}

export interface ITemplateDef extends IInternalStatement {
    modifier: Nullable<'private'>;
    name: IIdentifier;
    params: IParameterDecl[];
    extend: IIdentifier;
    members: IMemberAssign[];
}

export interface IUnnamedObj extends IInternalStatement {
    blueprint: IIdentifier;
    args: IArgument[];
}

export interface IParameterDecl extends IInternalNode {
    name: IIdentifier;
    annotation: Nullable<ITypeRef>;
    default: Nullable<IExpression>;
}

export interface IMemberAssign extends IInternalNode {
    name: IIdentifier;
    operator: '=' | 'is';
    value: IExpression;
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
}

export interface ILeafExpression extends ILeafNode {}

export interface IInternalExpression extends IAST {}

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
}

export interface ITernaryExpr extends IInternalExpression {
    condition: IExpression;
    trueExpr: IExpression;
    falseExpr: IExpression;
}

export interface ITemplateParam extends IInternalExpression {
    name: IIdentifier;
}

export interface IObjectCall extends IInternalExpression {
    blueprint: IIdentifier;
    args: IArgument[];
}

export interface IIndexAccess extends IInternalExpression {
    target: IExpression;
    index: IExpression;
}

export interface IMemberAccess extends IInternalExpression {
    target: IExpression;
    property: IIdentifier;
}

export interface IParenthesisExpr extends IInternalExpression {
    expr: IExpression;
}

export interface IReference extends ILeafExpression {
    path: string;
}

export interface IGuidCall extends ILeafExpression {
    uuid: string;
}

export interface IMapDef extends IInternalExpression {
    pairs: IPair[];
}

export interface IPair extends IInternalExpression {
    key: IExpression;
    value: IExpression;
}

export interface IVectorDef extends IInternalExpression {
    elements: IExpression[];
}

export interface ITypeInitializer extends IInternalExpression {
    name: ITypeRef;
    args: IExpression[];
}

export interface IPropertyAssignExpr extends IInternalExpression {
    modifier: Nullable<'private'>;
    name: IIdentifier;
    value: IExpression;
}

export interface IArgument extends IInternalNode {
    name: IIdentifier;
    value: Nullable<IExpression>;
    operator: Nullable<'=' | 'is'>;
    annotation: Nullable<ITypeRef>;
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
