// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file ast.ts
 * @author edocsitahw
 * @version 2.0
 * @date 2025/04/25 00:06
 * @desc AST 节点的接口定义（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 与 v1 接口的差异：
 * - `TypeRef` 由 `BuiltinType | GenericType` 合并为单一节点，携带泛型实参 `typeArgs` 与注解实参 `annotations`；
 * - 新增 `TypeAnnotation`（`[required]` / `[GroupBy = "…"]` / `[Name : Type]` / `[>= 0]`）；
 * - `Reference` 由"单段名字"改为"任意段路径" `segments`；
 * - `MemberAccess` 增加 `/` 与 `.` 两种分隔符；
 * - `Argument` 支持位置实参（`positional`）与键入实参（`annotation`）；
 * - `PropertyAssignExpr` 更名为 `DefinitionExpr`，修饰符扩展为 `export | private | public`；
 * - 删除 `TypeConstructor`：`float3[0,0,0]` 解析为 `IndexAccess`。
 * */
import { IPos, IType, Nullable } from "./other";
import { Token } from "../lexer";
import { Comment } from "../parser";


export type BinaryOperator = "+" | "-" | "*" | "%" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "div" | "|" | "&";


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

    /** 非语句层注释（语句层注释本身就是 Statement） */
    comments: IComment[];
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

    /** 赋值运算符：顶层语句实际只用 `is`，语法上兼容 `=` */
    get operator(): "is" | "=";

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
    modifier: Nullable<"export" | "private" | "public">;
    name: IIdentifier;
    comments1: IComment[];
    params: IParameterDecl[];
    separatorComments1: IComment[];
    comments2: IComment[];
    comments3: IComment[];
    extend: ITypeRef;
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
    modifier?: Token;
    assignOrIs?: Token;
    meybeComma?: Token;
}


export interface IMemberAssign extends IInternalNode {
    name: IIdentifier;
    operator: "=" | "is";
    comments1: IComment[];
    value: IExpression;
    comments2: IComment[];

    marks: IMemberAssignMark;
}


export interface ITypeRefMark extends IInternalNodeMark {
    lt?: Token;
    gt?: Token;
    leftBracket?: Token;
    rightBracket?: Token;
    meybeComma?: Token;
}


/**
 * @interface ITypeRef
 * @desc 类型引用：`类型名 [<泛型实参>] [[注解实参]]`，两种后缀可以同时出现
 * @example LIST<TActionDescriptor>[required]
 * */
export interface ITypeRef extends IInternalNode {
    name: IIdentifier;
    typeArgs: ITypeRef[];
    annotations: ITypeAnnotation[];

    marks: ITypeRefMark;
}


export interface ITypeAnnotationMark extends IInternalNodeMark {
    operator?: Token;
    assign?: Token;
    meybeComma?: Token;
}


/**
 * @interface ITypeAnnotation
 * @desc 类型注解实参
 * @example required                        -> kind = "flag"
 * @example GroupBy = "Position"            -> kind = "value"
 * @example ExpectedType : float3 = 'any'   -> kind = "typed"
 * @example >= 0                            -> kind = "constraint"
 * */
export interface ITypeAnnotation extends IInternalNode {
    kind: "flag" | "value" | "typed" | "constraint";
    name: Nullable<IIdentifier>;
    annotation: Nullable<ITypeRef>;
    value: Nullable<IExpression>;

    marks: ITypeAnnotationMark;
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


/**
 * @interface ITemplateParam
 * @desc 模板形参引用 `<Name>`
 * */
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


/**
 * @interface IIndexAccess
 * @desc 下标/内建函数调用/内建类型构造：`sqr[x]`、`lerp[a, b, c]`、`float3[0, 0, 0]`
 * */
export interface IIndexAccess extends IInternalExpression {
    target: IExpression;
    args: IExpression[];

    marks: IIndexAccessMark;
}


export interface IMemberAccessMark extends IInternalExpressionMark {
    separator?: Token;
}


/**
 * @interface IMemberAccess
 * @desc 成员/枚举路径访问：`obj.Value`（`.`）与 `EUnitMovingType/Track`（`/`）
 * */
export interface IMemberAccess extends IInternalExpression {
    target: IExpression;
    separator: "/" | ".";
    property: IIdentifier;

    marks: IMemberAccessMark;
}


export interface IParenthesisExprMark extends IInternalExpressionMark {
    leftParen?: Token;
    rightParen?: Token;
    comma?: Token;
}


/**
 * @interface IParenthesisExpr
 * @desc 括号表达式；若带逗号则是序对 `(a, b)`
 * */
export interface IParenthesisExpr extends IInternalExpression {
    expr: IExpression;
    /** 序对的第二个元素（`(a, b)` 时存在） */
    second: Nullable<IExpression>;

    marks: IParenthesisExprMark;
}


export interface IReferenceMark extends ILeafExpressionMark {
    prefix?: Token;
    value?: Token;
}


/**
 * @interface IReference
 * @desc 引用：`$/A/B`（绝对）或 `~/A/B`（相对加载命名空间）
 * */
export interface IReference extends ILeafExpression {
    operator: "$" | "~";
    segments: IIdentifier[];

    marks: IReferenceMark;
}


export interface IGuidCallMark extends ILeafExpressionMark {
    colon?: Token;
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


export interface IDefinitionExprMark extends IInternalExpressionMark {
    modifier?: Token;
    is?: Token;
}


/**
 * @interface IDefinitionExpr
 * @desc 作为值出现的定义：`Member = Named is TType ( … )`、`[private x is TParam()]`
 * */
export interface IDefinitionExpr extends IInternalExpression {
    modifier: Nullable<"export" | "private" | "public">;
    name: IIdentifier;
    operator: "is" | "=";
    value: IExpression;

    marks: IDefinitionExprMark;
}


export interface IArgumentMark extends IInternalNodeMark {
    modifier?: Token;
    colonOrAssignOrIs?: Token;
    meybeComma?: Token;
}


/**
 * @interface IArgument
 * @desc 对象体/实参表中的一个条目
 * @example Name = value
 * @example Name is value
 * @example Name : Type = default
 * @example value            （位置实参）
 * */
export interface IArgument extends IInternalNode {
    modifier: Nullable<"export" | "private" | "public">;
    name: Nullable<IIdentifier>;
    value: Nullable<IExpression>;
    operator: Nullable<"=" | "is">;
    annotation: Nullable<ITypeRef>;
    positional: boolean;
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


