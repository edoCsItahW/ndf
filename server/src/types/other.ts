// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file other.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/04/25 00:14
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */


/** @interface IError
 * @description 错误信息对象
 * @property {string} func - 函数名
 * @property {string} file - 文件名
 * @property {string} line - 行号
 * */
export interface IError {
    func: string;
    file: string;
    line: string;
}

export interface IPos {
    line: number;
    column: number;
}

export type Nullable<T> = T | undefined;

export type Optional<T> = T | undefined;

export enum BaseType {
    INT,
    FLOAT,
    STRING,
    BOOLEAN,
    NIL,
    VECTOR,
    MAP,
    PAIR,
    OBJECT,
    TEMPLATE,
    GENERIC,
    GUID,
    UNNEEDED,
    UNKNOW,
    ANY,
    ERROR
}


export interface IType {
    name?: string;
    type: BaseType;
}
