/*
 * Copyright (c) 2025. All rights reserved.
 * This source code is licensed under the CC BY-NC-SA
 * (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
 * This software is protected by copyright law. Reproduction, distribution, or use for commercial
 * purposes is prohibited without the author's permission. If you have any questions or require
 * permission, please contact the author: 2207150234@st.sziit.edu.cn
 *
 */

/**
 * @file index.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 02:18
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */

import { Lexer } from "./lexer";
import { Token } from "./token";
import { NDFError } from "../expection";
import { Processor } from "./processor";

export * from './token';
export * from './lexer';
export * from './processor';


export function tokenize(src: string): { tokens: Token[], errors: NDFError[] } {
    const lexer = new Lexer(src);
    const tokens = new Processor(lexer.tokenize()).process();
    return { tokens, errors: lexer.errors };
}


