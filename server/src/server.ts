// src/server.ts

import {
	createConnection,
	CompletionItemKind,
	TextEdit,
	DocumentFormattingParams,
	Diagnostic,
	DiagnosticSeverity,
	TextDocuments,
	HandlerResult,
	DocumentDiagnosticReportKind
} from "vscode-languageserver/node";
import {
	CompletionItem,
	Connection,
	DidChangeConfigurationNotification,
	DidChangeConfigurationParams,
	DidChangeTextDocumentParams,
	DidChangeWatchedFilesParams,
	DocumentDiagnosticParams,
	DocumentDiagnosticReport,
	Hover,
	InitializeError,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	SignatureHelp,
	TextDocumentChangeEvent,
	TextDocumentPositionParams,
	TextDocumentSyncKind
} from "vscode-languageserver";
import {TextDocument} from "vscode-languageserver-textdocument";
import { Nullable, Settings } from "./types";
import { Token, Lexer, Processor } from "./lexer";
import { Parser, Analyser, Scope, InternalNode, LeafNode, Program, Visitor } from "./parser";
import { NDFError, NDFWarning } from './expection';
import { Hover as HoverHelper, LOCALE } from './IDEHelper';


const flags = {
	// @desc 客户端是否支持 `workspace/configuration` 请求？
	hasConfigurationCapability: false,
	// 客户端是否支持 `workspace/workspaceFolders` 请求？
	hasWorkspaceFolderCapability: false,
	// 客户端是否支持 `textDocument/publishDiagnostics` 的 `relatedInformation` 字段？
	hasDiagnosticRelatedInformationCapability: false
};


export class Server {
	private caches: {
		ast: Nullable<Program>,
		errors: NDFError[],
		scope: Nullable<Scope>
	} = {
		ast: undefined,
		errors: [],
		scope: undefined
	};

	// 全局设置，在客户端不支持 `workspace/configuration` 请求时使用。
	// 请注意，在使用此示例提供的客户端时，不会出现这种情况，
	// 但与其他客户端一起使用时可能会发生。
	private defaultSettings: Settings = {maxNumberOfProblems: 1000, language: "en-US", level: "loose"} as const;
	private globalSettings: Settings = this.defaultSettings;
	private uri: Nullable<string>;
	debug: boolean = false;

	// 缓存所有打开文档的设置
	private documentSettings = new Map<string, Thenable<Settings>>();

	// 创建服务器连接，使用 Node 的 IPC 作为传输方式。同时包括所有预览 / 提案的 LSP 功能。
	constructor(
		private conn: Connection = createConnection(ProposedFeatures.all),
		private documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
	) {
	}

	/**
	 * @desc 初始化服务器功能
	 */
	initialize(params: InitializeParams): HandlerResult<InitializeResult, InitializeError> {
		const capabilities = params.capabilities;

		// 客户端是否支持 `workspace/configuration` 请求？如果不支持，我们将使用全局配置。
		flags.hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
		flags.hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
		flags.hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);

		const res: InitializeResult = {
			capabilities: {
				hoverProvider: true, // 悬停提示
//				documentFormattingProvider: true, // 格式化文档
//				signatureHelpProvider: {
//					// 签名帮助
//					triggerCharacters: ["("]
//				},
//
//				textDocumentSync: TextDocumentSyncKind.Incremental, // 文本文档同步
//				completionProvider: {
//					// 代码完成
//					resolveProvider: true
//				},
				diagnosticProvider: {
					interFileDependencies: false, // 跨文件依赖
					workspaceDiagnostics: false // 工作区诊断
				}
			}
		};

		if (flags.hasWorkspaceFolderCapability)
			res.capabilities.workspace = {
				workspaceFolders: {supported: true}
			};

		return res;
	}

	/**
	 * @desc 注册配置更改和文件夹更改事件
	 */
	Initialized(): void {
		if (flags.hasConfigurationCapability) this.conn.client.register(DidChangeConfigurationNotification.type, undefined);
		if (flags.hasWorkspaceFolderCapability) this.conn.workspace.onDidChangeWorkspaceFolders(ev => {});
	}

	/**
	 * @method getDocSettings
	 * @summary 获取文档级设置
	 * @desc 文档级设置是指特定文档的配置，可以通过 `workspace/configuration` 请求获取。
	 * @remarks
	 * 如果客户端不支持 `workspace/configuration` 请求，则会使用全局配置。
	 * 如果已经缓存了文档级设置，则直接返回缓存的结果。
	 * 如果没有缓存，则会发送 `workspace/configuration` 请求获取文档级设置,并缓存结果。
	 * */
	private getDocSettings(res: string): Thenable<Settings> {
		if (!flags.hasConfigurationCapability)
			return Promise.resolve(this.globalSettings);

		let result = this.documentSettings.get(res);

		if (!result) {
			result = this.conn.workspace.getConfiguration({scopeUri: res, section: "ndf"});
			this.documentSettings.set(res, result);
		}

		return result;
	}

	/**
	 * @method digOpenDocument
	 * @summary 打开文档时处理
	 * @desc 打开文档时，我们会解析文档内容，并缓存解析结果。
	 * @param e 事件参数
	 * */
	private digOpenDocument(e: TextDocumentChangeEvent<TextDocument>) {
		this.uri = e.document.uri;

		this.getDocSettings(this.uri).then(settings => {
			this.globalSettings = settings;

			LOCALE.language = this.globalSettings.language || this.defaultSettings.language;

			this.parse(e.document.getText());
		});
	}

	/**
	 * @method digChangeTextDocument
	 * @summary 文档内容更改时处理
	 * @desc 文档内容更改时，我们会清空缓存。
	 * @param e 事件参数
	 * @remarks 用户输入后立即执行
	 * */
	digChangeTextDocument(e: DidChangeTextDocumentParams) {
		this.caches.scope = undefined;
		this.caches.errors = [];
	}

	/**
	 * @method digChangeContent
	 * @summary 文档内容更改时处理
	 * @desc 文档内容更改时，我们会解析文档内容，并缓存解析结果。
	 * @param e 事件参数
	 * @remarks 用户停止输入后500ms后执行
	 * */
	digChangeContent(e: TextDocumentChangeEvent<TextDocument>) {
		this.uri = e.document.uri;
		// e.document.languageId

		this.parse(e.document.getText());
	}

	didChangeConfiguration(change: DidChangeConfigurationParams): void {
		const getConfiguration = (): Thenable<Settings> => {
			if (flags.hasConfigurationCapability) {
				// 主动获取最新配置
				const result = this.conn.workspace.getConfiguration("ndf");
				this.documentSettings.set(this.uri!, result);
				return result;
			}

			else
				return change.settings?.ndf || this.defaultSettings;

		};

		// 异步处理配置更新
		getConfiguration().then(config => {
			this.globalSettings = config;
			LOCALE.language = config.language || this.defaultSettings.language;

			// 清除文档级缓存
			this.documentSettings.clear();

			if (this.uri)
				this.parse(this.documents.get(this.uri)!.getText());

			// 优化诊断刷新
			this.conn.languages.diagnostics.refresh();
		});
	}

	/**
	 * @desc 仅保留打开文档的设置
	 *
	 * @param e
	 * @returns
	 */
	digClose(e: TextDocumentChangeEvent<TextDocument>) {
		return this.documentSettings.delete(e.document.uri);
	}

	private parse(text: string): void {
		const lexer = new Lexer(text, LOCALE);

		const parser = new Parser(new Processor(lexer.tokenize()).process(false), LOCALE);

		this.caches.ast = parser.parse();

		const anlys = new Analyser(this.caches.ast!, LOCALE);

		this.caches.scope = anlys.analyze();

		this.caches.errors = [...lexer.errors, ...parser.errors, ...anlys.errors];
	}

	async validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
		// 在这个简单的示例中，我们会在每次验证运行时获取文档的设置。
		const settings = await this.getDocSettings(this.uri!);
		
		const diagnostics: Diagnostic[] = [];

		if (settings.level !== "ignore")
			for (const error of this.caches.errors)
				diagnostics.push({
					severity: error instanceof NDFWarning
						? (settings.level === "strict" ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information)
						: (settings.level === "strict" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning),
					range: {
						start: {line: error.start.line - 1, character: error.start.column - 1},
						end: {line: error.end.line - 1, character: error.end.column - 1}
					},
					message: error.message,
					source: LOCALE.t("server", "NSI1", false)
				});

		return diagnostics;
	}

	async diagnose(params: DocumentDiagnosticParams) {
		const document = this.documents.get(params.textDocument.uri);
		if (document !== undefined) return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await this.validateTextDocument(document)
		} satisfies DocumentDiagnosticReport;

		// 我们不知道该文档。我们可以尝试从磁盘读取它，
		// 或者我们不对它报告问题。
		return {kind: DocumentDiagnosticReportKind.Full, items: []} satisfies DocumentDiagnosticReport;
	}

	hover(params: TextDocumentPositionParams): Promise<Hover> {
		const {line, character} = params.position;

		let node: Nullable<LeafNode>;
		Visitor.visit(this.caches.ast!, (n: LeafNode | InternalNode) => {
			if (n instanceof LeafNode
				&& line === n.pos.line - 1
				&& n.pos.column - 1 <= character
				&& n.pos.column - 1 + n.value.length >= character
			) {
				node = n;
				return true;
			}
			return false;
		});

		const hover = new HoverHelper(this.caches.scope!, false);
		const hoverInfo = hover.handle(node);

		return Promise.resolve({
			contents: hoverInfo ? [
				{language: "markdown", value: hoverInfo}
			] : []
		});
	}

	docFormat(params: DocumentFormattingParams): Promise<TextEdit[]> {
		const {textDocument} = params;
		const doc = this.documents.get(textDocument.uri)!;
		const text = doc.getText();
		const pattern = /\b[A-Z]{3,}\b/g;
		let match;
		const res = [];
		// 查找连续大写字符串
		while ((match = pattern.exec(text))) {
			res.push({
				range: {
					start: doc.positionAt(match.index),
					end: doc.positionAt(match.index + match[0].length)
				},
				// 将大写字符串替换为 驼峰风格
				newText: match[0].replace(/(?<=[A-Z])[A-Z]+/, r => r.toLowerCase())
			});
		}

		return Promise.resolve(res);
	}

	signatureHelp(params: TextDocumentPositionParams): Promise<SignatureHelp> {
		return Promise.resolve({
			signatures: [
				{
					label: "Signature Demo",
					documentation: "帮助文档",
					parameters: [
						{
							label: "@p1 first param",
							documentation: "参数说明"
						}
					]
				}
			],
			activeSignature: 0,
			activeParameter: 0
		});
	}

	didChangeWatchedFiles(change: DidChangeWatchedFilesParams): void {
		// 在 VSCode 中监控的文件已更改
		change.changes.forEach(fileChange => {
			if (fileChange.type === 1) {
				// 文件被新增
				console.log(`文件 ${fileChange.uri} 被新增`);
			} else if (fileChange.type === 2) {
				// 文件被更改
				console.log(`文件 ${fileChange.uri} 被更改`);
			} else if (fileChange.type === 3) {
				// 文件被删除
				console.log(`文件 ${fileChange.uri} 被删除`);
			}
		});
	}

	completion(params: TextDocumentPositionParams): CompletionItem[] {
		// 传递的参数包含请求代码补全的文本文档中的位置信息。
		// 在此示例中，我们忽略此信息并且总是提供相同的代码补全项。
		return [
			{
				label: "example",  // 标签
				kind: CompletionItemKind.Text,  // 类型
				detail: "示例详情",  // 详细信息
				documentation: "示例文档",  // 文档
				sortText: "00001",  // 排序文本
				filterText: "example",  // 过滤文本
				insertText: "example",  // 插入文本
				insertTextFormat: 2,  // 插入文本格式
				preselect: true,  // 是否预选中
				data: {  // 自定义数据
					uri: "example://example/example"
				},
				tags: [  // 标签

				]
			}
		];
	}

	completionResolve(item: CompletionItem): CompletionItem {
		return item;
	}

	run() {
		console.log("NDF parser running");
		this.conn.onInitialize(params => this.initialize(params));
		this.conn.onInitialized(() => this.Initialized());
		this.conn.onDidChangeConfiguration(change => this.didChangeConfiguration(change));
		this.conn.languages.diagnostics.on(params => this.diagnose(params));
		this.conn.onHover(params => this.hover(params));
		this.conn.onDocumentFormatting(params => this.docFormat(params));
		this.conn.onSignatureHelp(params => this.signatureHelp(params));
		this.conn.onDidChangeWatchedFiles(change => this.didChangeWatchedFiles(change));
		this.conn.onCompletion(params => this.completion(params));
		this.conn.onCompletionResolve(item => this.completionResolve(item));
		this.conn.onDidChangeTextDocument(e => this.digChangeTextDocument(e));
		this.documents.onDidClose(e => this.digClose(e));
		this.documents.onDidChangeContent(e => this.digChangeContent(e));
		this.documents.onDidOpen(e => this.digOpenDocument(e))
		this.documents.listen(this.conn);
		this.conn.listen();
	}
}


const server = new Server();
server.debug = true;
server.run();
