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
    ITypeInitializer,
    IUnaryExpr,
    IUnnamedObj,
    IVectorDef,
    Nullable,
    IType
} from "../types";


export type ASTWithBelong = Argument | UnnamedObj | TemplateDef | MemberAssign | ParameterDecl | Assignment;


export abstract class AST implements IAST {
    protected abstract _nodeName: string;
    abstract pos: IPos;
    abstract type: IType;

    get nodeName(): string {
        return this._nodeName;
    }

    abstract toJSON(): object;

    abstract toString(): string;
}


export abstract class LeafNode extends AST implements ILeafNode {
    abstract get value(): string;
}


export abstract class InternalNode extends AST implements IInternalNode {
    abstract get children(): GeneralAST[];
}


export class Program extends InternalNode implements IProgram {
    protected _nodeName: string = "Program";
    statements: Statement[] = [];
    type: IType = {type: BaseType.UNNEEDED};

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
        return this.statements.join('\n');
    }
}


export abstract class LeafStatement extends LeafNode implements ILeafStatement {
    abstract get value(): string;
}

export abstract class InternalStatement extends InternalNode implements IInternalStatement {
    abstract get children(): GeneralAST[];
}

export type Statement = LeafStatement | InternalStatement;


export class Assignment extends InternalStatement implements IAssignment {
    protected _nodeName: string = "Assignment";
    modifier: Nullable<'private' | 'export'> = undefined;
    name: Identifier = DEFAULT_IDENTIFIER;
    value: Expression = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNNEEDED};

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
        return `${this.modifier ? `${this.modifier} ` : ''}${this.name.toString()} is ${this.value.toString()}`;
    }
}


export class TemplateDef extends InternalStatement implements ITemplateDef {
    protected _nodeName: string = "TemplateDef";
    modifier: Nullable<'private'> = undefined;
    name: Identifier = DEFAULT_IDENTIFIER;
    params: ParameterDecl[] = [];
    extend: Identifier = DEFAULT_IDENTIFIER;
    members: MemberAssign[] = [];
    type: IType = {type: BaseType.TEMPLATE, name: this.name.toString()};

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
            members: this.members.map(member => member.toJSON())
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ''}template ${this.name.toString()} [${this.params.join(',')}] is ${this.extend.toString()} (${this.members.join(' ')})`
    }
}


export class UnnamedObj extends InternalStatement implements IUnnamedObj {
    protected _nodeName: string = "UnnamedObj";
    args: Argument[] = [];
    blueprint: Identifier = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNNEEDED};

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
            args: this.args.map(member => member.toJSON())
        };
    }

    toString(): string {
        return `unnamed ${this.blueprint.toString()} (${this.args.join('\n')})`
    }
}


export class ParameterDecl extends InternalNode implements IParameterDecl {
    protected _nodeName: string = "ParameterDecl";
    annotation: Nullable<TypeRef>;
    default: Nullable<Expression>;
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNNEEDED};

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
            default: this.default?.toJSON()
        };
    }

    toString(): string {
        return `${this.name.toString()} ${this.annotation ? (': ' + this.annotation?.toString()) : ''} ${this.default ? ('= ' + this.default?.toString()) : ''}`
    }
}


export class MemberAssign extends InternalNode implements IMemberAssign {
    protected _nodeName: string = "MemberAssign";
    name: Identifier = DEFAULT_IDENTIFIER;
    operator: "=" | "is" = '=';
    type: IType = {type: BaseType.UNNEEDED};
    value: Expression = DEFAULT_IDENTIFIER;

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
            value: this.value.toJSON()
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
    type: IType = {type: BaseType.UNKNOW, name: this.name};

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
    type: IType = {type: BaseType.UNKNOW};

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
            typeParams: this.typeParams.map(t => t.toJSON())
        };
    }

    toString(): string {
        return `${this.name.toString()} <${this.typeParams.map(t => t.toString()).join(', ')}>`
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
    type: IType = {type: BaseType.UNKNOW, name: this.name};

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
    operator: "-" | "!" = '-';
    type: IType = {type: BaseType.UNKNOW};

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
        return `${this.operator}${this.operand.toString()}`
    }
}


export class BinaryExpr extends InternalExpression implements IBinaryExpr {
    protected _nodeName: string = "BinaryExpr";
    left: Expression = DEFAULT_IDENTIFIER;
    operator: BinaryOperator = '+';
    right: Expression = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNKNOW};

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
            right: this.right.toJSON()
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
    type: IType = {type: BaseType.UNKNOW};

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
            falseExpr: this.falseExpr.toJSON()
        };
    }

    toString(): string {
        return `${this.condition.toString()} ? ${this.trueExpr.toString()} : ${this.falseExpr.toString()}`;
    }
}


export class TemplateParam extends InternalExpression implements ITemplateParam {
    protected _nodeName: string = "TemplateParam";
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNKNOW, name: this.name.toString()};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Identifier[] {
        return [this.name];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            name: this.name.toJSON()
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
    type: IType = {type: BaseType.OBJECT, name: this.blueprint.toString()};

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
            args: this.args.map(a => a.toJSON())
        };
    }

    toString(): string {
        return `${this.blueprint.toString()} (${this.args.map(arg => arg.toString()).join(',')})`;
    }
}


export class IndexAccess extends InternalExpression implements IIndexAccess {
    protected _nodeName: string = "IndexAccess";
    index: Expression = DEFAULT_IDENTIFIER;
    target: Expression = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNKNOW};

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
            target: this.target.toJSON()
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
    type: IType = {type: BaseType.UNKNOW};

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
    type: IType = {type: BaseType.UNKNOW};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return [this.expr];
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            expr: this.expr.toJSON()
        };
    }

    toString(): string {
        return `(${this.expr.toString()})`;
    }
}


export class Reference extends LeafExpression implements IReference {
    protected _nodeName: string = "Reference";
    path: string = "";
    type: IType = {type: BaseType.UNKNOW};

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
    type: IType = {type: BaseType.GUID};

    constructor(public pos: IPos) {
        super();
    }

    get value(): string {
        return this.uuid;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            uuid: this.uuid
        };
    }

    toString(): string {
        return `GUID:{${this.uuid}}`
    }
}


export class MapDef extends InternalExpression implements IMapDef {
    protected _nodeName: string = "MapDef";
    pairs: Pair[] = [];
    type: IType = {type: BaseType.MAP};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Pair[] {
        return this.pairs;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            pairs: this.pairs.map(p => p.toJSON())
        };
    }

    toString(): string {
        return `MAP [${this.pairs.map(p => p.toString()).join(',')}]`;
    }
}


export class Pair extends InternalExpression implements IPair {
    protected _nodeName: string = "Pair";
    key: Expression = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNKNOW};
    value: Expression = DEFAULT_IDENTIFIER;

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
            value: this.value.toJSON()
        };
    }

    toString(): string {
        return `(${this.key.toString()}, ${this.value.toString()})`;
    }
}


export class VectorDef extends InternalExpression implements IVectorDef {
    protected _nodeName: string = "VectorDef";
    elements: Expression[] = [];
    type: IType = {type: BaseType.VECTOR};

    constructor(public pos: IPos) {
        super();
    }

    get children(): Expression[] {
        return this.elements;
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            elements: this.elements.map(p => p.toJSON())
        };
    }

    toString(): string {
        return `[${this.elements.map(p => p.toString()).join(',')}]`;
    }
}


export class TypeInitializer extends InternalExpression implements ITypeInitializer {
    protected _nodeName: string = "TypeInitializer";
    args: Expression[] = [];
    name: TypeRef = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNKNOW};

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
            args: this.args.map(a => a.toJSON())
        };
    }

    toString(): string {
        return `${this.name.toString()}[${this.args.map(arg => arg.toString()).join(',')}]`
    }
}


export class PropertyAssignExpr extends InternalExpression implements IPropertyAssignExpr {
    protected _nodeName: string = "PropertyAssignExpr";
    modifier: Nullable<"private">;
    name: Identifier = DEFAULT_IDENTIFIER;
    type: IType = {type: BaseType.UNNEEDED};
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
        return `${this.modifier ? `${this.modifier} ` : ''}${this.name.toString()} is ${this.value.toString()}`;
    }
}


export class Argument extends InternalNode implements IArgument {
    protected _nodeName: string = "Argument";
    type: IType = {type: BaseType.UNNEEDED};
    modifier: Nullable<"export">;
    annotation: Nullable<TypeRef>;
    name: Identifier = DEFAULT_IDENTIFIER;
    operator: Nullable<'=' | 'is'>;
    value: Nullable<Expression>;

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
            operator: this.operator
        };
    }

    toString(): string {
        return `${this.modifier ? `${this.modifier} ` : ''}${this.name.toString()} ${this.annotation ? (': ' + this.annotation!.toString()) : ('= ' + this.value!.toString())}`;
    }
}


export abstract class Literal extends LeafExpression implements ILiteral {
    abstract value: string;
}


export class Integer extends Literal implements IInteger {
    protected _nodeName: string = "Integer";
    type: IType = {type: BaseType.INT};

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
    type: IType = {type: BaseType.FLOAT};

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
    type: IType = {type: BaseType.BOOLEAN};

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
    type: IType = {type: BaseType.STRING};

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
    type: IType = {type: BaseType.NIL};
    value: 'nil' = 'nil';

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

const DEFAULT_IDENTIFIER = new Identifier({line: -1, column: -1});

export class ErrorExpr extends LeafExpression {
    protected _nodeName: string = "ErrorExpr";
    type: IType = {type: BaseType.UNKNOW};

    constructor(public pos: IPos) {
        super();
    }

    toJSON(): object {
        return {
            nodeName: this._nodeName,
            type: this.type
        }
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
        }
        else if (node instanceof InternalNode) {
            if (visitor(node)) return;
            node.children.forEach(n => this.visit(n, visitor));
        }
    }
}

