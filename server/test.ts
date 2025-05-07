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
import { Lexer, Processor } from "./src/lexer";
import * as fs from "fs";
import * as path from "path";
import { Analyser, Parser } from "./src/parser";
import { boolean } from "vscode-languageserver/lib/common/utils/is";
import { RadixTree } from "./src/utils";

//const src = fs.readFileSync(path.join(__dirname, "test.ndf"), "utf-8");
//const src = fs.readFileSync("E:\\codeSpace\\codeSet\\ndf\\warnoMod\\GameData\\Gameplay\\Constantes\\GDConstantes.ndf", "utf-8");

//const { scope, errors } = analyze(src);

//for (const error of errors)
//    console.log(error.message);

//console.log(scope.toJSON(true))

//const lexer = new Lexer(src);
//const tokens = new Processor(lexer.tokenize()).process();
//const parser = new Parser(tokens, undefined, false, true);
//const program = parser.parse();
//
//const anlyzer = new Analyser(program, undefined, true);
//
//const scope = anlyzer.analyze();
//
//for (const error of anlyzer.errors)
//    console.log(error.message);

//console.log(JSON.stringify(scope.toJSON(true)));
function testRadixTree() {
    const tree = new RadixTree<number>();
    tree.insert("apple", 1);
    tree.insert("app", 2);

    console.log(tree.search("app"));  // 应返回2

// 测试长字符串
    tree.insert("abcdefghijk", 3);
    tree.insert("abcdxyz", 4);
    console.log(tree.search("abcdefghijk"));  // 应返回3

// 测试删除合并
    tree.delete("app");
    console.log(tree.search("apple"));  // 应仍返回1
}

function test() {
    testRadixTree();
}

test();
