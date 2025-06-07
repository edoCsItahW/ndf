grammar NDF;

Program: Statement* EOF;

Statement: Assignment | TemplateDef | UnnameObj | Comment;

Assignment: ('private' | 'export' | 'public')? Identifier 'is' Expression;

TemplateDef: ('private')? 'template' Identifier Divider* ParameterBlock Divider* 'is' Divider* Identifier Divider* MemberBlock;

UnnameObj: 'unnamed' Identifier Divider* ObjectCall;

ParameterBlock: '[' ParameterDecl (',' ParameterDecl)* | Empty ']';

MemberBlock: '(' Divider* MemberAssign* ')';

ParameterDecl: Divider* Identifier (Annotation | DefaultValue)? Divider*;

MemberAssign: Identifier ('=' | 'is') Divider* Expression Divider*;

Annotation: ':' TypeRef;

DefaultValue: '=' Expression;

TypeRef: BuiltinType | Identifier | GenericType;

BuiltinType: 'int' | 'float' | 'bool' | 'string';

GenericType: (Identifier | 'MAP') Divider* '<' TypeRef (',' TypeRef)* '>';

/* 表达式分层结构 */
Expression: Divider* TernaryExpr Divider*;

TernaryExpr: LogicalOrExpr (Divider* '?' Divider* Expression Divider* ':' Divider* TernaryExpr)?;

LogicalOrExpr: LogicalAndExpr (Divider* '|' Divider* LogicalAndExpr)*;

LogicalAndExpr: EqualityExpr (Divider* '&' Divider* EqualityExpr)*;

EqualityExpr: RelationalExpr (Divider* ('==' | '!=') Divider* RelationalExpr)*;

RelationalExpr:
	AdditiveExpr (Divider* ('<' | '>' | '<=' | '>=') Divider* AdditiveExpr)*;

AdditiveExpr:
	MultiplicativeExpr (Divider* ('+' | '-') Divider* MultiplicativeExpr)*;

MultiplicativeExpr:
    /* UnaryExpr | BinaryExpr */
	UnaryExpr (Divider* ('*' | 'div' | '%') Divider* UnaryExpr)*;

UnaryExpr: ('-' | '!')? PostfixExpr;

PostfixExpr: PrimaryExpr (ObjectCall | IndexAccess | MemberAccess)?;

ObjectCall: '(' Divider* Argument* ')';

IndexAccess: '[' Expression ']';

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

ParenthesisExpr: '(' Divider* Expression Divider* ')';

TemplateParam: '<' Identifier '>';

MapDef: 'MAP' Divider* '[' Pair (',' Pair)* ']';

VectorDef: '[' (Expression (',' Expression)* | Empty) ']';

TypeConstructor:
	Identifier Divider* '[' (Expression (',' Expression)* | Empty) ']';

GuidCall:
	'GUID' ':' '{' Divider* Uuid Divider* '}';

Reference: ('$' | '~' | '.') '/' Identifier;

Pair: '(' Divider* Expression Divider* ',' Divider* Expression Divider* ')';

Uuid: HexDigit {8} '-' HexDigit {4} '-' HexDigit {4} '-' HexDigit {4} '-' HexDigit {12};

/* 词法规则 */
Identifier: (Letter | '_') (Letter | '_' | Digit)*;

Divider: Newline | Comment;

Literal: Integer | Float | Boolean | String | Nil;

Integer: Digit+;
Float: Digit+ '.' Digit+;
Boolean: 'true' | 'false';
String: '"' (~["] | '""')* '"';
Nil: 'nil';

Empty: ;

Argument: ('exprot' | 'public')? Identifier (Annotation | ('=' | 'is') Expression) Divider*;

HexDigit: [0-9a-fA-F];
Letter: [a-zA-Z];
Digit: [0-9];

Newline: '\r'? '\n';
WS: [ \t]+;
Comment: '//' (~[\r\n])* Newline | '/*' .*? '*/' Newline | '(*' .*? '*)' Newline;
