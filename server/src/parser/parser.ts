// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

/**
 * @file parser.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/17 20:13
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { INVERSE_KEYWORDS, INVERSE_OPERATORS, Token, TokenCategory, TokenType } from "../lexer/token";
import { _SyntaxError, NDFError, ParseError } from "../expection";
import { BinaryOperator, IPos, Nullable, Optional, PartialLocalet } from "../types";
import { methodDebug, traceback } from "../debug";
import {
    Argument,
    Assignment,
    BinaryExpr,
    Bool,
    BuiltinType,
    Expression,
    Float,
    GenericType,
    GuidCall,
    Identifier,
    IndexAccess,
    Integer,
    Literal,
    MapDef,
    MemberAssign,
    Nil,
    ObjectCall,
    Pair,
    ParameterDecl,
    ParenthesisExpr,
    MemberAccess,
    Program,
    PropertyAssignExpr,
    Reference, Statement,
    Str,
    TemplateDef,
    TemplateParam,
    TernaryExpr,
    TypeConstructor,
    TypeRef,
    UnaryExpr,
    UnnamedObj,
    VectorDef, ErrorExpr, ASTWithBelong, Comment, CommenComment, LibImportComment, FileImportComment
} from "./ast";
import { enumToStr, isDigit, isHexDigit, isIdentifierChar } from "../utils";
import { Locale } from "../IDEHelper";


function parseDebug(obj: Parser, fnName: string, msg: string) {
    if (obj.debug && obj.current)
        console.log(`(Parser.${fnName}): ${obj.current.toString()} - ${msg}`);
}


function endPos(token: Token): IPos {
    return { line: token.pos.line, column: token.pos.column + token.value.length };
}


/**
 * @type _KWARGS
 * @property {boolean} [firstStop] 当遇到第一个令牌非预期是否立即停止解析
 * @property {boolean} [skipNewline] 当遇到换行符时是否跳过
 * @property {boolean} [debug] 是否输出调试信息
 * */
type _KWARGS = {
    /** 当遇到第一个令牌非预期是否立即停止解析 */
    firstStop?: boolean,
    /** 当遇到换行符时是否跳过 */
    skipNewline?: boolean,
    /** 是否输出调试信息 */
    debug?: boolean
};


/**
 * @class Parser
 * @summary 语法分析器
 * @classDesc 语法分析器，通过递归下降分析法解析Token序列，生成AST。
 * @see Token
 * @see Program
 * */
export class Parser {
    /**
     * @var idx
     * @summary 当前Token索引
     * @desc 当前Token索引，用于遍历Token序列。
     * @private
     * @remarks 一般情况下，不应该直接访问或修改此变量。
     * */
    private idx: number = 0;

    /**
     * @var _errors
     * @summary 错误列表
     * @desc 错误列表，用于存储解析过程中出现的错误。
     * @private
     * @see NDFError
     * */
    private _errors: NDFError[] = [];

    /**
     * @constructor
     * @param tokens Token序列
     * @param locale 语言环境
     * @param debug 是否输出调试信息
     * @param raise 是否抛出错误
     * @remarks `debug`参数和`raise`不能同时为`true`.
     * */
    constructor(private readonly tokens: Token[], private locale?: Locale, public debug: boolean = false, public raise: boolean = false) {
    }

    /**
     * @var current
     * @summary 当前Token
     * @desc 获取当前Token。
     * @returns {Nullable<Token>} 当前Token，如果当前索引超出Token序列长度，则返回`undefined`。
     * */
    get current(): Nullable<Token> {
        return this.tokens[this.idx];
    }

    /**
     * @var errors
     * @summary 错误列表
     * @desc 获取解析过程中出现的错误列表。
     * @returns {NDFError[]} 错误列表。
     * */
    get errors(): NDFError[] {
        return this._errors;
    }

    /**
     * @method localet
     * @summary 语言环境
     * @desc 获取语言环境。
     * @returns {Nullable<PartialLocalet>} 如果有语言环境，则返回语言环境的格式化方法，否则返回`undefined`。
     * @private
     * */
    private get localet(): Nullable<PartialLocalet> {
        return this.locale?.t.bind(this.locale, "parser");
    }

    /**
     * @method parse
     * @summary 解析Token序列
     * @desc 解析Token序列，生成AST。
     * @returns {Program} 解析结果，类型为`Program`。
     * @private
     * @see Program
     * */
    @methodDebug(parseDebug, "parse")
    @traceback(true)
    parse(): Program {
        const program = new Program(this.current?.pos || { line: 0, column: 0 });

        while (this.inScope()) {
            this.skip();

            const stmt = this.parseStatement();
            if (stmt)
                program.statements.push(stmt);
        }

        return program;
    }

    /**
     * @method parseStatement
     * @summary 解析语句
     * @desc 由{@link parse}调用，解析语句。
     * @returns {Nullable<Statement>} 解析结果，类型为`Statement`或`undefined`。
     * @throws {_SyntaxError} 如果解析过程中出现错误，则抛出此错误。
     * @private
     * @see Statement
     * */
    @methodDebug(parseDebug, "parse statement")
    @traceback()
    private parseStatement(): Nullable<Statement> {
        try {
            switch (this.current?.type) {
                case TokenType.KW_EXPORT:
                    if (this.peek() && this.peek()!.type === TokenType.IDENTIFIER)
                        return this.parseAssignment(TokenType.KW_EXPORT);

                    else
                        throw new _SyntaxError(
                            this.localet?.("NE2P2", enumToStr(TokenType, this.current!.type))
                            || `**Identifier** expected, but found \`${enumToStr(TokenType, this.current!.type)}\``,
                            this.current!.pos, endPos(this.advance()!)
                        );
                case TokenType.KW_PRIVATE:
                    if (this.peek() && this.peek()!.type === TokenType.IDENTIFIER)
                        return this.parseAssignment(TokenType.KW_PRIVATE);

                    else if (this.peek() && this.peek()!.type === TokenType.KW_TEMPLATE)
                        return this.parseTemplateDef(TokenType.KW_PRIVATE);

                    else
                        throw new _SyntaxError(
                            this.localet?.("NE2P2", enumToStr(TokenType, this.current!.type))
                            || `\`${enumToStr(TokenType, this.current!.type)}\` expected`,
                            this.current!.pos, endPos(this.advance()!)
                        );

                case TokenType.KW_PUBLIC:
                    if (this.peek() && this.peek()!.type === TokenType.IDENTIFIER)
                        return this.parseAssignment(TokenType.KW_PUBLIC);

                    else
                        throw new _SyntaxError(
                            this.localet?.("NE2P2", enumToStr(TokenType, this.current!.type))
                            || `**Identifier** expected, but found \`${enumToStr(TokenType, this.current!.type)}\``,
                            this.current!.pos, endPos(this.advance()!)
                        );

                case TokenType.KW_TEMPLATE:
                    return this.parseTemplateDef();

                case TokenType.KW_UNNAMED:
                    return this.parseUnnamedObj();

                case TokenType.IDENTIFIER:
                    return this.parseAssignment();

                case TokenType.COMMENT_LINE:
                case TokenType.COMMENT_BLOCK:
                    return this.parseComment();

                case TokenType.EOF:
                    return undefined;

                default:
                    throw new _SyntaxError(
                        this.localet?.("NE2P3", enumToStr(TokenType, this.current!.type))
                        || `Unexpected \`${enumToStr(TokenType, this.current!.type)}\``,
                        this.current!.pos, endPos(this.advance()!)
                    );
            }
        } catch (e) {
            this.syncStmtLevel();

            if (this.raise)
                throw e;

            this._errors.push(e instanceof NDFError ? e : new ParseError(
                    this.localet?.("NE2P4", (e as Error).message) || `Syntax analyzer internal error, error message: ${(e as Error).message}`,
                    this.current?.pos || (this.tokens.length ? this.tokens[this.tokens.length - 1].pos : {
                        line: 0,
                        column: 0
                    }),
                    this.current ? endPos(this.current) : (this.tokens.length ? this.tokens[this.tokens.length - 1].pos : {
                        line: 0,
                        column: 0
                    }))
            );
        }
    }

    /**
     * @method parseAssignment
     * @summary 解析赋值语句
     * @desc 由{@link parseStatement}调用，解析赋值语句。
     * @param {Optional<TokenType>} [modifier] 赋值语句的修饰符，如`export`或`private`。
     * @returns {Assignment} 解析结果，类型为`Assignment`。
     * @private
     * @see Assignment
     * */
    @methodDebug(parseDebug, "parse assignment")
    @traceback()
    private parseAssignment(modifier?: Optional<TokenType>): Assignment {
        const assignment = new Assignment(this.current!.pos);

        if (modifier && [TokenType.KW_EXPORT, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC].includes(modifier))
            assignment.modifier = INVERSE_KEYWORDS.get((assignment.marks.modifier = this.expect(modifier)).type)! as "export" | "private" | "public";

        assignment.name = this.parseIdentifier(assignment);

        assignment.marks.is = this.expect(TokenType.KW_IS);

        assignment.value = this.parseExpression();

        return assignment;
    }

    /**
     * @method parseTemplateDef
     * @summary 解析模板定义
     * @desc 由{@link parseStatement}调用，解析模板定义。
     * @param {Optional<TokenType>} [modifier] 模板定义的修饰符，如`private`。
     * @returns {TemplateDef} 解析结果，类型为`TemplateDef`。
     * @private
     * @see TemplateDef
     * */
    @methodDebug(parseDebug, "parse template def")
    @traceback()
    private parseTemplateDef(modifier?: Optional<TokenType>): TemplateDef {
        const templateDef = new TemplateDef(this.current!.pos);

        if (modifier)
            templateDef.modifier = (templateDef.marks.modifier = this.expect(modifier)).type === TokenType.KW_PRIVATE ? "private" : undefined;

        templateDef.marks.template = this.expect(TokenType.KW_TEMPLATE);

        templateDef.name = this.parseIdentifier(templateDef);

        templateDef.pos1Comments = this.extractComments();

        this.expect(TokenType.LBRACKET);

        templateDef.separatorComments1.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {  // 可留空参数
            const param = this.parseParameterDecl(templateDef);

            if (param)
                templateDef.params.push(param);

            templateDef.separatorComments1.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            templateDef.separatorComments1.push(this.extractComments());
        }

        this.expect(TokenType.RBRACKET);

        templateDef.pos2Comments = this.extractComments();

        templateDef.marks.is = this.expect(TokenType.KW_IS);

        templateDef.pos3Comments = this.extractComments();

        templateDef.extend = this.parseIdentifier();

        templateDef.pos4Comments = this.extractComments();

        this.expect(TokenType.LPAREN);

        templateDef.separatorComments2.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.RPAREN) {  // 可留空成员
            const member = this.parseMemberAssign(templateDef);

            if (member)
                templateDef.members.push(member);

            templateDef.separatorComments2.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RPAREN)
                break;

            templateDef.separatorComments2.push(this.extractComments());
        }

        this.expect(TokenType.RPAREN);

        return templateDef;
    }

    /**
     * @method parseUnnamedObj
     * @summary 解析匿名对象
     * @desc 由{@link parseStatement}调用，解析匿名对象。
     * @returns {UnnamedObj} 解析结果，类型为`UnnamedObj`。
     * @private
     * @see UnnamedObj
     * */
    @methodDebug(parseDebug, "parse unnamed obj")
    @traceback()
    private parseUnnamedObj(): UnnamedObj {
        const unnamedObj = new UnnamedObj(this.current!.pos);

        this.expect(TokenType.KW_UNNAMED);

        unnamedObj.blueprint = this.parseIdentifier();

        unnamedObj.pos1Comments = this.extractComments();

        this.expect(TokenType.LPAREN);

        unnamedObj.separatorComments.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.RPAREN) {
            const member = this.parseArgument(unnamedObj);

            if (member)
                unnamedObj.args.push(member);

            unnamedObj.separatorComments.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RPAREN)
                break;

            unnamedObj.separatorComments.push(this.extractComments());
        }

        this.expect(TokenType.RPAREN);

        return unnamedObj;
    }

    /**
     * @method parseComment
     * @summary 解析注释
     * @desc 由{@link parseStatement}调用，解析注释。
     * @returns {Comment} 解析结果，类型为`Comment`。
     * @private
     * @remarks 采用正则表达式并尝试解析,如果不符合规范则返回普通注释。
     * @see Comment
     * */
    @methodDebug(parseDebug, "parse comment")
    @traceback()
    private parseComment(): Comment {
        const comment = new CommenComment(this.current!.pos, this.current!.value);

        if (this.current!.value.startsWith("///")) {
            const text = this.current!.value.slice(3);

            const fileIptPattern = /^\s*from\s*(['"])(.*?)\1\s*import\s*([^,]+(?:,\s*[^,]+)*)/;
            const libIptPattern = /^\s*import\s*([^,]+(?:,\s*[^,]+)*)/;

            if (fileIptPattern.test(text)) {
                const [, quote, file, imports] = text.match(fileIptPattern)!;

                const fileIptComment = new FileImportComment(this.advance()!.pos);

                fileIptComment.path = file;
                fileIptComment.items = imports.split(",").map(item => item.trim()).filter(i => i.length);

                if (!fileIptComment.items.length)
                    return comment;

                return fileIptComment;
            }

            else if (libIptPattern.test(text)) {
                const [, imports] = text.match(libIptPattern)!;

                const libIptComment = new LibImportComment(this.advance()!.pos);

                libIptComment.items = imports.split(",").map(item => item.trim()).filter(i => i.length);

                if (!libIptComment.items.length)
                    return comment;

                return libIptComment;
            }
        }

        this.advance();

        return comment;
    }

    /**
     * @method parseParameterDecl
     * @summary 解析参数声明
     * @desc 由{@link parseTemplateDef}调用，解析参数声明。
     * @param {TemplateDef} belong 所属模板定义。
     * @returns {ParameterDecl} 解析结果，类型为`ParameterDecl`。
     * @private
     * @see ParameterDecl
     * */
    @methodDebug(parseDebug, "parse parameter decl")
    @traceback()
    private parseParameterDecl(belong: TemplateDef): ParameterDecl {
        const parameterDecl = new ParameterDecl(this.current!.pos, belong);

        parameterDecl.name = this.parseIdentifier(parameterDecl);

        if (this.inScope() && this.current?.type === TokenType.COLON) {
            this.advance();

            parameterDecl.annotation = this.parseTypeRef();
        }

        if (this.inScope() && this.current?.type === TokenType.ASSIGN) {
            this.advance();

            parameterDecl.default = this.parseExpression();
        }

        parameterDecl.pos1Comments = this.extractComments();

        return parameterDecl;
    }

    /**
     * @method parseMemberAssign
     * @summary 解析成员赋值
     * @desc 由{@link parseTemplateDef}调用，解析成员赋值。
     * @param {TemplateDef} belong 所属模板定义。
     * @returns {MemberAssign} 解析结果，类型为`MemberAssign`。
     * @private
     * @see MemberAssign
     * */
    @methodDebug(parseDebug, "parse member assign")
    @traceback()
    private parseMemberAssign(belong: TemplateDef): MemberAssign {
        this.skip();

        const memberAssign = new MemberAssign(this.current!.pos, belong);

        memberAssign.name = this.parseIdentifier(memberAssign);

        memberAssign.operator = (memberAssign.marks.operator = this.expect([TokenType.ASSIGN, TokenType.KW_IS])).type === TokenType.KW_IS ? "is" : "=";

        memberAssign.pos1Comments = this.extractComments();

        memberAssign.value = this.parseExpression();

        return memberAssign;
    }

    /**
     * @method parseTypeRef
     * @summary 解析类型引用
     * @desc 由{@link parseParameterDecl}或{@link parseMemberAssign}调用，解析类型引用。
     * @returns {TypeRef} 解析结果，类型为`TypeRef`。
     * @throws {_SyntaxError} 如果遇到非预期的Token，则抛出此错误。
     * @private
     * @see TypeRef
     * */
    @methodDebug(parseDebug, "parse type ref")
    @traceback()
    private parseTypeRef(): TypeRef {
        switch (this.current!.type) {
            case TokenType.KW_INT:
            case TokenType.KW_FLOAT:
            case TokenType.KW_BOOL:
            case TokenType.KW_STRING: {
                const builtinType = new BuiltinType(this.current!.pos);
                builtinType.name = INVERSE_KEYWORDS.get(this.advance()!.type)!;
                return builtinType;
            }
            case TokenType.KW_MAP: {
                return this.parseGenericType();
            }
            case TokenType.IDENTIFIER:
                if (this.peek() && this.peek()!.type === TokenType.LT)
                    return this.parseGenericType();
                else
                    return this.parseIdentifier();
            default:
                throw new _SyntaxError(
                    this.localet?.("NE2P5", enumToStr(TokenType, this.current!.type))
                    || `Unexpected **type** token \`${enumToStr(TokenType, this.current!.type)}\``,
                    this.current!.pos, endPos(this.advance()!)
                );
        }
    }

    /**
     * @method parseGenericType
     * @summary 解析泛型类型
     * @desc 由{@link parseTypeRef}调用，解析泛型类型。
     * @returns {GenericType} 解析结果，类型为`GenericType`。
     * @private
     * @see GenericType
     * */
    @methodDebug(parseDebug, "parse generic type")
    @traceback()
    private parseGenericType(): GenericType {
        const genericType = new GenericType(this.current!.pos);

        if (this.current!.type === TokenType.KW_MAP) {
            genericType.name = new Identifier(this.advance()!.pos);
            genericType.name.name = "Map";
        } else
            genericType.name = this.parseIdentifier();

        genericType.pos1Comments = this.extractComments();

        this.expect(TokenType.LT);

        genericType.separatorComments.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.GT) {  // 不可留空参数
            genericType.typeParams.push(this.parseTypeRef());

            genericType.separatorComments.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.GT)
                break;

            else
                this.expect(TokenType.COMMA);

            genericType.separatorComments.push(this.extractComments());
        }

        this.expect(TokenType.GT);

        return genericType;
    }

    // 开始消除左递归形式的表达式解析

    /**
     * @method parseExpression
     * @summary 解析表达式
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @throws {_SyntaxError} 如果解析过程中出现错误，则抛出此错误。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse expression")
    @traceback(true)
    private parseExpression(): Expression {
        try {
            return this.parseTernaryExpr();
        } catch (e) {
            this.syncExprLevel();

            if (this.raise)
                throw e;

            this._errors.push(e instanceof NDFError ? e : new ParseError(
                    this.localet?.("NE2P4", (e as Error).message)
                    || `Syntax analyzer internal error, error message: ${(e as Error).message}`,
                    this.current!.pos, endPos(this.current!)
                )
            );

            return new ErrorExpr(this.current!.pos);
        }
    }

    /**
     * @method parseTernaryExpr
     * @summary 解析三元表达式
     * @desc 由{@link parseExpression}调用，解析三元表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse ternary expr")
    @traceback()
    private parseTernaryExpr(): Expression {
        return this.parseLogicalOrExprWithTernary();
    }

    /**
     * @method parseLogicalOrExprWithTernary
     * @summary 解析逻辑或表达式（带三元表达式）
     * @desc 由{@link parseTernaryExpr}调用，解析逻辑或表达式（带三元表达式）。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse logical or expr with ternary")
    @traceback()
    private parseLogicalOrExprWithTernary(): Expression {
        const condition = this.parseLogicalOrExpr();

        this.skip();

        if (this.current?.type === TokenType.QUESTION)
            return this.parseFullTernary(condition);

        return condition;
    }

    /**
     * @method parseFullTernary
     * @summary 解析完整的三元表达式
     * @desc 由{@link parseLogicalOrExprWithTernary}调用，解析完整的三元表达式。
     * @param {Expression} condition 条件表达式。
     * @returns {TernaryExpr} 解析结果，类型为`TernaryExpr`。
     * @private
     * @see TernaryExpr
     * */
    @methodDebug(parseDebug, "parse full ternary")
    @traceback()
    private parseFullTernary(condition: Expression): TernaryExpr {
        const ternary = new TernaryExpr(this.current!.pos);
        ternary.condition = condition;

        ternary.pos1Comments = this.extractComments();

        this.expect(TokenType.QUESTION);

        ternary.pos2Comments = this.extractComments();

        ternary.trueExpr = this.parseExpression(); // 允许嵌套表达式

        ternary.pos3Comments = this.extractComments();

        this.expect(TokenType.COLON);

        ternary.pos4Comments = this.extractComments();

        ternary.falseExpr = this.parseTernaryExpr(); // 右结合性

        return ternary;
    }

    /**
     * @method parseLogicalOrExpr
     * @summary 解析逻辑或表达式
     * @desc 由{@link parseLogicalOrExprWithTernary}调用，解析逻辑或表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse logical or expr")
    @traceback()
    private parseLogicalOrExpr(): Expression {
        let expr: Expression = this.parseLogicalAndExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (this.inScope() && this.current?.type === TokenType.BIN_OR) {
            const binaryExpr = new BinaryExpr(this.current!.pos);

            this.advance();

            binaryExpr.pos1Comments = this.extractComments();

            const right = this.parseLogicalAndExpr();

            binaryExpr.left = expr;
            binaryExpr.operator = "|";
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    /**
     * @method parseLogicalAndExpr
     * @summary 解析逻辑与表达式
     * @desc 由{@link parseLogicalOrExpr}调用，解析逻辑与表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse logical and expr")
    @traceback()
    private parseLogicalAndExpr(): Expression {
        let expr: Expression = this.parseEqualityExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (this.inScope() && this.current?.type === TokenType.BIN_AND) {
            const binaryExpr = new BinaryExpr(this.current!.pos);

            this.advance();

            binaryExpr.pos1Comments = this.extractComments();

            const right = this.parseEqualityExpr();

            binaryExpr.left = expr;
            binaryExpr.operator = "&";
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    /**
     * @method parseEqualityExpr
     * @summary 解析相等表达式
     * @desc 由{@link parseLogicalAndExpr}调用，解析相等表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse equality expr")
    @traceback()
    private parseEqualityExpr(): Expression {
        let expr: Expression = this.parseRelationalExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (this.inScope() && this.current?.type === TokenType.EQ || this.current?.type === TokenType.NE) {
            const binaryExpr = new BinaryExpr(this.current!.pos);

            const operator = this.advance()?.type === TokenType.EQ ? "==" : "!=";

            binaryExpr.pos1Comments = this.extractComments();

            const right = this.parseRelationalExpr();

            binaryExpr.left = expr;
            binaryExpr.operator = operator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    /**
     * @method parseRelationalExpr
     * @summary 解析关系表达式
     * @desc 由{@link parseEqualityExpr}调用，解析关系表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse relational expr")
    @traceback()
    private parseRelationalExpr(): Expression {
        let expr: Expression = this.parseAdditiveExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (
            this.inScope()
            && this.current
            && [TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE].includes(this.current!.type)
            ) {
            const binaryExpr = new BinaryExpr(this.current.pos);

            const operator = INVERSE_OPERATORS.get(this.advance()!.type)!;

            binaryExpr.pos1Comments = this.extractComments();

            const right = this.parseAdditiveExpr();

            binaryExpr.left = expr;
            binaryExpr.operator = operator as BinaryOperator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    /**
     * @method parseAdditiveExpr
     * @summary 解析加法表达式
     * @desc 由{@link parseRelationalExpr}调用，解析加法表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse additive expr")
    @traceback()
    private parseAdditiveExpr(): Expression {
        let expr: Expression = this.parseMultiplicativeExpr();

        this.skip();

        while (this.inScope() && this.current && [TokenType.ADD, TokenType.SUB].includes(this.current!.type)) {
            const binaryExpr = new BinaryExpr(this.current.pos);

            const operator = this.advance()!.type === TokenType.ADD ? "+" : "-";

            binaryExpr.pos1Comments = this.extractComments();

            const right = this.parseMultiplicativeExpr();

            binaryExpr.left = expr;
            binaryExpr.operator = operator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    /**
     * @method parseMultiplicativeExpr
     * @summary 解析乘法表达式
     * @desc 由{@link parseAdditiveExpr}调用，解析乘法表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse multiplicative expr")
    @traceback()
    private parseMultiplicativeExpr(): Expression {
        let expr: Expression = this.parseUnaryExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (
            this.inScope()
            && this.current
            && [TokenType.MUL, TokenType.KW_DIV, TokenType.MOD].includes(this.current!.type)
            ) {
            const binaryExpr = new BinaryExpr(this.current.pos);

            const operator = INVERSE_OPERATORS.get(this.advance()!.type)!;

            binaryExpr.pos1Comments = this.extractComments();

            const right = this.parseUnaryExpr();

            binaryExpr.left = expr;
            binaryExpr.operator = operator as BinaryOperator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    /**
     * @method parseUnaryExpr
     * @summary 解析一元表达式
     * @desc 由{@link parseMultiplicativeExpr}调用，解析一元表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse unary expr")
    @traceback()
    private parseUnaryExpr(): Expression {
        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        if (this.inScope() && this.current?.type === TokenType.SUB || this.current?.type === TokenType.NOT) {
            const unaryExpr = new UnaryExpr(this.current!.pos);

            unaryExpr.operator = this.advance()!.type === TokenType.SUB ? "-" : "!";

            unaryExpr.operand = this.parseUnaryExpr();

            return unaryExpr;
        }

        return this.parsePostfixExpr();
    }

    /**
     * @method parsePostfixExpr
     * @summary 解析后缀表达式
     * @desc 由{@link parseUnaryExpr}调用，解析后缀表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse postfix expr")
    @traceback()
    private parsePostfixExpr(): Expression {
        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        let expr = this.parsePrimaryExpr();

        if (this.find(
            this.idx, this.tokens.length,
            [TokenType.LPAREN, TokenType.LBRACKET, TokenType.DIV],
            { firstStop: true, skipNewline: true }
        )) {
            this.skip();
            switch (this.current!.type) {
                case TokenType.LPAREN:
                    expr = this.parseObjectCall(expr);
                    break;
                case TokenType.LBRACKET:
                    expr = this.parseIndexAccess(expr);
                    break;
                case TokenType.DIV:
                    expr = this.parseMemberAccess(expr);
                    break;
                default:
                    return expr;
            }
        }

        return expr;
    }

    /**
     * @method parseObjectCall
     * @summary 解析对象调用
     * @desc 由{@link parsePostfixExpr}调用，解析对象调用。
     * @param {Expression} expr 对象表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse object call")
    @traceback()
    private parseObjectCall(expr: Expression): Expression {
        const objectCall = new ObjectCall(this.current!.pos);

        objectCall.blueprint = expr as Identifier;

        objectCall.pos1Comments = this.extractComments();

        this.expect(TokenType.LPAREN);

        objectCall.separatorComments.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.RPAREN) {
            const arg = this.parseArgument(objectCall);

            if (arg)
                objectCall.args.push(arg);

            objectCall.separatorComments.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RPAREN)
                break;

            objectCall.separatorComments.push(this.extractComments());
        }

        this.expect(TokenType.RPAREN);

        return objectCall;
    }

    /**
     * @method parseIndexAccess
     * @summary 解析索引访问
     * @desc 由{@link parsePostfixExpr}调用，解析索引访问。
     * @param {Expression} expr 索引表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse index access")
    @traceback()
    private parseIndexAccess(expr: Expression): Expression {
        const indexAccess = new IndexAccess(this.current!.pos);

        indexAccess.target = expr;

        this.expect(TokenType.LBRACKET);

        indexAccess.pos1Comments = this.extractComments();

        indexAccess.index = this.parseExpression();

        indexAccess.pos2Comments = this.extractComments();

        this.expect(TokenType.RBRACKET);

        return indexAccess;
    }

    /**
     * @method parseMemberAccess
     * @summary 解析成员访问
     * @desc 由{@link parsePostfixExpr}调用，解析成员访问。
     * @param {Expression} expr 成员表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse path access")
    @traceback()
    private parseMemberAccess(expr: Expression): Expression {
        const pathAccess = new MemberAccess(this.current!.pos);

        this.expect(TokenType.DIV);

        pathAccess.target = expr;
        pathAccess.property = this.parseIdentifier();

        return pathAccess;
    }

    /**
     * @method parsePrimaryExpr
     * @summary 解析基础表达式
     * @desc 由{@link parsePostfixExpr}调用，解析基础表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @throws {_SyntaxError} 如果遇到非预期的表达式，则抛出异常。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse primary expr")
    @traceback()
    private parsePrimaryExpr(): Expression {
        this.skip();
        switch (this.current!.type) {
            case TokenType.REFERENCE:
                return this.parseReference();

            case TokenType.LT:
                return this.parseTemplateParam();

            case TokenType.KW_MAP:
                return this.parseMapDef();

            case TokenType.LBRACKET:
                return this.parseVectorDef();

            case TokenType.LPAREN:
                if (this.isPairStart())
                    return this.parsePair();

                return this.parseParenthesisExpr();

            case TokenType.KW_PRIVATE:
                return this.parsePropertyAssignExpr(TokenType.KW_PRIVATE);

            case TokenType.IDENTIFIER:
                if (this.isGuidCallStart())
                    return this.parseGuidCall();

                else if (this.peek()?.type === TokenType.LPAREN)
                    return this.parseObjectCall(this.parseIdentifier());

                const expr = this.tryParseTypeConstructor();

                if (expr)
                    return expr;
                else if (this.peek()?.type === TokenType.KW_IS)
                    return this.parsePropertyAssignExpr();

                return this.parseIdentifier();

            default:
                if (this.current!.category === TokenCategory.LITERAL || this.current!.category === TokenCategory.KEYWORD)
                    return this.parseLiteral();

                throw new _SyntaxError(this.localet?.("NE2P6", enumToStr(TokenType, this.current!.type))
                    || `Unexpected **expression** starting token \`${enumToStr(TokenType, this.current!.type) + " " + this.current!.toString()}\``,
                    this.current!.pos, endPos(this.advance()!)
                );
        }
    }

    /**
     * @method parseReference
     * @summary 解析引用表达式
     * @desc 由{@link parsePrimaryExpr}调用，解析引用表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse reference")
    @traceback()
    private parseReference(): Expression {
        const reference = new Reference(this.current!.pos);

        reference.path = this.expect(TokenType.REFERENCE).value;

        return reference;
    }

    /**
     * @method parseTemplateParam
     * @summary 解析模板参数表达式
     * @desc 由{@link parsePrimaryExpr}调用，解析模板参数表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse template param")
    @traceback()
    private parseTemplateParam(): Expression {
        const templateParam = new TemplateParam(this.current!.pos);

        this.expect(TokenType.LT);

        templateParam.pos1Comments = this.extractComments();

        templateParam.name = this.parseIdentifier();

        templateParam.pos2Comments = this.extractComments();

        this.expect(TokenType.GT);

        return templateParam;
    }

    /**
     * @method parseMapDef
     * @summary 解析映射定义
     * @desc 由{@link parsePrimaryExpr}调用，解析映射定义。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse map def")
    @traceback()
    private parseMapDef(): Expression {
        const mapDef = new MapDef(this.current!.pos);

        this.expect(TokenType.KW_MAP);

        mapDef.pos1Comments = this.extractComments();

        this.expect(TokenType.LBRACKET);

        mapDef.separatorComments.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {
            const pair = this.parsePair();

            if (pair)
                mapDef.pairs.push(pair);

            mapDef.separatorComments.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            mapDef.separatorComments.push(this.extractComments());
        }

        this.expect(TokenType.RBRACKET);

        return mapDef;
    }

    /**
     * @method isPairStart
     * @summary 判断是否为键值对开始
     * @desc 由{@link parseMapDef}调用，判断是否为键值对开始。
     * @returns {boolean} 是否为键值对开始。
     * @private
     * */
    private isPairStart(): boolean {
        const saveIdx = this.idx; // 保存当前解析位置
        let isPair = false;

        try {
            this.advance(); // 跳过LPAREN
            this.parseExpression();
            if (this.current?.type === TokenType.COMMA) {
                isPair = true;
            }
        } catch (e) {
            // 忽略错误，不作为实际解析
        } finally {
            this.idx = saveIdx; // 必须回滚到检测前的位置
        }

        return isPair;
    }

    /**
     * @method parsePair
     * @summary 解析键值对
     * @desc 由{@link parseMapDef}调用，解析键值对。
     * @returns {Pair} 解析结果，类型为`Pair`。
     * @private
     * @see Pair
     * */
    @methodDebug(parseDebug, "parse pair")
    @traceback()
    private parsePair(): Pair {
        const pair = new Pair(this.current!.pos);

        this.expect(TokenType.LPAREN);

        pair.pos1Comments = this.extractComments();

        pair.key = this.parseExpression();

        pair.pos2Comments = this.extractComments();

        this.expect(TokenType.COMMA);

        pair.pos3Comments = this.extractComments();

        pair.value = this.parseExpression();

        pair.pos4Comments = this.extractComments();

        this.expect(TokenType.RPAREN);

        return pair;
    }

    /**
     * @method parseVectorDef
     * @summary 解析向量定义
     * @desc 由{@link parsePrimaryExpr}调用，解析向量定义。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse vector def")
    @traceback()
    private parseVectorDef(): Expression {
        const vectorDef = new VectorDef(this.current!.pos);

        this.expect(TokenType.LBRACKET);

        vectorDef.separatorComments.push(this.extractComments());

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {
            const element = this.parseExpression();

            if (element)
                vectorDef.elements.push(element);

            vectorDef.separatorComments.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            vectorDef.separatorComments.push(this.extractComments());
        }

        this.expect(TokenType.RBRACKET);

        return vectorDef;
    }

    /**
     * @method tryParseTypeConstructor
     * @summary 尝试解析类型构造器
     * @desc 由{@link parsePrimaryExpr}调用，尝试解析类型构造器。
     * @returns {Nullable<Expression>} 解析结果，类型为`Nullable<Expression>`。
     * */
    private tryParseTypeConstructor(): Nullable<Expression> {
        if (this.peek()?.type === TokenType.LBRACKET) {
            const typeName = this.parseIdentifier();

            this.advance(); // 吃掉 LBRACKET

            const comments = this.extractComments();

            return this.parseTypeConstructor(typeName, comments);
        }
    }

    /**
     * @method parseTypeConstructor
     * @summary 解析类型构造器
     * @desc 由{@link tryParseTypeConstructor}调用，解析类型构造器。
     * @param {Identifier} typeName 类型名称。
     * @param {Comment[]} comments 注释。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * */
    @methodDebug(parseDebug, "parse type initializer")
    @traceback()
    private parseTypeConstructor(typeName: Identifier, comments: Comment[]): Expression {
        const typeConstructor = new TypeConstructor(this.current!.pos);

        typeConstructor.name = typeName;

//        this.expect(TokenType);  // 在tryParseTypeInitializer中已经吃掉了LBRACKET

        typeConstructor.pos1Comments = comments;

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {
            typeConstructor.args.push(this.parseExpression());

            typeConstructor.separatorComments.push(this.extractComments());

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            typeConstructor.separatorComments.push(this.extractComments());
        }

        this.expect(TokenType.RBRACKET);

        return typeConstructor;
    }

    /**
     * @method parsePropertyAssignExpr
     * @summary 解析属性赋值表达式
     * @desc 由{@link parsePrimaryExpr}调用，解析属性赋值表达式。
     * @param {Optional<TokenType>} [modifier] 修饰符。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse property assign expr")
    @traceback()
    private parsePropertyAssignExpr(modifier?: Optional<TokenType>): Expression {
        const propertyAssignExpr = new PropertyAssignExpr(this.current!.pos);

        if (modifier)
            propertyAssignExpr.modifier = this.expect(modifier).type === TokenType.KW_PRIVATE ? "private" : undefined;

        propertyAssignExpr.name = this.parseIdentifier();

        this.expect(TokenType.KW_IS);

        propertyAssignExpr.value = this.parseExpression();

        return propertyAssignExpr;
    }

    /**
     * @method parseParenthesisExpr
     * @summary 解析括号表达式
     * @desc 由{@link parsePrimaryExpr}调用，解析括号表达式。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse parenthesis expr")
    @traceback()
    private parseParenthesisExpr(): Expression {
        const parenthesisExpr = new ParenthesisExpr(this.current!.pos);

        this.expect(TokenType.LPAREN);

        parenthesisExpr.pos1Comments = this.extractComments();

        parenthesisExpr.expr = this.parseExpression();

        parenthesisExpr.pos2Comments = this.extractComments();

        this.expect(TokenType.RPAREN);

        return parenthesisExpr;
    }

    /**
     * @method isGuidCallStart
     * @summary 判断是否为GUID调用开始
     * @desc 由{@link parsePrimaryExpr}调用，判断是否为GUID调用开始。
     * @returns {boolean} 是否为GUID调用开始。
     * */
    private isGuidCallStart(): boolean {
        if (this.current!.value.toLowerCase() !== "guid")
            return false;

        return this.peek()?.type === TokenType.COLON && this.peek(2)?.type === TokenType.LBRACE;
    }

    /**
     * @method parseGuidCall
     * @summary 解析GUID调用
     * @desc 由{@link parsePrimaryExpr}调用，解析GUID调用。
     * @returns {Expression} 解析结果，类型为`Expression`。
     * @throws {ParseError} 如果遇到非法的GUID格式，则抛出异常。
     * @private
     * @see Expression
     * */
    @methodDebug(parseDebug, "parse guid call")
    @traceback()
    private parseGuidCall(): Expression {
        const guidCall = new GuidCall(this.current!.pos);

        this.advance();

        this.expect(TokenType.COLON);

        this.expect(TokenType.LBRACE);

        guidCall.pos1Comments = this.extractComments();

        let idx: number = 0;
        const tmp: number[] = [8, 4, 4, 4, 12];
        let value: string = "";

        while (this.inScope()) {
            // @ts-ignore
            if ((this.current?.type === TokenType.SUB) || (this.current?.type === TokenType.RBRACE)) {
                if (value.length !== tmp[idx] || Array.from(value).some(c => !isHexDigit(c)))
                    throw new ParseError(
                        this.localet?.("NE2P7", this.current!.value)
                        || `Invalid **GUID** format, '${this.current!.value}' is not a valid hexadecimal character`,
                        this.current!.pos, endPos(this.advance()!)
                    );

                guidCall.uuid += value + (this.current.type === TokenType.SUB ? "-" : "");

                // @ts-ignore
                if (this.current.type === TokenType.RBRACE)
                    break;

                this.advance();
                idx++;
                value = "";
            } else {
                value += this.current!.value;
                this.advance();
            }
        }

        guidCall.pos2Comments = this.extractComments();

        this.expect(TokenType.RBRACE);

        return guidCall;
    }

    /**
     * @method parseIdentifier
     * @summary 解析标识符
     * @desc 由{@link parsePrimaryExpr}调用，解析标识符。
     * @param {ASTWithBelong} [belong] 所属语法节点。
     * @returns {Identifier} 解析结果，类型为`Identifier`。
     * @private
     * @see Identifier
     * */
    @methodDebug(parseDebug, "parse identifier")
    @traceback()
    private parseIdentifier(belong?: ASTWithBelong): Identifier {
        const identifier = new Identifier(this.current!.pos, belong);

        identifier.name = this.expect(TokenType.IDENTIFIER).value;

        return identifier;
    }

    /**
     * @method parseArgument
     * @summary 解析参数
     * @desc 由{@link parseObjectCall}调用，解析参数。
     * @param {ObjectCall | UnnamedObj} belong 所属语法节点。
     * @returns {Argument} 解析结果，类型为`Argument`。
     * @throws {ParseError} 如果参数语法错误，则抛出异常。
     * @private
     * @see Argument
     * */
    @methodDebug(parseDebug, "parse argument")
    @traceback()
    private parseArgument(belong: ObjectCall | UnnamedObj): Argument {
        let haveOne: boolean = false;  // 至少进行类型注解或赋值其中一项
        const argument = new Argument(this.current!.pos, belong);

        if (this.inScope() && [TokenType.KW_PUBLIC, TokenType.KW_EXPORT].includes(this.current!.type))
            argument.modifier = this.advance()!.type === TokenType.KW_EXPORT ? "export" : "public";

        argument.name = this.parseIdentifier(argument);

        if (this.inScope() && this.current?.type === TokenType.COLON) {
            this.advance();

            argument.annotation = this.parseTypeRef();
            haveOne = true;
        }

        if (this.inScope() && this.current && [TokenType.ASSIGN, TokenType.KW_IS].includes(this.current.type)) {
            argument.operator = this.current?.type === TokenType.ASSIGN ? "=" : "is";

            this.advance();

            argument.pos1Comments = this.extractComments();

            argument.value = this.parseExpression();

            haveOne = true;
        }

        if (!haveOne)
            throw new ParseError(
                this.localet?.("NE2P8")
                || "**Object member** requires either a **type annotation** or a **value**",
                this.current!.pos, endPos(this.advance()!)
            );

        return argument;
    }

    /**
     * @method parseLiteral
     * @summary 解析字面量
     * @desc 由{@link parsePrimaryExpr}调用，解析字面量。
     * @returns {Literal} 解析结果，类型为`Literal`。
     * @throws {_SyntaxError} 如果遇到非预期的字面量，则抛出异常。
     * @private
     * @see Literal
     * */
    @methodDebug(parseDebug, "parse literal")
    @traceback()
    private parseLiteral(): Literal {
        switch (this.current!.type) {
            case TokenType.INT:
                return new Integer(this.current!.pos, this.advance()!.value);

            case TokenType.FLOAT:
                return new Float(this.current!.pos, this.advance()!.value);

            case TokenType.STRING:
                return new Str(this.current!.pos, this.advance()!.value);

            case TokenType.KW_TRUE:
            case TokenType.KW_FALSE:
                return new Bool(this.current!.pos, this.advance()!.value);

            case TokenType.KW_NIL:
                return new Nil(this.advance()!.pos);

            default:
                throw new _SyntaxError(
                    this.localet?.("NE2P9", enumToStr(TokenType, this.current!.type))
                    || `Unexpected **literal** token \`${enumToStr(TokenType, this.current!.type)}\``
                    , this.current!.pos, endPos(this.advance()!)
                );
        }
    }

    /**
     * @method inScope
     * @summary 当前位置是否在有效范围内
     * @desc 当{@link idx}在令牌序列范围内，且当前令牌不为EOF时，返回true。
     * @returns {boolean} 是否在有效范围内。
     * @private
     * */
    private inScope(): boolean {
        return this.idx < this.tokens.length && this.current?.type !== TokenType.EOF;
    }

    /**
     * @method skip
     * @summary 跳过空白符
     * @desc 跳过当前位置的空白符，包括空格、制表符、换行符。
     * @private
     * */
    private skip() {
        while (this.inScope() && this.current?.type === TokenType.NEWLINE)
            this.idx++;
    }

    /**
     * @method peek
     * @summary 预读下一个令牌
     * @desc 预读下一个令牌，不移动当前位置。
     * @param {number} [n=1] 预读的数量。
     * @returns {Nullable<Token>} 预读的令牌，如果没有更多令牌，返回`undefined`。
     * @private
     * */
    private peek(n: number = 1): Nullable<Token> {
        return this.tokens[this.idx + n];
    }

    /**
     * @method advance
     * @summary 移动当前位置
     * @desc 移动当前位置到下一个令牌，并返回当前令牌。
     * @param {number} [n=1] 移动的数量。
     * @returns {Nullable<Token>} 当前令牌，如果没有更多令牌，返回`undefined`。
     * @private
     * */
    private advance(n: number = 1): Nullable<Token> {
        const tk = this.current;
        this.idx += n;
        return tk;
    }

    /**
     * @method expect
     * @summary 期望下一个令牌
     * @desc 期望下一个令牌的类型，如果类型匹配，移动当前位置并返回当前令牌。
     * @param {TokenType | TokenType[]} types 期望的令牌类型。
     * @param {boolean} [skipNewline=false] 是否跳过空白符。
     * @returns {Token} 当前令牌。
     * @private
     * @throws {_SyntaxError} 如果期望的令牌类型不匹配，抛出语法错误。
     * */
    private expect(types: TokenType[], skipNewline?: boolean): Token;
    private expect(type: TokenType, skipNewline?: boolean): Token;
    private expect(typeOrTypes: TokenType | TokenType[], skipNewline: boolean = false): Token {
        if (skipNewline && (Array.isArray(typeOrTypes)
            ? !typeOrTypes.includes(TokenType.NEWLINE)
            : typeOrTypes !== TokenType.NEWLINE))
            this.skip();

        if (this.inScope() && this.current && (Array.isArray(typeOrTypes)
            ? typeOrTypes.includes(this.current!.type)
            : this.current?.type === typeOrTypes))
            return this.advance()!;

        const expect = Array.isArray(typeOrTypes)
            ? typeOrTypes.map(t => enumToStr(TokenType, t)).join("|")
            : enumToStr(TokenType, typeOrTypes);

        throw new _SyntaxError(
            this.localet?.("NE2P10", expect, enumToStr(TokenType, this.current?.type || TokenType.ERROR))
            || `\`${expect}\` expected, but found \`${enumToStr(TokenType, this.current?.type || TokenType.ERROR)}\``,
            this.current?.pos || { line: 0, column: 0 }, endPos(this.advance()!)
        );
    }

    /**
     * @method find
     * @summary 查找令牌
     * @desc 查找从当前位置到指定位置的令牌，返回第一个匹配的令牌。
     * @param {number} _start 开始位置。
     * @param {number} _end 结束位置。
     * @param {TokenType | TokenType[]} type 要查找的令牌类型。
     * @param {_KWARGS} [kwargs] 其他参数。
     * @returns {boolean} 是否找到。
     * @private
     * @see _KWARGS
     * */
    private find(_start: number, _end: number, type: TokenType, kwargs?: _KWARGS): boolean;
    private find(_start: number, _end: number, types: TokenType[], kwargs?: _KWARGS): boolean;
    private find(
        _start: number,
        _end: number,
        typeOrTypes: TokenType | TokenType[],
        kwargs?: _KWARGS
    ): boolean {
        kwargs = Object.assign({ firstStop: false, skipNewline: true, debug: false }, kwargs);

        for (let i = _start; i < _end; i++) {
            if (kwargs.debug) console.log(`check: ${this.tokens[i]}`);

            if (Array.isArray(typeOrTypes)
                ? typeOrTypes.includes(this.tokens[i].type)
                : this.tokens[i].type === typeOrTypes)
                return true;

            else if (kwargs.skipNewline
                && (Array.isArray(typeOrTypes)
                    ? !typeOrTypes.includes(TokenType.NEWLINE)
                    : typeOrTypes !== TokenType.NEWLINE)
                && this.tokens[i].type === TokenType.NEWLINE)
                continue;

            else if (kwargs.firstStop) return false;
        }

        return false;
    }

    /**
     * @method extractComments
     * @summary 提取注释
     * @desc 提取从当前位置到下一个令牌之间的注释，并返回注释列表。
     * @returns {Comment[]} 注释列表。
     * @private
     * */
    private extractComments(): Comment[] {
        const comments: Comment[] = [];

        this.skip();

        while (this.inScope() && this.current?.category === TokenCategory.COMMENT) {
            const comment = new CommenComment(this.current!.pos, this.current!.value);
            comments.push(comment);

            this.advance();

            this.skip();
        }

        return comments;
    }

    /**
     * @method syncStmtLevel
     * @summary 同步语句级别
     * @desc 同步语句级别，直到遇到语句结束符或语句级别结束符。
     * @private
     * */
    private syncStmtLevel() {
        while (this.inScope()) {
            if ([
                TokenType.KW_EXPORT,
                TokenType.KW_TEMPLATE,
                TokenType.KW_UNNAMED,
                TokenType.IDENTIFIER
            ].includes(this.current!.type)) {
                break;
            }
            this.advance();
        }
    }

    /**
     * @method syncExprLevel
     * @summary 同步表达式级别
     * @desc 同步表达式级别，直到遇到表达式结束符或表达式级别结束符。
     * @private
     * */
    private syncExprLevel() {
        while (this.inScope()) {
            if ([
                TokenType.COMMA,
                TokenType.RBRACKET,
                TokenType.RPAREN,
                TokenType.NEWLINE
            ].includes(this.current!.type))
                break;

            this.advance();
        }
    }

    /**
     * @method reportError
     * @summary 报告错误
     * @desc 报告错误，并记录到错误列表。
     * @param {string} msg 错误信息。
     * @param {IPos} start 错误开始位置。
     * @param {IPos} end 错误结束位置。
     * @private
     * @see IPos
     * */
    private reportError(msg: string, start: IPos, end: IPos) {
        this._errors.push(new ParseError(msg, start, end));
    }
}
