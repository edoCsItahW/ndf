grammar NDF;

Program: Statement* EOF;

Statement: Assignment | TemplateDef | UnnameObj | Comment;

Assignment: ('private' | 'export' | 'public')? Identifier 'is' Expression;

TemplateDef: ('private')? 'template' Identifier (Newline | Comment)* ParameterBlock (Newline | Comment)* 'is' Newline* Identifier (Newline | Comment)* MemberBlock;

UnnameObj: 'unnamed' Identifier (Newline | Comment)* ArgumentBlock;

ParameterBlock: '[' ParameterDecl (',' ParameterDecl)* | Empty ']';

MemberBlock: '(' MemberAssign* ')';

ParameterDecl: Identifier Annotation? DefaultValue?;

MemberAssign: Identifier ('=' | 'is') (Newline | Comment)* Expression;

Annotation: ':' TypeRef;

DefaultValue: '=' Expression;

TypeRef: BuiltinType | Identifier | GenericType;

BuiltinType: 'int' | 'float' | 'bool' | 'string';

GenericType: (Identifier | 'MAP') (Newline | Comment)* '<' (Newline | Comment)* TypeRef ((Newline | Comment)* ',' (Newline | Comment)* TypeRef)* (Newline | Comment)* '>';

/* 表达式分层结构 */
Expression: TernaryExpr;

TernaryExpr: LogicalOrExpr ((Newline | Comment)* '?' (Newline | Comment)* Expression (Newline | Comment)* ':' (Newline | Comment)* TernaryExpr)?;

LogicalOrExpr: LogicalAndExpr ((Newline | Comment)* '|' (Newline | Comment)* LogicalAndExpr)*;

LogicalAndExpr: EqualityExpr ((Newline | Comment)* '&' (Newline | Comment)* EqualityExpr)*;

EqualityExpr: RelationalExpr ((Newline | Comment)* ('==' | '!=') (Newline | Comment)* RelationalExpr)*;

RelationalExpr:
	AdditiveExpr ((Newline | Comment)* ('<' | '>' | '<=' | '>=') (Newline | Comment)* AdditiveExpr)*;

AdditiveExpr:
	MultiplicativeExpr ((Newline | Comment)* ('+' | '-') (Newline | Comment)* MultiplicativeExpr)*;

MultiplicativeExpr:
    /* UnaryExpr | BinaryExpr */
	UnaryExpr ((Newline | Comment)* ('*' | 'div' | '%') (Newline | Comment)* UnaryExpr)*;

UnaryExpr: ('-' | '!') (UnaryExpr | PostfixExpr);

PostfixExpr: PrimaryExpr (ObjectCall | IndexAccess | MemberAccess)*;

ObjectCall: Identifier (Newline | Comment)* ArgumentBlock;

IndexAccess: '[' (Newline | Comment)* Expression (Newline | Comment)* ']';

MemberAccess: '/' Identifier;


PrimaryExpr:
	Literal
	| Identifier
	| Reference
	| GuidCall
	| ParenthesisExpr
	| TemplateParam
	| MapDef
	| VectorDef
	| TypeConstructor
	| PropertyAssignExpr
	;

PropertyAssignExpr: ('private')? Identifier 'is' Expression;

ParenthesisExpr: '(' (Newline | Comment)* Expression (Newline | Comment)* ')';

TemplateParam: '<' (Newline | Comment)* Identifier (Newline | Comment)* '>';

MapDef: 'MAP' (Newline | Comment)* '[' (Newline | Comment)* Pair ((Newline | Comment)* ',' (Newline | Comment)* Pair)* (Newline | Comment)* ']';

VectorDef: '[' (Newline | Comment)* (Expression ((Newline | Comment)* ',' (Newline | Comment)* Expression)* | Empty) (Newline | Comment)* ']';

TypeConstructor:
	Identifier (Newline | Comment)* '[' (Newline | Comment)* (Expression ((Newline | Comment)* ',' (Newline | Comment)* Expression)* | Empty) (Newline | Comment)* ']';

GuidCall:
	'GUID' ':' '{' (Newline | Comment)* Uuid (Newline | Comment)* '}';

Reference: ('$' | '~' | '.') '/' Identifier ('/' Identifier)*;

Pair: '(' (Newline | Comment)* Expression (Newline | Comment)* ',' (Newline | Comment)* Expression (Newline | Comment)* ')';

Uuid: HexDigit {8} '-' HexDigit {4} '-' HexDigit {4} '-' HexDigit {4} '-' HexDigit {12};

/* 词法规则 */
Identifier: (Letter | '_') (Letter | '_' | Digit)*;

Literal: Integer | Float | Boolean | String | Nil;

Integer: Digit+;
Float: Digit+ '.' Digit+;
Boolean: 'true' | 'false';
String: '"' (~["] | '""')* '"';
Nil: 'nil';

Empty: ;

ArgumentBlock: '(' (Newline | Comment)* Argument* (Newline | Comment)* ')';

Argument: ('exprot' | 'public')? Identifier (Annotation | ('=' | 'is') Expression);

HexDigit: [0-9a-fA-F];
Letter: [a-zA-Z];
Digit: [0-9];

Newline: '\r'? '\n';
WS: [ \t]+;
Comment: '//' (~[\r\n])* Newline | '/*' .*? '*/' Newline | '(*' .*? '*)' Newline;
