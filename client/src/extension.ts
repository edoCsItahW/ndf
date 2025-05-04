/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';


let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// 服务器使用 Node.js 实现
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	// 如果扩展在调试模式下启动，则使用调试服务器选项
    // 否则使用运行选项
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// 控制语言客户端的选项
	const clientOptions: LanguageClientOptions = {
		// 为纯文本文件注册服务器
		documentSelector: [{ scheme: 'file', language: 'ndf' }],
		synchronize: {
			// 通知服务器工作区中 `.clientrc` 文件的变化事件
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// 创建语言客户端并启动客户端
	client = new LanguageClient(
		'Language Server Sample',
		serverOptions,
		clientOptions
	);

	// 启动客户端。这将同时启动服务器
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) 
		return undefined;
	
	return client.stop();
}
