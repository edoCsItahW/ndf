// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn

import { Progress } from "vscode";


/**
 * @file types.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/05/22 17:45
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
interface DataProtocol {
    type: string;
    data: any;
}

export interface ProgRequStart extends DataProtocol {
    type: "start";
    data: string;
}

export interface ProgRequUpdate extends DataProtocol {
    type: "update";
    data: {
        id: string;
        msg?: string;
        percentage?: number;
    };
}

export interface ProgRequEnd extends DataProtocol {
    type: "end";
}

export type ProgRequ = ProgRequStart | ProgRequUpdate | ProgRequEnd;

export interface ProgRespStart extends DataProtocol {
    type: "start";
    data: string;
}

export type ProgResp = ProgRespStart;

export interface ProgDetail {
    progress: Progress<{ message?: string; increment?: number }>;
    resolve: () => void;
    reject: (reason?: any) => void;
}
