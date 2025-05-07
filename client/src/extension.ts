/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import { ExtensionContext, Progress, ProgressLocation, window, workspace } from "vscode";

import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import { RequestType } from "vscode-languageclient";


let client: LanguageClient;

// RequestType<P, R, E> 用于定义请求的类型，其中 P 表示请求参数的类型，R 表示响应结果的类型，E 表示错误的类型。
export namespace PrgNotify {
    interface DataProtocol {
        type: string;
        data: any;
    }


    export interface StartRequ extends DataProtocol {
        type: "start";
        data: string;
    }


    export interface StartResp extends DataProtocol {
        type: "start";
        data: string;
    }


    export interface UpdateRequ extends DataProtocol {
        type: "update";
        data: {
            id: string;
            message?: string;
            percentage?: number;
        };
    }


    export interface EndRequ extends DataProtocol {
        type: "end";
    }


    type ProgressRequ = StartRequ | UpdateRequ | EndRequ;
    type ProgressResp = StartResp;


    export const type = new RequestType<ProgressRequ, ProgressResp | void, void>("progress/notify");
}

export async function activate(context: ExtensionContext) {
    // 服务器使用 Node.js 实现
    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "server.js")
    );

    // 如果扩展在调试模式下启动，则使用调试服务器选项
    // 否则使用运行选项
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc
        }
    };

    // 控制语言客户端的选项
    const clientOptions: LanguageClientOptions = {
        // 为纯文本文件注册服务器
        documentSelector: [{ scheme: "file", language: "ndf" }],
        synchronize: {
            // 通知服务器工作区中 `.clientrc` 文件的变化事件
            fileEvents: workspace.createFileSystemWatcher("**/.clientrc")
        }
    };

    // 创建语言客户端并启动客户端
    client = new LanguageClient(
        "ndf",
        serverOptions,
        clientOptions
    );

    progressManager = new ProgressManager();

    client.onRequest('progress/start', async (params: PrgNotify.StartRequ) => {
        return await progressManager.createProgress(params.data);
    });

    client.onRequest('progress/update', (params: PrgNotify.UpdateRequ) => {
        progressManager.updateProgress(params.data);
    });

    client.onRequest('progress/end', (params: PrgNotify.EndRequ) => {
        progressManager.endProgress(params.data);
    });


    // 启动客户端。这将同时启动服务器
    client.start();
}


export function deactivate(): Thenable<void> | undefined {
    if (!client)
        return undefined;

    return client.stop();
}
// 新增进度管理器类
class ProgressManager {
    private progressMap = new Map<
        string,
        {
            progress: Progress<{ message?: string; increment?: number }>;
            resolve: () => void;
            reject: (reason?: any) => void;
        }
    >();

    async createProgress(title: string): Promise<PrgNotify.StartResp> {
        const id = Date.now().toString();

        // 使用 Deferred Promise 控制生命周期
        let resolve: () => void;
        let reject: (reason?: any) => void;
        const promise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        window.withProgress({  // 不要等待这个进度条完成,而是立即返回一个 promise,否则服务器会收不到
            location: ProgressLocation.Notification,
            title,
            cancellable: true
        }, (progress, token) => {
            // 存储进度控制句柄
            this.progressMap.set(id, { progress, resolve: resolve!, reject: reject! });

            token.onCancellationRequested(() => {
                this.sendCancelToServer(id);
                this.cleanupProgress(id);
            });

            return promise;
        });

        return { type: "start", data: id };
    }

    updateProgress(data: PrgNotify.UpdateRequ["data"]) {
        const entry = this.progressMap.get(data.id);
        if (entry) {
            entry.progress.report({ message: data.message, increment: data.percentage });
        }
    }

    endProgress(id: string) {
        const entry = this.progressMap.get(id);
        if (entry) {
            entry.resolve();
            this.cleanupProgress(id);
        }
    }

    private cleanupProgress(id: string) {
        this.progressMap.delete(id);
    }

    private sendCancelToServer(id: string) {
        // 通知服务端取消操作
        client.sendNotification('progress/cancel', { id });
    }
}

// 在激活函数中初始化
let progressManager: ProgressManager;

