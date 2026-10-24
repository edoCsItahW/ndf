// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//


/**
 * @file processor.ts
 * @author edocsitahw
 * @version 2.0
 * @date 2025/04/17 17:47
 * @desc 令牌后处理器
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 *
 * @remarks
 * v1 的 `Processor` 承担了两件事：把标识符按关键字表分类、把相邻的单字符运算符合并成
 * `<=`/`>=`/`==`/`!=`。v2 把这两件事都下沉到了 {@link Lexer}：
 * - 关键字分类改成只看"硬关键字"，软关键字保持 `IDENTIFIER`；
 * - 双字符运算符由词法器直接匹配，不再依赖"两个符号的列号相邻"这种脆弱判断。
 *
 * 因此本类保留下来只是为了让 `tokenize()` 与外部调用点（如 `server.ts`）保持不变，
 * 逻辑上是一层恒等变换；后续可以直接删除。
 * */
import { Token } from "./token";


export class Processor {
    constructor(private tokens: Token[]) {
    }

    process(): Token[] {
        return this.tokens;
    }
}
