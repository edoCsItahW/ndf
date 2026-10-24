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
 * @version 2.0
 * @date 2025/04/17 20:13
 * @desc 语法分析器（NDF 语法 v2）
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * 递归下降实现，逐条对应 `NDF.g4` v2.0：
 *
 * ```
 * program            : statement* EOF
 * statement          : templateDefinition | unnamedInstantiation | definition | comment
 * definition         : modifier? name ('is' | '=') value
 * value              : definition | expression
 * templateDefinition : modifier? 'template' name templateParameterList 'is' typeRef objectBody
 * unnamedInstantiation : 'unnamed' name objectBody
 * templateParameterList : '[' (templateParameter (',' templateParameter)* ','?)? ']'
 * templateParameter  : modifier? name (':' typeRef)? ('=' value)?
 * typeRef            : typeName typeArgumentList? typeParameterList?
 * typeArgumentList   : '<' (typeRef (',' typeRef)* ','?)? '>'
 * typeParameterList  : '[' (typeParameter (',' typeParameter)* ','?)? ']'
 * typeParameter      : typeConstraint | name '=' value | name ':' typeRef ('=' value)? | name | expression
 * objectBody         : '(' (bodyItem (','? bodyItem)* ','?)? ')'
 * bodyItem           : modifier? name ':' typeRef ('=' value)? | definition | expression
 * expression         : conditionalExpression
 * conditionalExpression : logicalOrExpression ('?' value ':' conditionalExpression)?
 * ...                : 二元运算优先级链（| & ==,!= <,>,<=,>= +,- *,%,div）
 * unaryExpression    : ('-' | '!') unaryExpression | postfixExpression
 * postfixExpression  : primaryExpression (objectBody | arrayLiteral | '/' name | '.' name)*
 * primaryExpression  : literal | reference | templateParameterReference | mapLiteral | arrayLiteral
 *                    | guidLiteral | parenthesizedValue | name
 * ```
 *
 * 布局约定：
 * - 换行（`NEWLINE`）在语法上无意义，解析时被跳过；
 * - 注释在语句层会成为 `Comment` 语句节点（`///` 还承载导入指令），其余位置的注释被收集到
 *   `Program.comments`，供语义高亮使用，节点不再持有注释数组；
 * - 因此"成员之间只隔一个空格"和"两条语句紧挨着"都能正确解析。
 * */
import { INVERSE_OPERATORS, Token, TokenCategory, TokenType } from "../lexer/token";
import { NDFError, ParseError } from "../expection";
import { BinaryOperator, IPos, Nullable, Optional, PartialLocalet } from "../types";
import {
    Argument,
    Assignment,
    ASTWithBelong,
    BinaryExpr,
    Bool,
    CommenComment,
    Comment,
    DefinitionExpr,
    ErrorExpr,
    Expression,
    FileImportComment,
    Float,
    GuidCall,
    Identifier,
    IndexAccess,
    Integer,
    LibImportComment,
    MapDef,
    MemberAccess,
    MemberAssign,
    Nil,
    ObjectCall,
    Pair,
    ParameterDecl,
    ParenthesisExpr,
    Program,
    Reference,
    Statement,
    Str,
    TemplateDef,
    TemplateParam,
    TernaryExpr,
    TypeAnnotation,
    TypeRef,
    UnaryExpr,
    UnnamedObj,
    VectorDef
} from "./ast";
import { enumToStr } from "../utils";
import { Locale } from "../IDEHelper";


function endPos(token: Token): IPos {
    return { line: token.pos.line, column: token.pos.column + token.value.length };
}


/**
 * @const BINARY_LEVELS
 * @desc 二元运算符优先级（从低到高）
 * */
const BINARY_LEVELS: Array<[TokenType[], string[]]> = [
    [[TokenType.BIN_OR], ["|"]],
    [[TokenType.BIN_AND], ["&"]],
    [[TokenType.EQ, TokenType.NE], ["==", "!="]],
    [[TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE], ["<", ">", "<=", ">="]],
    [[TokenType.ADD, TokenType.SUB], ["+", "-"]],
    [[TokenType.MUL, TokenType.MOD, TokenType.KW_DIV], ["*", "%", "div"]]
];


/** 可作为"定义"出现的修饰符 */
const MODIFIER_TYPES = [TokenType.KW_EXPORT, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC];

/** 表达式可能的首令牌（用于补全提示） */
const EXPRESSION_START: TokenType[] = [
    TokenType.IDENTIFIER, TokenType.INT, TokenType.FLOAT, TokenType.STRING, TokenType.GUID,
    TokenType.KW_TRUE, TokenType.KW_FALSE, TokenType.KW_NIL,
    TokenType.DOLLAR, TokenType.TILDE, TokenType.LT, TokenType.LBRACKET, TokenType.LPAREN,
    TokenType.SUB, TokenType.NOT
];

/** 对象体/实参表中一项可能的首令牌（用于补全提示） */
const BODY_ITEM_START: TokenType[] = [
    TokenType.IDENTIFIER, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC, TokenType.KW_EXPORT
];


/**
 * @class Parser
 * @summary 语法分析器
 * @classDesc 通过递归下降把 Token 序列解析成 AST
 * */
export class Parser {
    private idx: number = 0;

    private _errors: NDFError[] = [];

    /** 非语句层注释（用于语义高亮，见 {@link Program.comments}） */
    private comments: Comment[] = [];

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

    /* ======================================================================
     * 入口
     * ==================================================================== */

    parse(): Program {
        const program = new Program(this.current?.pos || { line: 0, column: 0 });

        while (this.inScope()) {
            this.skipNewlines();

            if (!this.inScope())
                break;

            try {
                const stmt = this.parseStatement();

                if (stmt)
                    program.statements.push(stmt);
            } catch (e) {
                this.syncStmtLevel();

                const error = e instanceof NDFError
                    ? e
                    : new ParseError(
                        this.localet?.("NE2P4", (e as Error).message)
                        || `Syntax analyzer internal error, error message: ${(e as Error).message}`,
                        this.current?.pos || { line: 0, column: 0 },
                        this.current ? endPos(this.current) : { line: 0, column: 0 }
                    );

                if (this.raise)
                    throw error;

                this._errors.push(error);
            }
        }

        program.comments = this.comments;
        return program;
    }

    /* ======================================================================
     * 基础操作
     * ==================================================================== */

    private inScope(): boolean {
        return this.idx < this.tokens.length && !this.at(TokenType.EOF);
    }

    private at(type: TokenType): boolean {
        return this.current?.type === type;
    }

    private peek(n: number = 1): Nullable<Token> {
        return this.tokens[this.idx + n];
    }

    private advance(n: number = 1): Token {
        const tk = this.tokens[this.idx];
        this.idx += n;
        return tk;
    }

    /** 跳过换行（注释不跳过，交由 {@link collectComments} 处理） */
    private skipNewlines(): number {
        let count = 0;

        while (this.at(TokenType.NEWLINE)) {
            const previous = this.tokens[this.idx - 1];
            const newline = this.advance();

            // 把"上一行期望的令牌"带到换行符上，供跨行补全使用
            if (previous?.state.inferNext)
                newline.state.inferNext = previous.state.inferNext;

            count++;
        }

        return count;
    }

    /** 跳过换行与注释；注释收集到 {@link comments} */
    private collectComments(): void {
        for (;;) {
            this.skipNewlines();

            const tk = this.current;

            if (!tk || (tk.type !== TokenType.COMMENT_LINE && tk.type !== TokenType.COMMENT_BLOCK))
                return;

            const comment = new CommenComment(tk.pos, tk.value);
            comment.marks.value = tk;
            comment.category = tk.value.startsWith("///") ? "doc" : "common";
            comment.trailingNewLines = 0;
            this.comments.push(comment);
            this.advance();
        }
    }

    /** 跳过换行与注释，用于"运算符/后缀/括号"等布局无意义的判定点 */
    private skipTrivia(): void {
        this.collectComments();
    }

    /** 保存解析状态（含已收集注释的数量），用于向前看失败后回退 */
    private saveState(): { idx: number; comments: number } {
        return { idx: this.idx, comments: this.comments.length };
    }

    private restoreState(state: { idx: number; comments: number }): void {
        this.idx = state.idx;
        this.comments.length = state.comments;
    }

    /** 当前令牌之后的下一个有效令牌（跳过换行与注释） */
    private peekSignificant(n: number = 1): Nullable<Token> {
        let offset = this.idx;
        let count = 0;

        while (offset < this.tokens.length) {
            const tk = this.tokens[offset];

            if (tk.type === TokenType.EOF)
                return count === n ? tk : undefined;

            if (tk.type !== TokenType.NEWLINE && tk.type !== TokenType.COMMENT_LINE && tk.type !== TokenType.COMMENT_BLOCK) {
                if (count === n)
                    return tk;

                count++;
            }

            offset++;
        }

        return undefined;
    }

    private expect(type: TokenType, hint?: string): Token {
        const tk = this.current;

        if (tk && tk.type === type) {
            this.advance();
            return tk;
        }

        throw new ParseError(
            this.localet?.("NE2P2", enumToStr(TokenType, type))
            || `\`${hint || enumToStr(TokenType, type)}\` expected, but found \`${tk ? enumToStr(TokenType, tk.type) : "<EOF>"}\`${tk ? ` (\`${tk.value}\`)` : ""}`,
            tk?.pos || { line: 0, column: 0 },
            tk ? endPos(tk) : { line: 0, column: 0 }
        );
    }

    private expectName(hint: string = "Identifier"): Token {
        const tk = this.current;

        if (tk && tk.type === TokenType.IDENTIFIER) {
            this.advance();
            return tk;
        }

        throw new ParseError(
            this.localet?.("NE2P2", hint) || `\`${hint}\` expected, but found \`${tk ? enumToStr(TokenType, tk.type) : "<EOF>"}\`${tk ? ` (\`${tk.value}\`)` : ""}`,
            tk?.pos || { line: 0, column: 0 },
            tk ? endPos(tk) : { line: 0, column: 0 }
        );
    }

    private error(msg: string, tk: Nullable<Token> = this.current): never {
        throw new ParseError(
            msg,
            tk?.pos || { line: 0, column: 0 },
            tk ? endPos(tk) : { line: 0, column: 0 }
        );
    }

    /** 记录"下一步可能出现的令牌"，用于代码补全 */
    private infer(...types: TokenType[]): void {
        if (this.current)
            this.current.state.inferNext = types;
    }

    /** 把补全提示记录到指定令牌上（例如刚消费掉的 `=`、`(`、`,`） */
    private inferOn(token: Nullable<Token>, ...types: TokenType[]): void {
        if (token)
            token.state.inferNext = types;
    }

    private isModifier(tk: Nullable<Token> = this.current): boolean {
        return !!tk && MODIFIER_TYPES.includes(tk.type);
    }

    private modifierText(token: Token): "export" | "private" | "public" {
        switch (token.type) {
            case TokenType.KW_PRIVATE:
                return "private";
            case TokenType.KW_PUBLIC:
                return "public";
            default:
                return "export";
        }
    }

    private isStatementStart(tk: Nullable<Token> = this.current): boolean {
        return !!tk && [
            TokenType.KW_EXPORT, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC,
            TokenType.KW_TEMPLATE, TokenType.KW_UNNAMED, TokenType.IDENTIFIER,
            TokenType.COMMENT_LINE, TokenType.COMMENT_BLOCK
        ].includes(tk.type);
    }

    private syncStmtLevel(): void {
        let guard = 0;

        while (this.inScope() && guard++ < 1e6) {
            const tk = this.advance();

            if (tk.type === TokenType.NEWLINE) {
                const save = this.idx;
                this.skipNewlines();

                if (!this.current || this.isStatementStart()) {
                    this.idx = save;
                    return;
                }
            }
        }
    }

    /* ======================================================================
     * 语句
     * ==================================================================== */

    private parseStatement(): Optional<Statement> {
        const tk = this.current;

        if (!tk)
            return undefined;

        tk.state.stmtStart = true;
        this.infer(TokenType.KW_TEMPLATE, TokenType.KW_UNNAMED, TokenType.IDENTIFIER,
            TokenType.KW_EXPORT, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC);

        // 注释语句（顶层注释保留为语句：`///` 承载导入指令）
        if (tk.type === TokenType.COMMENT_LINE || tk.type === TokenType.COMMENT_BLOCK)
            return this.parseComment();

        if (this.isModifier(tk)) {
            this.advance();
            this.skipTrivia();
            this.infer(TokenType.IDENTIFIER, TokenType.KW_TEMPLATE);

            if (this.at(TokenType.KW_TEMPLATE))
                return this.parseTemplateDef(tk);

            return this.parseAssignment(tk);
        }

        if (tk.type === TokenType.KW_TEMPLATE)
            return this.parseTemplateDef();

        if (tk.type === TokenType.KW_UNNAMED) {
            this.advance();
            return this.parseUnnamedObj(tk);
        }

        if (tk.type === TokenType.IDENTIFIER)
            return this.parseAssignment();

        this.error(
            this.localet?.("NE2P3", enumToStr(TokenType, tk.type))
            || `Unexpected \`${enumToStr(TokenType, tk.type)}\` (\`${tk.value}\`)`
        );
    }

    /** `definition : modifier? name ('is' | '=') value`（顶层语句） */
    private parseAssignment(modifier?: Token): Assignment {
        const start = modifier ?? this.current!;
        const node = new Assignment(start.pos);

        if (modifier) {
            node.modifier = this.modifierText(modifier);
            node.marks.modifier = modifier;
        }

        node.name = this.parseIdentifier(node);
        this.skipTrivia();
        this.infer(TokenType.KW_IS, TokenType.ASSIGN);

        if (this.at(TokenType.KW_IS) || this.at(TokenType.ASSIGN)) {
            node.marks.is = this.advance();
            this.inferOn(node.marks.is, ...EXPRESSION_START);
        } else
            this.error(`\`is\` or \`=\` expected after \`${node.name.value}\``);

        this.skipTrivia();
        node.value = this.parseValue();

        return node;
    }

    /**
     * `value : definition | expression`
     * @desc 值位置允许嵌套定义（`Member = Named is TType ( … )`）
     * */
    private parseValue(): Expression {
        const tk = this.current;

        if (!tk)
            this.error("Expression expected, but reached end of file");

        if (this.isModifier(tk))
            return this.parseDefinitionExpr();

        if (tk.type === TokenType.IDENTIFIER) {
            const next = this.peekSignificant(1);

            if (next && (next.type === TokenType.KW_IS || next.type === TokenType.ASSIGN))
                return this.parseDefinitionExpr();
        }

        return this.parseExpression();
    }

    /** 作为值出现的定义 */
    private parseDefinitionExpr(): DefinitionExpr {
        const start = this.current!;
        const node = new DefinitionExpr(start.pos);

        if (this.isModifier(start)) {
            node.modifier = this.modifierText(start);
            node.marks.modifier = this.advance();
            this.skipTrivia();
        }

        node.name = this.parseIdentifier(node);
        this.skipTrivia();

        if (this.at(TokenType.KW_IS) || this.at(TokenType.ASSIGN)) {
            const operator = this.advance();
            node.operator = operator.type === TokenType.ASSIGN ? "=" : "is";
            node.marks.is = operator;
            this.inferOn(operator, ...EXPRESSION_START);
        } else
            this.error(`\`is\` or \`=\` expected after \`${node.name.value}\``);

        this.skipTrivia();
        node.value = this.parseValue();

        return node;
    }

    /* ======================================================================
     * 模板 / 无名对象
     * ==================================================================== */

    private parseTemplateDef(modifier?: Token): TemplateDef {
        const start = modifier ?? this.current!;
        const node = new TemplateDef(start.pos);

        if (modifier) {
            node.modifier = this.modifierText(modifier);
            node.marks.modifier = modifier;
        }

        node.marks.template = this.expect(TokenType.KW_TEMPLATE, "template");
        this.skipTrivia();
        this.infer(TokenType.IDENTIFIER);

        node.name = this.parseIdentifier(node);
        this.collectComments();
        node.marks.leftBracket = this.expect(TokenType.LBRACKET, "[");

        this.parseTemplateParameters(node);
        node.marks.rightBracket = this.expect(TokenType.RBRACKET, "]");

        node.comments2 = [];
        this.collectComments();
        node.comments3 = [];
        node.marks.is = this.expect(TokenType.KW_IS, "is");
        this.collectComments();
        this.infer(TokenType.IDENTIFIER);

        node.extend = this.parseTypeRef(node);
        this.collectComments();
        this.infer(TokenType.LPAREN);

        node.marks.leftParen = this.expect(TokenType.LPAREN, "(");
        this.parseTemplateMembers(node);
        node.marks.rightParen = this.expect(TokenType.RPAREN, ")");

        return node;
    }

    /** `templateParameterList`：`[ Name : string, Level : int = 1, … ]` */
    private parseTemplateParameters(node: TemplateDef): void {
        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`]` expected, but reached end of file");

            if (this.at(TokenType.RBRACKET))
                return;

            const param = this.parseParameterDecl(node);
            node.params.push(param);
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                param.marks.meybeComma = this.advance();
                continue;
            }

            if (this.at(TokenType.RBRACKET))
                return;

            // 允许"只有空格/换行"分隔的形参
            if (this.at(TokenType.IDENTIFIER) || this.isModifier())
                continue;

            this.error(`\`,\` or \`]\` expected in template parameter list, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /** `templateParameter : modifier? name (':' typeRef)? ('=' value)?` */
    private parseParameterDecl(belong: TemplateDef): ParameterDecl {
        const start = this.current!;
        const node = new ParameterDecl(start.pos, belong);

        if (this.isModifier(start)) {
            node.modifier = this.modifierText(start);
            this.advance();
            this.collectComments();
        }

        this.infer(TokenType.IDENTIFIER);
        node.name = this.parseIdentifier(node);
        this.skipTrivia();

        if (this.at(TokenType.COLON)) {
            node.marks.colonOrAssign = this.advance();
            this.inferOn(node.marks.colonOrAssign, TokenType.IDENTIFIER);
            this.skipTrivia();
            this.infer(TokenType.IDENTIFIER);
            node.annotation = this.parseTypeRef(node);
            this.skipTrivia();
        }

        if (this.at(TokenType.ASSIGN)) {
            const assign = this.advance();
            this.inferOn(assign, ...EXPRESSION_START);
            node.marks.colonOrAssign ??= assign;
            this.skipTrivia();
            node.default = this.parseValue();
            this.skipTrivia();
        }

        return node;
    }

    /** 模板体（`objectBody`），成员以 {@link MemberAssign} 表示 */
    private parseTemplateMembers(node: TemplateDef): void {
        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`)` expected, but reached end of file");

            if (this.at(TokenType.RPAREN))
                return;

            this.infer(TokenType.IDENTIFIER, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC, TokenType.KW_EXPORT);

            const member = this.parseMemberAssign(node);
            node.members.push(member);
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                member.marks.meybeComma = this.advance();
                continue;
            }

            if (this.at(TokenType.RPAREN))
                return;

            if (this.at(TokenType.IDENTIFIER) || this.isModifier())
                continue;

            this.error(`\`)\` expected in object body, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /** 模板体成员：`modifier? name ('=' | 'is') value` */
    private parseMemberAssign(belong: TemplateDef): MemberAssign {
        const start = this.current!;
        const node = new MemberAssign(start.pos, belong);

        if (this.isModifier(start)) {
            node.modifier = this.modifierText(start);
            node.marks.modifier = this.advance();
            this.collectComments();
        }

        node.name = this.parseIdentifier(node);
        this.skipTrivia();

        if (this.at(TokenType.ASSIGN) || this.at(TokenType.KW_IS)) {
            const operator = this.advance();
            node.operator = operator.type === TokenType.ASSIGN ? "=" : "is";
            node.marks.assignOrIs = operator;
            this.inferOn(operator, ...EXPRESSION_START);
        } else
            this.error(`\`=\` or \`is\` expected after member \`${node.name.value}\``);

        this.skipTrivia();
        node.value = this.parseValue();

        return node;
    }

    /** `unnamedInstantiation : 'unnamed' name objectBody` */
    private parseUnnamedObj(unnamed: Token): UnnamedObj {
        const node = new UnnamedObj(unnamed.pos);
        node.marks.unnamed = unnamed;
        this.skipTrivia();
        this.infer(TokenType.IDENTIFIER);

        node.blueprint = this.parseIdentifier(node);
        this.collectComments();
        node.marks.leftParen = this.expect(TokenType.LPAREN, "(");
        this.inferOn(node.marks.leftParen, ...BODY_ITEM_START);

        node.args = this.parseBody(node);
        node.marks.rightParen = this.expect(TokenType.RPAREN, ")");

        return node;
    }

    /* ======================================================================
     * 对象体 / 实参
     * ==================================================================== */

    /**
     * `objectBody : '(' (bodyItem (','? bodyItem)* ','?)? ')'`
     * @desc 调用方负责消费 `(` 与 `)`
     * */
    private parseBody(belong?: ObjectCall | UnnamedObj): Argument[] {
        const args: Argument[] = [];

        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`)` expected, but reached end of file");

            if (this.at(TokenType.RPAREN))
                return args;

            this.infer(TokenType.IDENTIFIER, TokenType.KW_PRIVATE, TokenType.KW_PUBLIC, TokenType.KW_EXPORT);

            const arg = this.parseArgument(belong);
            args.push(arg);
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                arg.marks.meybeComma = this.advance();
                continue;
            }

            if (this.at(TokenType.RPAREN))
                return args;

            if (this.at(TokenType.IDENTIFIER) || this.isModifier())
                continue;

            this.error(`\`,\` or \`)\` expected in object body, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /**
     * `bodyItem : modifier? name ':' typeRef ('=' value)? | definition | expression`
     * */
    private parseArgument(belong?: ObjectCall | UnnamedObj): Argument {
        const start = this.current!;
        const node = new Argument(start.pos, belong);

        if (this.isModifier(start)) {
            node.modifier = this.modifierText(start);
            node.marks.modifier = this.advance();
            this.skipTrivia();
        }

        const tk = this.current;
        const next = this.peekSignificant(1);

        // 键入实参：Name : Type = default
        if (tk?.type === TokenType.IDENTIFIER && next?.type === TokenType.COLON) {
            node.name = this.parseIdentifier(node);
            this.skipTrivia();
            node.marks.colonOrAssignOrIs = this.advance();
            this.skipTrivia();
            this.infer(TokenType.IDENTIFIER);
            node.annotation = this.parseTypeRef(node);
            this.skipTrivia();

            if (this.at(TokenType.ASSIGN)) {
                const assign = this.advance();
                node.operator = "=";
                this.inferOn(assign, ...EXPRESSION_START);
                this.skipTrivia();
                node.value = this.parseValue();
            }

            return node;
        }

        // 具名实参：Name = value / Name is value
        if (tk?.type === TokenType.IDENTIFIER && next && (next.type === TokenType.ASSIGN || next.type === TokenType.KW_IS)) {
            node.name = this.parseIdentifier(node);
            this.skipTrivia();
            const operator = this.advance();
            node.operator = operator.type === TokenType.ASSIGN ? "=" : "is";
            node.marks.colonOrAssignOrIs = operator;
            this.inferOn(operator, ...EXPRESSION_START);
            this.skipTrivia();
            node.value = this.parseValue();
            return node;
        }

        // 位置实参
        node.positional = true;
        node.value = this.parseValue();
        return node;
    }

    /* ======================================================================
     * 类型引用
     * ==================================================================== */

    /** `typeRef : typeName typeArgumentList? typeParameterList?` */
    private parseTypeRef(belong?: ASTWithBelong): TypeRef {
        const start = this.current!;
        const node = new TypeRef(start.pos, belong);

        this.infer(TokenType.IDENTIFIER);
        node.name = this.parseIdentifier(node);
        this.skipTrivia();

        if (this.at(TokenType.LT)) {
            node.marks.lt = this.advance();
            this.parseTypeArguments(node);
            node.marks.gt = this.expect(TokenType.GT, ">");
            this.skipTrivia();
        }

        if (this.at(TokenType.LBRACKET)) {
            node.marks.leftBracket = this.advance();
            this.parseTypeParameters(node);
            node.marks.rightBracket = this.expect(TokenType.RBRACKET, "]");
        }

        return node;
    }

    /** `typeArgumentList : '<' (typeRef (',' typeRef)* ','?)? '>'` */
    private parseTypeArguments(node: TypeRef): void {
        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`>` expected, but reached end of file");

            if (this.at(TokenType.GT))
                return;

            node.typeArgs.push(this.parseTypeRef(node));
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                this.advance();
                continue;
            }

            if (this.at(TokenType.GT))
                return;

            this.error(`\`,\` or \`>\` expected in type argument list, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /** `typeParameterList : '[' (typeParameter (',' typeParameter)* ','?)? ']'` */
    private parseTypeParameters(node: TypeRef): void {
        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`]` expected, but reached end of file");

            if (this.at(TokenType.RBRACKET))
                return;

            node.annotations.push(this.parseTypeAnnotation());
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                this.advance();
                continue;
            }

            if (this.at(TokenType.RBRACKET))
                return;

            this.error(`\`,\` or \`]\` expected in type parameter list, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /**
     * `typeParameter : typeConstraint | name '=' value | name ':' typeRef ('=' value)? | name | expression`
     * */
    private parseTypeAnnotation(): TypeAnnotation {
        const start = this.current!;
        const node = new TypeAnnotation(start.pos);

        // 约束注解：>= 0 / > 1 / != 2 …
        if ([TokenType.GE, TokenType.GT, TokenType.LE, TokenType.LT, TokenType.NE, TokenType.EQ].includes(start.type)) {
            node.kind = "constraint";
            node.marks.operator = this.advance();
            this.skipTrivia();
            node.value = this.parseExpression();
            return node;
        }

        const next = this.peekSignificant(1);

        if (start.type === TokenType.IDENTIFIER && next?.type === TokenType.ASSIGN) {
            node.kind = "value";
            node.name = this.parseIdentifier();
            this.skipTrivia();
            node.marks.assign = this.advance();
            this.skipTrivia();
            node.value = this.parseValue();
            return node;
        }

        if (start.type === TokenType.IDENTIFIER && next?.type === TokenType.COLON) {
            node.kind = "typed";
            node.name = this.parseIdentifier();
            this.skipTrivia();
            node.marks.operator = this.advance();
            this.skipTrivia();
            node.annotation = this.parseTypeRef();
            this.skipTrivia();

            if (this.at(TokenType.ASSIGN)) {
                node.marks.assign = this.advance();
                this.skipTrivia();
                node.value = this.parseValue();
            }

            return node;
        }

        if (start.type === TokenType.IDENTIFIER) {
            node.kind = "flag";
            node.name = this.parseIdentifier();
            return node;
        }

        // 形如 `float3[0, 0, 0]` 的缺省实参
        node.kind = "value";
        node.value = this.parseExpression();
        return node;
    }

    /* ======================================================================
     * 表达式
     * ==================================================================== */

    private parseExpression(): Expression {
        return this.parseConditional();
    }

    /** `conditionalExpression : logicalOrExpression ('?' value ':' conditionalExpression)?` */
    private parseConditional(): Expression {
        const condition = this.parseBinaryLevel(0);

        const state = this.saveState();
        this.skipTrivia();

        if (!this.at(TokenType.QUESTION)) {
            this.restoreState(state);
            return condition;
        }

        const node = new TernaryExpr(condition.pos);
        node.condition = condition;
        node.marks.question = this.advance();
        this.skipTrivia();
        node.trueExpr = this.parseValue();
        this.skipTrivia();
        node.marks.colon = this.expect(TokenType.COLON, ":");
        this.skipTrivia();
        node.falseExpr = this.parseConditional();

        return node;
    }

    private parseBinaryLevel(level: number): Expression {
        if (level >= BINARY_LEVELS.length)
            return this.parseUnary();

        const operators = BINARY_LEVELS[level][1];
        let left = this.parseBinaryLevel(level + 1);

        for (;;) {
            const state = this.saveState();
            this.skipTrivia();

            const tk = this.current;

            if (!tk || !operators.includes(tk.value)) {
                this.restoreState(state);
                break;
            }

            const operator = tk.value as BinaryOperator;
            this.advance();
            this.skipTrivia();

            const right = this.parseBinaryLevel(level + 1);

            const node = new BinaryExpr(left.pos);
            node.left = left;
            node.marks.operator = tk;
            node.operator = operator;
            node.right = right;
            left = node;
        }

        return left;
    }

    /** `unaryExpression : ('-' | '!') unaryExpression | postfixExpression` */
    private parseUnary(): Expression {
        const state = this.saveState();
        this.skipTrivia();
        const tk = this.current;

        if (tk && (tk.type === TokenType.SUB || tk.type === TokenType.NOT)) {
            const node = new UnaryExpr(tk.pos);
            node.operator = tk.type === TokenType.SUB ? "-" : "!";
            node.marks.subOrNot = this.advance();
            this.skipTrivia();
            node.operand = this.parseUnary();
            return node;
        }

        this.restoreState(state);
        return this.parsePostfix();
    }

    /** `postfixExpression : primaryExpression (objectBody | arrayLiteral | '/' name | '.' name)*` */
    private parsePostfix(): Expression {
        let expr = this.parsePrimary();

        for (;;) {
            const state = this.saveState();
            this.skipTrivia();

            const tk = this.current;

            if (!tk) {
                this.restoreState(state);
                return expr;
            }

            if (tk.type === TokenType.LPAREN) {
                if (!(expr instanceof Identifier)) {
                    this.restoreState(state);
                    return expr;
                }

                const node = new ObjectCall(expr.pos);
                node.blueprint = expr;
                node.marks.leftParen = this.advance();
                this.inferOn(node.marks.leftParen, ...BODY_ITEM_START);
                node.args = this.parseBody(node);
                node.marks.rightParen = this.expect(TokenType.RPAREN, ")");
                expr = node;
                continue;
            }

            if (tk.type === TokenType.LBRACKET) {
                const node = new IndexAccess(expr.pos);
                node.target = expr;
                node.marks.leftBracket = this.advance();
                this.inferOn(node.marks.leftBracket, ...EXPRESSION_START);
                node.args = this.parseArrayArguments();
                node.marks.rightBracket = this.expect(TokenType.RBRACKET, "]");
                expr = node;
                continue;
            }

            if (tk.type === TokenType.DIV || tk.type === TokenType.DOT) {
                const node = new MemberAccess(expr.pos);
                node.target = expr;
                node.separator = tk.type === TokenType.DIV ? "/" : ".";
                node.marks.separator = this.advance();
                this.skipTrivia();
                node.property = this.parseIdentifier();
                expr = node;
                continue;
            }

            this.restoreState(state);
            return expr;
        }
    }

    /** `'[' (arrayElement (','? arrayElement)* ','?)? ']'`（下标实参） */
    private parseArrayArguments(): Expression[] {
        const args: Expression[] = [];

        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`]` expected, but reached end of file");

            if (this.at(TokenType.RBRACKET))
                return args;

            args.push(this.parseValue());
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                this.advance();
                continue;
            }

            if (this.at(TokenType.RBRACKET))
                return args;

            // 允许空格分隔（`sqr[x]` 的实参之间实际只会有逗号，这里保持宽容）
            if (this.at(TokenType.IDENTIFIER) || this.isModifier())
                continue;

            this.error(`\`,\` or \`]\` expected in index arguments, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /* ======================================================================
     * 主表达式
     * ==================================================================== */

    private parsePrimary(): Expression {
        const tk = this.current;

        if (!tk)
            this.error("Expression expected, but reached end of file");

        switch (tk.type) {
            case TokenType.INT:
                this.advance();
                return this.withToken(new Integer(tk.pos, tk.value), tk);

            case TokenType.FLOAT:
                this.advance();
                return this.withToken(new Float(tk.pos, tk.value), tk);

            case TokenType.STRING:
                this.advance();
                return this.withToken(new Str(tk.pos, tk.value), tk);

            case TokenType.KW_TRUE:
            case TokenType.KW_FALSE:
                this.advance();
                return this.withToken(new Bool(tk.pos, tk.value), tk);

            case TokenType.KW_NIL:
                this.advance();
                return this.withToken(new Nil(tk.pos), tk);

            case TokenType.DOLLAR:
            case TokenType.TILDE:
                return this.parseReference();

            case TokenType.LT:
                return this.parseTemplateParam();

            case TokenType.LBRACKET:
                return this.parseVectorDef();

            case TokenType.LPAREN:
                return this.parseParenthesis();

            case TokenType.IDENTIFIER:
                if (tk.value === "GUID" && this.peekSignificant(1)?.type === TokenType.COLON && this.peekSignificant(2)?.type === TokenType.GUID)
                    return this.parseGuidCall();

                if (tk.value === "MAP" && this.peekSignificant(1)?.type === TokenType.LBRACKET)
                    return this.parseMapDef();

                this.advance();
                return this.withToken(this.parseIdentifierNode(tk), tk);

            default:
                this.error(
                    this.localet?.("NE2P3", enumToStr(TokenType, tk.type))
                    || `Unexpected \`${enumToStr(TokenType, tk.type)}\` (\`${tk.value}\`) in expression`
                );
        }
    }

    private withToken<T extends Expression>(node: T, token: Token): T {
        (node.marks as { value?: Token }).value = token;
        return node;
    }


    /** `<Name>` 模板形参引用 */
    private parseTemplateParam(): TemplateParam {
        const start = this.current!;
        const node = new TemplateParam(start.pos);
        node.marks.lt = this.advance();
        this.skipTrivia();
        node.name = this.parseIdentifier();
        this.skipTrivia();
        node.marks.gt = this.expect(TokenType.GT, ">");
        return node;
    }

    /** `reference : ('$' | '~') ('/' name)+` */
    private parseReference(): Reference {
        const start = this.current!;
        const node = new Reference(start.pos);
        node.operator = start.type === TokenType.DOLLAR ? "$" : "~";
        node.marks.prefix = this.advance();

        for (;;) {
            this.skipTrivia();

            if (!this.at(TokenType.DIV))
                break;

            this.advance();
            this.skipTrivia();
            node.segments.push(this.parseIdentifier());
        }

        if (!node.segments.length)
            this.error(`Reference \`${node.operator}\` requires a path segment`);

        return node;
    }

    /** `guidLiteral : 'GUID' ':' GUID_VALUE` */
    private parseGuidCall(): GuidCall {
        const start = this.current!;
        const node = new GuidCall(start.pos);

        node.marks.value = this.expectName("GUID");
        this.skipTrivia();
        node.marks.colon = this.expect(TokenType.COLON, ":");
        this.skipTrivia();

        const guid = this.expect(TokenType.GUID, "{GUID}");
        node.marks.guid = guid;
        node.uuid = guid.value;

        return node;
    }

    /** `mapLiteral : MAP '[' (pair (','? pair)* ','?)? ']'` */
    private parseMapDef(): MapDef {
        const start = this.current!;
        const node = new MapDef(start.pos);

        node.marks.map = this.expectName("MAP");
        this.inferOn(node.marks.map, TokenType.LBRACKET);
        this.skipTrivia();
        node.marks.leftBracket = this.expect(TokenType.LBRACKET, "[");
        this.inferOn(node.marks.leftBracket, TokenType.LPAREN);

        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`]` expected, but reached end of file");

            if (this.at(TokenType.RBRACKET)) {
                node.marks.rightBracket = this.advance();
                return node;
            }

            node.pairs.push(this.parsePair());
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                this.advance();
                continue;
            }

            if (this.at(TokenType.RBRACKET)) {
                node.marks.rightBracket = this.advance();
                return node;
            }

            if (this.at(TokenType.LPAREN))
                continue;

            this.error(`\`,\` or \`]\` expected in MAP literal, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /** `pair : '(' value ',' value ')'` */
    private parsePair(): Pair {
        const start = this.current!;
        const node = new Pair(start.pos);

        node.marks.leftParen = this.expect(TokenType.LPAREN, "(");
        this.skipTrivia();
        node.key = this.parseValue();
        this.skipTrivia();
        node.marks.comma = this.expect(TokenType.COMMA, ",");
        this.skipTrivia();
        node.value = this.parseValue();
        this.skipTrivia();
        node.marks.rightParen = this.expect(TokenType.RPAREN, ")");

        return node;
    }

    /** `arrayLiteral : '[' (arrayElement (','? arrayElement)* ','?)? ']'` */
    private parseVectorDef(): VectorDef {
        const start = this.current!;
        const node = new VectorDef(start.pos);

        node.marks.leftBracket = this.expect(TokenType.LBRACKET, "[");
        this.inferOn(node.marks.leftBracket, ...EXPRESSION_START);

        for (;;) {
            this.collectComments();

            if (!this.current)
                this.error("`]` expected, but reached end of file");

            if (this.at(TokenType.RBRACKET)) {
                node.marks.rightBracket = this.advance();
                return node;
            }

            node.elements.push(this.parseValue());
            this.collectComments();

            if (this.at(TokenType.COMMA)) {
                this.advance();
                continue;
            }

            if (this.at(TokenType.RBRACKET)) {
                node.marks.rightBracket = this.advance();
                return node;
            }

            if (this.at(TokenType.IDENTIFIER) || this.isModifier()
                || this.at(TokenType.LBRACKET) || this.at(TokenType.LPAREN))
                continue;

            this.error(`\`,\` or \`]\` expected in vector literal, but found \`${this.current ? this.current.value : "<EOF>"}\``);
        }
    }

    /** `parenthesizedValue : '(' value (',' value)? ')'` */
    private parseParenthesis(): Expression {
        const start = this.current!;

        this.advance();  // '('
        this.skipTrivia();
        const first = this.parseValue();
        this.skipTrivia();

        if (this.at(TokenType.COMMA)) {
            const pair = new Pair(start.pos);
            pair.marks.leftParen = start;
            pair.key = first;
            pair.marks.comma = this.advance();
            this.skipTrivia();
            pair.value = this.parseValue();
            this.skipTrivia();
            pair.marks.rightParen = this.expect(TokenType.RPAREN, ")");
            return pair;
        }

        const node = new ParenthesisExpr(start.pos);
        node.marks.leftParen = start;
        node.expr = first;
        node.marks.rightParen = this.expect(TokenType.RPAREN, ")");
        node.second = undefined;

        return node;
    }

    /* ======================================================================
     * 标识符与注释
     * ==================================================================== */

    private parseIdentifier(belong?: ASTWithBelong): Identifier {
        const tk = this.expectName();
        return this.parseIdentifierNode(tk, belong);
    }

    private parseIdentifierNode(tk: Token, belong?: ASTWithBelong): Identifier {
        const node = new Identifier(tk.pos, belong);
        node.name = tk.value;
        node.marks.value = tk;
        node.type = { type: node.type.type, name: tk.value };
        return node;
    }

    /** 顶层注释语句：`///` 导入指令或普通注释 */
    private parseComment(): Comment {
        const tk = this.advance();
        let node: Comment;

        if (tk.type === TokenType.COMMENT_LINE && tk.value.startsWith("///")) {
            const body = tk.value.replace(/^\/\/\/\s*/, "");
            const fromMatch = /^from\s+(['"])(.*?)\1\s+import\s+(.+)$/.exec(body);

            if (fromMatch) {
                const fileImport = new FileImportComment(tk.pos, tk.value);
                fileImport.path = fromMatch[2];
                fileImport.items = this.splitImportItems(fromMatch[3]);
                node = fileImport;
            } else {
                const libMatch = /^import\s+(.+)$/.exec(body);

                if (libMatch) {
                    const libImport = new LibImportComment(tk.pos, tk.value);
                    libImport.items = this.splitImportItems(libMatch[1]);
                    node = libImport;
                } else {
                    const common = new CommenComment(tk.pos, tk.value);
                    common.category = "doc";
                    node = common;
                }
            }
        } else {
            const common = new CommenComment(tk.pos, tk.value);
            common.category = "common";
            node = common;
        }

        node.marks.value = tk;
        node.trailingNewLines = this.skipNewlines();

        return node;
    }

    private splitImportItems(raw: string): string[] {
        return raw.split(",").map(item => item.trim()).filter(item => item.length > 0);
    }
}










