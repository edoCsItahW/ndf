// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file analysis.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 00:11
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import { BaseType, IPos, IType } from "./other";


import {
    IProgram,
    IStatement,
    IAssignment,
    ITemplateDef,
    IUnnamedObj,
    ITypeRef,
    IBuiltinType,
    IGenericType,
    IExpression,
    IIdentifier,
    IUnaryExpr,
    IBinaryExpr,
    ITernaryExpr,
    ITemplateParam,
    IObjectCall,
    IIndexAccess,
    IMemberAccess,
    IParenthesisExpr,
    IReference,
    IGuidCall,
    IMapDef,
    IPair,
    IVectorDef,
    ITypeConstructor,
    IPropertyAssignExpr,
    ILiteral
} from "./ast";


export interface IAnalyser {
    visitProgram(node: IProgram): void;

    visitStatement(node: IStatement): void;

    visitAssignment(node: IAssignment): void;

    visitTemplateDef(node: ITemplateDef): void;

    visitUnnamedObj(node: IUnnamedObj): void;

    visitTypeRef(node: ITypeRef): IType;

    visitBuiltinType(node: IBuiltinType): IType;

    visitGenericType(node: IGenericType): IType;

    visitExpression(node: IExpression): IType;

    visitIdentifier(node: IIdentifier): IType;

    visitUnaryExpr(node: IUnaryExpr): IType;

    visitBinaryExpr(node: IBinaryExpr): IType;

    visitTernaryExpr(node: ITernaryExpr): IType;

    visitTemplateParam(node: ITemplateParam): IType;

    visitObjectCall(node: IObjectCall): IType;

    visitIndexAccess(node: IIndexAccess): IType;

    visitMemberAccess(node: IMemberAccess): IType;

    visitParenthesisExpr(node: IParenthesisExpr): IType;

    visitReference(node: IReference): IType;

    visitGuidCall(node: IGuidCall): IType;

    visitMapDef(node: IMapDef): IType;

    visitPair(node: IPair): IType;

    visitVectorDef(node: IVectorDef): IType;

    visitTypeConstructor(node: ITypeConstructor): IType;

    visitPropertyAssignExpr(node: IPropertyAssignExpr): IType;

    visitLiteral(node: ILiteral): IType;
}


export interface ITypeJSON {
    typeName: string;
    type: BaseType;
    name?: string;
}

export interface ITemplateTypeJSON {
    typeName: string;
    name: string;
    type: BaseType;
    params: Record<string, ITypeJSON>;
    prototypeScope?: IScopeJSON;
}

export interface IObjectTypeJSON {
    typeName: string;
    name: string;
    type: BaseType;
    prototypeScope?: IScopeJSON;
}

export interface IGenericTypeJSON {
    typeName: string;
    name: string;
    type: BaseType;
    params: ITypeJSON[];
}

export interface IVectorTypeJSON {
    typeName: string;
    name?: string;
    type: BaseType;
    elementType?: ITypeJSON[];
}

export interface IMapTypeJSON {
    typeName: string;
    name?: string;
    type: BaseType;
    keyType?: ITypeJSON[];
    valueType?: ITypeJSON[];
}

export interface IPairTypeJSON {
    typeName: string;
    name?: string;
    type: BaseType;
    keyType?: ITypeJSON;
    valueType?: ITypeJSON;
}

export type TypeJSON = ITypeJSON | ITemplateTypeJSON | IObjectTypeJSON | IGenericTypeJSON | IVectorTypeJSON | IMapTypeJSON | IPairTypeJSON;

export interface ISymbolJSON {
    name: string;
    pos: IPos;
    type: ITypeJSON;
}

export interface IScopeJSON {
    kind: string;
    id: number;
    symbols: Record<string, ISymbolJSON>;
    parent?: number | IScopeJSON;
}
