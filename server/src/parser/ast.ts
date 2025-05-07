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
 * @version 1.1
 * @date 2025/04/17 20:12
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import {
    BaseType,
    BinaryOperator,
    GeneralAST,
    IArgument,
    IAssignment,
    IAST,
    IBinaryExpr,
    IBoolean,
    IBuiltinType,
    IFloat,
    IGenericType,
    IGuidCall,
    IIdentifier,
    IIndexAccess,
    IInteger, IInternalExpression, IInternalNode,
    IInternalStatement,
    IInternalTypeRef,
    ILeafExpression, ILeafNode,
    ILeafStatement,
    ILeafTypeRef,
    ILiteral,
    IMapDef,
    IMemberAssign,
    INil,
    IObjectCall,
    IPair,
    IParameterDecl,
    IParenthesisExpr,
    IMemberAccess,
    IPos,
    IProgram,
    IPropertyAssignExpr,
    IReference,
    IString,
    ITemplateDef,
    ITemplateParam,
    ITernaryExpr,
    ITypeConstructor,
    IUnaryExpr,
    IUnnamedObj,
    IVectorDef,
    Nullable,
    IType, IAssignMark, ITemplateDefMark, IMemberAssignMark, IComment,
    SeparatorComments, IFileImportComment, ILeafComment, IInternalComment, ILibImportComment, ICommonComment
} from "../types";


export type ASTWithBelong = Argument | UnnamedObj | TemplateDef | MemberAssign | ParameterDecl | Assignment;


/**
 * @class AST
 * @classDesc NDF的抽象语法树节点基类
 * @desc 该类是所有NDF抽象语法树节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、子节点等。
 * @property {string} _nodeName - 节点名称，用于标识节点类型。
 * @abstract
 * */
export abstract class AST implements IAST {
    /**
     * @var _nodeName
     * @summary 节点名称，用于标识节点类型。
     * @desc 该属性是所有NDF抽象语法树节点的基类，用于标识节点类型。
     * @access protected
     * @abstract
     * @remarks 该属性是预定义的,不可修改。
     * */
    protected abstract _nodeName: string;

    /**
     * @var pos
     * @summary 节点位置信息。
     * @desc 该属性记录了节点在源代码中的位置信息，包括行号和列号。
     * @abstract
     * @see IPos
     * */
    abstract pos: IPos;

    /**
     * @var type
     * @summary 节点类型信息。
     * @desc 该属性记录了节点的类型信息，包括基础类型、模板类型、自定义类型等。
     * @abstract
     * @see IType
     * @remarks 在语义分析阶段，该属性会被赋值为具体的类型信息。
     * */
    abstract type: IType;

    /**
     * @var nodeName
     * @summary 节点名称。
     * @desc 节点名称对应于节点的类型，用于标识节点的具体类型。
     * @readonly
     * */
    get nodeName(): string {
        return this._nodeName;
    }

    /**
     * @method toJSON
     * @summary 序列化节点。
     * @desc 该方法用于将节点序列化为JSON格式，方便存储和传输。
     * @returns {object} 序列化后的JSON对象。
     * @abstract
     * */
    abstract toJSON(): object;

    /**
     * @method toString
     * @summary 打印节点。
     * @desc 该方法用于将节点打印为字符串，方便调试。
     * @returns {string} 节点的字符串表示。
     * @abstract
     * */
    abstract toString(): string;
}


/**
 * @class LeafNode
 * @classDesc NDF的叶子节点基类
 * @desc 所有叶子节点都继承自该类
 * @abstract
 * @extends AST
 * @see AST
 * @remarks 一般需要遍历节点的时候,会涉及此类.
 * */
export abstract class LeafNode extends AST implements ILeafNode {
    /**
     * @var value
     * @summary 节点值。
     * @desc 该属性记录了节点的值，用于表示节点的具体内容。
     * @return {string} 节点值。
     * @abstract
     * */
    abstract get value(): string;
}


/**
 * @class InternalNode
 * @classDesc NDF的内部节点基类
 * @desc 所有内部节点都继承自该类
 * @abstract
 * @extends AST
 * @see AST
 * @remarks 一般需要遍历节点的时候,会涉及此类.
 * */
export abstract class InternalNode extends AST implements IInternalNode {
    /**
     * @var children
     * @summary 节点子节点。
     * @desc 该属性记录了节点的子节点，用于表示节点的结构。
     * @return {GeneralAST[]} 节点子节点。
     * @abstract
     * */
    abstract get children(): GeneralAST[];
}


/**
 * @class Program
 * @classDesc NDF的程序节点
 * @desc 该类表示NDF的程序节点，用于表示整个程序的结构。
 * @extends InternalNode
 * @remarks 语法结构:
 * ```antlr4
 * Program : Statement* EOF ;
 * ```
 * @see InternalNode
 * @see Statement
 * */
export class Program extends InternalNode implements IProgram {
    protected _nodeName: string = "Program";

    /**
     * @var statements
     * @summary 程序语句。
     * @desc 该属性记录了程序的语句，用于表示程序的结构。
     * @return {Statement[]} 程序语句。
     * */
    statements: Statement[] = [];

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Statement[] {
        return this.statements;
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


/**
 * @class LeafStatement
 * @classDesc 叶子节点类型的语句节点基类
 * @desc 该类是所有叶子节点类型的语句节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、子节点等。
 * @abstract
 * @extends LeafNode
 * @see LeafNode
 * */
export abstract class LeafStatement extends LeafNode implements ILeafStatement {
    abstract get value(): string;
}


/**
 * @class InternalStatement
 * @classDesc 内部节点类型的语句节点基类
 * @desc 该类是所有内部节点类型的语句节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、子节点等。
 * @abstract
 * @extends InternalNode
 * @see InternalNode
 * */
export abstract class InternalStatement extends InternalNode implements IInternalStatement {
    abstract get children(): GeneralAST[];
}


/**
 * @type Statement
 * @summary 语句节点类型。
 * @desc 该类型表示NDF的语句节点，用于表示程序的结构。
 * @see LeafStatement
 * @see InternalStatement
 * @remarks 语法结构:
 * ```antlr4
 * Statement : Assignment | TemplateDef | UnnamedObj | Comment ;
 * ```
 * */
export type Statement = LeafStatement | InternalStatement;


/**
 * @class Assignment
 * @classDesc 赋值语句节点
 * @desc 该类表示NDF的赋值语句节点，用于表示变量的赋值。
 * @extends InternalStatement
 * @see InternalStatement
 * @remarks 语法结构:
 * ```antlr4
 * Assignment : ('private' | 'export')? Identifier 'is' Expression ;
 * ```
 * */
export class Assignment extends InternalStatement implements IAssignment {
    protected _nodeName: string = "Assignment";

    /**
     * @var modifier
     * @summary 赋值语句修饰符。
     * @desc 该属性记录了赋值语句的修饰符，用于表示变量的访问权限。
     * @return {string} 赋值语句修饰符。
     * */
    modifier: Nullable<"export" | "private" | "public">;

    /**
     * @var name
     * @summary 赋值语句左值。
     * @desc 该属性记录了赋值语句的左值，用于表示变量的名称。
     * @return {Identifier} 赋值语句左值。
     * */
    name: Identifier = DEFAULT_IDENTIFIER;

    /**
     * @var value
     * @summary 赋值语句右值。
     * @desc 该属性记录了赋值语句的右值，用于表示变量的值。
     * @return {Expression} 赋值语句右值。
     * */
    value: Expression = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNNEEDED };
    marks: IAssignMark = {};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Statement[] {
        return [this.name, this.value];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            value: this.value.toJSON()
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}${this.name.toString()} is ${this.value.toString()}`;
    }
}


/**
 * @class TemplateDef
 * @classDesc 模板定义语句节点
 * @desc 该类表示NDF的模板定义语句节点，用于表示模板的定义。
 * @extends InternalStatement
 * @see InternalStatement
 * @remarks 语法结构:
 * ```antlr4
 * TemplateDef : 'private'? 'template' Identifier (Newline | Comment)* ParameterBlock (Newline | Comment)* 'is' Identifier (Newline | Comment)* MemberBlock;
 * ParameterBlock : '[' ParameterDecl (',' ParameterDecl)* | Empty ']';
 * MemberBlock : '(' MemberAssign* ')';
 * ```
 * */
export class TemplateDef extends InternalStatement implements ITemplateDef {
    protected _nodeName: string = "TemplateDef";

    /**
     * @var modifier
     * @summary 模板定义语句修饰符。
     * @desc 该属性记录了模板定义语句的修饰符，用于表示模板的访问权限。
     * @return {string} 模板定义语句修饰符。
     * */
    modifier: Nullable<"private">;

    /**
     * @var name
     * @summary 模板定义语句名称。
     * @desc 该属性记录了模板定义语句的名称，用于表示模板的名称。
     * @return {Identifier} 模板定义语句名称。
     * */
    name: Identifier = DEFAULT_IDENTIFIER;
    params: ParameterDecl[] = [];
    extend: Identifier = DEFAULT_IDENTIFIER;
    members: MemberAssign[] = [];
    type: IType = { type: BaseType.TEMPLATE, name: this.name.toString() };
    marks: ITemplateDefMark = {};

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];
    pos3Comments: Comment[] = [];
    pos4Comments: Comment[] = [];
    separatorComments1: SeparatorComments = [];
    separatorComments2: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | ParameterDecl[] | MemberAssign[])[] {
        return [this.name, this.params, this.extend, this.members];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            params: this.params.map(param => param.toJSON()),
            extend: this.extend.toJSON(),
            members: this.members.map(member => member.toJSON()),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON()),
            pos3Comments: this.pos3Comments.map(comment => comment.toJSON()),
            pos4Comments: this.pos4Comments.map(comment => comment.toJSON()),
            separatorComments1: this.separatorComments1.map(
                comments => comments.map(comment => comment.toJSON())
            ),
            separatorComments2: this.separatorComments2.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}template ${this.name.toString()}
        ${this.pos1Comments.map(comment => comment.toString())}[${this.params.join(",")}]${this.pos2Comments.map(comment => comment.toString())}is${this.extend.toString()}${this.pos3Comments.map(comment => comment.toString())}(${this.members.join(" ")})`;
    }
}


export class UnnamedObj extends InternalStatement implements IUnnamedObj {
    protected _nodeName: string = "UnnamedObj";
    args: Argument[] = [];
    blueprint: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNNEEDED };
    marks = undefined;

    pos1Comments: Comment[] = [];
    separatorComments: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Argument[])[] {
        return [this.blueprint, this.args];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            blueprint: this.blueprint.toJSON(),
            args: this.args.map(member => member.toJSON()),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            separatorComments: this.separatorComments.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `unnamed ${this.blueprint.toString()} (${this.args.join("\n")})`;
    }
}


export abstract class LeafComment extends LeafStatement implements ILeafComment {}


export abstract class InternalComment extends InternalStatement implements IInternalComment {}


export type Comment = LeafComment | InternalComment;


export class FileImportComment extends InternalComment implements IFileImportComment {
    protected _nodeName: string = "FileImportComment";
    items: string[] = [];
    path: string = "";
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): GeneralAST[] {
        return [];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            items: this.items,
            path: this.path
        };
    }

    toString(): string {
        return `/// from "${this.path}" import ${this.items.map(item => item.toString()).join(", ")}`;
    }
}


export class LibImportComment extends InternalComment implements ILibImportComment {
    protected _nodeName: string = "LibImportComment";
    items: string[] = [];
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): GeneralAST[] {
        return [];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            items: this.items
        };
    }

    toString(): string {
        return `/// import ${this.items.map(item => item.toString()).join(", ")}`;
    }
}


export class CommenComment extends LeafComment implements ICommonComment {
    protected _nodeName: string = "CommenComment";
    category: "doc" | "common" = "common";
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public value: string) {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            category: this.category,
            value: this.value
        };
    }

    toString(): string {
        return `/// ${this.value}`;
    }
}


export class ParameterDecl extends InternalNode implements IParameterDecl {
    protected _nodeName: string = "ParameterDecl";
    annotation: Nullable<TypeRef>;
    default: Nullable<Expression>;
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNNEEDED };

    pos1Comments: Comment[] = [];

    constructor(public pos: IPos, public readonly belong: TemplateDef) {
        super();
    }

    get children(): (Identifier | TypeRef | Expression)[] {
        return [this.name, this.annotation, this.default].filter(x => x !== undefined);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            annotation: this.annotation?.toJSON(),
            default: this.default?.toJSON(),
            pos1Comments: this.pos1Comments.map((comment) => comment.toJSON()),
        };
    }

    toString(): string {
        return `${this.name.toString()} ${this.annotation ? (": " + this.annotation?.toString()) : ""} ${this.default ? ("= " + this.default?.toString()) : ""}`;
    }
}


export class MemberAssign extends InternalNode implements IMemberAssign {
    protected _nodeName: string = "MemberAssign";
    name: Identifier = DEFAULT_IDENTIFIER;
    operator: "=" | "is" = "=";
    type: IType = { type: BaseType.UNNEEDED };
    value: Expression = DEFAULT_IDENTIFIER;
    marks: IMemberAssignMark = {};

    pos1Comments: Comment[] = [];

    constructor(public pos: IPos, public readonly belong: TemplateDef) {
        super();
    }

    get children(): (Identifier | Expression)[] {
        return [this.name, this.value];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            operator: this.operator,
            value: this.value.toJSON(),
            pos1Comments: this.pos1Comments.map((comment) => comment.toJSON()),
        };
    }

    toString(): string {
        return `${this.name.toString()} ${this.operator} ${this.value.toString()}`;
    }
}


export abstract class LeafTypeRef extends LeafNode implements ILeafTypeRef {
    abstract get value(): string;
}


export abstract class InternalTypeRef extends InternalNode implements IInternalTypeRef {
    abstract get children(): GeneralAST[];
}


export type TypeRef = LeafTypeRef | InternalTypeRef;


export class BuiltinType extends LeafTypeRef implements IBuiltinType {
    protected _nodeName: string = "BuiltinType";
    name: string = "";
    type: IType = { type: BaseType.UNKNOWN, name: this.name };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.name;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name
        };
    }

    toString(): string {
        return `${this.name}`;
    }
}


export class GenericType extends InternalTypeRef implements IGenericType {
    protected _nodeName: string = "GenericType";
    name: Identifier = DEFAULT_IDENTIFIER;
    typeParams: TypeRef[] = [];
    type: IType = { type: BaseType.UNKNOWN };

    pos1Comments: Comment[] = [];
    separatorComments: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | TypeRef[])[] {
        return [this.name, this.typeParams];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            typeParams: this.typeParams.map(t => t.toJSON()),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            separatorComments: this.separatorComments.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `${this.name.toString()} <${this.typeParams.map(t => t.toString()).join(", ")}>`;
    }
}


export abstract class LeafExpression extends LeafNode implements ILeafExpression {
    abstract get value(): string;
}


export abstract class InternalExpression extends InternalNode implements IInternalExpression {
    abstract get children(): GeneralAST[];
}


export type Expression = LeafExpression | InternalExpression;


export class Identifier extends LeafExpression implements IIdentifier {
    protected _nodeName: string = "Identifier";
    name: string = "";
    type: IType = { type: BaseType.UNKNOWN, name: this.name };

    constructor(public pos: IPos, public readonly belong?: ASTWithBelong) {
        super();
    }

    get value(): string {
        return this.name;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name
        };
    }

    toString(): string {
        return this.name;
    }
}


export class UnaryExpr extends InternalExpression implements IUnaryExpr {
    protected _nodeName: string = "UnaryExpr";
    operand: Expression = DEFAULT_IDENTIFIER;
    operator: "-" | "!" = "-";
    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.operand];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            operator: this.operator,
            operand: this.operand.toJSON()
        };
    }

    toString(): string {
        return `${this.operator}${this.operand.toString()}`;
    }
}


export class BinaryExpr extends InternalExpression implements IBinaryExpr {
    protected _nodeName: string = "BinaryExpr";
    left: Expression = DEFAULT_IDENTIFIER;
    operator: BinaryOperator = "+";
    right: Expression = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.left, this.right];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            left: this.left.toJSON(),
            operator: this.operator,
            right: this.right.toJSON(),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `${this.left.toString()} ${this.operator} ${this.right.toString()}`;
    }
}


export class TernaryExpr extends InternalExpression implements ITernaryExpr {
    protected _nodeName: string = "TernaryExpr";
    condition: Expression = DEFAULT_IDENTIFIER;
    falseExpr: Expression = DEFAULT_IDENTIFIER;
    trueExpr: Expression = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];
    pos3Comments: Comment[] = [];
    pos4Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.condition, this.trueExpr, this.falseExpr];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            condition: this.condition.toJSON(),
            trueExpr: this.trueExpr.toJSON(),
            falseExpr: this.falseExpr.toJSON(),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON()),
            pos3Comments: this.pos3Comments.map(comment => comment.toJSON()),
            pos4Comments: this.pos4Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `${this.condition.toString()} ? ${this.trueExpr.toString()} : ${this.falseExpr.toString()}`;
    }
}


export class TemplateParam extends InternalExpression implements ITemplateParam {
    protected _nodeName: string = "TemplateParam";
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN, name: this.name.toString() };

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Identifier[] {
        return [this.name];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `<${this.name.toString()}>`;
    }
}


export class ObjectCall extends InternalExpression implements IObjectCall {
    protected _nodeName: string = "ObjectCall";
    args: Argument[] = [];
    blueprint: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.OBJECT, name: this.blueprint.toString() };

    pos1Comments: Comment[] = [];
    separatorComments: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Argument[])[] {
        return [this.blueprint, this.args];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            blueprint: this.blueprint.toJSON(),
            args: this.args.map(a => a.toJSON()),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            separatorComments: this.separatorComments.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `${this.blueprint.toString()} (${this.args.map(arg => arg.toString()).join(",")})`;
    }
}


export class IndexAccess extends InternalExpression implements IIndexAccess {
    protected _nodeName: string = "IndexAccess";
    index: Expression = DEFAULT_IDENTIFIER;
    target: Expression = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.index, this.target];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            index: this.index.toJSON(),
            target: this.target.toJSON(),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `${this.target.toString()}[${this.target.toString()}]`;
    }
}


export class MemberAccess extends InternalExpression implements IMemberAccess {
    protected _nodeName: string = "MemberAccess";
    target: Expression = DEFAULT_IDENTIFIER;
    property: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.target, this.property];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            target: this.target.toJSON(),
            property: this.property.toJSON()
        };
    }

    toString(): string {
        return `${this.target.toString()}/${this.property.toString()}`;
    }
}


export class ParenthesisExpr extends InternalExpression implements IParenthesisExpr {
    protected _nodeName: string = "ParenthesisExpr";
    expr: Expression = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.expr];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            expr: this.expr.toJSON(),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `(${this.expr.toString()})`;
    }
}


export class Reference extends LeafExpression implements IReference {
    protected _nodeName: string = "Reference";
    path: string = "";
    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.path;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            path: this.path
        };
    }

    toString(): string {
        return this.path;
    }
}


export class GuidCall extends LeafExpression implements IGuidCall {
    protected _nodeName: string = "GuidCall";
    uuid: string = "";
    type: IType = { type: BaseType.GUID };

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.uuid;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            uuid: this.uuid,
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `GUID:{${this.uuid}}`;
    }
}


export class MapDef extends InternalExpression implements IMapDef {
    protected _nodeName: string = "MapDef";
    pairs: Pair[] = [];
    type: IType = { type: BaseType.MAP };

    pos1Comments: Comment[] = [];
    separatorComments: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Pair[] {
        return this.pairs;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            pairs: this.pairs.map(p => p.toJSON()),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            separatorComments: this.separatorComments.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `MAP [${this.pairs.map(p => p.toString()).join(",")}]`;
    }
}


export class Pair extends InternalExpression implements IPair {
    protected _nodeName: string = "Pair";
    key: Expression = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };
    value: Expression = DEFAULT_IDENTIFIER;

    pos1Comments: Comment[] = [];
    pos2Comments: Comment[] = [];
    pos3Comments: Comment[] = [];
    pos4Comments: Comment[] = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.key, this.value];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            key: this.key.toJSON(),
            value: this.value.toJSON(),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            pos2Comments: this.pos2Comments.map(comment => comment.toJSON()),
            pos3Comments: this.pos3Comments.map(comment => comment.toJSON()),
            pos4Comments: this.pos4Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `(${this.key.toString()}, ${this.value.toString()})`;
    }
}


export class VectorDef extends InternalExpression implements IVectorDef {
    protected _nodeName: string = "VectorDef";
    elements: Expression[] = [];
    type: IType = { type: BaseType.VECTOR };

    separatorComments: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return this.elements;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            elements: this.elements.map(p => p.toJSON()),
            separatorComments: this.separatorComments.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `[${this.elements.map(p => p.toString()).join(",")}]`;
    }
}


export class TypeConstructor extends InternalExpression implements ITypeConstructor {
    protected _nodeName: string = "TypeConstructor";
    args: Expression[] = [];
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNKNOWN };

    pos1Comments: Comment[] = [];
    separatorComments: SeparatorComments = [];

    constructor(public pos: IPos) {
        super();
    }

    get children(): (TypeRef | Expression[])[] {
        return [this.name, this.args];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            args: this.args.map(a => a.toJSON()),
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON()),
            separatorComments: this.separatorComments.map(
                comments => comments.map(comment => comment.toJSON())
            )
        };
    }

    toString(): string {
        return `${this.name.toString()}[${this.args.map(arg => arg.toString()).join(",")}]`;
    }
}


export class PropertyAssignExpr extends InternalExpression implements IPropertyAssignExpr {
    protected _nodeName: string = "PropertyAssignExpr";
    modifier: Nullable<"private">;
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = { type: BaseType.UNNEEDED };
    value: Expression = DEFAULT_IDENTIFIER;

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.name, this.value];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            value: this.value.toJSON()
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}${this.name.toString()} is ${this.value.toString()}`;
    }
}


export class Argument extends InternalNode implements IArgument {
    protected _nodeName: string = "Argument";
    type: IType = { type: BaseType.UNNEEDED };
    modifier: Nullable<"export" | "public">;
    annotation: Nullable<TypeRef>;
    name: Identifier = DEFAULT_IDENTIFIER;
    operator: Nullable<"=" | "is">;
    value: Nullable<Expression>;

    pos1Comments: Comment[] = [];

    constructor(public pos: IPos, public readonly belong: ObjectCall | UnnamedObj) {
        super();
    }

    get children(): (Identifier | Expression | TypeRef)[] {
        return [this.name, this.value, this.annotation].filter(x => x !== undefined);
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            modifier: this.modifier,
            annotation: this.annotation?.toJSON(),
            value: this.value?.toJSON(),
            operator: this.operator,
            pos1Comments: this.pos1Comments.map(comment => comment.toJSON())
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}${this.name.toString()} ${this.annotation ? (": " + this.annotation!.toString()) : ("= " + this.value!.toString())}`;
    }
}


export abstract class Literal extends LeafExpression implements ILiteral {
    abstract value: string;
}


export class Integer extends Literal implements IInteger {
    protected _nodeName: string = "Integer";
    type: IType = { type: BaseType.INT };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Float extends Literal implements IFloat {
    protected _nodeName: string = "Float";
    type: IType = { type: BaseType.FLOAT };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Bool extends Literal implements IBoolean {
    protected _nodeName: string = "Bool";
    type: IType = { type: BaseType.BOOLEAN };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Str extends Literal implements IString {
    protected _nodeName: string = "String";
    type: IType = { type: BaseType.STRING };

    constructor(public pos: IPos, public value: string = "") {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value
        };
    }

    toString(): string {
        return this.value;
    }
}


export class Nil extends Literal implements INil {
    protected _nodeName: string = "Nil";
    type: IType = { type: BaseType.NIL };
    value: "nil" = "nil";

    constructor(public pos: IPos) {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            value: this.value
        };
    }

    toString(): string {
        return this.value;
    }
}


const DEFAULT_IDENTIFIER = new Identifier({ line: -1, column: -1 });


export class ErrorExpr extends LeafExpression {
    protected _nodeName: string = "ErrorExpr";
    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            type: this.type
        };
    }

    toString(): string {
        return "ErrorExpr";
    }

    get value(): string {
        return "ErrorExpr";
    }

}


export class Visitor {
    static visit(node: GeneralAST, visitor: (node: LeafNode | InternalNode) => boolean) {
        if (Array.isArray(node))
            node.forEach(n => this.visit(n, visitor));
        else if (node instanceof LeafNode) {
            if (visitor(node)) return;
        } else if (node instanceof InternalNode) {
            if (visitor(node)) return;
            node.children.forEach(n => this.visit(n, visitor));
        }
    }
}

