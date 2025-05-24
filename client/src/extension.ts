// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file extension.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/05/22 16:02
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import { join } from "path";
import { commands, Disposable, ExtensionContext, languages, ProgressLocation, window, workspace } from "vscode";
import { ProgDetail, ProgRequEnd, ProgRequStart, ProgRequUpdate, ProgRespStart } from "./types";


class Extension {
    private readonly serverOpt: ServerOptions;
    private readonly clientOpt: LanguageClientOptions;
    private readonly client: LanguageClient;
    private readonly progressMap = new Map<string, ProgDetail>();

    constructor(
        private readonly module: string = join("server", "out", "server.js"),
        private context: ExtensionContext
    ) {
        this.module = this.context.asAbsolutePath(this.module);
        this.serverOpt = {
            run: { module: this.module, transport: TransportKind.ipc },
            debug: { module: this.module, transport: TransportKind.ipc }
        };
        this.clientOpt = {
            documentSelector: [{ scheme: "file", language: "ndf" }],
            synchronize: { fileEvents: workspace.createFileSystemWatcher("**/*.ndf") }
        };
        this.client = new LanguageClient("ndf", "NDF Language Server", this.serverOpt, this.clientOpt);
    }

    private async progressStart(params: ProgRequStart): Promise<ProgRespStart> {
        const id = Date.now().toString();

        let resolve: () => void;
        let reject: (reason?: any) => void;
        const promise = new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        window.withProgress({
            location: ProgressLocation.Notification,
            title: params.data,
            cancellable: true
        }, (progress, token) => {
            this.progressMap.set(id, { progress, resolve, reject });

            return promise;
        });

        return { type: "start", data: id };
    }

    private progressUpdate(params: ProgRequUpdate) {
        const detail = this.progressMap.get(params.data.id);
        if (detail)
            detail.progress.report({ message: params.data.msg, increment: params.data.percentage });
    }

    private progressEnd(params: ProgRequEnd) {
        const detail = this.progressMap.get(params.data);
        if (detail) {
            detail.resolve();
            this.progressMap.delete(params.data);
        }
    }

    private needImport(params: boolean) {
        commands.executeCommand("setContext", 'ndf.needImport', params);
    }

    stop() {
        if (this.client)
            this.client.stop();
    }

    run() {
        this.client.onRequest("progress/start", this.progressStart.bind(this));
        this.client.onRequest("progress/update", this.progressUpdate.bind(this));
        this.client.onRequest("progress/end", this.progressEnd.bind(this));
        this.client.onNotification("ndf/needImport", this.needImport.bind(this));
        this.client.start();
    }
}


let extension: Extension;

export async function activate(context: ExtensionContext) {
    extension = new Extension(join("server", "out", "server.js"), context);
    extension.run();
}

export async function deactivate() {
    if (extension)
        extension.stop();
}
