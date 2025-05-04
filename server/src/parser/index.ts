// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn

/**
 * @file index.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 02:19
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */

import { Program } from "./ast";
import { NDFError } from "../expection";
import { Parser } from "./parser";
import { Analyser, Scope } from "./analysis";
import { tokenize } from "../lexer";

export * from './ast';
export * from './parser';
export * from './analysis';


export function parse(src: string): { ast: Program, errors: NDFError[] } {
    const { tokens, errors } = tokenize(src);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return { ast, errors: errors.concat(parser.errors) };
}

export function analyze(src: string): { scope: Scope, errors: NDFError[] } {
    const { ast, errors } = parse(src);

    const analyser = new Analyser(ast);
    const scope = analyser.analyze();
    return { scope, errors: errors.concat(analyser.errors) };
}