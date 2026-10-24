// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file ast.ts
 * @author edocsitahw
 * @version 2.0
 * @date 2025/04/25 00:06
 * @desc NDF 抽象语法树节点（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 本文件的节点集合与 `NDF.g4` v2.0 的产生式一一对应：
 *
 * ```
 * program        : statement* EOF
 * statement      : templateDefinition | unnamedInstantiation | definition
 * definition     : modifier? name ('is' | '=') value
 * value          : definition | expression
 * templateDefinition : modifier? 'template' name templateParameterList 'is' typeRef objectBody
 * unnamedInstantiation : 'unnamed' name objectBody
 * typeRef        : typeName typeArgumentList? typeParameterList?
 * objectBody     : '(' (bodyItem (','? bodyItem)* ','?)? ')'
 * ```
 *
 * 节点与 v1 的差异见 `types/ast.ts` 的说明。每个节点都用 `marks` 保存**原始令牌**，
 * 供格式化器/语义高亮还原位置与布局。
 * */
import {
    BaseType,
    BinaryOperator,
    Node,
    IArgument,
    IAssignment,
    IAST,
    IBinaryExpr,
    IBoolean,
    IDefinitionExpr,
    IFloat,
    IGuidCall,
    IIdentifier,
    IIndexAccess,
    IInteger,
    IInternalExpression,
    IInternalNode,
    IInternalStatement,
    ILeafExpression,
    ILeafNode,
    ILeafStatement,
    ILiteral,
    IMapDef,
    IMemberAccess,
    IMemberAssign,
    INil,
    IObjectCall,
    IPair,
    IParameterDecl,
    IParenthesisExpr,
    IPos,
    IProgram,
    IReference,
    IStr,
    ITemplateDef,
    ITemplateParam,
    ITernaryExpr,
    ITypeAnnotation,
    ITypeRef,
    IUnaryExpr,
    IUnnamedObj,
    IVectorDef,
    Nullable,
    IType,
    IAssignMark,
    ITemplateDefMark,
    IMemberAssignMark,
    IComment,
    IFileImportComment,
    ILibImportComment,
    ICommonComment,
    IUnnamedObjMark,
    IDefinitionExprMark,
    IArgumentMark,
    IMapDefMark,
    IPairMark,
    IVectorDefMark,
    ITypeRefMark,
    ITypeAnnotationMark,
    IIndexAccessMark,
    IMemberAccessMark,
    IReferenceMark,
    IGuidCallMark,
    IParenthesisExprMark,
    ITernaryExprMark,
    IBinaryExprMark,
    IUnaryExprMark,
    ITemplateParamMark,
    IObjectCallMark,
    IIdentifierMark,
    ILiteral as ILiteralIface,
    ILeafNodeMark,
    IInternalNodeMark,
    ILeafExpressionMark,
    IInternalExpressionMark,
    IParameterDeclMark,
    Optional
} from "../types";
import { Token } from "../lexer";


export type ASTWithBelong = Argument | UnnamedObj | TemplateDef | MemberAssign | ParameterDecl | Assignment | DefinitionExpr | TypeRef;


/**
 * @class AST
 * @classDesc NDF 抽象语法树节点基类
 * @desc 提供 `nodeName`、`pos`、`type`、`length` 等公共能力
 * @abstract
 * */
export abstract class AST implements IAST {
    protected abstract _nodeName: string;

    abstract pos: IPos;

    abstract type: IType;

    get nodeName(): string {
        return this._nodeName;
    }

    abstract toJSON(): object;

    abstract toString(): string;

    abstract get length(): number;

    protected _length(...args: (Optional<Token | AST | AST[]>)[]): number {
        return args.map(arg => {
            if (arg instanceof Token || arg instanceof AST)
                return arg.length;

            else if (Array.isArray(arg))
                return arg.map(i => this._length(i)).reduce((a, b) => a + b, 0);

            else
                return 0;
        }).reduce((a, b) => a + b, 0);
    }
}


/**
 * @class LeafNode
 * @classDesc 叶子节点基类
 * @abstract
 * */
export abstract class LeafNode extends AST implements ILeafNode {
    abstract get value(): string;

    abstract marks: ILeafNodeMark;
}


/**
 * @class InternalNode
 * @classDesc 内部节点基类
 * @abstract
 * */
export abstract class InternalNode extends AST implements IInternalNode {
    abstract get children(): Node[];

    abstract marks: IInternalNodeMark;
}


/**
 * @class Program
 * @classDesc 程序节点
 * @remarks `program : statement* EOF`
 * */
export class Program extends InternalNode implements IProgram {
    protected _nodeName: string = "Program";

    statements: Statement[] = [];

    /** 非语句层注释：供语义高亮遍历，不参与语句结构 */
    comments: Comment[] = [];

    marks: IInternalNodeMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Statement[] {
        return this.statements;
    }

    get length(): number {
        return this._length(this.statements);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            statements: this.statements.map(stmt => stmt.toJSON())
        };
    }

    toString(): string {
        return this.statements.join("\n");
    }
}


export abstract class LeafStatement extends LeafNode implements ILeafStatement {
    abstract get value(): string;
}


export abstract class InternalStatement extends InternalNode implements IInternalStatement {
    abstract get children(): Node[];
}


/**
 * @type Statement
 * @remarks `statement : templateDefinition | unnamedInstantiation | definition`
 * */
export type Statement = LeafStatement | InternalStatement;


/**
 * @class Assignment
 * @classDesc 顶层定义语句
 * @remarks `definition : modifier? name ('is' | '=') value`
 * @example `export Descriptor_Unit_X is TEntityDescriptor ( … )`
 * */
export class Assignment extends InternalStatement implements IAssignment {
    protected _nodeName: string = "Assignment";

    modifier: Nullable<"export" | "private" | "public">;

    name: Identifier = DEFAULT_IDENTIFIER;

    value: Expression = DEFAULT_IDENTIFIER;

    marks: IAssignMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly belong?: ASTWithBelong) {
        super();
    }

    get operator(): "is" | "=" {
        return this.marks.is?.value === "=" ? "=" : "is";
    }

    get children(): (Identifier | Expression)[] {
        return [this.name, this.value];
    }

    get length(): number {
        return this._length(this.marks.modifier, this.name, this.marks.is, this.value);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            operator: this.operator,
            value: this.value.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}${this.name.toString()} ${this.operator} ${this.value.toString()}`;
    }
}


/**
 * @class TemplateDef
 * @classDesc 模板定义
 * @remarks `templateDefinition : modifier? 'template' name templateParameterList 'is' typeRef objectBody`
 * @example
 * ```
 * template Character [ Name : string, Level : int = 1 ] is TCharacter (
 *     Name = <Name>
 * )
 * ```
 * */
export class TemplateDef extends InternalStatement implements ITemplateDef {
    protected _nodeName: string = "TemplateDef";

    modifier: Nullable<"export" | "private" | "public">;

    name: Identifier = DEFAULT_IDENTIFIER;

    comments1: Comment[] = [];           // 名字后、参数块前
    params: ParameterDecl[] = [];
    separatorComments1: Comment[] = [];  // 参数块内、`]` 前
    comments2: Comment[] = [];           // `]` 与 `is` 之间
    comments3: Comment[] = [];           // `is` 与类型之间
    extend: TypeRef = DEFAULT_TYPEREF;
    comments4: Comment[] = [];           // 类型与 `(` 之间
    comments5: Comment[] = [];           // `(` 之后
    members: MemberAssign[] = [];

    marks: ITemplateDefMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Node[] {
        return [this.name, this.comments1, this.params, this.comments2, this.comments3, this.extend,
            this.comments4, this.comments5, this.members];
    }

    get length(): number {
        return this._length(
            this.marks.modifier, this.marks.template, this.name, this.comments1,
            this.marks.leftBracket, this.params, this.separatorComments1, this.marks.rightBracket,
            this.comments2, this.marks.is, this.comments3, this.extend, this.comments4,
            this.marks.leftParen, this.comments5, this.members, this.marks.rightParen
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            params: this.params.map(param => param.toJSON()),
            extend: this.extend.toJSON(),
            members: this.members.map(member => member.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}template ${this.name.toString()} [...] is ${this.extend.toString()} (...)`;
    }
}


/**
 * @class UnnamedObj
 * @classDesc 无名对象（只能出现在顶层）
 * @remarks `unnamedInstantiation : 'unnamed' name objectBody`
 * */
export class UnnamedObj extends InternalStatement implements IUnnamedObj {
    protected _nodeName: string = "UnnamedObj";

    blueprint: Identifier = DEFAULT_IDENTIFIER;

    comments1: Comment[] = [];
    comments2: Comment[] = [];
    args: Argument[] = [];

    marks: IUnnamedObjMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Comment[] | Argument[])[] {
        return [this.blueprint, this.comments1, this.comments2, this.args];
    }

    get length(): number {
        return this._length(
            this.marks.unnamed, this.blueprint, this.comments1,
            this.marks.leftParen, this.comments2, this.args, this.marks.rightParen
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            blueprint: this.blueprint.toJSON(),
            args: this.args.map(arg => arg.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `unnamed ${this.blueprint.toString()} (...)`;
    }
}


/**
 * @class Comment
 * @classDesc 注释语句基类
 * @remarks 注释在 v2 语法里属于 HIDDEN 通道；AST 仍保留它们，因为
 * - `///` 承载本插件的 import 指令（工具层语义）；
 * - 格式化器需要还原注释与空行。
 * */
export abstract class Comment extends LeafStatement implements IComment {
    abstract trailingNewLines: number;
}


export class FileImportComment extends Comment implements IFileImportComment {
    protected _nodeName: string = "FileImportComment";

    items: string[] = [];
    path: string = "";

    marks: ILeafNodeMark = {};

    trailingNewLines = 0;
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly value: string) {
        super();
    }

    get length(): number {
        return this._length(this.marks.value);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            items: this.items,
            path: this.path,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `/// from "${this.path}" import ${this.items.join(", ")}`;
    }
}


export class LibImportComment extends Comment implements ILibImportComment {
    protected _nodeName: string = "LibImportComment";

    items: string[] = [];

    marks: ILeafNodeMark = {};

    trailingNewLines = 0;
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly value: string) {
        super();
    }

    get length(): number {
        return this._length(this.marks.value);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            items: this.items,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `/// import ${this.items.join(", ")}`;
    }
}


export class CommenComment extends Comment implements ICommonComment {
    protected _nodeName: string = "CommenComment";

    category: "doc" | "common" = "common";

    marks: ILeafNodeMark = {};

    trailingNewLines = 0;
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public value: string) {
        super();
    }

    get length(): number {
        return this._length(this.marks.value);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            category: this.category,
            value: this.value,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


/**
 * @class ParameterDecl
 * @classDesc 模板形参声明
 * @remarks `templateParameter : modifier? name (':' typeRef)? ('=' value)?`
 * @example `Level : int = 1`
 * */
export class ParameterDecl extends InternalNode implements IParameterDecl {
    protected _nodeName: string = "ParameterDecl";

    modifier: Nullable<"export" | "private" | "public">;

    comments1: Comment[] = [];  // 名称前置注释
    name: Identifier = DEFAULT_IDENTIFIER;
    annotation: Nullable<TypeRef>;
    default: Nullable<Expression>;
    comments2: Comment[] = [];  // 结尾注释

    marks: IParameterDeclMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly belong: TemplateDef) {
        super();
    }

    get children(): (Identifier | TypeRef | Expression | Comment[])[] {
        return [this.comments1, this.name, this.annotation, this.default, this.comments2].filter(x => x !== undefined);
    }

    get length(): number {
        return this._length(
            this.marks.colonOrAssign === undefined ? undefined : this.marks.colonOrAssign,
            this.name, this.annotation, this.default, this.marks.meybeComma, this.comments1, this.comments2
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            annotation: this.annotation?.toJSON(),
            default: this.default?.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.name.toString()}${this.annotation ? `: ${this.annotation.toString()}` : ""}${this.default ? ` = ${this.default.toString()}` : ""}`;
    }
}


/**
 * @class MemberAssign
 * @classDesc 模板体成员（模板体的 `objectBody` 中，成员以 `MemberAssign` 表示）
 * @remarks `bodyItem : modifier? name ':' typeRef ('=' value)? | definition | expression`
 * @example `Name = <Name>`
 * */
export class MemberAssign extends InternalNode implements IMemberAssign {
    protected _nodeName: string = "MemberAssign";

    modifier: Nullable<"export" | "private" | "public">;

    name: Identifier = DEFAULT_IDENTIFIER;
    operator: "=" | "is" = "=";
    comments1: Comment[] = [];  // 赋值符号尾随注释
    value: Expression = DEFAULT_IDENTIFIER;
    comments2: Comment[] = [];  // 结尾注释

    marks: IMemberAssignMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly belong: TemplateDef) {
        super();
    }

    get children(): (Identifier | Expression | Comment[])[] {
        return [this.name, this.comments1, this.value, this.comments2];
    }

    get length(): number {
        return this._length(
            this.marks.modifier, this.name, this.marks.assignOrIs, this.comments1,
            this.value, this.comments2, this.marks.meybeComma
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            operator: this.operator,
            value: this.value.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.name.toString()} ${this.operator} ${this.value.toString()}`;
    }
}


/**
 * @class TypeRef
 * @classDesc 类型引用
 * @remarks `typeRef : typeName typeArgumentList? typeParameterList?`
 * @example `TEntityDescriptor`
 * @example `LIST<TActionDescriptor>`
 * @example `TEvaluable[required]`
 * @example `LIST<TActionDescriptor>[required]`
 * */
export class TypeRef extends InternalNode implements ITypeRef {
    protected _nodeName: string = "TypeRef";

    name: Identifier = DEFAULT_IDENTIFIER;
    typeArgs: TypeRef[] = [];
    annotations: TypeAnnotation[] = [];

    marks: ITypeRefMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos, public readonly belong?: ASTWithBelong) {
        super();
    }

    get children(): (Identifier | TypeRef[] | TypeAnnotation[])[] {
        return [this.name, this.typeArgs, this.annotations];
    }

    get length(): number {
        return this._length(
            this.name, this.marks.lt, this.typeArgs, this.marks.gt,
            this.marks.leftBracket, this.annotations, this.marks.rightBracket, this.marks.meybeComma
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            typeArgs: this.typeArgs.map(arg => arg.toJSON()),
            annotations: this.annotations.map(annotation => annotation.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.name.toString()}`
            + (this.typeArgs.length ? `<${this.typeArgs.map(arg => arg.toString()).join(", ")}>` : "")
            + (this.annotations.length ? `[${this.annotations.map(a => a.toString()).join(", ")}]` : "");
    }
}


/**
 * @class TypeAnnotation
 * @classDesc 类型注解实参
 * @remarks
 * ```
 * typeParameter : typeConstraint
 *               | name '=' value
 *               | name ':' typeRef ('=' value)?
 *               | name
 *               | expression
 * ```
 * */
export class TypeAnnotation extends InternalNode implements ITypeAnnotation {
    protected _nodeName: string = "TypeAnnotation";

    kind: "flag" | "value" | "typed" | "constraint" = "flag";

    name: Nullable<Identifier>;
    annotation: Nullable<TypeRef>;
    value: Nullable<Expression>;

    marks: ITypeAnnotationMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | TypeRef | Expression)[] {
        return [this.name, this.annotation, this.value].filter(x => x !== undefined) as (Identifier | TypeRef | Expression)[];
    }

    get length(): number {
        return this._length(
            this.marks.operator, this.name, this.marks.assign,
            this.annotation, this.value, this.marks.meybeComma
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            kind: this.kind,
            name: this.name?.toJSON(),
            annotation: this.annotation?.toJSON(),
            value: this.value?.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        switch (this.kind) {
            case "constraint":
                return `${this.marks.operator?.value || ">="} ${this.value?.toString() || "0"}`;
            case "value":
                return `${this.name?.toString()} = ${this.value?.toString()}`;
            case "typed":
                return `${this.name?.toString()}: ${this.annotation?.toString()}${this.value ? ` = ${this.value.toString()}` : ""}`;
            default:
                return `${this.name?.toString()}`;
        }
    }
}


/* ============================================================================
 * 表达式
 * ========================================================================== */

export abstract class LeafExpression extends LeafNode implements ILeafExpression {
    abstract get value(): string;

    abstract marks: ILeafExpressionMark;

    trailingComments: Comment[] = [];
    leadingComments: Comment[] = [];

    get length(): number {
        return this._length(this.trailingComments, this.leadingComments, this.marks.meybeComma);
    }
}


export abstract class InternalExpression extends InternalNode implements IInternalExpression {
    abstract get children(): Node[];

    abstract marks: IInternalExpressionMark;

    trailingComments: Comment[] = [];
    leadingComments: Comment[] = [];

    get length(): number {
        return this._length(this.trailingComments, this.leadingComments, this.marks.meybeComma);
    }
}


export type Expression = LeafExpression | InternalExpression;


/**
 * @class Identifier
 * @classDesc 标识符表达式（名字 / 内建类型名 / 容器名）
 * */
export class Identifier extends LeafExpression implements IIdentifier {
    protected _nodeName: string = "Identifier";

    name: string = "";

    marks: IIdentifierMark = {};

    type: IType = { type: BaseType.UNKNOWN, name: this.name };

    constructor(public pos: IPos, public readonly belong?: ASTWithBelong) {
        super();
    }

    get value(): string {
        return this.name;
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.name;
    }
}


export class UnaryExpr extends InternalExpression implements IUnaryExpr {
    protected _nodeName: string = "UnaryExpr";

    operator: "-" | "!" = "-";
    operand: Expression = DEFAULT_IDENTIFIER;

    marks: IUnaryExprMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Node[] {
        return [this.leadingComments, this.operand, this.trailingComments];
    }

    get length(): number {
        return this._length(this.marks.subOrNot, this.operand);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            operator: this.operator,
            operand: this.operand.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.operator}${this.operand.toString()}`;
    }
}


export class BinaryExpr extends InternalExpression implements IBinaryExpr {
    protected _nodeName: string = "BinaryExpr";

    left: Expression = DEFAULT_IDENTIFIER;
    comments1: Comment[] = [];
    operator: BinaryOperator = "+";
    comments2: Comment[] = [];
    right: Expression = DEFAULT_IDENTIFIER;

    marks: IBinaryExprMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Expression | Comment[])[] {
        return [this.left, this.comments1, this.comments2, this.right];
    }

    get length(): number {
        return this._length(this.left, this.comments1, this.marks.operator, this.comments2, this.right);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            left: this.left.toJSON(),
            operator: this.operator,
            right: this.right.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.left.toString()} ${this.operator} ${this.right.toString()}`;
    }
}


export class TernaryExpr extends InternalExpression implements ITernaryExpr {
    protected _nodeName: string = "TernaryExpr";

    condition: Expression = DEFAULT_IDENTIFIER;
    comments1: Comment[] = [];
    comments2: Comment[] = [];
    trueExpr: Expression = DEFAULT_IDENTIFIER;
    comments3: Comment[] = [];
    comments4: Comment[] = [];
    falseExpr: Expression = DEFAULT_IDENTIFIER;

    marks: ITernaryExprMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Expression | Comment[])[] {
        return [this.condition, this.comments1, this.comments2, this.trueExpr, this.comments3, this.comments4, this.falseExpr];
    }

    get length(): number {
        return this._length(
            this.condition, this.comments1, this.marks.question, this.comments2,
            this.trueExpr, this.comments3, this.marks.colon, this.comments4, this.falseExpr
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            condition: this.condition.toJSON(),
            trueExpr: this.trueExpr.toJSON(),
            falseExpr: this.falseExpr.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.condition.toString()} ? ${this.trueExpr.toString()} : ${this.falseExpr.toString()}`;
    }
}


/**
 * @class TemplateParam
 * @classDesc 模板形参引用 `<Name>`
 * */
export class TemplateParam extends LeafExpression implements ITemplateParam {
    protected _nodeName: string = "TemplateParam";

    name: Identifier = DEFAULT_IDENTIFIER;

    marks: ITemplateParamMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return `<${this.name.value}>`;
    }

    get length(): number {
        return this._length(this.marks.lt, this.name, this.marks.gt);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `<${this.name.toString()}>`;
    }
}


/**
 * @class ObjectCall
 * @classDesc 对象构造 / 模板实例化 / 调用
 * @remarks `postfixPart : objectBody | arrayLiteral | '/' name | '.' name`
 * @example `TEntityDescriptor ( Member = 1 )`
 * @example `Character ( Name = "Hero" )`
 * */
export class ObjectCall extends InternalExpression implements IObjectCall {
    protected _nodeName: string = "ObjectCall";

    blueprint: Identifier = DEFAULT_IDENTIFIER;

    comments1: Comment[] = [];
    comments2: Comment[] = [];
    args: Argument[] = [];

    marks: IObjectCallMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Comment[] | Argument[])[] {
        return [this.blueprint, this.comments1, this.comments2, this.args];
    }

    get length(): number {
        return this._length(
            this.blueprint, this.comments1, this.marks.leftParen,
            this.comments2, this.args, this.marks.rightParen
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            blueprint: this.blueprint.toJSON(),
            args: this.args.map(arg => arg.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.blueprint.toString()} (${this.args.map(arg => arg.toString()).join(" ")} )`;
    }
}


/**
 * @class IndexAccess
 * @classDesc 下标访问 / 内建函数调用 / 内建类型构造
 * @example `float3[0, 0, 0]`、`length[parA - parB]`、`lerp[a, b, c]`
 * */
export class IndexAccess extends InternalExpression implements IIndexAccess {
    protected _nodeName: string = "IndexAccess";

    target: Expression = DEFAULT_IDENTIFIER;
    args: Expression[] = [];

    marks: IIndexAccessMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Expression | Expression[])[] {
        return [this.target, this.args];
    }

    get length(): number {
        return this._length(this.target, this.marks.leftBracket, this.args, this.marks.rightBracket);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            target: this.target.toJSON(),
            args: this.args.map(arg => arg.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.target.toString()}[${this.args.map(arg => arg.toString()).join(", ")}]`;
    }
}


/**
 * @class MemberAccess
 * @classDesc 成员/枚举路径访问
 * @example `~/Table.Value`（`.`）、`EUnitMovingType/Track`（`/`）
 * */
export class MemberAccess extends InternalExpression implements IMemberAccess {
    protected _nodeName: string = "MemberAccess";

    target: Expression = DEFAULT_IDENTIFIER;
    separator: "/" | "." = "/";
    property: Identifier = DEFAULT_IDENTIFIER;

    marks: IMemberAccessMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Expression | Identifier)[] {
        return [this.target, this.property];
    }

    get length(): number {
        return this._length(this.target, this.marks.separator, this.property);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            target: this.target.toJSON(),
            separator: this.separator,
            property: this.property.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.target.toString()}${this.separator}${this.property.toString()}`;
    }
}


/**
 * @class ParenthesisExpr
 * @classDesc 括号表达式；带逗号时是序对 `(a, b)`
 * */
export class ParenthesisExpr extends InternalExpression implements IParenthesisExpr {
    protected _nodeName: string = "ParenthesisExpr";

    expr: Expression = DEFAULT_IDENTIFIER;
    second: Nullable<Expression>;

    marks: IParenthesisExprMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Expression)[] {
        return this.second ? [this.expr, this.second] : [this.expr];
    }

    get length(): number {
        return this._length(
            this.marks.leftParen, this.expr, this.marks.comma, this.second, this.marks.rightParen
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            expr: this.expr.toJSON(),
            second: this.second?.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `(${this.expr.toString()}${this.second ? `, ${this.second.toString()}` : ""})`;
    }
}


/**
 * @class Reference
 * @classDesc 引用：`$/A/B` 或 `~/A/B`
 * */
export class Reference extends LeafExpression implements IReference {
    protected _nodeName: string = "Reference";

    operator: "$" | "~" = "$";
    segments: Identifier[] = [];

    marks: IReferenceMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return `${this.operator}/${this.segments.map(segment => segment.value).join("/")}`;
    }

    get name(): Identifier {
        return this.segments.length ? this.segments[this.segments.length - 1] : DEFAULT_IDENTIFIER;
    }

    get length(): number {
        return this._length(this.marks.prefix, this.segments);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            operator: this.operator,
            segments: this.segments.map(segment => segment.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


/**
 * @class GuidCall
 * @classDesc GUID 字面量 `GUID:{…}`
 * */
export class GuidCall extends LeafExpression implements IGuidCall {
    protected _nodeName: string = "GuidCall";

    uuid: string = "";

    marks: IGuidCallMark = {};

    type: IType = { type: BaseType.GUID };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.uuid;
    }

    get length(): number {
        return this._length(this.marks.colon, this.marks.value);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            uuid: this.uuid,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `GUID:${this.uuid}`;
    }
}


/**
 * @class MapDef
 * @classDesc MAP 字面量：`MAP [ (k, v), … ]`
 * */
export class MapDef extends InternalExpression implements IMapDef {
    protected _nodeName: string = "MapDef";

    comments1: Comment[] = [];
    pairs: Pair[] = [];
    comments2: Comment[] = [];

    marks: IMapDefMark = {};

    type: IType = { type: BaseType.MAP };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Pair[] | Comment[])[] {
        return [this.comments1, this.pairs, this.comments2];
    }

    get length(): number {
        return this._length(
            this.marks.map, this.marks.leftBracket, this.comments1, this.pairs, this.comments2, this.marks.rightBracket
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            pairs: this.pairs.map(pair => pair.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `MAP[${this.pairs.map(pair => pair.toString()).join(", ")}]`;
    }
}


/**
 * @class Pair
 * @classDesc 序对 `(a, b)`
 * */
export class Pair extends InternalExpression implements IPair {
    protected _nodeName: string = "Pair";

    key: Expression = DEFAULT_IDENTIFIER;
    value: Expression = DEFAULT_IDENTIFIER;

    marks: IPairMark = {};

    type: IType = { type: BaseType.PAIR };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.key, this.value];
    }

    get length(): number {
        return this._length(this.marks.leftParen, this.key, this.marks.comma, this.value, this.marks.rightParen);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            key: this.key.toJSON(),
            value: this.value.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `(${this.key.toString()}, ${this.value.toString()})`;
    }
}


/**
 * @class VectorDef
 * @classDesc 向量字面量 `[ … ]`
 * */
export class VectorDef extends InternalExpression implements IVectorDef {
    protected _nodeName: string = "VectorDef";

    elements: Expression[] = [];
    comments1: Comment[] = [];

    marks: IVectorDefMark = {};

    type: IType = { type: BaseType.VECTOR };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Expression[] | Comment[])[] {
        return [this.comments1, this.elements];
    }

    get length(): number {
        return this._length(this.marks.leftBracket, this.comments1, this.elements, this.marks.rightBracket);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            elements: this.elements.map(element => element.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `[${this.elements.map(element => element.toString()).join(", ")}]`;
    }
}


/**
 * @class DefinitionExpr
 * @classDesc 作为值出现的定义（v1 的 PropertyAssignExpr）
 * @remarks `value : definition | expression`
 * @example `ParticleDescriptor = export PD is ParticleDescriptor ( … )`
 * @example `[ private parX is Template_Param_Int ( DefaultValue = 1 ), ]`
 * */
export class DefinitionExpr extends InternalExpression implements IDefinitionExpr {
    protected _nodeName: string = "DefinitionExpr";

    modifier: Nullable<"export" | "private" | "public">;

    name: Identifier = DEFAULT_IDENTIFIER;
    operator: "is" | "=" = "is";
    value: Expression = DEFAULT_IDENTIFIER;

    marks: IDefinitionExprMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Expression)[] {
        return [this.name, this.value];
    }

    get length(): number {
        return this._length(this.marks.modifier, this.name, this.marks.is, this.value);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            operator: this.operator,
            value: this.value.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}${this.name.toString()} ${this.operator} ${this.value.toString()}`;
    }
}


/**
 * @class Argument
 * @classDesc 对象体/实参表条目
 * @remarks
 * ```
 * bodyItem : modifier? name ':' typeRef ('=' value)?   // 键入实参
 *          | definition                              // Name = value / Name is value
 *          | expression                              // 位置实参
 * ```
 * */
export class Argument extends InternalNode implements IArgument {
    protected _nodeName: string = "Argument";

    modifier: Nullable<"export" | "private" | "public">;
    name: Nullable<Identifier>;
    annotation: Nullable<TypeRef>;
    operator: Nullable<"=" | "is">;
    value: Nullable<Expression>;
    positional: boolean = false;
    comments1: Comment[] = [];

    marks: IArgumentMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly belong?: ObjectCall | UnnamedObj) {
        super();
    }

    get children(): (Identifier | Expression | TypeRef | Comment[])[] {
        return [this.name, this.annotation, this.value, this.comments1].filter(x => x !== undefined) as (Identifier | Expression | TypeRef | Comment[])[];
    }

    get length(): number {
        return this._length(
            this.marks.modifier, this.name, this.marks.colonOrAssignOrIs,
            this.annotation, this.value, this.comments1, this.marks.meybeComma
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name?.toJSON(),
            annotation: this.annotation?.toJSON(),
            operator: this.operator,
            positional: this.positional,
            value: this.value?.toJSON(),
            comments1: this.comments1.map(comment => comment.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        if (this.positional)
            return this.value?.toString() || "";

        return `${this.modifier ? `${this.modifier} ` : ""}${this.name?.toString()}`
            + (this.annotation ? `: ${this.annotation.toString()}` : "")
            + (this.operator ? ` ${this.operator} ${this.value?.toString()}` : "");
    }
}


/* ============================================================================
 * 字面量
 * ========================================================================== */

export abstract class Literal extends LeafExpression implements ILiteral {
    abstract value: string;
}


export class Integer extends Literal implements IInteger {
    protected _nodeName: string = "Integer";

    marks: ILeafExpressionMark = {};

    type: IType = { type: BaseType.INT };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Float extends Literal implements IFloat {
    protected _nodeName: string = "Float";

    marks: ILeafExpressionMark = {};

    type: IType = { type: BaseType.FLOAT };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Bool extends Literal implements IBoolean {
    protected _nodeName: string = "Bool";

    marks: ILeafExpressionMark = {};

    type: IType = { type: BaseType.BOOLEAN };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Str extends Literal implements IStr {
    protected _nodeName: string = "Str";

    marks: ILeafExpressionMark = {};

    type: IType = { type: BaseType.STRING };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Nil extends Literal implements INil {
    protected _nodeName: string = "Nil";

    value: "nil" = "nil";

    marks: ILeafExpressionMark = {};

    type: IType = { type: BaseType.NIL };

    constructor(public pos: IPos) {
        super();
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return this.value;
    }
}


export class ErrorExpr extends LeafExpression {
    protected _nodeName: string = "ErrorExpr";

    marks: ILeafExpressionMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get length(): number {
        return this._length(this.marks.value) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return "ErrorExpr";
    }

    get value(): string {
        return "ErrorExpr";
    }
}


const DEFAULT_IDENTIFIER = new Identifier({ line: -1, column: -1 });
const DEFAULT_TYPEREF = new TypeRef({ line: -1, column: -1 });


export class Visitor {
    static visit(node: Node, visitor: (node: LeafNode | InternalNode) => boolean) {
        if (Array.isArray(node))
            node.forEach(n => this.visit(n, visitor));
        else if (node instanceof LeafNode) {
            if (visitor(node)) return;
        } else if (node instanceof InternalNode) {
            if (visitor(node)) return;
            node.children.forEach(n => this.visit(n, visitor));
        }
    }

    static findToken(tokens: Token[], pos: IPos): Nullable<Token> {
        return tokens.find(t =>
            t.pos.line === pos.line && t.pos.column <= pos.column && t.pos.column + t.value.length >= pos.column
        );
    }
}




