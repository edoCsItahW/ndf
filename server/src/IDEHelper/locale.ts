// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file locale.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 00:04
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { ILocalePack, Language, Pending } from "../types";


export const locales: ILocalePack = {
    // N(NDF)
    // + (E(Error) | W(Warning) | I(Info))
    // + (L(Lexer) | P(Processor) | 2P(Parser) + A(Analysis))
    // + {Number}
    server: {
        NSI1: {
            "zh-CN": "NDF 解析器",
            "en-US": "NDF Parser"
        },
        NSE2: {
            "zh-CN": "无效的导入路径'{0}'",
            "en-US": "Invalid import path '{0}'"
        }
    },
    lexer: {
        NEL1: {
            "zh-CN": "无效的令牌",
            "en-US": "Invalid token"
        },
        NEL2: {
            "zh-CN": "无效的`引用`",
            "en-US": "Invalid `reference`"
        },
        NEL3: {
            "zh-CN": "无效的`运算符`",
            "en-US": "Invalid `operator`"
        }
    },
    processor: {},
    parser: {
        NE2P1: {
            "zh-CN": "期望'{0}'",
            "en-US": "'{0}' expected."
        },
        NE2P2: {
            "zh-CN": "期望`标识符`,但当前是'{0}'",
            "en-US": "`Identifier` expected, but found '{0}'."
        },
        NE2P3: {
            "zh-CN": "意外的'{0}'",
            "en-US": "Unexpected '{0}'"
        },
        NE2P4: {
            "zh-CN": "语法分析器内部错误,错误信息: {0}",
            "en-US": "Syntax analyzer internal error, error message: {0}"
        },
        NE2P5: {
            "zh-CN": "意外的`类型`令牌'{0}'",
            "en-US": "Unexpected `type` token '{0}'"
        },
        NE2P6: {
            "zh-CN": "意外的`表达式`起始令牌'{0}'",
            "en-US": "Unexpected `expression` starting token '{0}'"
        },
        NE2P7: {
            "zh-CN": "`GUID`格式错误,'{0}'不是有效的十六进制字符",
            "en-US": "Invalid `GUID` format, '{0}' is not a valid hexadecimal character"
        },
        NE2P8: {
            "zh-CN": "`对象成员`需要`类型注释`或`值`其中之一",
            "en-US": "`Object member` requires either a `type annotation` or a `value`"
        },
        NE2P9: {
            "zh-CN": "意外的`字面量`令牌'{0}'",
            "en-US": "Unexpected `literal` token '{0}'"
        },
        NE2P10: {
            "zh-CN": "期望'{0}',但当前是'{1}'",
            "en-US": "'{0}' expected, but found '{1}'"
        }
    },
    analysis: {
        NEA1: {
            "zh-CN": "不支持的`语句`类型'{0}'",
            "en-US": "Unsupported 'statement' type '{0}'"
        },
        NEA2: {
            "zh-CN": "类型'{0}'不能赋值给类型'{1}'",
            "en-US": "Type '{0}' is not assignable to type '{1}'"
        },
        NEA3: {
            "zh-CN": "重复的标识符'{0}'",
            "en-US": "Duplicate identifier '{0}'"
        },
        NWA4: {
            "zh-CN": "父模板几乎以'T'开头",
            "en-US": "Parent template almost starts with 'T'"
        },
        NEA5: {
            "zh-CN": "`匿名对象`不能在`局部作用域`内声明",
            "en-US": "`Anonymous object` cannot be declared in `local scope`"
        },
        NWA6: {
            "zh-CN": "未知的`蓝图`'{0}'",
            "en-US": "Unknown `blueprint` '{0}'"
        },
        NEA7: {
            "zh-CN": "'{0}'的类型不支持实例化",
            "en-US": "Type '{0}' does not support instantiation"
        },
        NEA8: {
            "zh-CN": "无法重新声明模板作用域`模板参数`'{0}'",
            "en-US": "Cannot redeclare template scope `template parameter` '{0}'"
        },
        NEA9: {
            "zh-CN": "模板'{0}'中的`模板参数`'{1}'的类型与模板'{2}'中的同一`模板参数`类型'{3}'不匹配",
            "en-US": "Type of `template parameter` '{1}' in template '{0}' does not match the same `template parameter` type '{3}' in template '{2}'"
        },
        NEA10: {
            "zh-CN": "无法重新声明原型作用域`成员`'{0}'",
            "en-US": "Cannot redeclare prototype scope `member` '{0}'"
        },
        NEA11: {
            "zh-CN": "`成员`'{0}'的类型与模板'{1}'中的同一`成员`类型'{2}'不匹配",
            "en-US": "Type of `member` '{0}' does not match the same `member` type '{2}' in template '{1}'"
        },
        NEA12: {
            "zh-CN": "不支持的`类型引用`类型'{0}'",
            "en-US": "Unsupported `type reference` type '{0}'"
        },
        NEA13: {
            "zh-CN": "未定义的`内置类型`'{0}'",
            "en-US": "Undefined `built-in type` '{0}'"
        },
        NEA14: {
            "zh-CN": "未定义的`表达式`类型'{0}',其无法被分析",
            "en-US": "Undefined `expression` type '{0}', which cannot be analyzed"
        },
        NEA15: {
            "zh-CN": "未知的`标识符`'{0}'",
            "en-US": "Unknown `identifier` '{0}'"
        },
        NEA16: {
            "zh-CN": "`条件表达式`的类型必须是`布尔值`,但当前是'{0}'",
            "en-US": "The type of `conditional expression` must be `boolean`, but found '{0}'"
        },
        NEA17: {
            "zh-CN": "`真值表达式`的类型'{0}'和`假值表达式`的类型'{1}'不匹配",
            "en-US": "The type of `true expression` '{0}' does not match the type of `false expression` '{1}'"
        },
        NEA18: {
            "zh-CN": "`模板参数`只能在`模板声明`中声明",
            "en-US": "`Template parameter` can only be declared in `template declaration`"
        },
        NEA19: {
            "zh-CN": "无法找到`模板参数`'{0}'",
            "en-US": "Cannot find `template parameter` '{0}'"
        },
        NEA20: {
            "zh-CN": "'{0}'类型的`索引签名`必须是类型'{1}',但当前是'{2}'",
            "en-US": "The type of the index signature of '{0}' must be '{1}', but found '{2}'"
        },
        NEA21: {
            "zh-CN": "类型'{0}'不支持`索引访问`",
            "en-US": "Type '{0}' does not support `index access`"
        },
        NEA22: {
            "zh-CN": "在类型'{0}'中无法找到`成员`'{1}'",
            "en-US": "Cannot find `member` '{1}' in type '{0}'"
        },
        NEA23: {
            "zh-CN": "类型'{0}'不支持`成员访问`",
            "en-US": "Type '{0}' does not support `member access`"
        },
        NEA24: {
            "zh-CN": "无法重新声明实例化`成员`'{0}'",
            "en-US": "Cannot redeclare instantiated `member` '{0}'"
        },
        NEA25: {
            "zh-CN": "由于无法找到`蓝图`而无法解析`成员`'{0}'",
            "en-US": "Cannot resolve `member` '{0}' because cannot find `blueprint`"
        },
        NEA26: {
            "zh-CN": "未定义的`字面量`类型'{0}',其无法被分析",
            "en-US": "Undefined `literal` type '{0}', which cannot be analyzed"
        },
        NEA27: {
            "zh-CN": "错误`表达式`'{0}'",
            "en-US": "Error `expression` '{0}'"
        },
        NEA28: {
            "zh-CN": "类型'{0}'不支持'{1}'",
            "en-US": "Type '{0}' does not support '{1}'"
        },
        NEA29: {
            "zh-CN": "未定义的`操作符`'{0}'",
            "en-US": "Undefining `operator` '{0}'"
        },
        NEA30: {
            "zh-CN": "存在不可参与运算的类型",
            "en-US": "There is an ineligible type"
        },
        NEA31: {
            "zh-CN": "符号'{0}'不能被应用于类型'{1}'和类型'{2}'",
            "en-US": "Operator '{0}' cannot be applied to type '{1}' and type '{2}'"
        },
        NEA32: {
            "zh-CN": "'{0}'类型不支持`取模运算`",
            "en-US": "Type '{0}' does not support `modulus operator`"
        },
        NEA33: {
            "zh-CN": "无法对`非变量`类型进行赋值",
            "en-US": "Cannot assign to a non-variable type"
        },
        NEA34: {
            "zh-CN": "类型'{0}'不支持`属性访问`",
            "en-US": "Type '{0}' does not support `property access`"
        },
        NEA35: {
            "zh-CN": "类型'{0}'中不存在`属性'{1}'",
            "en-US": "Property '{1}' does not exist on type '{0}'"
        },
        NEA36: {
            "zh-CN": "类型'{0}'的构造器的参数类型应为'{1}',但当前是'{2}'",
            "en-US": "The parameter type of the constructor of type '{0}' should be '{1}', but found '{2}'"
        }
    }
};


export class Locale {
    private static _instance: Locale;
    private _language: Language = "en-US";

    private constructor(private localePack: ILocalePack = locales) {
    }

    static initialize(localePack: ILocalePack = locales): Locale {
        if (!Locale._instance)
            Locale._instance = new Locale(localePack);
        return Locale._instance;
    }

    set language(language: Language) {
        this._language = language;
    }

    t(file: string, key: string, prefix: boolean, ...args: string[]): string;
    t(file: string, key: string, ...args: string[]): string;
    t(file: string, key: string, ...args: (boolean | string)[]): string {
        let prefix = true;
        if (args.length && typeof args[0] === "boolean") {
            prefix = args[0] as boolean;
            args = args.slice(1);
        }

        if (!this.localePack[file])
            console.warn(`Locale file ${file} not found`);

        const template = this.localePack[file]?.[key]?.[this._language] ?? key;
        return this.format(`${prefix ? `${key}: ` : ""}${template}`, args as string[]);
    }


    private format(template: string, args: string[]): string {
        return template.replace(/{(\d+)}/g, (match, index) => {
            return args[index] !== undefined ? args[index] : match;
        });
    }
}


export const LOCALE = Locale.initialize();
