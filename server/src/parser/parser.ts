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
    TypeInitializer,
    TypeRef,
    UnaryExpr,
    UnnamedObj,
    VectorDef, ErrorExpr, ASTWithBelong
} from "./ast";
import { enumToStr, isHexDigit } from "../utils";
import { Locale } from "../IDEHelper";


function parseDebug(obj: Parser, fnName: string, msg: string) {
    if (obj.debug && obj.current)
        console.log(`(Parser.${fnName}): ${obj.current.toString()} - ${msg}`);
}


function endPos(token: Token): IPos {
    return { line: token.pos.line, column: token.pos.column + token.value.length };
}


type _KWARGS = { firstStop?: boolean, skipNewline?: boolean, debug?: boolean };


export class Parser {
    // 分隔符为换行符则子元素解析最后要skip,否则不能。
    // 分隔符为换行符则while解析最后不能skip,否则需要。
    // 可为空的容器在while前需要一次skip
    private idx: number = 0;
    private _errors: NDFError[] = [];

//    get idx(): number {
//        return this._idx;
//    }
//
//    set idx(value: number) {
//        process.stdout.write(`set idx: ${value} now token: ${this.current?.toString()}, caller: `)
//        try {
//            throw new Error("set idx")
//        }
//        catch (e) {
//            const stack = regexStack((e as Error).stack);
//            console.log(stack.stack.map(s => s.func));
//        }
//        this._idx = value;
//    }

    constructor(private readonly tokens: Token[], private locale?: Locale, public debug: boolean = false, public raise: boolean = false) {
    }

    get current(): Nullable<Token> {
        return this.tokens[this.idx];
    }

    get errors(): NDFError[] {
        return this._errors;
    }

    private get localet(): Nullable<PartialLocalet> {
        return this.locale?.t.bind(this.locale, "parser");
    }

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

                case TokenType.KW_TEMPLATE:
                    return this.parseTemplateDef();

                case TokenType.KW_UNNAMED:
                    return this.parseUnnamedObj();

                case TokenType.IDENTIFIER:
                    return this.parseAssignment();

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
                this.localet?.("NE2P4") || `Syntax analyzer internal error, error message: ${(e as Error).message}`,
                this.current!.pos, endPos(this.current!))
            );
        }
    }

    @methodDebug(parseDebug, "parse assignment")
    @traceback()
    private parseAssignment(modifier?: Optional<TokenType>): Assignment {
        const assignment = new Assignment(this.current!.pos);

        if (modifier)
            assignment.modifier = this.expect(modifier).type === TokenType.KW_EXPORT ? "export" : "private";

        assignment.name = this.parseIdentifier(assignment);

        this.expect(TokenType.KW_IS);

        assignment.value = this.parseExpression();

        return assignment;
    }

    @methodDebug(parseDebug, "parse template def")
    @traceback()
    private parseTemplateDef(modifier?: Optional<TokenType>): TemplateDef {
        const templateDef = new TemplateDef(this.current!.pos);

        if (modifier)
            templateDef.modifier = this.expect(modifier).type === TokenType.KW_PRIVATE ? "private" : undefined;

        this.expect(TokenType.KW_TEMPLATE);

        templateDef.name = this.parseIdentifier(templateDef);

        this.skip();

        this.expect(TokenType.LBRACKET);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {  // 可留空参数
            const param = this.parseParameterDecl(templateDef);

            if (param)
                templateDef.params.push(param);

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            this.skip();
        }

        this.expect(TokenType.RBRACKET);

        this.skip();

        this.expect(TokenType.KW_IS);

        templateDef.extend = this.parseIdentifier();

        this.skip();

        this.expect(TokenType.LPAREN);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.RPAREN) {  // 可留空成员
            const member = this.parseMemberAssign(templateDef);

            if (member)
                templateDef.members.push(member);

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RPAREN)
                break;

            this.skip();
        }

        this.expect(TokenType.RPAREN);

        return templateDef;
    }

    @methodDebug(parseDebug, "parse unnamed obj")
    @traceback()
    private parseUnnamedObj(): UnnamedObj {
        const unnamedObj = new UnnamedObj(this.current!.pos);

        this.expect(TokenType.KW_UNNAMED);

        unnamedObj.blueprint = this.parseIdentifier();

        this.skip();

        this.expect(TokenType.LPAREN);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.RPAREN) {
            const member = this.parseArgument(unnamedObj);

            if (member)
                unnamedObj.args.push(member);

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RPAREN)
                break;

            this.skip();
        }

        this.expect(TokenType.RPAREN);

        return unnamedObj;
    }

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

        this.skip();

        return parameterDecl;
    }

    @methodDebug(parseDebug, "parse member assign")
    @traceback()
    private parseMemberAssign(belong: TemplateDef): MemberAssign {
        this.skip();

        const memberAssign = new MemberAssign(this.current!.pos, belong);

        memberAssign.name = this.parseIdentifier(memberAssign);

        memberAssign.operator = this.expect([TokenType.ASSIGN, TokenType.KW_IS]).type === TokenType.KW_IS ? "is" : "=";

        memberAssign.value = this.parseExpression();

        return memberAssign;
    }

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

    @methodDebug(parseDebug, "parse generic type")
    @traceback()
    private parseGenericType(): GenericType {
        const genericType = new GenericType(this.current!.pos);

        if (this.current!.type === TokenType.KW_MAP) {
            genericType.name = new Identifier(this.advance()!.pos);
            genericType.name.name = "Map";
        } else
            genericType.name = this.parseIdentifier();

        this.skip();

        this.expect(TokenType.LT);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.GT) {  // 不可留空参数
            genericType.typeParams.push(this.parseTypeRef());

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.GT)
                break;

            else
                this.expect(TokenType.COMMA);

            this.skip();
        }

        this.expect(TokenType.GT);

        return genericType;
    }

    // 开始消除左递归形式的表达式解析

    @methodDebug(parseDebug, "parse expression")
    @traceback(true)
    private parseExpression(): Expression {
        try {
            return this.parseTernaryExpr();
        } catch (e) {
            this.syncExprLevel();

            if (this.raise)
                throw e;

            this._errors.push( e instanceof NDFError ? e : new ParseError(
                this.localet?.("NE2P4", (e as Error).message)
                || `Syntax analyzer internal error, error message: ${(e as Error).message}`,
                this.current!.pos, endPos(this.current!)
                )
            );

            return new ErrorExpr(this.current!.pos);
        }
    }

    @methodDebug(parseDebug, "parse ternary expr")
    @traceback()
    private parseTernaryExpr(): Expression {
        return this.parseLogicalOrExprWithTernary();
    }

    @methodDebug(parseDebug, "parse logical or expr with ternary")
    private parseLogicalOrExprWithTernary(): Expression {
        const condition = this.parseLogicalOrExpr();

        this.skip();

        if (this.current?.type === TokenType.QUESTION)
            return this.parseFullTernary(condition);

        return condition;
    }

    @methodDebug(parseDebug, "parse full ternary")
    @traceback()
    private parseFullTernary(condition: Expression): TernaryExpr {
        const ternary = new TernaryExpr(this.current!.pos);
        ternary.condition = condition;

        this.skip();

        this.expect(TokenType.QUESTION);

        this.skip();

        ternary.trueExpr = this.parseExpression(); // 允许嵌套表达式

        this.skip();

        this.expect(TokenType.COLON);

        this.skip();

        ternary.falseExpr = this.parseTernaryExpr(); // 右结合性

        return ternary;
    }

    @methodDebug(parseDebug, "parse logical or expr")
    @traceback()
    private parseLogicalOrExpr(): Expression {
        let expr: Expression = this.parseLogicalAndExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (this.inScope() && this.current?.type === TokenType.BIN_OR) {
            const pos = this.current!.pos;

            this.advance();

            this.skip();

            const right = this.parseLogicalAndExpr();

            const binaryExpr = new BinaryExpr(pos);

            binaryExpr.left = expr;
            binaryExpr.operator = "|";
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    @methodDebug(parseDebug, "parse logical and expr")
    @traceback()
    private parseLogicalAndExpr(): Expression {
        let expr: Expression = this.parseEqualityExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (this.inScope() && this.current?.type === TokenType.BIN_AND) {
            const pos = this.current!.pos;

            this.advance();

            this.skip();

            const right = this.parseEqualityExpr();

            const binaryExpr = new BinaryExpr(pos);

            binaryExpr.left = expr;
            binaryExpr.operator = "&";
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    @methodDebug(parseDebug, "parse equality expr")
    @traceback()
    private parseEqualityExpr(): Expression {
        let expr: Expression = this.parseRelationalExpr();

        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        while (this.inScope() && this.current?.type === TokenType.EQ || this.current?.type === TokenType.NE) {
            const pos = this.current!.pos;

            const operator = this.advance()?.type === TokenType.EQ ? "==" : "!=";

            this.skip();

            const right = this.parseRelationalExpr();

            const binaryExpr = new BinaryExpr(pos);

            binaryExpr.left = expr;
            binaryExpr.operator = operator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

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
            const pos = this.current.pos;

            const operator = INVERSE_OPERATORS.get(this.advance()!.type)!;

            this.skip();

            const right = this.parseAdditiveExpr();

            const binaryExpr = new BinaryExpr(pos);

            binaryExpr.left = expr;
            binaryExpr.operator = operator as BinaryOperator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    @methodDebug(parseDebug, "parse additive expr")
    @traceback()
    private parseAdditiveExpr(): Expression {
        let expr: Expression = this.parseMultiplicativeExpr();

        this.skip();

        while (this.inScope() && this.current && [TokenType.ADD, TokenType.SUB].includes(this.current!.type)) {
            const pos = this.current.pos;

            const operator = this.advance()!.type === TokenType.ADD ? "+" : "-";

            this.skip();

            const right = this.parseMultiplicativeExpr();

            const binaryExpr = new BinaryExpr(pos);

            binaryExpr.left = expr;
            binaryExpr.operator = operator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

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
            const pos = this.current.pos;

            const operator = INVERSE_OPERATORS.get(this.advance()!.type)!;

            this.skip();

            const right = this.parseUnaryExpr();

            const binaryExpr = new BinaryExpr(pos);

            binaryExpr.left = expr;
            binaryExpr.operator = operator as BinaryOperator;
            binaryExpr.right = right;

            expr = binaryExpr;
        }

        return expr;
    }

    @methodDebug(parseDebug, "parse unary expr")
    @traceback()
    private parseUnaryExpr(): Expression {
        // this.skip();  // while将会处理,且上级表达式已skip,无需skip

        if (this.inScope() && this.current?.type === TokenType.SUB || this.current?.type === TokenType.NOT) {
            const unaryExpr = new UnaryExpr(this.current!.pos);

            unaryExpr.operator = this.advance()!.type === TokenType.SUB ? "-" : "!";

            this.skip();

            unaryExpr.operand = this.parseUnaryExpr();

            return unaryExpr;
        }

        return this.parsePostfixExpr();
    }

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
                    expr = this.parsePathAccess(expr);
                    break;
                default:
                    return expr;
            }
        }

        return expr;
    }

    @methodDebug(parseDebug, "parse object call")
    @traceback()
    private parseObjectCall(expr: Expression): Expression {
        const objectCall = new ObjectCall(this.current!.pos);

        objectCall.blueprint = expr as Identifier;

        this.expect(TokenType.LPAREN);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.RPAREN) {
            const arg = this.parseArgument(objectCall);

            if (arg)
                objectCall.args.push(arg);

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RPAREN)
                break;

            this.skip();
        }

        this.expect(TokenType.RPAREN);

        return objectCall;
    }

    @methodDebug(parseDebug, "parse index access")
    @traceback()
    private parseIndexAccess(expr: Expression): Expression {
        const indexAccess = new IndexAccess(this.current!.pos);

        indexAccess.target = expr;

        this.expect(TokenType.LBRACKET);

        this.skip();

        indexAccess.index = this.parseExpression();

        this.skip();

        this.expect(TokenType.RBRACKET);

        return indexAccess;
    }

    @methodDebug(parseDebug, "parse path access")
    @traceback()
    private parsePathAccess(expr: Expression): Expression {
        const pathAccess = new MemberAccess(this.current!.pos);

        this.expect(TokenType.DIV);

        this.skip();

        pathAccess.target = expr;
        pathAccess.property = this.parseIdentifier();

        return pathAccess;
    }

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

                return this.tryParseTypeInitializer() || this.parseIdentifier();

            default:
                if (this.current!.category === TokenCategory.LITERAL || this.current!.category === TokenCategory.KEYWORD)
                    return this.parseLiteral();

                throw new _SyntaxError(this.localet?.("NE2P6", enumToStr(TokenType, this.current!.type))
                    || `Unexpected **expression** starting token \`${enumToStr(TokenType, this.current!.type)}\``,
                    this.current!.pos, endPos(this.advance()!)
                );
        }
    }

    @methodDebug(parseDebug, "parse reference")
    @traceback()
    private parseReference(): Expression {
        const reference = new Reference(this.current!.pos);

        reference.path = this.expect(TokenType.REFERENCE).value;

        return reference;
    }

    @methodDebug(parseDebug, "parse template param")
    @traceback()
    private parseTemplateParam(): Expression {
        const templateParam = new TemplateParam(this.current!.pos);

        this.expect(TokenType.LT);

        this.skip();

        templateParam.name = this.parseIdentifier();

        this.skip();

        this.expect(TokenType.GT);

        return templateParam;
    }

    @methodDebug(parseDebug, "parse map def")
    @traceback()
    private parseMapDef(): Expression {
        const mapDef = new MapDef(this.current!.pos);

        this.expect(TokenType.KW_MAP);

        this.skip();

        this.expect(TokenType.LBRACKET);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {
            const pair = this.parsePair();

            if (pair)
                mapDef.pairs.push(pair);

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            this.skip();
        }

        this.expect(TokenType.RBRACKET);

        return mapDef;
    }

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

    @methodDebug(parseDebug, "parse pair")
    @traceback()
    private parsePair(): Pair {
        const pair = new Pair(this.current!.pos);

        this.expect(TokenType.LPAREN);

        this.skip();

        pair.key = this.parseExpression();

        this.skip();

        this.expect(TokenType.COMMA);

        this.skip();

        pair.value = this.parseExpression();

        this.skip();

        this.expect(TokenType.RPAREN);

        return pair;
    }

    @methodDebug(parseDebug, "parse vector def")
    @traceback()
    private parseVectorDef(): Expression {
        const vectorDef = new VectorDef(this.current!.pos);

        this.expect(TokenType.LBRACKET);

        this.skip();

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {
            const element = this.parseExpression();

            if (element)
                vectorDef.elements.push(element);

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            this.skip();
        }

        this.expect(TokenType.RBRACKET);

        return vectorDef;
    }

    private tryParseTypeInitializer(): Nullable<Expression> {
        if (this.peek()?.type === TokenType.LBRACKET) {
            const typeName = this.parseIdentifier();

            this.advance(); // 吃掉 LBRACKET

            this.skip();

            return this.parseTypeInitializer(typeName);
        }
    }

    @methodDebug(parseDebug, "parse type initializer")
    @traceback()
    private parseTypeInitializer(typeName: Identifier): Expression {
        const typeInitializer = new TypeInitializer(this.current!.pos);

        typeInitializer.name = typeName;

//        this.expect(TokenType);  // 在tryParseTypeInitializer中已经吃掉了LBRACKET

        while (this.inScope() && this.current?.type !== TokenType.RBRACKET) {
            typeInitializer.args.push(this.parseExpression());

            this.skip();

            // @ts-ignore
            if (this.current?.type === TokenType.RBRACKET)
                break;

            else
                this.expect(TokenType.COMMA);

            this.skip();
        }

        this.expect(TokenType.RBRACKET);

        return typeInitializer;
    }

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

    @methodDebug(parseDebug, "parse parenthesis expr")
    @traceback()
    private parseParenthesisExpr(): Expression {
        const parenthesisExpr = new ParenthesisExpr(this.current!.pos);

        this.expect(TokenType.LPAREN);

        this.skip();

        parenthesisExpr.expr = this.parseExpression();

        this.skip();

        this.expect(TokenType.RPAREN);

        return parenthesisExpr;
    }

    private isGuidCallStart(): boolean {
        if (this.current!.value.toLowerCase() !== "guid")
            return false;

        return this.peek()?.type === TokenType.COLON && this.peek(2)?.type === TokenType.LBRACE;
    }

    @methodDebug(parseDebug, "parse guid call")
    @traceback()
    private parseGuidCall(): Expression {
        const guidCall = new GuidCall(this.current!.pos);

        this.advance();

        this.expect(TokenType.COLON);

        this.expect(TokenType.LBRACE);

        this.skip();

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

        this.skip();

        this.expect(TokenType.RBRACE);

        return guidCall;
    }

    @methodDebug(parseDebug, "parse identifier")
    @traceback()
    private parseIdentifier(belong?: ASTWithBelong): Identifier {
        const identifier = new Identifier(this.current!.pos, belong);

        identifier.name = this.expect(TokenType.IDENTIFIER).value;

        return identifier;
    }

    @methodDebug(parseDebug, "parse argument")
    @traceback()
    private parseArgument(belong: ObjectCall | UnnamedObj): Argument {
        let haveOne: boolean = false;
        const argument = new Argument(this.current!.pos, belong);

        if (this.inScope() && this.current?.type === TokenType.KW_EXPORT)
            argument.modifier = this.advance()!.type === TokenType.KW_EXPORT ? "export" : undefined;

        argument.name = this.parseIdentifier(argument);

        if (this.inScope() && this.current?.type === TokenType.COLON) {
            this.advance();

            argument.annotation = this.parseTypeRef();
            haveOne = true;
        }

        if (this.inScope() && this.current && [TokenType.ASSIGN, TokenType.KW_IS].includes(this.current.type)) {
            argument.operator = this.current?.type === TokenType.ASSIGN ? "=" : "is";

            this.advance();

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

    private inScope(): boolean {
        return this.idx < this.tokens.length && this.current?.type !== TokenType.EOF;
    }

    private skip() {
        while (this.inScope()
        && (
            this.current?.type === TokenType.NEWLINE
            || this.current?.category === TokenCategory.COMMENT)
        )
            this.idx++;
    }

    private peek(n: number = 1): Nullable<Token> {
        return this.tokens[this.idx + n];
    }

    private advance(n: number = 1): Nullable<Token> {
        const tk = this.current;
        this.idx += n;
        return tk;
    }

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

    private syncExprLevel() {
        while (this.inScope()) {
            if ([
                TokenType.COMMA,
                TokenType.RBRACKET,
                TokenType.RPAREN,
                TokenType.NEWLINE
            ].includes(this.current!.type)) {
                break;
            }
            this.advance();
        }
    }

    private reportError(msg: string, start: IPos, end: IPos) {
        this._errors.push(new ParseError(msg, start, end));
    }
}
