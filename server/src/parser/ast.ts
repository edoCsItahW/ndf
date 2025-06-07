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
    Node,
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
    IInteger,
    IInternalExpression,
    IInternalNode,
    IInternalStatement,
    IInternalTypeRef,
    ILeafExpression,
    ILeafNode,
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
    IStr,
    ITemplateDef,
    ITemplateParam,
    ITernaryExpr,
    ITypeConstructor,
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
    IPropertyAssignMark,
    IArgumentMark,
    IMapDefMark,
    Optional,
    IParameterDeclMark,
    IBuiltinTypeMark,
    IGenericTypeMark,
    ILeafTypeRefMark,
    IInternalTypeRefMark,
    ILeafExpressionMark,
    IInternalExpressionMark,
    IIdentifierMark,
    IUnaryExprMark,
    IBinaryExprMark,
    ITernaryExprMark,
    ITemplateParamMark,
    IObjectCallMark,
    IIndexAccessMark,
    IMemberAccessMark,
    IParenthesisExprMark,
    IReferenceMark,
    IGuidCallMark,
    IPairMark,
    IVectorDefMark, ITypeConstructorMark, ILeafNodeMark, IInternalNodeMark
} from "../types";
import { Token } from "../lexer";


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

    abstract get length(): number;

    protected _length(...args: (Optional<Token | AST | AST[]>)[]): number {
        return args.map(arg => {
            if (arg instanceof Token || arg instanceof AST)
                return arg.length;

            else if (Array.isArray(arg))
                return arg.map(i => this._length(i)).reduce((a, b) => a + b);

            else
                return 0;
        }).reduce((a, b) => a + b, 0);
    }
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

    abstract marks: ILeafNodeMark;
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
     * @return {Node[]} 节点子节点。
     * @abstract
     * */
    abstract get children(): Node[];

    abstract marks: IInternalNodeMark;
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
 * 对应属性:
 * ```
 * Program : statements ;
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
    abstract get children(): Node[];
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
 * @see Identifier
 * @see Expression
 * @remarks 语法结构:
 * ```antlr4
 * Assignment : ('private' | 'export' | 'public')? Identifier 'is' Expression ;
 * ```
 * 对应属性:
 * ```
 * Assignment : marks.modifier name marks.is value ;
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
    marks: IAssignMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Statement[] {
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
            value: this.value.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return [
            this.modifier ? `${this.modifier} ` : "",
            this.name.toString(),
            " is ",
            this.value.toString()
        ].join("");
    }
}


/**
 * @class TemplateDef
 * @classDesc 模板定义语句节点
 * @desc 该类表示NDF的模板定义语句节点，用于表示模板的定义。
 * @extends InternalStatement
 * @see InternalStatement
 * @see Identifier
 * @see ParameterDecl
 * @see MemberAssign
 * @remarks 语法结构:
 * ```antlr4
 * TemplateDef : 'private'? 'template' Identifier Divider* ParameterBlock Divider* 'is' Divider* Identifier Divider* MemberBlock;
 *
 * ParameterBlock : '[' ParameterDecl (',' ParameterDecl)* | Empty ']';
 *
 * MemberBlock : '(' Divider* MemberAssign* ')';
 *
 * Divider : Newline | Comment;
 * ```
 * 对应属性:
 * ```
 * TemplateDef : marks.modifier marks.template name comments1 marks.leftBracket params marks.rightBracket comments2 marsk.is comments3 extend comments4 marks.leftParen comments5 members marks.rightParen;
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
    comments1: Comment[] = [];  // 名称尾随注释
    params: ParameterDecl[] = [];
    comments2: Comment[] = [];  // 中括号尾随注释
    comments3: Comment[] = [];  // 当存在尾随逗号且其后尾随注释时，其注释没有ParameterDecl来记录，因此需要单独记录
    comments4: Comment[] = [];  // is尾随注释
    extend: Identifier = DEFAULT_IDENTIFIER;
    comments5: Comment[] = [];  // 基模板尾随注释
    comments6: Comment[] = [];  // 左括号尾随注释
    members: MemberAssign[] = [];

    marks: ITemplateDefMark = {};

    type: IType = { type: BaseType.TEMPLATE, name: this.name.toString() };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | ParameterDecl[] | MemberAssign[])[] {
        return [this.name, this.params, this.extend, this.members];
    }

    get length(): number {
        return this._length(
            this.marks.modifier,
            this.name,
            this.comments1,
            this.marks.leftBracket,
            this.params,
            this.marks.rightBracket,
            this.comments2,
            this.marks.is,
            this.comments3,
            this.extend,
            this.comments4,
            this.marks.leftParen,
            this.comments5,
            this.members,
            this.marks.rightParen,
            this.comments6
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            params: this.params.map(param => param.toJSON()),
            comments2: this.comments2.map(c => c.toJSON()),
            comments3: this.comments3.map(c => c.toJSON()),
            comments4: this.comments4.map(c => c.toJSON()),
            extend: this.extend.toJSON(),
            comments5: this.comments5.map(c => c.toJSON()),
            comments6: this.comments6.map(c => c.toJSON()),
            members: this.members.map(member => member.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}template ${this.name.toString()}
        ${this.comments1.map(comment => comment.toString())}[${this.params.join(",")}]${this.comments2.map(comment => comment.toString())}is${this.extend.toString()}${this.comments3.map(comment => comment.toString())}(${this.members.join(" ")})`;
    }
}


/**
 * @class UnnamedObj
 * @classDesc 匿名对象定义语句节点
 * @desc 该类表示NDF的匿名对象定义语句节点，用于表示匿名对象。
 * @extends InternalStatement
 * @see InternalStatement
 * @see Identifier
 * @see ObjectCall
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * UnnamedObj : 'unnamed' Identifier Divider* ObjectCall;
 *
 * Divider : Newline | Comment;
 * ```
 * 对应属性:
 * ```
 * UnnamedObj : marks.unnamed blueprint comments1 marks.leftParen comments2 args marks.rightParen;
 * ```
 * */
export class UnnamedObj extends InternalStatement implements IUnnamedObj {
    protected _nodeName: string = "UnnamedObj";

    blueprint: Identifier = DEFAULT_IDENTIFIER;
    comments1: Comment[] = [];  // 蓝图尾随注释
    comments2: Comment[] = [];  // 左括号尾随注释
    args: Argument[] = [];

    type: IType = { type: BaseType.UNNEEDED };
    marks: IUnnamedObjMark = {};

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Argument[])[] {
        return [this.blueprint, this.args];
    }

    get length(): number {
        return this._length(
            this.marks.unnamed,
            this.blueprint,
            this.comments1,
            this.marks.leftParen,
            this.comments2,
            this.args,
            this.marks.rightParen
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            blueprint: this.blueprint.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            comments2: this.comments2.map(c => c.toJSON()),
            args: this.args.map(a => a.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `unnamed ${this.blueprint.toString()} (${this.args.join("\n")})`;
    }
}


/**
 * @class Comment
 * @classDesc 注释语句节点
 * @desc 该类表示NDF的注释语句节点，用于表示注释。
 * @abstract
 * @extends LeafStatement
 * @see LeafStatement
 * @remarks 语法结构:
 * ```antlr4
 * Comment : FileImportComment | LibImportComment | CommenComment ;
 * ```
 * */
export abstract class Comment extends LeafStatement implements IComment {
    abstract trailingNewLines: number;
}


/**
 * @class FileImportComment
 * @classDesc 文件导入注释语句节点
 * @desc 该类表示NDF的文件导入注释语句节点，用于表示文件导入。注意，这不是标准NDF语法的一部分。
 * @extends Comment
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * FileImportComment : '///' 'from' StringLiteral 'import' Identifier (',' Identifier)* ;
 * ```
 * */
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
        return `/// from "${this.path}" import ${this.items.map(item => item.toString()).join(", ")}`;
    }
}


/**
 * @class LibImportComment
 * @classDesc 标准库导入注释语句节点
 * @desc 该类表示NDF的标准库导入注释语句节点，用于表示从标准库导入。注意，这不是标准NDF语法的一部分。
 * @extends Comment
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * LibImportComment : '///' 'import' Identifier (',' Identifier)* ;
 * ```
 * */
export class LibImportComment extends Comment implements ILibImportComment {
    protected _nodeName: string = "LibImportComment";

    items: string[] = [];

    marks: ILeafNodeMark = {};

    trailingNewLines = 0;
    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly value: string) {
        super();
    }

    get children(): Node[] {
        return [];
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
        return `/// import ${this.items.map(item => item.toString()).join(", ")}`;
    }
}


/**
 * @class CommonComment
 * @classDesc 通用注释语句节点
 * @desc 该类表示NDF的通用注释语句节点，用于表示注释。
 * @extends Comment
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * CommenComment : ( '//' (~[\r\n])*
 *                 | '/*' .*? '*\/'
 *                 | '(*' .*? '*)'
 *                 ) Newline;
 * ```
 * */
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
        return `/// ${this.value}`;
    }
}


/**
 * @class ParameterDecl
 * @classDesc 模板参数声明语句节点
 * @desc 该类表示NDF的模板参数声明语句节点，用于表示模板参数的声明。
 * @extends InternalNode
 * @see InternalNode
 * @see Identifier
 * @see TypeRef
 * @see Expression
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * ParameterDecl : Divider* Identifier (Annotation | DefaultValue)? Divider*;
 *
 * Annotation : ':' TypeRef;
 *
 * DefaultValue : '=' Expression;
 * ```
 * 对应属性:
 * ```
 * ParameterDecl : comments1 name marks.colonOrAssign (annotation | default) comments2 marks.meybeComma;
 * ```
 * */
export class ParameterDecl extends InternalNode implements IParameterDecl {
    protected _nodeName: string = "ParameterDecl";

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

    get children(): (Identifier | TypeRef | Expression)[] {
        return [this.name, this.annotation, this.default].filter(x => x !== undefined);
    }

    get length(): number {
        return this._length(
            this.comments1,
            this.name,
            this.marks.colonOrAssign,
            this.annotation,
            this.default,
            this.comments2,
            this.marks.meybeComma
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            comments1: this.comments1.map(c => c.toJSON()),
            name: this.name.toJSON(),
            annotation: this.annotation?.toJSON(),
            default: this.default?.toJSON(),
            comments2: this.comments2.map(c => c.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.name.toString()} ${this.annotation ? (": " + this.annotation?.toString()) : ""} ${this.default ? ("= " + this.default?.toString()) : ""}`;
    }
}


/**
 * @class MemberAssign
 * @classDesc 模板成员赋值语句节点
 * @desc 该类表示NDF的模板成员赋值语句节点，用于表示模板成员的赋值。
 * @extends InternalNode
 * @see InternalNode
 * @see Identifier
 * @see Expression
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * MemberAssign : Identifier ('=' | 'is') Divider* Expression Divider*;
 *
 * Divider : Newline | Comment;
 * ```
 * 对应属性:
 * ```
 * MemberAssign : name marks.assignOrIs comments1 value comments2;
 * ```
 * */
export class MemberAssign extends InternalNode implements IMemberAssign {
    protected _nodeName: string = "MemberAssign";

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

    get children(): (Identifier | Expression)[] {
        return [this.name, this.value];
    }

    get length(): number {
        return this._length(
            this.name,
            this.marks.assignOrIs,
            this.comments1,
            this.value,
            this.comments2
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            operator: this.operator,
            comments1: this.comments1.map(c => c.toJSON()),
            value: this.value.toJSON(),
            comments2: this.comments2.map(c => c.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.name.toString()} ${this.operator} ${this.value.toString()}`;
    }
}


/**
 * @class LeafTypeRef
 * @classDesc 叶子节点类型的类型引用节点基类
 * @desc 该类是所有叶子节点类型的类型引用节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、子节点等。
 * @abstract
 * @extends LeafNode
 * @see LeafNode
 * */
export abstract class LeafTypeRef extends LeafNode implements ILeafTypeRef {
    abstract get value(): string;

    abstract marks: ILeafTypeRefMark;

    get length(): number {
        return this._length(this.marks.meybeComma);
    }
}


/**
 * @class InternalTypeRef
 * @classDesc 内部节点类型的类型引用节点基类
 * @desc 该类是所有内部节点类型的类型引用节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、子节点等。
 * @abstract
 * @extends InternalNode
 * @see InternalNode
 * */
export abstract class InternalTypeRef extends InternalNode implements IInternalTypeRef {
    abstract get children(): Node[];

    abstract marks: IInternalTypeRefMark;
}


/**
 * @type TypeRef
 * @classDesc 类型引用节点
 * @desc 该类表示NDF的类型引用节点，用于表示类型。
 * @see LeafTypeRef
 * @see InternalTypeRef
 * */
export type TypeRef = LeafTypeRef | InternalTypeRef;


/**
 * @class BuiltinType
 * @classDesc 内置类型引用节点
 * @desc 该类表示NDF的内置类型引用节点，用于表示内置类型。
 * @extends LeafTypeRef
 * @see LeafTypeRef
 * @remarks 语法结构:
 * ```antlr4
 * BuiltinType : 'int' | 'float' | 'bool' | 'string';
 * ```
 * 对应属性:
 * ```
 * BuiltinType : marks.type;
 * ```
 * */
export class BuiltinType extends LeafTypeRef implements IBuiltinType {
    protected _nodeName: string = "BuiltinType";

    name: string = "";

    marks: IBuiltinTypeMark = {};

    type: IType = { type: BaseType.UNKNOWN, name: this.name };

    constructor(public pos: IPos) {
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
        return `${this.name}`;
    }
}


/**
 * @class GenericType
 * @classDesc 泛型类型引用节点
 * @desc 该类表示NDF的泛型类型引用节点，用于表示泛型类型。
 * @extends InternalTypeRef
 * @see InternalTypeRef
 * @remarks 语法结构:
 * ```antlr4
 * GenericType : (Identifier | 'MAP') Divider* '<' TypeRef (',' TypeRef)* '>' ;
 * ```
 * 对应属性:
 * ```
 * GenericType : name comments1 typeParams;
 * ```
 * */
export class GenericType extends InternalTypeRef implements IGenericType {
    protected _nodeName: string = "GenericType";

    name: Identifier = DEFAULT_IDENTIFIER;
    comments1: Comment[] = [];
    typeParams: TypeRef[] = [];

    marks: IGenericTypeMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | TypeRef[])[] {
        return [this.name, this.typeParams];
    }

    get length(): number {
        return this._length(
            this.marks.meybeMap,
            this.name,
            this.comments1,
            this.typeParams,
            this.marks.meybeComma
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            comments: this.comments1.map(c => c.toJSON()),
            typeParams: this.typeParams.map(t => t.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.name.toString()} <${this.typeParams.map(t => t.toString()).join(", ")}>`;
    }
}


/**
 * @class LeafExpression
 * @classDesc 叶子表达式节点基类
 * @desc 该类是所有叶子表达式节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、值等。
 * @abstract
 * @extends LeafNode
 * @see LeafNode
 * */
export abstract class LeafExpression extends LeafNode implements ILeafExpression {
    abstract get value(): string;

    abstract marks: ILeafExpressionMark;

    trailingComments: Comment[] = [];
    leadingComments: Comment[] = [];

    get length(): number {
        return this._length(this.trailingComments, this.leadingComments, this.marks.meybeComma);
    }
}


/**
 * @class InternalExpression
 * @classDesc 内部表达式节点基类
 * @desc 该类是所有内部表达式节点的基类，提供了一些公共的属性和方法，包括节点名称、位置、类型、子节点等。
 * @abstract
 * @extends InternalNode
 * */
export abstract class InternalExpression extends InternalNode implements IInternalExpression {
    abstract get children(): Node[];

    abstract marks: IInternalExpressionMark;

    trailingComments: Comment[] = [];
    leadingComments: Comment[] = [];

    get length(): number {
        return this._length(this.trailingComments, this.leadingComments, this.marks.meybeComma);
    }
}


/**
 * @type Expression
 * @classDesc 表达式节点
 * @desc 该类表示NDF的表达式节点，用于表示表达式。
 * @see LeafExpression
 * @see InternalExpression
 * */
export type Expression = LeafExpression | InternalExpression;


/**
 * @class Identifier
 * @classDesc 标识符表达式节点
 * @desc 该类表示NDF的标识符表达式节点，用于表示标识符。
 * @extends LeafExpression
 * @see LeafExpression
 * @remarks
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


/**
 * @class UnaryExpr
 * @classDesc 一元表达式节点
 * @desc 该类表示NDF的一元表达式节点，用于表示一元表达式。
 * @extends InternalExpression
 * @see InternalExpression
 * @see ObjectCall
 * @see IndexAccess
 * @see MemberAccess
 * @see Comment
 * @remarks 语法结构:
 * ```antlr4
 * UnaryExpr : ('-' | '!')? Divider* PostfixExpr ;
 *
 * PostfixExpr : PrimaryExpr (ObjectCall | IndexAccess | MemberAccess)?
 *
 * Divider : Newline | Comment;
 * ```
 * 对应属性:
 * ```
 * UnaryExpr : marks.subOrNot operand;
 * ```
 * */
export class UnaryExpr extends InternalExpression implements IUnaryExpr {
    protected _nodeName: string = "UnaryExpr";

    operator: "-" | "!" = "-";
    operand: Expression = DEFAULT_IDENTIFIER;

    marks: IUnaryExprMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.operand];
    }

    get length(): number {
        return this._length(
            this.marks.subOrNot,
            this.operand
        ) + super.length;
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


/**
 * @class BinaryExpr
 * @classDesc 二元表达式节点
 * @desc 该类表示NDF的二元表达式节点，用于表示二元表达式。
 * @extends InternalExpression
 * @see InternalExpression
 * @see ObjectCall
 * @see IndexAccess
 * @see MemberAccess
 * @see Comment
 * @remarks 语法结构:
 * */
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

    get children(): Expression[] {
        return [this.left, this.right];
    }

    get length(): number {
        return this._length(
            this.left,
            this.comments1,
            this.marks.operator,
            this.comments2
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            left: this.left.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            operator: this.operator,
            comments2: this.comments2.map(c => c.toJSON()),
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

    get children(): Expression[] {
        return [this.condition, this.trueExpr, this.falseExpr];
    }

    get length(): number {
        return this._length(
            this.condition,
            this.comments1,
            this.marks.question,
            this.comments2,
            this.trueExpr,
            this.comments3,
            this.marks.colon,
            this.comments4
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            condition: this.condition.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            comments2: this.comments2.map(c => c.toJSON()),
            trueExpr: this.trueExpr.toJSON(),
            comments3: this.comments3.map(c => c.toJSON()),
            comments4: this.comments4.map(c => c.toJSON()),
            falseExpr: this.falseExpr.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.condition.toString()} ? ${this.trueExpr.toString()} : ${this.falseExpr.toString()}`;
    }
}


export class TemplateParam extends LeafExpression implements ITemplateParam {
    protected _nodeName: string = "TemplateParam";

    name: Identifier = DEFAULT_IDENTIFIER;

    marks: ITemplateParamMark = {};

    type: IType = { type: BaseType.UNKNOWN, name: this.name.toString() };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.name.value;
    }

    get length(): number {
        return this._length(
            this.marks.lt,
            this.marks.value,
            this.marks.gt
        ) + super.length;
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


export class ObjectCall extends InternalExpression implements IObjectCall {
    protected _nodeName: string = "ObjectCall";

    blueprint: Identifier = DEFAULT_IDENTIFIER;
    comments1: Comment[] = [];
    comments2: Comment[] = [];
    args: Argument[] = [];

    marks: IObjectCallMark = {};

    type: IType = { type: BaseType.OBJECT, name: this.blueprint.toString() };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (Identifier | Argument[])[] {
        return [this.blueprint, this.args];
    }

    get length(): number {
        return this._length(
            this.blueprint,
            this.comments1,
            this.marks.leftParen,
            this.comments2,
            this.marks.rightParen
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            blueprint: this.blueprint.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            comments2: this.comments2.map(c => c.toJSON()),
            args: this.args.map(a => a.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.blueprint.toString()} (${this.args.map(arg => arg.toString()).join(",")})`;
    }
}


export class IndexAccess extends InternalExpression implements IIndexAccess {
    protected _nodeName: string = "IndexAccess";

    target: Expression = DEFAULT_IDENTIFIER;
    index: Expression = DEFAULT_IDENTIFIER;

    marks: IIndexAccessMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.index, this.target];
    }

    get length(): number {
        return this._length(
            this.target,
            this.marks.leftBracket,
            this.index,
            this.marks.rightBracket
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            target: this.target.toJSON(),
            index: this.index.toJSON(),
            type: this.type.toJSON?.(true) || this.type
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

    marks: IMemberAccessMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.target, this.property];
    }

    get length(): number {
        return this._length(this.target, this.marks.div, this.property) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            target: this.target.toJSON(),
            property: this.property.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.target.toString()}/${this.property.toString()}`;
    }
}


export class ParenthesisExpr extends InternalExpression implements IParenthesisExpr {
    protected _nodeName: string = "ParenthesisExpr";

    expr: Expression = DEFAULT_IDENTIFIER;

    marks: IParenthesisExprMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.expr];
    }

    get length(): number {
        return this._length(
            this.marks.leftParen,
            this.expr,
            this.marks.rightParen
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            expr: this.expr.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `(${this.expr.toString()})`;
    }
}


export class Reference extends LeafExpression implements IReference {
    protected _nodeName: string = "Reference";

    operator: "$" | "~" | "." = "$";
    name: Identifier = DEFAULT_IDENTIFIER;

    marks: IReferenceMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.name.value;
    }

    get length(): number {
        return this._length(
            this.marks.dollarOrTildeOrDot,
            this.marks.div,
            this.marks.value
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            operator: this.operator,
            name: this.name.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.operator}/${this.name.value}`;
    }
}


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
        return this._length(
            this.marks.guid,
            this.marks.colon,
            this.marks.leftBrace,
            this.marks.value,
            this.marks.rightBrace
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            uuid: this.uuid,
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `GUID:{${this.uuid}}`;
    }
}


export class MapDef extends InternalExpression implements IMapDef {
    protected _nodeName: string = "MapDef";

    comments1: Comment[] = [];  // Map关键字尾随的注释
    pairs: Pair[] = [];
    comments2: Comment[] = [];  // 当存在尾随逗号且其后尾随注释时，其注释没有Pair来记录，因此需要单独记录

    type: IType = { type: BaseType.MAP };

    marks: IMapDefMark = {};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Pair[] {
        return this.pairs;
    }

    get length(): number {
        return this._length(
            this.marks.map,
            this.comments1,
            this.marks.leftBracket,
            this.pairs,
            this.comments2,
            this.marks.rightBracket
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            comments1: this.comments1.map(c => c.toJSON()),
            pairs: this.pairs.map(p => p.toJSON()),
            comments2: this.comments2.map(c => c.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `MAP [${this.pairs.map(p => p.toString()).join(",")}]`;
    }
}


export class Pair extends InternalExpression implements IPair {
    protected _nodeName: string = "Pair";

    key: Expression = DEFAULT_IDENTIFIER;
    value: Expression = DEFAULT_IDENTIFIER;

    marks: IPairMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.key, this.value];
    }

    get length(): number {
        return this._length(
            this.marks.leftParen,
            this.key,
            this.marks.comma,
            this.value,
            this.marks.rightParen
        ) + super.length;
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


export class VectorDef extends InternalExpression implements IVectorDef {
    protected _nodeName: string = "VectorDef";

    elements: Expression[] = [];
    comments1: Comment[] = [];  // 当存在尾随逗号且其后尾随注释时，其注释没有Expression来记录，因此需要单独记录

    marks: IVectorDefMark = {};

    type: IType = { type: BaseType.VECTOR };

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return this.elements;
    }

    get length(): number {
        return this._length(
            this.marks.leftBracket,
            this.elements,
            this.comments1,
            this.marks.rightBracket
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            elements: this.elements.map(p => p.toJSON()),
            comments1: this.comments1.map(c => c.toJSON()),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `[${this.elements.map(p => p.toString()).join(",")}]`;
    }
}


export class TypeConstructor extends InternalExpression implements ITypeConstructor {
    protected _nodeName: string = "TypeConstructor";

    name: Identifier = DEFAULT_IDENTIFIER;
    comments1: Comment[] = [];
    args: Expression[] = [];

    marks: ITypeConstructorMark = {};

    type: IType = { type: BaseType.UNKNOWN };

    constructor(public pos: IPos) {
        super();
    }

    get children(): (TypeRef | Expression[])[] {
        return [this.name, this.args];
    }

    get length(): number {
        return this._length(
            this.name,
            this.comments1,
            this.marks.leftBracket,
            this.args,
            this.marks.rightBracket
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            args: this.args.map(a => a.toJSON()),
            type: this.type.toJSON?.(true) || this.type
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
    value: Expression = DEFAULT_IDENTIFIER;

    type: IType = { type: BaseType.UNNEEDED };

    marks: IPropertyAssignMark = {};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.name, this.value];
    }

    get length(): number {
        return this._length(
            this.marks.modifier,
            this.name,
            this.marks.is,
            this.value
        ) + super.length;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            value: this.value.toJSON(),
            type: this.type.toJSON?.(true) || this.type
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ""}${this.name.toString()} is ${this.value.toString()}`;
    }
}


export class Argument extends InternalNode implements IArgument {
    protected _nodeName: string = "Argument";

    modifier: Nullable<"export" | "public">;
    name: Identifier = DEFAULT_IDENTIFIER;
    annotation: Nullable<TypeRef>;
    operator: Nullable<"=" | "is">;
    value: Nullable<Expression>;
    comments1: Comment[] = [];

    marks: IArgumentMark = {};

    type: IType = { type: BaseType.UNNEEDED };

    constructor(public pos: IPos, public readonly belong: ObjectCall | UnnamedObj) {
        super();
    }

    get children(): (Identifier | Expression | TypeRef)[] {
        return [this.name, this.value, this.annotation].filter(x => x !== undefined);
    }

    get length(): number {
        return this._length(
            this.marks.modifier,
            this.name,
            this.marks.colonOrAssignOrIs,
            this.annotation,
            this.value,
            this.comments1
        );
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            modifier: this.modifier,
            name: this.name.toJSON(),
            annotation: this.annotation?.toJSON(),
            operator: this.operator,
            value: this.value?.toJSON(),
            comments1: this.comments1.map(c => c.toJSON()),
            type: this.type.toJSON?.(true) || this.type
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


const DEFAULT_IDENTIFIER = new Identifier({ line: -1, column: -1 });


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

