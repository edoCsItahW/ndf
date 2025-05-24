/*
 * Copyright (c) 2025. All rights reserved.
 * This source code is licensed under the CC BY-NC-SA
 * (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
 * This software is protected by copyright law. Reproduction, distribution, or use for commercial
 * purposes is prohibited without the author's permission. If you have any questions or require
 * permission, please contact the author: 2207150234@st.sziit.edu.cn
 */

/**
 * @file test.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/26 19:43
 * @desc
 * @copyrigh-t CC BY-NC-SA 2025. All rights reserved.
 * */
import { Lexer, Processor, TokenType } from "./src/lexer";
import * as fs from "fs";
import * as path from "path";
import { Analyser, Parser } from "./src/parser";
import { boolean } from "vscode-languageserver/lib/common/utils/is";
import { enumToStr, RadixTree } from "./src/utils";

const src = fs.readFileSync(path.join(__dirname, "test.ndf"), "utf-8");

const lexer = new Lexer(src);
const tokens = new Processor(lexer.tokenize()).process();
const parser = new Parser(tokens, undefined, false, true);
const program = parser.parse();

const analyser = new Analyser(program);
const scope = analyser.analyze();

//for (const token of tokens)
//    console.log(token.toString(), ", 下一个应为: ", token.state.inferNext?.map((t) => enumToStr(TokenType, t)).join(", "))

for (const error of analyser.errors)
    console.log(error.toString());
