// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file hover.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/22 05:54
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import {
    Argument,
    Assignment,
    AST,
    Identifier,
    MemberAssign,
    ParameterDecl, Reference,
    TemplateDef,
    UnnamedObj
} from "../parser/ast";
import {Nullable, Optional} from "../types";
import {ObjectType, Scope, TemplateType, typeToStr} from "../parser/analysis";


export class Hover {
    constructor(private scope: Scope, public debug: boolean = false) {
    }

    private assignment(node: Assignment): string {
        let type = node.name.type;
        const symbol = this.scope.resolve(node.name.value);
        if (symbol)
            type = symbol.type;
        return `${node.modifier ? `${node.modifier} ` : ''}${node.name.value}: ${typeToStr(type)}`;
    }

    private templateDef(node: TemplateDef): string {
        return `${node.modifier ? `${node.modifier} ` : ''}template ${node.name.value} is ${node.extend.value}`;
    }

    private parameterDecl(node: ParameterDecl): string {
        let type = node.name.type;
        if (!node.annotation) {
            const templateSymbol = this.scope.resolve(node.belong.name.value);

            if (templateSymbol?.type instanceof TemplateType) {
                const paramType = templateSymbol.type.params.get(node.name.value);
                if (paramType)
                    type = paramType;
            }
        }
        return `@${node.belong.name.value}\n${node.name.value}: ${node.annotation?.toString() || typeToStr(type)}`;
    }

    private memberAssign(node: MemberAssign): string {
        let type = node.name.type;
        const templateSymbol = this.scope.resolve(node.belong.name.value);

        if (templateSymbol?.type instanceof TemplateType) {
            const symbol = templateSymbol.type.prototypeScope!.lookup(node.name.value);
            if (symbol)
                type = symbol.type;
        }
        return `@${node.belong.name.value}\n${node.name.value}: ${typeToStr(type)}`;
    }

    private argument(node: Argument): string {
        let type = node.name.type;
        if (!node.annotation) {
            const blueprintSymbol = this.scope.resolve(node.belong.blueprint.value);

            if (blueprintSymbol?.type instanceof TemplateType || blueprintSymbol?.type instanceof ObjectType) {  // 实例化自模
                const symbol = blueprintSymbol.type.prototypeScope!.lookup(node.name.value);

                if (symbol)
                    type = symbol.type;
            }
        }

        return `${node.belong instanceof UnnamedObj ? 'unnamed\n' : ''}${node.modifier ? `${node.modifier} ` : ''} ${node.name.value}: ${node.annotation?.toString() || typeToStr(type)}`;
    }

    handle(node: Optional<AST>): Nullable<string> {
        if (this.debug)
            console.log(node);

        if (node instanceof Identifier) {
            if (node.belong instanceof TemplateDef)  // 悬停于模板名
                return this.templateDef(node.belong);

            else if (node.belong instanceof MemberAssign)  // 悬停于成员名
                return this.memberAssign(node.belong);

            else if (node.belong instanceof ParameterDecl)  // 悬停于参数名
                return this.parameterDecl(node.belong);

            else if (node.belong instanceof Argument)  // 悬停于参数名
                return this.argument(node.belong);

            else if (node.belong instanceof Assignment)
                return this.assignment(node.belong);

            else {
                const symbol = this.scope.resolve(node.value);
                if (symbol)
                    return `${node.value}: ${typeToStr(symbol.type)}`;
                else
                    return `${node.value}: ${typeToStr(node.type)}`;
            }
        }

        else if (node instanceof Reference)
            return `${node.path}: ${typeToStr(node.type)}`;
    }
}
