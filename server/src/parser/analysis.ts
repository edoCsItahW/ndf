// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file analysis.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/19 23:32
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import {
    Argument,
    Assignment,
    BinaryExpr,
    Bool,
    BuiltinType,
    ErrorExpr,
    Expression,
    Float,
    GenericType,
    GuidCall,
    Identifier,
    IndexAccess,
    Integer,
    InternalExpression,
    InternalNode,
    LeafExpression,
    LeafNode,
    Literal,
    MapDef,
    MemberAccess,
    MemberAssign,
    Nil,
    ObjectCall,
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
    TernaryExpr,
    TypeInitializer,
    TypeRef,
    UnaryExpr,
    UnnamedObj,
    VectorDef
} from "./ast";
import { BaseType, GeneralAST, IAnalyser, IPos, IType, Nullable, PartialLocalet } from "../types";
import {_TypeError, DefineError, NameWarning, NDFError, ReferenceWarning} from "../expection";
import {methodDebug, traceback, regexStack} from "../debug";
import {enumToStr} from "../utils";
import { Locale } from "../IDEHelper";


function endPos(node: LeafNode | InternalNode): IPos {
    return {line: node.pos.line, column: node.pos.column + node.toString().length};
}


export function typeToStr(type: IType): string {
    if (typeof type.type === "number" &&
        ![BaseType.MAP, BaseType.VECTOR, BaseType.PAIR, BaseType.OBJECT,
            BaseType.TEMPLATE, BaseType.GENERIC].includes(type.type))
        return enumToStr(BaseType, type.type).toLowerCase();

    switch (type.type) {
        case BaseType.VECTOR:
            return type instanceof _GenericType ? `LIST<${type.params.map(typeToStr).join(" | ")}>` : "vector";
        case BaseType.MAP:
            return type instanceof _GenericType ? `MAP<${type.params.map(typeToStr).join(" | ")}>` : "map";
        case BaseType.PAIR:
            return type instanceof _GenericType ? `PAIR<${type.params.map(typeToStr).join(",")}>` : "pair";
        case BaseType.OBJECT:
            return type.name || 'object';
        case BaseType.TEMPLATE:
            return type.name || 'template';
        case BaseType.GENERIC:
            return type instanceof _GenericType ? `${type.name}<${type.params.map(typeToStr).join(",")}>` : "generic";
        default:
            return 'unknown';
    }
}


/**
 * @class Type
 * @summary 类型
 * @classDesc 类型类,主要用于语义分析中的类型检测和类型推导.
 * 是类型类的基类,通常与Scope类配合使用,用于管理符号表和类型信息.
 * 该类集成了部分静态的类型检查和比对方法.
 * @property {BaseType} type - 基本类型枚举
 * @property {string} name - 具有符号意义的名称,如Type和TemplateType,其都是类类型,但其名称可以用于区分
 * @remarks
 * Type类可以赋值为实现了IType接口的对象,例如
 * ```ts
 * const tp: Type = {type: BaseType.INT};
 * ```
 * 亦或
 * ```ts
 * function returnIType(): Type {
 *     return {type: BaseType.FLOAT};
 * }
 * ```
 * 一般来说它们混用不会出现什么问题,但这会导致Type的toString方法失效
 * @see Scope
 * @see Analyser
 * */
export class Type implements IType {
    /**
     * @constructor
     * @param {BaseType} type - 基本类型枚举
     * @param {string} [name] - 具有符号意义的名称,如Type和TemplateType,其都是类类型,但其名称可以用于区分.
     * 常用于非基本类型,如ObjectType,TemplateType等.
     * */
    constructor(public type: BaseType, public name?: string) {
    }

    /**
     * @method isNumeric
     * @summary 判断类型是否为数字类型
     * @desc 判断类型是否为数字类型,包括整数和浮点数.
     * @param {IType} type - 类型对象
     * @returns {boolean} - 类型是否为数字类型
     * @static
     * */
    static isNumeric(type: IType): boolean {
        return type.type === BaseType.INT || type.type === BaseType.FLOAT;
    }

    /**
     * @method isSomeObj
     * @summary 判断两个对象是否为同一类型
     * @desc 判断两个对象是否为同一类型,包括类型,名称,.
     * @param {IType} obj1Type - 对象类型1
     * @param {IType} obj2Type - 对象类型2
     * @remarks 如果传入类型中有非对象类型,则会返回false.
     * @returns {boolean} - 类型是否相同
     * @static
     * */
    static isSomeObj(obj1Type: IType, obj2Type: IType): boolean {
        return obj1Type.type === obj2Type.type && obj1Type.type === BaseType.OBJECT && obj1Type.name === obj2Type.name;
    }

    static isSomeGenericType(gen1Type: IType, gen2Type: IType): boolean {
        if (gen1Type instanceof _GenericType
            && gen2Type instanceof _GenericType
            && gen1Type.name === gen2Type.name
            && gen1Type.params.length === gen2Type.params.length) {
            return gen1Type.params.some(type => gen2Type.params.some(t => Type.isCompatible(type, t)));
        }
        return false;
    }

    /**
     * @method isCompatible
     * @summary 判断两个类型是否兼容
     * @desc 判断两个类型是否兼容,包括类型,名称,.
     * @param {IType} type1 - 类型1
     * @param {IType} type2 - 类型2
     * @returns {boolean} - 类型是否兼容
     * @remarks 兼容性规则:
     * 1. 如果任意类型为BaseType.UNNEEDED或者BaseType.TEMPLATE,则不兼容.
     * 2. 如果是同一对象类型,则兼容.
     * 3. 如果两个类型的基本类型相同,则兼容.
     * 4. 如果是数字类型(包括整数和浮点数),则兼容.
     * 5. 如果有任一为BaseType.ANY或者BaseType.UNKNOW,则兼容.
     * 6. 如果为BaseType.OBJECT和BaseType.NIL,则兼容.
     * 7. 否则不兼容.
     * @static
     * */
    static isCompatible(type1: IType, type2: IType): boolean {
        if ([type1.type, type2.type].some(t => t === BaseType.UNNEEDED || t === BaseType.TEMPLATE))
            return false;

        if (Type.isSomeObj(type1, type2))
            return true;
        else if (Type.isSomeGenericType(type1, type2))
            return true;
        else if (type1.type === type2.type)
            return true;
        else {
            if (Type.isNumeric(type1) && Type.isNumeric(type2))
                return true;
            else if (type1.type === BaseType.ANY || type2.type === BaseType.ANY)
                return true;
            else if (type1.type === BaseType.UNKNOW || type2.type === BaseType.UNKNOW)
                return true;
            else if (type1.type === BaseType.OBJECT && type2.type === BaseType.NIL)
                return true;
        }

        return false;
    }

    toString(): string {
        return `<Type: ${typeToStr(this)}, name: ${this.name}>`;
    }
}


export class TemplateType extends Type {
    params: Map<string, Type> = new Map();
    prototypeScope: Nullable<Scope>;

    constructor(public type: BaseType, public name?: string) {
        super(type, name);
    }

    toString(): string {
        return `<TemplateType: ${typeToStr(this)}, name: ${this.name}, params: [${this.params}]>`;
    }
}


export class ObjectType extends Type {
    prototypeScope: Nullable<Scope>;

    constructor(public type: BaseType, public name?: string) {
        super(type, name);
    }

    toString(): string {
        return `<ObjectType: ${typeToStr(this)}, name: ${this.name}>`;
    }
}


export class _GenericType extends Type {
    params: Type[] = [];

    constructor(public type: BaseType, public name?: string) {
        super(type, name);
    }
}


export class Symbol {
    private _type: Type = {type: BaseType.UNKNOW};

    constructor(public readonly name: string, public readonly pos: IPos, type?: Type) {
        if (type)
            this._type = type;
    }

    get type(): Type {
        return this._type;
    }

    set type(value: Type) {
        if (value === undefined || !(value as object).hasOwnProperty('type')) {
            console.warn(`Warning: Symobl.type 被设置为非法值: ${value}`);
            return;
        }
        this._type = value;
    }

    toString(): string {
        return `<Symbol: ${this.name}, type: ${this.type} in [${this.pos.line}:${this.pos.column}]>`
    }
}


type ScopeKind = 'global' | 'template' | 'prototype' | 'local';

let id: number = 0;
export class Scope {
    private symbols: Map<string, Symbol> = new Map();
    parent: Nullable<Scope>;
    children: Scope[] = [];
    start: Nullable<IPos>;
    end: Nullable<IPos>;
    id: number;

    constructor(symbols: Array<Symbol>, kind?: string);
    constructor(parent?: Scope, kind?: string);
    constructor(symbolsOrParent?: Scope | Array<Symbol>, public readonly kind: ScopeKind = 'local') {
        if (Array.isArray(symbolsOrParent))
            symbolsOrParent.forEach(symbol => this.define(symbol));

        else if (symbolsOrParent instanceof Scope)
            this.parent = symbolsOrParent;

        this.id = id++;
    }

    define(symbol: Symbol) {
        this.symbols.set(symbol.name, symbol);
    }

    resolve(name: string): Nullable<Symbol> {
        return this.symbols.get(name);
    }

    lookup(name: string, stop?: ScopeKind): Nullable<Symbol>;
    lookup(name: string, allow: ScopeKind[]): Nullable<Symbol>;
    lookup(name: string, stopOrAllow: ScopeKind | ScopeKind[] = 'global'): Nullable<Symbol> {
        let current: Nullable<Scope> = this;
        while (current) {
            const symbol = current.resolve(name);

            if (symbol)
                return symbol;

            else if (Array.isArray(stopOrAllow) ? !stopOrAllow.includes(current.kind) : current.kind === stopOrAllow)
                break;

            else
                current = current.parent;
        }
    }

    toJSON(): object {
        return {
            kind: this.kind,
            symbols: Object.fromEntries(this.symbols),
            parent: this.parent?.toJSON()
        };
    }
}


function analyserDebug(obj: Analyser, fnName: string, msg: string) {
//    if (obj.debug) {
//        console.log(`(Parser.${fnName}): `, obj.currentScope.symbols, ` - ${msg}`);
//    }
}


export class Analyser implements IAnalyser {
    static deepCopy: boolean = false;
    globalScope: Scope = new Scope([new Symbol("color", {line: 0, column: 0}, {type: BaseType.VECTOR})], "global");
    currentScope: Scope = this.globalScope;
    errors: NDFError[] = [];

    constructor(private ast: Program, private readonly locale?: Locale, public debug: boolean = false, public raise: boolean = false) {
    }

    private get localet(): Nullable<PartialLocalet> {
        return this.locale?.t.bind(this.locale, "analysis");
    }

    analyze(): Scope {
        this.visitProgram(this.ast);
        return this.globalScope;
    }

    @methodDebug(analyserDebug, "visitProgram")
    @traceback(true)
    visitProgram(node: Program) {
        node.statements.forEach(stmt => this.visitStatement(stmt));
    }

    @methodDebug(analyserDebug, "visitStatement")
    @traceback()
    visitStatement(node: Statement) {
        if (node instanceof Assignment)
            this.visitAssignment(node);

        else if (node instanceof TemplateDef)
            this.visitTemplateDef(node);

        else if (node instanceof UnnamedObj)
            this.visitUnnamedObj(node);

        else
            this.reportError(new _TypeError(
                this.localet?.("NEA1", node.constructor.name)
                || `Unsupported \`statement\` type \`${node.constructor.name}\``,
                node.pos, endPos(node))
            );
    }

    @methodDebug(analyserDebug, "visitAssignment")
    @traceback()
    visitAssignment(node: Assignment) {
        let symbol = this.globalScope.resolve(node.name.value);  // 语句只能在全局作用域定义

        const valueType = this.visitExpression(node.value);

        if (symbol) {  // 重新赋值,则检查类型是否一致
            const declaredType = symbol.type;

            const resultType = this.assignResultWithCheck(node, declaredType, valueType);

            if (resultType.type === BaseType.ERROR)
                this.reportError(new _TypeError(
                    this.localet?.("NEA2", typeToStr(valueType), typeToStr(declaredType))
                    || `Type \`${typeToStr(valueType)}\` is not assignable to type \`${typeToStr(declaredType)}\``,
                    node.name.pos, endPos(node.name))
                );

            else
                symbol.type = resultType;

        } else {
            symbol = new Symbol(node.name.value, node.pos);
            symbol.type = valueType;
            this.currentScope.define(symbol);
        }
    }

    /**
     * @method visitTemplateDef
     * @summary 分析模板定义语句
     * @desc 分析模板定义语句,并处理模板参数、原型(模板正文)
     * @param {TemplateDef} node - 模板定义语句
     * @remarks
     * 分析:
     * 1. 模板可以继承自模板,但不能继承自其他类型.如果不进行继承,则模板的蓝图转为最终类型.
     * 2. 与其它语言不同,其模板参数类似于Python的类属性类型提示,在模板参数定义块中不参与计算,只能进行声明和设置默认值.如
     * ```python
     * class A:
     *     attr: int
     * ```
     * 所以模板参数应该是模板本身的属性,它可以被其下的原型域参考和引用,但不能被原型域覆盖.其不可在模板参数块中重复定义.
     *
     * 最终,对于模板参数和原型域,处理方式为:
     * 1. 对于模板参数,采用静态复制的方式,同时限制其子模板进行类型不同的修改,并且不设作用域.
     * 当引用模板参数或推导模板参数类型时,从模板参数中查找即可,类型验证时,如果没有在父模板中找到,则证明为新模板参数.
     * 2. 对于原型域,采用原型链动态链接的方式,其子模版可以继承自其父模板的原型域,也可以实现模板参数,
     * 但不能进行类型不同的修改,也不能在原型域内重复定义.
     * 由于引用方式不同,则成员的引用和类型推导的查找方式也不同.当引用原型域成员时,优先在原型域内查找,
     * 如果没有找到,则在父模板的原型域中查找,如果还是没有找到,则报错.当推导类型时和检查修改合法性时,
     * 优先在模板参数中查找,如果没有找到,则在父模板的原型域中查找,如果还是没有找到,则非法(由于无法解析外部模板导致的问题不在管辖范围)
     * */
    @methodDebug(analyserDebug, "visitTemplateDef")
    @traceback()
    visitTemplateDef(node: TemplateDef) {
        let symbol = this.globalScope.resolve(node.name.value);

        if (symbol)
            this.reportError(new DefineError(
                this.localet?.("NEA3", node.name.value)
                || `Duplicate identifier \`${node.name.value}\``,
                node.name.pos, endPos(node.name))
            );

        else {
            const templateScope = new Scope(this.currentScope, "template");
            const templateType = new TemplateType(BaseType.TEMPLATE, node.name.value);

            let parentType: Nullable<TemplateType>;
            const parentSymbol = this.currentScope.resolve(node.extend.value);

            if (parentSymbol
                && parentSymbol.type instanceof TemplateType
                && parentSymbol.type.type === BaseType.TEMPLATE
            )   // 继承模板
                parentType = parentSymbol.type;

            else if (!parentSymbol && !node.extend.value.startsWith("T"))
                this.reportError(new NameWarning(
                    this.localet?.("NWA4") || "Parent template almost starts with `T`",
                    node.extend.pos, endPos(node.extend))
                );

            this.enterScope(templateScope, endPos(node.name));  // 进入模板作用域

            // 处理模板参数的同时收集,并且保持作用域在templateScope
            node.params.map(param => this.visitParameterDecl(param, templateType, parentType));

            parentType?.params.forEach((type, name) => {
                if (!templateType.params.has(name)) {
                    templateType.params.set(name, type);

                    const symbol = new Symbol(name, node.pos);
                    symbol.type = type;
                    templateScope.define(symbol);
                }
            });  // 复制父模板模板参数

            const prototypeScope = new Scope(templateScope, "prototype");

            this.enterScope(prototypeScope, endPos(node.extend));  // 进入原型作用域

            node.members.forEach(member => this.visitMemberAssign(member, node.extend.value));

            this.exitScope(endPos(node.members.length ? node.members[node.members.length - 1] : node.extend));  // 回到原型作用域

            templateType.prototypeScope = prototypeScope;

            this.exitScope(node.params.length ? endPos(node.params[node.params.length - 1]) : node.extend.pos);  // 回到原来的作用域

            symbol = new Symbol(node.name.value, node.pos);

            symbol.type = templateType;
            this.currentScope.define(symbol);
        }

    }

    @methodDebug(analyserDebug, "visitUnnamedObj")
    @traceback()
    visitUnnamedObj(node: UnnamedObj) {
        if (this.currentScope.parent)
            return this.reportError(new DefineError(
                this.localet?.("NEA5") || "**Anonymous object** cannot be declared in **local scope**",
                node.pos, endPos(node))
            );

        let symbol = this.globalScope.resolve(node.blueprint.value);

        const objType = new ObjectType(BaseType.OBJECT, node.blueprint.value);

        const prototypeScope = new Scope(this.currentScope, "prototype");  // 稍后定义父类作用域

        if (!symbol) {
            this.reportError(new ReferenceWarning(
                this.localet?.("NWA6", node.blueprint.value) || `Unknown **blueprint** \`${node.blueprint.value}\``,
                node.blueprint.pos, endPos(node.blueprint))
            );

            this.enterScope(prototypeScope, endPos(node.blueprint));

            node.args.forEach(arg => this.visitArgument(arg));

            this.exitScope(endPos(node.args.length ? node.args[node.args.length - 1] : node.blueprint));

            objType.prototypeScope = prototypeScope;

            return;
        }


        this.enterScope(prototypeScope, endPos(node.blueprint));

        if ((symbol.type instanceof TemplateType && symbol.type.type === BaseType.TEMPLATE)
            || (symbol.type instanceof ObjectType && symbol.type.type === BaseType.OBJECT)) {
            prototypeScope.parent = symbol.type.prototypeScope;  // 继承原型作用域

            node.args.forEach(arg => this.visitArgument(arg));

        } else
            this.reportError(new _TypeError(
                this.localet?.("NEA7", node.blueprint.value)
                || `Type \`${node.blueprint.value}\` does not support instantiation`,
                node.pos, endPos(node))
            );

        this.exitScope(endPos(node.args.length ? node.args[node.args.length - 1] : node.blueprint));  // 回到原型作用域

        objType.prototypeScope = prototypeScope;
    }

    @methodDebug(analyserDebug, "visitParameterDecl")
    @traceback()
    visitParameterDecl(node: ParameterDecl, tmplType: TemplateType, parentType: Nullable<TemplateType>) {
        if (tmplType.params.has(node.name.value))
            return this.reportError(new DefineError(
                this.localet?.("NEA8")
                || `Cannot redeclare template scope **template parameter** \`${node.name.value}\``,
                node.name.pos, endPos(node.name))
            );

        const symbol = new Symbol(node.name.value, node.pos);

        let type = node.annotation
            ? this.visitTypeRef(node.annotation)
            : node.default
                ? this.visitExpression(node.default)
                : {type: BaseType.ANY};

        if (parentType && parentType.params.has(node.name.value))
            if (!Type.isCompatible(type, parentType.params.get(node.name.value)!)) {
                this.reportError(new _TypeError(
                    this.localet?.("NEA9", node.name.value, tmplType.name!, typeToStr(parentType.params.get(node.name.value)!), parentType.name!)
                    || `Type of **template parameter** \`${node.name.value}\` in template \`${tmplType.name}\` does not match the same **template parameter** type \`${typeToStr(parentType.params.get(node.name.value)!)}\` in template \`${parentType.name}\``,
                    node.name.pos, endPos(node.name)));

                type = parentType.params.get(node.name.value)!;

            } else
                type = this.assignResultWithCheck(node, parentType.params.get(node.name.value)!, type);

        tmplType.params.set(node.name.value, type);

        symbol.type = type;
        node.name.type = type;

        this.currentScope.define(symbol);
    }

    @methodDebug(analyserDebug, "visitMemberAssign")
    @traceback()
    visitMemberAssign(node: MemberAssign, parentName?: string) {
        let symbol = this.currentScope.resolve(node.name.value);

        if (symbol)
            return this.reportError(new DefineError(
                this.localet?.("NEA10", node.name.value)
                || `Cannot redeclare prototype scope **member** \`${node.name.value}\``,
                node.name.pos, endPos(node.name)
            ));

        let type = this.visitExpression(node.value);

        const parentSymbol = this.currentScope.lookup(node.name.value, ["template", "prototype"]);

        if (parentSymbol)
            if (!Type.isCompatible(type, parentSymbol.type)) {
                this.reportError(new _TypeError(
                    this.localet?.("NEA11", node.name.value, parentName!, typeToStr(parentSymbol.type))
                    || `Type of **member** \`${node.name.value}\` does not match the same **member** type \`${typeToStr(parentSymbol.type)}\` in template \`${parentName}\``,
                    node.name.pos, endPos(node.name))
                );

                type = parentSymbol.type;

            } else
                type = this.assignResultWithCheck(node, parentSymbol!.type, type);

        symbol = new Symbol(node.name.value, node.pos);

        symbol.type = type;
        node.name.type = type;

        this.currentScope.define(symbol);
    }

    @methodDebug(analyserDebug, "visitTypeRef")
    @traceback()
    visitTypeRef(node: TypeRef): Type {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof Analyser] as (node: GeneralAST) => Type)(node);
        else
            this.reportError(new _TypeError(
                this.localet?.("NEA11", node.nodeName)
                || `Unsupported **type reference** type \`${node.nodeName}\``,
                node.pos, endPos(node)
            ));

        return {type: BaseType.UNKNOW};
    }

    @methodDebug(analyserDebug, "visitBuiltinType")
    @traceback()
    visitBuiltinType(node: BuiltinType): Type {
        switch (node.name) {
            case "int":
                return {type: BaseType.INT};

            case "float":
                return {type: BaseType.FLOAT};

            case "bool":
                return {type: BaseType.BOOLEAN};

            case "string":
                return {type: BaseType.STRING};

            case "nil":
                return {type: BaseType.NIL};

            default:
                this.reportError(new _TypeError(
                    this.localet?.("NEA13", node.name)
                    || `Unsupported **type reference** type \`${node.name}\``,
                    node.pos, endPos(node)
                ));

                return {type: BaseType.ERROR};
        }
    }

    @methodDebug(analyserDebug, "visitGenericType")
    @traceback()
    visitGenericType(node: GenericType): Type {
        let symbol = this.globalScope.resolve(node.name.value);  // 由于其特性,只能在全局作用域中寻找

        if (symbol)
            return symbol.type;

        else {
            const genericType = new _GenericType(BaseType.GENERIC, node.name.value);

            genericType.params = this.unrepeatedType(node.typeParams.map(param => this.visitTypeRef(param)));

            symbol = new Symbol(node.name.value, node.pos);
            node.name.type = genericType;
            symbol.type = genericType;

            this.globalScope.define(symbol);

            return genericType;
        }
    }

    @methodDebug(analyserDebug, "visitExpression")
    @traceback()
    visitExpression(node: Expression): Type {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this && (node instanceof LeafExpression || node instanceof InternalExpression)) {
            return (this[methodName as keyof Analyser] as (node: GeneralAST) => Type)(node);
        } else
            this.reportError(new _TypeError(
               this.localet?.("NEA14", node.nodeName)
               || `Undefined **expression** type \`${node.nodeName}\`, which cannot be analyzed`,
                node.pos, endPos(node)
            ));

        return {type: BaseType.UNKNOW};
    }

    @methodDebug(analyserDebug, "visitIdentifier")
    @traceback()
    visitIdentifier(node: Identifier): Type {
        const symbol = this.currentScope.lookup(node.value);

        if (!symbol) {
            this.reportError(new _TypeError(
                this.localet?.("NEA15", node.value)
                || `Unknown **identifier** \`${node.value}\``,
                node.pos, endPos(node)
            ));
            return {type: BaseType.UNKNOW};
        }

        node.type = symbol.type;

        return symbol.type || {type: BaseType.UNKNOW};  // 防御性处理
    }

    @methodDebug(analyserDebug, "visitTernaryExpr")
    @traceback()
    visitTernaryExpr(node: TernaryExpr): Type {
        const conditionType = this.visitExpression(node.condition);
        const trueType = this.visitExpression(node.trueExpr);
        const falseType = this.visitExpression(node.falseExpr);

        if (conditionType.type !== BaseType.BOOLEAN) {
            this.reportError(new _TypeError(
                this.localet?.("NEA16", typeToStr(conditionType))
                || `The type of **conditional expression** must be **boolean**, but found \`${typeToStr(conditionType)}\``,
                node.pos, endPos(node)
            ));

            return {type: BaseType.ERROR};
        }

        if (!Type.isCompatible(trueType, falseType)) {
            this.reportError(new _TypeError(
                this.localet?.("NEA17", typeToStr(trueType), typeToStr(falseType))
                || `The type of **true expression** \`${typeToStr(trueType)}\` does not match the type of **false expression** \`${typeToStr(falseType)}\``,
                node.pos, endPos(node)
            ));

            return {type: BaseType.ERROR};
        }

        return trueType;
    }

    @methodDebug(analyserDebug, "visitBinaryExpr")
    @traceback()
    visitBinaryExpr(node: BinaryExpr): Type {
        const leftType = this.visitExpression(node.left);

        const rightType = this.visitExpression(node.right);

        return this.binaryExprResultWithCheck(node, leftType, rightType);
    }

    @methodDebug(analyserDebug, "visitUnaryExpr")
    @traceback()
    visitUnaryExpr(node: UnaryExpr): Type {
        const operandType = this.visitExpression(node.operand);

        return this.unaryExprResultWithCheck(node, operandType);
    }

    @methodDebug(analyserDebug, "visitTemplateParam")
    @traceback()
    visitTemplateParam(node: TemplateParam): Type {
        if (!this.currentScope.parent) {
            this.reportError(new _TypeError(
                this.localet?.("NEA18")
                || "**Template parameter** can only be declared in **template declaration**",
                node.pos, endPos(node)
            ));
            return {type: BaseType.ERROR};
        }

        const symbol = this.currentScope.lookup(node.name.value, ["template", "prototype"]);

        if (symbol) {
            node.name.type = symbol.type;
            return symbol.type;
        } else
            this.reportError(new _TypeError(
                this.localet?.("NEA19", node.name.value)
                || `Cannot find **template parameter** \`${node.name.value}\``,
                node.name.pos, endPos(node)
            ));

        node.name.type = {type: BaseType.UNKNOW};
        return {type: BaseType.UNKNOW};
    }

    /**
     * @method visitObjectCall
     * @summary 分析对象构造的表达式
     * @desc 分析对象构造的表达式,并处理参数声明与赋值
     * @param {ObjectCall} node - 对象构造的表达式
     * @remarks
     * 分析:
     * 1. 对象构造表达式的蓝图可以是模板或者原型
     * 2. 对象表达式的参数必需是原型链上的成员(可以不实现所有成员),不能是模板参数.
     * 3. 参数不可以进行类型不同的覆盖
     * 4. 无论实例化的是模板还是原型,其都只与原型域有关,与模板参数无关.
     * 最终,对于对象构造表达式,处理方式为:
     * 1. 对于模板和原型,其都有原型域,则在类型检查时按原型链,向上游查找即可.
     * */
    @methodDebug(analyserDebug, "visitObjectCall")
    @traceback()
    visitObjectCall(node: ObjectCall): ObjectType {
        const tmplOrProtoSymbol = this.currentScope.lookup(node.blueprint.value);
        const orgScope = this.currentScope;

        const objType = new ObjectType(BaseType.OBJECT, node.blueprint.value)

        const prototypeScope = new Scope(orgScope, "prototype");  // 稍后定义父类作用域

        if (!tmplOrProtoSymbol) {
            this.reportError(new ReferenceWarning(
                this.localet?.("NWA6", node.blueprint.value)
                || `Unknown **blueprint** \`${node.blueprint.value}\``,
                node.blueprint.pos, endPos(node.blueprint)
            ));

            this.enterScope(prototypeScope, endPos(node.blueprint));

            node.args.forEach(arg => this.visitArgument(arg));

            this.exitScope(endPos(node.args.length ? node.args[node.args.length - 1] : node.blueprint));

            objType.prototypeScope = prototypeScope;

            this.enterScope(orgScope);  // 回到原来的作用域

            return objType;  // 虽然无法确定类型,但实例化的肯定是对象
        }

        this.enterScope(prototypeScope, endPos(node.blueprint));

        if ((tmplOrProtoSymbol.type instanceof TemplateType && tmplOrProtoSymbol.type.type === BaseType.TEMPLATE)
            || (tmplOrProtoSymbol.type instanceof ObjectType && tmplOrProtoSymbol.type.type === BaseType.OBJECT)) {
            prototypeScope.parent = tmplOrProtoSymbol.type.prototypeScope;  // 继承原型作用域

            node.args.forEach(arg => this.visitArgument(arg, false, node.blueprint.value));
        } else
            this.reportError(new _TypeError(
                this.localet?.("NEA7", node.blueprint.value)
                || `Type \`${node.blueprint.value}\` does not support instantiation`,
                node.pos, endPos(node))
            );

        this.exitScope(endPos(node.args.length ? node.args[node.args.length - 1] : node.blueprint));  // 回到原型作用域

        objType.prototypeScope = prototypeScope;

        this.enterScope(orgScope);  // 回到原来的作用域

        return objType;
    }

    @methodDebug(analyserDebug, "visitIndexAccess")
    @traceback()
    visitIndexAccess(node: IndexAccess): Type {
        const targetType = this.visitExpression(node.target);
        const indexType = this.visitExpression(node.index);

        if (targetType.type === BaseType.VECTOR) {
            if (indexType.type === BaseType.INT)
                return {type: targetType.type};

            else
                this.reportError(new _TypeError(
                    this.localet?.("NEA20", typeToStr(targetType), 'int', typeToStr(indexType))
                    || `The type of the index signature of \`${typeToStr(targetType)}\` must be \`int\`, but found \`${typeToStr(indexType)}\``,
                    node.pos, endPos(node)
                ));

        } else if (targetType.type === BaseType.MAP) {
            if (indexType.type === BaseType.STRING)
                return {type: targetType.type};

            else
                this.reportError(new _TypeError(
                    this.localet?.("NEA20", typeToStr(targetType), 'string', typeToStr(indexType))
                    || `The type of the index signature of \`${typeToStr(targetType)}\` must be \`string\`, but found \`${typeToStr(indexType)}\``,
                    node.pos, endPos(node)
                ));

        } else
            this.reportError(new _TypeError(
                this.localet?.("NEA21", typeToStr(targetType))
                || `Type \`${typeToStr(targetType)}\` does not support **index access**`,
                node.pos, endPos(node)
            ));

        return {type: BaseType.ERROR};
    }

    @methodDebug(analyserDebug, "visitMemberAccess")
    @traceback()
    visitMemberAccess(node: MemberAccess): Type {
        const type = this.visitExpression(node.target);

        if (type instanceof ObjectType && type.type === BaseType.OBJECT) {

            const member = type.prototypeScope!.lookup(node.property.value);

            if (member)
                return member.type;

            else
                this.reportError(new _TypeError(
                    this.localet?.("NEA22", node.property.value, type.name!)
                    || `Cannot find **member** \`${node.property.value}\` in type \`${type.name}\``
                    , node.pos, endPos(node)
                ));

            return {type: BaseType.ERROR};
        }

        this.reportError(new _TypeError(
            this.localet?.("NEA23", typeToStr(type))
            || `Type \`${typeToStr(type)}\` does not support **member access**`,
            node.target.pos, endPos(node.property)
        ));

        return {type: BaseType.ERROR};
    }

    @methodDebug(analyserDebug, "visitParenthesisExpr")
    @traceback()
    visitParenthesisExpr(node: ParenthesisExpr): Type {
        return this.visitExpression(node.expr);
    }

    @methodDebug(analyserDebug, "visitReference")
    @traceback()
    visitReference(node: Reference): Type {
        // TODO: 尝试从当前作用域或所有文件中查找引用的类型
        return {type: BaseType.UNKNOW};
    }

    @methodDebug(analyserDebug, "visitGuidCall")
    @traceback()
    visitGuidCall(node: GuidCall): Type {
        return {type: BaseType.GUID, name: node.uuid};
    }

    @methodDebug(analyserDebug, "visitMapDef")
    @traceback()
    visitMapDef(node: MapDef): Type {
        const type = new _GenericType(BaseType.MAP, "map");
        type.params = this.unrepeatedType(node.pairs.map(pair => this.visitPair(pair)));

        node.type = type;

        return type;
    }

    @methodDebug(analyserDebug, "visitPair")
    @traceback()
    visitPair(node: Pair): Type {
        const type = new _GenericType(BaseType.PAIR, "pair");
        type.params = [this.visitExpression(node.key), this.visitExpression(node.value)];

        node.type = type;

        return type;
    }

    @methodDebug(analyserDebug, "visitVectorDef")
    @traceback()
    visitVectorDef(node: VectorDef): Type {
        const type = new _GenericType(BaseType.VECTOR, "vector");

        const orgParams = node.elements.map(elem => this.visitExpression(elem));

        type.params = this.unrepeatedType(orgParams);

        node.type = type;

        return type;
    }

    @methodDebug(analyserDebug, "visitTypeInitializer")
    @traceback()
    visitTypeInitializer(node: TypeInitializer): Type {
        // TODO: 实现类型/泛型验证
        return {type: BaseType.ANY};
    }

    @methodDebug(analyserDebug, "visitPropertyAssignExpr")
    @traceback()
    visitPropertyAssignExpr(node: PropertyAssignExpr): Type {
        let symbol = this.currentScope.resolve(node.name.value);

        if (symbol)
            this.reportError(new _TypeError(
                this.localet?.("NEA24", node.name.value)
                || `Cannot redeclare instantiated **member** \`${node.name.value}\``,
                node.name.pos, endPos(node.name)
            ));

        else {
            const valueType = this.visitExpression(node.value);

            symbol = new Symbol(node.name.value, node.pos);
            symbol.type = valueType;
            this.currentScope.define(symbol);

            return valueType;
        }

        return {type: BaseType.UNKNOW};
    }

    @methodDebug(analyserDebug, "visitArgument")
    @traceback()
    visitArgument(node: Argument, noParent?: boolean, parentName?: string) {
        let symbol = this.currentScope.resolve(node.name.value);

        if (symbol)
            return this.reportError(new _TypeError(
                this.localet?.("NEA24", node.name.value)
                || `Cannot redeclare instantiated **member** \`${node.name.value}\``,
                node.name.pos, endPos(node.name)
            ));

        symbol = new Symbol(node.name.value, node.pos);

        let type = node.annotation ? this.visitTypeRef(node.annotation) : this.visitExpression(node.value!);

        const parentSymbol = this.currentScope.lookup(node.name.value, ["template", "prototype"]);

        if (!parentSymbol) {

            if (!noParent)
                this.reportError(new NameWarning(
                    this.localet?.("NEA25", node.name.value)
                    || `Cannot resolve **member** \`${node.name.value}\` because cannot find **blueprint**`,
                    node.name.pos, endPos(node.name)
                ));

            symbol.type = type;
            node.name.type = type;

            return this.currentScope.define(symbol);
        }

        if (!Type.isCompatible(parentSymbol.type, type)) {
            this.reportError(new _TypeError(
                this.localet?.("NEA11", node.name.value, parentName!, typeToStr(parentSymbol.type))
                || `Type of **member** \`${node.name.value}\` does not match the same **member** type \`${parentName}\` in template \`${typeToStr(parentSymbol.type)}\``,
                node.pos, endPos(node)
            ));

            type = parentSymbol.type;

        } else
            type = this.assignResultWithCheck(node, parentSymbol.type, type);

        symbol.type = type;
        node.name.type = type;

        this.currentScope.define(symbol);
    }

    @methodDebug(analyserDebug, "visitLiteral")
    @traceback()
    visitLiteral(node: Literal): Type {
        const methodName = `visit${node.nodeName}`;

        if (methodName in this)
            return (this[methodName as keyof Analyser] as (node: GeneralAST) => Type)(node);
        else
            this.reportError(new _TypeError(
                this.localet?.("NEA26", node.nodeName)
                || `Undefined **literal** type \`${node.nodeName}\`, which cannot be analyzed`,
                node.pos, endPos(node)
            ));

        return {type: BaseType.UNKNOW};
    }

    @methodDebug(analyserDebug, "visitInteger")
    @traceback()
    visitInteger(node: Integer): Type {
        return {type: BaseType.INT};
    }

    @methodDebug(analyserDebug, "visitFloat")
    @traceback()
    visitFloat(node: Float): Type {
        return {type: BaseType.FLOAT};
    }

    @methodDebug(analyserDebug, "visitBoolean")
    @traceback()
    visitBool(node: Bool): Type {
        return {type: BaseType.BOOLEAN};
    }

    @methodDebug(analyserDebug, "visitString")
    @traceback()
    visitString(node: Str): Type {
        return {type: BaseType.STRING};
    }

    @methodDebug(analyserDebug, "visitNil")
    @traceback()
    visitNil(node: Nil): Type {
        return {type: BaseType.NIL};
    }

    @methodDebug(analyserDebug, "visitErrorExpr")
    @traceback()
    visitErrorExpr(node: ErrorExpr): Type {
        this.reportError(new _TypeError(
            this.localet?.("NEA27", node.toString()) || `Error **expression** \`${node.toString()}\``,
            node.pos, endPos(node)
        ));

        return {type: BaseType.ERROR};
    }

    private unaryExprResultWithCheck(node: UnaryExpr, operandType: Type): Type {
        switch (node.operator) {
            case '-':
                if (Type.isNumeric(operandType))
                    return operandType;

                else
                    this.reportError(new _TypeError(
                        this.localet?.("NEA28", typeToStr(operandType), node.operator)
                        || `Type \`${typeToStr(operandType)}\` does not support \`${node.operator}\``,
                        node.pos, endPos(node)
                    ));

                break;

            case '!':
                if (operandType.type === BaseType.BOOLEAN)
                    return operandType;

                else
                    this.reportError(new _TypeError(
                        this.localet?.("NEA28", typeToStr(operandType), node.operator)
                        || `Type \`${typeToStr(operandType)}\` does not support \`${node.operator}\``,
                        node.pos, endPos(node)
                    ));

                break;

            default:

                this.reportError(new _TypeError(
                    this.localet?.("NEA29", node.operator)
                    || `Undefining **operator** \`${node.operator}\``,
                    node.pos, endPos(node)
                ));
        }

        return {type: BaseType.ERROR};
    }

    private binaryExprResultWithCheck(node: BinaryExpr, leftType: Type, rightType: Type): Type {
        if (leftType.type === BaseType.ANY && rightType.type === BaseType.ANY)
            return {type: BaseType.ANY};

        else if (leftType.type === BaseType.UNKNOW && rightType.type === BaseType.UNKNOW)
            return {type: BaseType.UNKNOW};

        else if (leftType.type === BaseType.ANY || rightType.type === BaseType.ANY)
            return {type: BaseType.ANY};

        else if (leftType.type === BaseType.UNKNOW || rightType.type === BaseType.UNKNOW)
            return {type: BaseType.UNKNOW};

        else if ([leftType.type, rightType.type].some(t => t === BaseType.UNNEEDED || t === BaseType.TEMPLATE)) {
            this.reportError(new _TypeError(
                this.localet?.("NEA30") || "There is an ineligible type", node.pos, endPos(node)));

            return {type: BaseType.ERROR};
        }

        switch (node.operator) {
            case '+':
                if (Type.isNumeric(leftType) && Type.isNumeric(rightType))
                    return {type: leftType.type === BaseType.INT && rightType.type === BaseType.INT ? BaseType.INT : BaseType.FLOAT};
                if (leftType.type === rightType.type) {
                    if (leftType.type === BaseType.GENERIC && Type.isSomeGenericType(leftType, rightType))
                        return leftType;
                    else if (leftType.type === BaseType.STRING) return {type: BaseType.STRING};
                    else if (leftType.type === BaseType.VECTOR) return {type: BaseType.VECTOR};
                    else if (leftType.type === BaseType.MAP) return {type: BaseType.MAP};
                }
                this.reportError(new _TypeError(
                    this.localet?.("NEA31", node.operator, typeToStr(leftType), typeToStr(rightType))
                    || `Operator \`${node.operator}\` cannot be applied to type \`${typeToStr(leftType)}\` and type \`${typeToStr(rightType)}\``,
                    node.pos, endPos(node)
                ));
                break;
            case '-':
            case '*':
            case 'div': {
                if (Type.isNumeric(leftType) && Type.isNumeric(rightType))
                    return {type: leftType.type === BaseType.INT && rightType.type === BaseType.INT ? BaseType.INT : BaseType.FLOAT};

                this.reportError(new _TypeError(
                    this.localet?.("NEA31", node.operator, typeToStr(leftType), typeToStr(rightType))
                    || `Operator \`${node.operator}\` cannot be applied to type \`${typeToStr(leftType)}\` and type \`${typeToStr(rightType)}\``,
                    node.pos, endPos(node)
                ));

                break;
            }
            case '%':
                if (Type.isNumeric(rightType) && Type.isNumeric(rightType))
                    if (leftType.type === BaseType.INT && rightType.type === BaseType.INT)
                        return {type: BaseType.INT};

                    else {
                        this.reportError(new _TypeError(
                            this.localet?.("NEA32", 'float') || `Type \`float\` does not support **modulus operator**`,
                            node.pos, endPos(node)
                        ));
                        break;
                    }

                this.reportError(new _TypeError(
                    this.localet?.("NEA31", node.operator, typeToStr(leftType), typeToStr(rightType))
                    || `Operator \`${node.operator}\` cannot be applied to type \`${typeToStr(leftType)}\` and type \`${typeToStr(rightType)}\``,
                    node.pos, endPos(node)
                ));

                break;
            case '>':
            case '<':
            case '>=':
            case '<=':
            case '&':
            case '|':
                if (Type.isNumeric(leftType) && Type.isNumeric(rightType))
                    return {type: BaseType.INT};

                this.reportError(new _TypeError(
                    this.localet?.("NEA31", node.operator, typeToStr(leftType), typeToStr(rightType))
                    || `Operator \`${node.operator}\` cannot be applied to type \`${typeToStr(leftType)}\` and type \`${typeToStr(rightType)}\``,
                    node.pos, endPos(node)
                ));

                break;

            case '==':
            case '!=':
                if (leftType.type === rightType.type)
                    if (Type.isSomeObj(leftType, rightType) || Type.isSomeGenericType(leftType, rightType))
                        return {type: BaseType.BOOLEAN};

                return {type: BaseType.BOOLEAN};

            default:

                this.reportError(new _TypeError(
                    this.localet?.("NEA29", node.operator) || `Undefining **operator** \`${node.operator}\``,
                    node.pos, endPos(node)
                ));

                break;
        }

        return {type: BaseType.ERROR};
    }

    // 注意方向,覆盖时是后来的赋给原先的
    private assignResultWithCheck(node: Assignment | MemberAssign | Argument | ParameterDecl, targetType: Type, valueType: Type): Type {
        if ([targetType.type, valueType.type].some(t => t === BaseType.UNNEEDED || t === BaseType.TEMPLATE))
            this.reportError(new _TypeError(
                this.localet?.("NEA33") || "Cannot assign to a non-variable type",
                node.pos, endPos(node)
            ));

        if (Type.isSomeObj(targetType, valueType))
            return targetType;
        else if (Type.isSomeGenericType(targetType, valueType))
            return targetType;
        else if (targetType.type === valueType.type)
            return targetType;
        else {
            if (Type.isNumeric(targetType) && Type.isNumeric(valueType))
                return targetType;
            else if (targetType.type === BaseType.ANY || valueType.type === BaseType.ANY)
                if (targetType.type === BaseType.UNKNOW || valueType.type === BaseType.UNKNOW)  // 一个是未知类型，另一个是任意类型 => 任意类型
                    return {type: BaseType.ANY};
                else  // 一个是任意类型,另一个不明确 => 如果左边是任意类型或者未知类型，则返回右边类型，否则返回左边类型
                    return targetType.type === BaseType.ANY ? valueType : targetType;
            else if (targetType.type === BaseType.UNKNOW || valueType.type === BaseType.UNKNOW)
                return targetType.type === BaseType.UNKNOW ? valueType : targetType;
            else if (targetType.type === BaseType.OBJECT && valueType.type === BaseType.NIL)
                return targetType;
        }

        this.reportError(new _TypeError(`类型不匹配: ${targetType.name} = ${valueType.name}`, node.pos, endPos(node)));
        return {type: BaseType.ERROR};
    }

    private unrepeatedType(types: Type[]): Type[] {
        const set = new Set<string>();

        function genCompositeKey(type: Type): string {
            if (type instanceof ObjectType)
                return `${type.type}_${type.name}`;
            else if (type instanceof _GenericType)
                return `${type.type}_${type.name}_${type.params.map(p => genCompositeKey(p)).join('_')}`;
            else
                return String(type.type);
        }

        types = types.filter(type => {
            const compositeKey = genCompositeKey(type);

            if (set.has(compositeKey))
                return false;
            set.add(compositeKey);
            return true;
        });

        return types;
    }

    enterScope(start?: IPos): void;
    enterScope(scope?: Scope): void;
    enterScope(scope?: Scope, start?: IPos): void;
    enterScope(scopeOrScope?: Scope | IPos, start?: IPos): void {
        let scope: Scope;
        switch (arguments.length) {
            case 0:
                scope = new Scope(this.currentScope);
                break;
            case 1:
                if (scopeOrScope instanceof Scope)
                    scope = scopeOrScope;

                else {
                    scope = new Scope(this.currentScope);
                    scope.start = scopeOrScope;
                }
                break;
            case 2:
                scope = scopeOrScope as Scope;
                scope.start = start;
                break;
            default:
                throw new Error("Invalid arguments");
        }

        if (Analyser.deepCopy)
            scope = JSON.parse(JSON.stringify(scope));

        this.currentScope.children.push(scope);
        this.currentScope = scope;
    }

    exitScope(end?: IPos) {
        if (end)
            this.currentScope.end = end;

        if (this.currentScope.parent)
            this.currentScope = this.currentScope.parent;
    }

    reportError(err: NDFError) {
        this.errors.push(err);
    }
}

