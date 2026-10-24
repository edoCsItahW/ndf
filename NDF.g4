/*
 * ============================================================================
 *  NDF (Napoleon / WARNO Data Format) — ANTLR4 语法定义
 *  版本 : v2.0（基于 NDF Reference Manual v1.1.1 + WARNO base.zip 全量语料反推）
 *  校验 : 本文件与 tools/ndf-corpus-check.js 中的手写递归下降解析器 1:1 对应，
 *         该解析器已无错通过 base.zip 全部 4564 个 .ndf 文件（约 1.64e7 token）。
 * ============================================================================
 *
 *  与 v1 语法的差异（详见 NDF语法规范v2.md）：
 *   1. 注解/泛型不再是 `MAP<T>` 一种形态：类型引用 = 类型名 + `<...>` 泛型实参 + `[...]` 注解实参，
 *      且两者可同时出现（`LIST<TActionDescriptor>[required]`）。
 *   2. 新增"键入实参" `Name : Type = default`（如 `TResistanceTypeRTTI(Family=X Index=1)`）。
 *   3. 成员/实参的分隔符可为逗号、换行、注释，甚至"什么都不写"（仅空格）——
 *      NDF 没有空白敏感性；语句与语句之间也可以直接相邻。
 *   4. 允许嵌套定义作为值：`Member = Named is TType ( ... )`。
 *   5. 新增十六进制整数、`1.` / `.5` 形式的浮点数、单引号字符串、`GUID:{...}` 字面量、
 *      `True`/`False` 大写布尔、"软关键字"（int/float3/RGB/... 可以当标识符用）。
 *   6. 删除 `/` 作为除法运算符（实际语料中除法只用 `div`），`/` 仅表示命名空间/枚举路径。
 *
 *  设计约定：
 *   - 布局（空白、换行、注释）全部位于 HIDDEN 通道，但保留独立 token 类型，
 *     方便 LSP / 格式化器从 token 流（或 hidden channel）中还原布局与注释；
 *   - 结构性关键字（export/is/template/...）在语法规则中用字符串字面量，
 *     由 ANTLR 生成隐式 token（隐式 token 优先于 IDENTIFIER，故不会被当作标识符）；
 *   - 内建类型名属于"软关键字"（语料中 `RGB is 2`、`bool` 作注解类型同时存在），
 *     因此显式定义 token，并在 name 规则中回退为标识符。
 */
grammar NDF;

/* ==========================================================================
 * 1. 程序与语句
 * ========================================================================== */

program
    : statement* EOF
    ;

statement
    : templateDefinition                                // template X [...] is T (...)
    | unnamedInstantiation                              // unnamed T (...)
    | definition                                        // [modifier] Name is <value>
    ;

/* 定义（顶层声明 / 对象成员 / 具名实参 均为同一形态）。
 * 语料统计：顶层 74205 次使用 `is`，0 次使用 `=`；成员 61626 次 `=`、22 次 `is`。
 * 这里同时接受两种写法。 */
definition
    : modifier? name ('is' | '=') value
    ;

/* 值：允许把"定义"直接当作值使用，从而实现
 *   Member = export PD is ParticleDescriptor ( ... )      （别名 + 内联具名对象）
 * 以及对象体里的作用域对象
 *   Bag is TInventory ( ... )
 * 注意：`A is B is C` 会解析成 A is (B is C)，与 WARNO 的语义一致。 */
value
    : definition
    | expression
    ;

modifier
    : 'export'
    | 'private'
    | 'public'
    ;

/* ==========================================================================
 * 2. 模板
 * ========================================================================== */

templateDefinition
    : modifier? 'template' name templateParameterList 'is' typeRef objectBody
    ;

/* 无名对象只能出现在顶层：unnamed TType ( ... ) / unnamed Template_X ( ... ) */
unnamedInstantiation
    : 'unnamed' name objectBody
    ;

/* 模板形参表：`[ Name : string, Level : int = 1, ... ]`，允许尾随逗号、允许为空 */
templateParameterList
    : '[' (templateParameter (',' templateParameter)* ','?)? ']'
    ;

/* 形参 = [修饰符] 名字 [ ':' 类型 ] [ '=' 默认值 ] */
templateParameter
    : modifier? name (':' typeRef)? ('=' value)?
    ;

/* ==========================================================================
 * 3. 类型引用
 * ========================================================================== */

/* 语料中出现的全部形态：
 *   TEntityDescriptor
 *   LIST<TActionDescriptor>           泛型实参
 *   TEvaluable[required]              注解实参（标志）
 *   boolean[GroupBy = "Position"]     注解实参（键值）
 *   integer[>= 0]                     注解实参（约束）
 *   string[Values = ['float','int']]  注解实参（键值 + 向量）
 *   LIST<TActionDescriptor>[required] 泛型 + 注解同时出现
 *   float3 / integer / single / color 内建类型名（软关键字） */
typeRef
    : typeName typeArgumentList? typeParameterList?
    ;

typeName
    : name
    ;

typeArgumentList
    : '<' (typeRef (',' typeRef)* ','?)? '>'
    ;

typeParameterList
    : '[' (typeParameter (',' typeParameter)* ','?)? ']'
    ;

typeParameter
    : typeConstraint                                    // >= 0
    | name '=' value                                    // GroupBy = "Position"
    | name ':' typeRef ('=' value)?                     // ExpectedType : float3
    | name                                              // required
    | expression                                        // 0, 0, 0 / 任意常量表达式
    ;

typeConstraint
    : ('>=' | '>' | '<=' | '<' | '!=' | '==') expression
    ;

/* ==========================================================================
 * 4. 对象体（对象成员 / 调用实参 统一为同一种表）
 * ========================================================================== */

/* 分隔符可以是 `,`、换行、注释、甚至仅空格；语料实例：
 *   TResistanceTypeRTTI(Family=ResistanceFamily_blindage Index=1)   ← 空格分隔
 *   Params = [a is Template_Alias()] Intrinsic = ...                ← 空格分隔
 *   Template_Param_Float ( DefaultValue = 500 )                     ← 尾随空体 */
objectBody
    : '(' (bodyItem (','? bodyItem)* ','?)? ')'
    ;

bodyItem
    : modifier? name ':' typeRef ('=' value)?           // 键入实参（带默认值）
    | definition                                       // Name = value / Name is value
    | expression                                       // 位置实参
    ;

/* ==========================================================================
 * 5. 表达式
 * ========================================================================== */

expression
    : conditionalExpression
    ;

/* 三元运算符只出现 493 次，但确实存在：
 *   DurationInSec = parWaitBetweenShot == 0 ? parFlyDuration : (parWaitBetweenShot * 2) */
conditionalExpression
    : logicalOrExpression ('?' value ':' conditionalExpression)?
    ;

/* 位运算符优先级（按出现频率给出同样结构：| 2329 次、& 15 次） */
logicalOrExpression
    : logicalAndExpression ('|' logicalAndExpression)*
    ;

logicalAndExpression
    : equalityExpression ('&' equalityExpression)*
    ;

equalityExpression
    : relationalExpression (('==' | '!=') relationalExpression)*
    ;

/* 注意：`<` `>` 在操作数位置是模板形参引用 `<Name>`（见 templateParameterReference） */
relationalExpression
    : additiveExpression (('<' | '>' | '<=' | '>=') additiveExpression)*
    ;

additiveExpression
    : multiplicativeExpression (('+' | '-') multiplicativeExpression)*
    ;

/* 除法只有 `div` 关键字（语料 164 次），`%` 语料中未使用但手册列出；
 * `/` 不是算术运算符，它是命名空间/枚举路径分隔符。 */
multiplicativeExpression
    : unaryExpression (('*' | '%' | 'div') unaryExpression)*
    ;

unaryExpression
    : ('-' | '!') unaryExpression                       // -9.81 / ! <Absolute>
    | postfixExpression
    ;

/* 后缀链可以任意组合：
 *   TType(...)              对象构造 / 模板实例化
 *   float3[0,0,0]           内建类型构造（语法上与下标同形）
 *   length[parA - parB]     内建函数"下标调用"
 *   EUnitMovingType/Track   枚举值
 *   ~/Table_Rubble.Value    引用 + 成员访问
 *   (a)(b)[c]/d.e           任意混合 */
postfixExpression
    : primaryExpression postfixPart*
    ;

postfixPart
    : objectBody
    | arrayLiteral
    | '/' name
    | '.' name
    ;

primaryExpression
    : literal
    | reference
    | templateParameterReference
    | mapLiteral
    | arrayLiteral
    | guidLiteral
    | parenthesizedValue
    | name
    ;

/* 向量（允许逗号、尾随逗号、元素为"定义"）：
 *   []
 *   [1, 2, 3]
 *   [~/ETerrainType/ForetLegere, ~/ETerrainType/ForetDense, ]
 *   [private parDestination is Template_Param_Float3(DefaultValue = float3[0,0,0]), ] */
arrayLiteral
    : '[' (arrayElement (','? arrayElement)* ','?)? ']'
    ;

arrayElement
    : definition
    | expression
    ;

/* MAP 字面量：MAP [ (k, v), ... ]，允许空表与尾随逗号 */
mapLiteral
    : KW_MAP '[' (pair (','? pair)* ','?)? ']'
    ;

pair
    : '(' value ',' value ')'
    ;

/* 括号表达式 与 序对 "(a, b)" 同形（序对 76719 次，多用于 MAP 之外的位置） */
parenthesizedValue
    : '(' value (',' value)? ')'
    ;

literal
    : DECIMAL_INT
    | HEX_INT
    | FLOAT_LITERAL
    | STRING_LITERAL
    | booleanLiteral
    | 'nil'
    ;

/* 大小写两种布尔写法都被接受（语料中 True/False 约 8.4 万次） */
booleanLiteral
    : 'true'
    | 'false'
    | 'True'
    | 'False'
    ;

/* 引用：绝对 $/  与 加载命名空间相对 ~/；允许 `/` 两侧出现空白（语料实例 `~ / x`） */
reference
    : ('$' | '~') ('/' name)+
    ;

/* 模板形参引用：<Name>（语料 5991 次） */
templateParameterReference
    : '<' name '>'
    ;

/* GUID 字面量：GUID:{d72a9d19-9dc8-4b8c-b63d-132c602b7337}（语料 8233 次） */
guidLiteral
    : KW_GUID ':' GUID_VALUE
    ;

/* 名字：普通标识符，或"软关键字"（内建类型名、MAP/LIST/List/PAIR/GUID）。
 * 语料证据：`RGB is 2`（Globals.ndf）、`LIST<PAIR<string,int>>`、`MAP<int2, T>`；
 * `GUID` 还能作类型名：`DescriptorId: GUID`（server/lib.d.ndf:4）。
 * 注意 primaryExpression 中 guidLiteral 排在 name 之前，`GUID:{…}` 仍走字面量。 */
name
    : IDENTIFIER
    | builtinTypeName
    | KW_MAP
    | KW_LIST
    | KW_LIST_TITLE
    | KW_PAIR
    | KW_GUID
    ;

builtinTypeName
    : KW_INT
    | KW_FLOAT
    | KW_STRING
    | KW_BOOL
    | KW_BOOLEAN
    | KW_SINGLE
    | KW_INTEGER
    | KW_COLOR
    | KW_RGB
    | KW_RGBA
    | KW_FLOAT2
    | KW_FLOAT3
    | KW_FLOAT4
    | KW_INT2
    | KW_INT3
    | KW_INT4
    ;

/* ==========================================================================
 * 6. 词法
 * ========================================================================== */

/* ---- 6.1 布局与注释：全部隐藏，但保留独立类型供 IDE 使用 ---- */

NEWLINE       : '\r'? '\n'                  -> channel(HIDDEN) ;
WHITESPACE    : [ \t\f\u00A0\uFEFF]+        -> channel(HIDDEN) ;

/* `///` 同时承载本插件的 import 指令（/// from 'a.ndf' import X），
 * 属于工具层语义，这里只保证它是注释。 */
COMMENT_DOC   : '///' ~[\r\n]*              -> channel(HIDDEN) ;
COMMENT_LINE  : '//'  ~[\r\n]*              -> channel(HIDDEN) ;
COMMENT_BLOCK : '/*'  .*? '*/'              -> channel(HIDDEN) ;
COMMENT_PAREN : '(*'  .*? '*)'              -> channel(HIDDEN) ;

/* ---- 6.2 软关键字：既是类型名/容器名，也可作为标识符使用 ---- */

KW_MAP        : 'MAP' ;
KW_LIST       : 'LIST' ;
KW_LIST_TITLE : 'List' ;
KW_PAIR       : 'PAIR' ;
KW_GUID       : 'GUID' ;

KW_INT        : 'int' ;
KW_INTEGER    : 'integer' ;
KW_INT2       : 'int2' ;
KW_INT3       : 'int3' ;
KW_INT4       : 'int4' ;

KW_FLOAT      : 'float' ;
KW_FLOAT2     : 'float2' ;
KW_FLOAT3     : 'float3' ;
KW_FLOAT4     : 'float4' ;

KW_STRING     : 'string' ;
KW_BOOL       : 'bool' ;
KW_BOOLEAN    : 'boolean' ;
KW_SINGLE     : 'single' ;
KW_COLOR      : 'color' ;
KW_RGB        : 'RGB' ;
KW_RGBA       : 'RGBA' ;

/* ---- 6.3 字面量 ---- */

/* GUID 值：8-4-4-4-12 位十六进制，仅在 `GUID:` 之后出现 */
GUID_VALUE    : '{' HEX8 '-' HEX4 '-' HEX4 '-' HEX4 '-' HEX12 '}' ;

/* 整数：十进制或 0x 十六进制（0xFF00A8、0x1） */
HEX_INT       : '0' [xX] HEX+ ;
DECIMAL_INT   : [0-9]+ ;

/* 浮点：无指数、无十六进制；整数部分与小数部分均可省略（53. 与 .127 都合法） */
FLOAT_LITERAL : [0-9]+ '.' [0-9]*
              | '.' [0-9]+ ;

/* 字符串：单引号或双引号，不跨行。NDF 没有转义序列（语料 70 万个字符串中无
 * 反斜杠转义、无重复引号转义），因此 `"a\"b"` 不是合法写法。 */
STRING_LITERAL
    : '"'  ~["\r\n]*  '"'
    | '\'' ~['\r\n]*  '\''
    ;

/* ---- 6.4 运算符与分隔符 ---- */

LPAREN    : '(' ;
RPAREN    : ')' ;
LBRACK    : '[' ;
RBRACK    : ']' ;
LBRACE    : '{' ;            /* 只在 GUID 之外作为错误恢复锚点出现 */
RBRACE    : '}' ;

COMMA     : ',' ;
COLON     : ':' ;
SEMICOLON : ';' ;            /* 预留：语料中未使用 */

QUESTION  : '?' ;
ASSIGN    : '=' ;
EQ        : '==' ;
NEQ       : '!=' ;
LT        : '<' ;
LE        : '<=' ;
GT        : '>' ;
GE        : '>=' ;

PLUS      : '+' ;
MINUS     : '-' ;
STAR      : '*' ;
SLASH     : '/' ;            /* 命名空间/枚举路径分隔符，不是除法 */
PERCENT   : '%' ;
PIPE      : '|' ;
AMP       : '&' ;
BANG      : '!' ;
TILDE     : '~' ;            /* 相对引用前缀 ~/ */
DOLLAR    : '$' ;            /* 绝对引用前缀 $/ */
DOT       : '.' ;            /* 成员访问 obj.Value */

/* ---- 6.5 标识符 ---- */

IDENTIFIER    : [A-Za-z_] [A-Za-z0-9_]* ;

/* ---- 6.6 片段 ---- */

fragment HEX   : [0-9a-fA-F] ;
fragment HEX4  : HEX HEX HEX HEX ;
fragment HEX8  : HEX4 HEX4 ;
fragment HEX12 : HEX4 HEX4 HEX4 ;



