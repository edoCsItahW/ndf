// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn
//

/**
 * @file IDE.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 20:48
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
export type Language = "en-US" | "zh-CN";

export type Level = "strict" | "loose" | "ignore";

export type PartialLocalet = (key: string, ...args: string[]) => string;

export interface ILocalePack {
    [file: string]: {
        [id: string]: {
            [lang in Language]: string;
        }
    }
}

export interface Pending {
    file: string;
    id: string;
    lang: Language;
}

export interface Settings {
    maxNumberOfProblems: number;
    language: Language;
    level: Level;
}
