// Copyright (c) 2025. All rights reserved.
// This source code is licensed under the CC BY-NC-SA
// (Creative Commons Attribution-NonCommercial-NoDerivatives) License, By Xiao Songtao.
// This software is protected by copyright law. Reproduction, distribution, or use for commercial
// purposes is prohibited without the author's permission. If you have any questions or require
// permission, please contact the author: 2207150234@st.sziit.edu.cn


/**
 * @file serverRebuild.ts
 * @author edocsitahw
 * @version 1.1
 * @date 2025/05/03 11:54
 * @desc
 * @copyright CC BY-NC-SA 2025. All rights reserved.
 * */
import {
    CompletionParams,
    Connection,
    DidChangeConfigurationNotification,
    DidChangeConfigurationParams,
    DocumentDiagnosticParams,
    DocumentDiagnosticReport,
    Hover,
    InitializedParams,
    InitializeError,
    InitializeParams,
    InitializeResult,
    ProposedFeatures,
    SemanticTokensParams,
    SemanticTokensPartialResult,
    TextDocumentChangeEvent,
    TextDocumentPositionParams,
    WorkspaceFolder,
    CompletionItem,
    CompletionItemKind,
    CodeActionParams,
    CodeAction,
    ExecuteCommandParams,
    CodeActionKind,
    WorkspaceEdit
} from "vscode-languageserver";
import {
    createConnection,
    DiagnosticSeverity,
    DocumentDiagnosticReportKind,
    HandlerResult,
    TextDocuments
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { cpus } from "node:os";
import { createHash } from "node:crypto";
import { Analyser, analyze, parse, InternalNode, LeafNode, Parser, Program, Scope, Symbol, Visitor } from "./parser";
import { CompletionKind, Language, Level, LowercaseAlphabet, Nullable, SymbolInfo } from "./types";
import {
    Hover as HoverHelper,
    LOCALE,
    GlobalBuilder,
    TokenLegend,
    TokenModifier,
    SemanticCollector, Completion
} from "./IDEHelper";
import { NDFError, NDFWarning } from "./expection";
import { Lexer, Processor, Token, TokenType } from "./lexer";
import { methodDebug } from "./debug";
import { enumToStr, RadixTree } from "./utils";
import { readdirSync } from "fs";


/**
 * @class Server
 * @summary vscode语言服务器类。
 * @classDesc 该类实现了vscode语言服务器的主要功能。
 * */
class Server {
    /**
     * @var documentsCaches
     * @summary 文档缓存。
     * @desc 该属性用于记录所有已打开的文档的缓存。
     * @private
     * @see DocCacheValue
     * */
    private documentsCaches: { [uri: string]: DocCacheValue } = {};

    /**
     * @var globalCaches
     * @summary 全局缓存。
     * @desc 该属性用于记录全局缓存。
     * @private
     * @see GlobalCache
     * */
    private globalCaches: GlobalCache;

    /**
     * @var settings
     * @summary 服务器设置。
     * @desc 该属性用于记录服务器设置。
     * @private
     * @see Settings
     * */
    private settings: Settings = DEFAULT_SETTINGS;

    private extName: string = "ndf";
    private prjRoot: string = "";
    private cacheDir: string = "";
    debug: boolean = false;

    /**
     * @constructor
     * @summary 构造函数。
     * @desc 该构造函数用于初始化服务器。
     * @param connection 服务器连接。
     * @param documents 文档管理器。
     * @see Connection
     * @see TextDocuments
     * */
    constructor(
        private readonly connection: Connection = createConnection(ProposedFeatures.all),
        private readonly documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
    ) {
        this.globalCaches = {
            symbols: {
                searched: new Map(),
                global: new Map()
            },
            uri: "",
            backSteps: [],
            progress: new Map(),
            flag: {
                searched: false,
                workspaceCfg: false
            }
        };
    }

    /**
     * @method run
     * @summary 运行服务器。
     * @desc 调度方法,用于启动服务器。
     * @remarks
     * 服务器启动时函数调用顺序:
     * 1. initialize()
     * 2. initialized()
     * 3. didOpen()
     * 4. didChangeContent()
     * 5. diagnostics()
     *
     * 切换文档时(首次打开该文档时)函数调用顺序:
     * 1. didOpen()
     * 2. didChangeContent()
     * 3. diagnostics()
     * */
    run() {
        console.log("NDF Language Server is running");

        // 初始化
        this.connection.onInitialize(this.initialize.bind(this));  // 初始化
        this.connection.onInitialized(this.initialized.bind(this));  // 初始化完成

        // 功能
        this.connection.onHover(this.hover.bind(this));  // 悬停提示
        this.connection.onCompletion(this.completion.bind(this));  // 代码完成
        this.connection.onCompletionResolve(this.completionResolve.bind(this));  // 代码完成解析
        // this.connection.onDocumentFormatting(this.formatting.bind(this))  // 格式化
        // this.connection.onSignatureHelp(this.signatureHelp.bind(this))  // 签名帮助
        this.connection.languages.semanticTokens.on(this.semanticTokens.bind(this));  // 语义令牌
        this.connection.onCodeAction(this.codeAction.bind(this));  // 代码操作
        this.connection.onExecuteCommand(this.executeCommand.bind(this));  // 执行命令

        // 事件监听
        // this.connection.onDidChangeWatchedFiles(this.watchedFilesChanged.bind(this))  // 文件监视器变更
        this.connection.onDidChangeConfiguration(this.configurationChanged.bind(this));  // 配置变更
        this.connection.onDidChangeTextDocument(this.textDocumentChanged.bind(this));  // 文档内容变更

        // 诊断
        this.connection.languages.diagnostics.on(this.diagnostics.bind(this));  // 文档诊断

        // 文档监听
        this.documents.onDidOpen(this.didOpen.bind(this));  // 文档打开
        this.documents.onDidChangeContent(this.didChangeContent.bind(this));  // 文档内容变更
        this.documents.onDidClose(this.didClose.bind(this));  // 文档关闭

        // 启动服务器
        this.documents.listen(this.connection);
        this.connection.listen();
    }

    /**
     * @method initialize
     * @summary 初始化服务器。
     * @desc 语言服务器的初始化处理器.
     * @callback
     * @param params 初始化参数。
     * @returns 初始化结果。
     * @remarks 由于大多数用户的配置都支持`workspace/configuration`和`workspace/workspaceFolders`所以不做判断.
     * @see InitializeParams
     * @see onInitialize
     * */
    @methodDebug(serverDebug)
    private initialize(params: InitializeParams): HandlerResult<InitializeResult, InitializeError> {
        const capabilities = params.capabilities;

        this.globalCaches.flag.workspaceCfg = !!capabilities.workspace?.configuration;

        const result: InitializeResult = {
            capabilities: {
                // 悬停提示: 支持
                hoverProvider: true,

                // 代码完成: 支持
                completionProvider: {
                    resolveProvider: true,
                    triggerCharacters: ["/", ":", " "]
                },

                // 文档诊断: 支持
                diagnosticProvider: {
                    interFileDependencies: false,  // 跨文件依赖
                    workspaceDiagnostics: false  // 工作区诊断
                },

                // 代码操作: 支持
                codeActionProvider: {
                    codeActionKinds: [CodeActionKind.QuickFix],
                    resolveProvider: false
                },

                // 执行命令: 支持
                executeCommandProvider: {
                    commands: ["ndf.autoSpawnImport"]
                },

                // 格式化: 暂不支持
                documentFormattingProvider: false,

                // 签名帮助: 暂不支持
                signatureHelpProvider: undefined,

                // 语义令牌: 支持
                semanticTokensProvider: {
                    legend: {
                        tokenTypes: Object.keys(TokenLegend).filter(k => isNaN(Number(k))),
//                        tokenModifiers: Object.keys(TokenModifier).filter(k => isNaN(Number(k)))
                        tokenModifiers: []
                    },
                    full: {
                        delta: false  // 增量更新
                    },
                    range: false  // 范围更新
                },

                // 文本文档同步: 暂不支持
                textDocumentSync: undefined
            }
        };

        if (this.globalCaches.flag.workspaceCfg)
            result.capabilities.workspace = { workspaceFolders: { supported: true } };

        LOCALE.language = this.settings.language;

        return result;
    }

    /**
     * @method initialized
     * @summary 初始化完成。
     * @desc 语言服务器初始化完成处理器。
     * @callback
     * @param params 初始化参数。
     * @remarks 由于大多数用户的配置都支持`workspace/configuration`和`workspace/workspaceFolders`所以不做判断.
     * @see InitializedParams
     * @see onInitialized
     * */
    @methodDebug(serverDebug)
    private async initialized(params: InitializedParams) {
        this.connection.client.register(DidChangeConfigurationNotification.type);  // 配置变更通知
        this.connection.workspace.onDidChangeWorkspaceFolders(e => {
        });  // 工作区文件夹变更通知

        if (this.globalCaches.flag.workspaceCfg)
            this.connection.workspace.getConfiguration(this.extName).then(cfg => {
                this.settings = { ...this.settings, ...cfg };
                LOCALE.language = this.settings.language;
            });

        // 获取项目根目录
        const workspaceFolders = await this.connection.workspace.getWorkspaceFolders();
        if (workspaceFolders)
            this.prjRoot = uriToPath(workspaceFolders[0].uri);
    }

    /**
     * @method configurationChanged
     * @summary 配置变更。
     * @desc 语言服务器配置变更处理器。
     * @callback
     * @param params 配置变更参数。
     * @see DidChangeConfigurationParams
     * @see onDidChangeConfiguration
     * */
    @methodDebug(serverDebug)
    private async configurationChanged(params: DidChangeConfigurationParams) {
        const change: Promise<Settings> | Settings = this.globalCaches.flag.workspaceCfg
            ? this.connection.workspace.getConfiguration(this.extName)  // 工作区配置
            : params.settings?.[this.extName] || {};  // 用户配置

        if (change) {
            this.settings = { ...this.settings, ...(change instanceof Promise ? await change : change) };

            // 手动跟新部分配置
            LOCALE.language = this.settings.language;

            this.documentsCaches[this.globalCaches.uri].hash = "";

            // 重新进行分析
            this.parse(this.documents.get(this.globalCaches.uri)!.getText());
        }
    }

    private textDocumentChanged() {
        console.log("textDocumentChanged");
    }

    /**
     * @method diagnostics
     * @summary 文档诊断。
     * @desc 文档诊断处理器。
     * @callback
     * @param params 文档诊断参数。
     * @returns 文档诊断结果。
     * @see DocumentDiagnosticParams
     * @see onDiagnostics
     * */
    @methodDebug(serverDebug)
    private async diagnostics(params: DocumentDiagnosticParams): Promise<DocumentDiagnosticReport> {
        const document = this.documents.get(params.textDocument.uri);

        if (document)  // 文档存在
            return {
                kind: "full",
                items: this.documentsCaches[params.textDocument.uri].errors.map(e => {
                    return {
                        severity: e instanceof NDFWarning
                            ? (this.settings.level === "strict" ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information)
                            : (this.settings.level === "strict" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning),
                        range: {
                            start: { line: e.start.line - 1, character: e.start.column - 1 },
                            end: { line: e.end.line - 1, character: e.end.column - 1 }
                        },
                        message: e.message,
                        source: LOCALE.t("server", "NSI1", false)
                    };
                })
            } satisfies DocumentDiagnosticReport;

        // 无法获取文档,则尝试从磁盘读取,亦或是不报告诊断
        return { kind: DocumentDiagnosticReportKind.Full, items: [] } satisfies DocumentDiagnosticReport;
    }

    /**
     * @method didOpen
     * @summary 文档打开。
     * @desc 文档打开处理器。
     * @callback
     * @param e 文档事件。
     * @see TextDocumentChangeEvent
     * @see onDidOpen
     * */
    @methodDebug(serverDebug)
    private async didOpen(e: TextDocumentChangeEvent<TextDocument>) {
        this.globalCaches.uri = e.document.uri;

        if (this.settings.globalSearch && !this.globalCaches.flag.searched) {
            this.globalCaches.flag.searched = true;
            this.buildGlobalSymbols();
        }

        this.documentsCaches[e.document.uri] = {
            tokens: [],
            ast: undefined,
            errors: [],
            scope: undefined,
            needImports: new Map(),
            imported: false,
            hash: ""
        };

        this.parse(e.document.getText());
    }

    /**
     * @method didChangeContent
     * @summary 文档内容变更。
     * @desc 文档内容变更处理器。
     * @callback
     * @param e 文档事件。
     * @see TextDocumentChangeEvent
     * @see onDidChangeContent
     * */
    @methodDebug(serverDebug)
    private didChangeContent(e: TextDocumentChangeEvent<TextDocument>) {
        this.globalCaches.uri = e.document.uri;

        this.parse(e.document.getText());
    }

    private didClose() {
    }

    /**
     * @method hover
     * @summary 悬停提示。
     * @desc 悬停提示处理器。
     * @callback
     * @param params 悬停提示参数。
     * @returns 悬停提示结果。
     * @see TextDocumentPositionParams
     * @see onHover
     * */
    @methodDebug(serverDebug)
    private async hover(params: TextDocumentPositionParams): Promise<Hover> {
        const { line, character } = params.position;

        let node: Nullable<LeafNode>;
        Visitor.visit(this.documentsCaches[params.textDocument.uri].ast!, (n: LeafNode | InternalNode) => {
            if (n instanceof LeafNode && line === n.pos.line - 1
                && character >= n.pos.column - 1 && character <= n.pos.column + n.value.length - 1) {
                node = n;
                return true;
            }
            return false;
        });

        const hover = new HoverHelper(this.documentsCaches[params.textDocument.uri].scope!, false);
        const info = hover.handle(node);

        return {
            contents: info ? [{ language: "markdown", value: info }] : []
        };
    }

    /**
     * @method semanticTokens
     * @summary 语义令牌。
     * @desc 语义令牌处理器。
     * @callback
     * @param params 语义令牌参数。
     * @returns 语义令牌结果。
     * @see SemanticTokensParams
     * @see onSemanticTokens
     * */
    @methodDebug(serverDebug)
    private semanticTokens(params: SemanticTokensParams): SemanticTokensPartialResult {
        const collector = new SemanticCollector(this.documentsCaches[params.textDocument.uri].ast!, false);

        return {
            data: collector.visit()
        };
    }

    /**
     * @method completion
     * @summary 代码完成。
     * @desc 代码完成处理器。
     * @callback
     * @param params 代码完成参数。
     * @returns 代码完成结果。
     * @see CompletionParams
     * @see onCompletion
     * */
    @methodDebug(serverDebug)
    private completion(params: CompletionParams): CompletionItem[] {
        const document = this.documents.get(params.textDocument.uri);
        if (!document)
            return [];

        const docCache = this.documentsCaches[params.textDocument.uri];
        if (!docCache || !docCache.scope || !docCache.ast)
            return [];

        const { line, character } = params.position;
        const code = document.getText();

        const completionHelper = new Completion(docCache.scope, docCache.tokens, true);
        const result = completionHelper.provide(code, { line: line + 1, column: character + 1 });

        return result.map(item => {
            return {
                label: item.label,
                kind: this.transKind(item.kind),
                detail: item.detail,
                documentation: item.documentation,
                sortText: item.sortText
            };
        });
    }

    /**
     * @method completionResolve
     * @summary 代码完成解析。
     * @desc 代码完成解析处理器。
     * @callback
     * @param item 代码完成项。
     * @returns 代码完成项。
     * @see CompletionItem
     * @see onCompletionResolve
     * */
    private completionResolve(item: CompletionItem): CompletionItem {
        return item;
    }

    /**
     * @method codeAction
     * @summary 代码操作。
     * @desc 代码操作处理器。
     * @callback
     * @param params 代码操作参数。
     * @returns 代码操作结果。
     * @see CodeActionParams
     * @see onCodeAction
     * */
    private codeAction(params: CodeActionParams): CodeAction[] {
//        console.log("codeAction, ", params);
        const codeActions: CodeAction[] = [];

        const current = Visitor.findToken(
            this.documentsCaches[params.textDocument.uri].tokens,
            { line: params.range.start.line + 1, column: params.range.start.character + 1 }
        );

        if (!current)
            return codeActions;

        const word = current.value.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "");

        for (const [name, values] of this.documentsCaches[params.textDocument.uri].needImports)
            if (values.includes(word)) {
                this.connection.sendNotification("ndf/needImport", true);
                codeActions.push({
                    title: LOCALE.t("server", "NSI6", false, name, word),
                    kind: CodeActionKind.QuickFix,
                    command: {
                        title: LOCALE.t("server", "NSI7", false),
                        command: "ndf.autoSpawnImport",
                        arguments: [name, word]
                    }
                });
            }

        return codeActions;
    }

    /**
     * @method executeCommand
     * @summary 执行命令。
     * @desc 执行命令处理器。
     * @callback
     * @param params 执行命令参数。
     * @returns 执行命令结果。
     * @see ExecuteCommandParams
     * @see onExecuteCommand
     * */
    private async executeCommand(params: ExecuteCommandParams) {
//        console.log("executeCommand, ", params);
        switch (params.command) {
            case "ndf.autoSpawnImport":
                const [file, word] = params.arguments!;

                const pattern = new RegExp(`\/\/\/\s*from\s+(["'])${file}\x01\s+import\s+([^,]+(?:,\\s*[^,]+)*)`);

                const match = this.documents.get(this.globalCaches.uri)!.getText().match(pattern);
                if (match) {
                    const [_, quote, _imports] = match;
                    const imports = _imports.split(",").map(i => i.trim()).filter(k => k.length);

                    if (imports.includes(word))
                        return;

                    const text = `/// from '${file}' import ${imports.join(", ")}, ${word}`;

                    const edit: WorkspaceEdit = {
                        changes: {
                            [this.globalCaches.uri]: [{
                                range: {
                                    start: { line: match.index!, character: 0 },
                                    end: { line: match.index! + 1, character: 0 }
                                },
                                newText: text
                            }]
                        }
                    };

                    await this.connection.workspace.applyEdit(edit);
                }
        }
    }

    /**
     * @method parse
     * @summary 解析文档。
     * @desc 该方法用于解析文档。
     * @param {string} code 文档内容。
     * @remarks
     * 此方法已经进行了诊断刷新。
     * @see Lexer
     * @see Processor
     * @see Parser
     * @see Analyser
     * */
    @methodDebug(serverDebug)
    private parse(code: string) {
        if (code.trim() === "")  // 空白文档
            return;

        const hash = createHash("md5").update(code).digest("hex");

        if (this.documentsCaches[this.globalCaches.uri].hash === hash)  // 文档内容未变更
            return;

        // 词法分析
        const lexer = new Lexer(code, LOCALE);
        this.documentsCaches[this.globalCaches.uri].tokens = new Processor(lexer.tokenize()).process();

        // 语法分析
        const parser = new Parser(this.documentsCaches[this.globalCaches.uri].tokens, LOCALE);
        this.documentsCaches[this.globalCaches.uri].ast = parser.parse();

        // 语义分析
        const anlyzer = new Analyser(this.documentsCaches[this.globalCaches.uri].ast!, LOCALE);
        if (this.settings.globalSearch)
            anlyzer.globalSymbolCallback = this.globalSymbolCB.bind(this);

        anlyzer.importSymbolCallback = this.importSymbolCB.bind(this);

        this.documentsCaches[this.globalCaches.uri].scope = anlyzer.analyze();

        this.documentsCaches[this.globalCaches.uri].errors = [...lexer.errors, ...parser.errors, ...anlyzer.errors];

        this.documentsCaches[this.globalCaches.uri].hash = hash;

        if (!this.documentsCaches[this.globalCaches.uri].imported && this.settings.autoSpawnImport)
            this.spawnImport(uriToPath(this.globalCaches.uri), this.documentsCaches[this.globalCaches.uri].needImports);

        this.connection.languages.diagnostics.refresh();
    }

    /**
     * @method globalSymbolCB
     * @summary 全局符号回调。
     * @desc 在{@link Analyser}进行全局符号搜索时调用。
     * @callback
     * @param name 符号名称。
     * @returns 符号对象。
     * @see Analyser.globalSymbolCallback
     * */
    @methodDebug(serverDebug)
    private globalSymbolCB(name: string): Nullable<Symbol> {
        if (this.globalCaches.backSteps.includes(name))   // 在逆推表中表示搜索失败
            return;

        if (this.globalCaches.symbols.searched.has(name))    // 已在搜索缓存中
            return this.globalCaches.symbols.searched.get(name)!;

        const prefix = name[0].toLowerCase() as LowercaseAlphabet;

        if (this.cacheDir && existsSync(this.cacheDir)) {  // 存在缓存文件,则尝试读取缓存
            const cacheFile = join(this.cacheDir, `${prefix}.json`);

            if (!this.globalCaches.symbols.global.has(prefix) && existsSync(cacheFile))
                this.globalCaches.symbols.global.set(
                    prefix, RadixTree.deserialize(readFileSync(join(this.cacheDir, `${prefix}.json`), "utf-8"))
                );

        }

        if (this.globalCaches.symbols.global.has(prefix)) {  // 全局缓存存在
            const result = this.globalCaches.symbols.global.get(prefix)!.search(name);
            const needImports = this.documentsCaches[this.globalCaches.uri].needImports;

            if (result) {
                const symbol = Symbol.fromJSON(result.info);

                this.globalCaches.symbols.searched.set(name, symbol);

                // 记录需要导入的符号
                if (needImports.has(result.file) && !needImports.get(result.file)!.includes(name))
                    needImports.get(result.file)!.push(name);

                else
                    needImports.set(result.file, [name]);

                return symbol;
            }
        }

        this.globalCaches.backSteps.push(name);  // 加入逆推表
    }

    /**
     * @method spawnImport
     * @summary 自动将找到的全局符号导入到文档中。
     * @desc 该方法用于自动将找到的全局符号导入到文档中。
     * @param {string} path 文档路径。
     * @param {Map<string, string[]>} needImports 需要导入的符号。
     * @see parse
     * */
    @methodDebug(serverDebug)
    private spawnImport(path: string, needImports: Map<string, string[]>) {
        const codes: string[] = [];
        needImports.forEach((names, file) => {
            // 如果符号就是当前文件中的,则不导入
            if (file === path)
                return;

            codes.push(`/// from '\\${relative(this.prjRoot, file)}' import ${names.join(", ")}\n`);
        });

        if (codes.length) {
            const code = codes.join("");

            const content = readFileSync(path, "utf-8");

            const newContent = code + content;

            writeFileSync(path, newContent);

            this.documentsCaches[this.globalCaches.uri].imported = true;
        }
    }

    /**
     * @method importSymbolCB
     * @summary 导入符号回调。
     * @desc 在{@link Analyser}进行导入符号搜索时调用。
     * @callback
     * @param {string[]} names 符号名称。
     * @param {string} [path] 导入路径。
     * @returns {Symbol[] | string} 符号对象数组,如果路径不正确则返回错误信息。
     * @see Analyser.importSymbolCallback
     * @remarks
     * 导入方式分为标准库导入和自定义导入,自定义导入又分为相对根目录导入,相对导入文件导入和绝对导入.
     * */
    @methodDebug(serverDebug)
    private importSymbolCB(names: string[], path?: string): Symbol[] | string {
        const symbols: Symbol[] = [];

        if (path) {  // 自定义导入
            let absPath: string;

            if (path.startsWith("."))
                absPath = resolve(uriToPath(this.globalCaches.uri), path);

            else if (path.startsWith("/") || path.startsWith("\\"))
                absPath = join(this.prjRoot, path.slice(1));

            else
                absPath = path;

            // 如果路径和当前文档路径一致,则需要删除(遗留问题)
            if (absPath === uriToPath(this.globalCaches.uri)) {
                const oldContent = readFileSync(uriToPath(this.globalCaches.uri), "utf-8");

                // 删除整行
                const pattern = new RegExp(`^\\s*///\\s*from\\s*['"]\\${relative(this.prjRoot, absPath)}['"]\\s*import\\s*(\\w+(?:,\\s*\\w+)*)\\s*$`, "m");

                const newContent = oldContent.replace(pattern, "");

                writeFileSync(uriToPath(this.globalCaches.uri), newContent);

                return [];
            }

            if (existsSync(absPath)) {
                const code = readFileSync(absPath, "utf-8");

                const { ast } = parse(code);

                const analyze = new Analyser(ast);
                analyze.importSymbolCallback = this.importSymbolCB.bind(this);
                analyze.globalSymbolCallback = this.globalSymbolCB.bind(this);

                const scope = analyze.analyze();

                names.forEach(name => {
                    const symbol = scope.resolve(name);

                    if (symbol)
                        symbols.push(symbol);
                });

                return symbols;
            }

            return LOCALE.t("server", "NSI2", path);
        } else {  // 标准库导入
            const lib = readFileSync(join(dirname(__dirname), "lib.d.ndf"), "utf8");

            const { scope } = analyze(lib);

            names.forEach(name => {
                const symbol = scope.resolve(name);

                if (symbol)
                    symbols.push(symbol);
            });

            return symbols;
        }
    }

    /**
     * @method buildGlobalSymbols
     * @summary 构建全局符号。
     * @desc 该方法用于构建全局符号。
     * */
    @methodDebug(serverDebug)
    private async buildGlobalSymbols() {
        const folders = await this.connection.workspace.getWorkspaceFolders();

        return this.withServerProgress(LOCALE.t("server", "NSI3", false), async ({ update, id }) => {

            if (!folders)
                return;

            for (const folder of folders) {
                if (WorkspaceFolder.is(folder)) {
                    const folderPath = uriToPath(folder.uri);

                    const gb = new GlobalBuilder(folderPath, {
                        processNum: this.settings.processNumber ? this.settings.processNumber : DEFAULT_SETTINGS.processNumber,
                        threadNum: this.settings.threadNumber ? this.settings.threadNumber : DEFAULT_SETTINGS.threadNumber,
                        asyncNum: this.settings.asyncWorkerNumber ? this.settings.asyncWorkerNumber : DEFAULT_SETTINGS.asyncWorkerNumber
                    });

                    await update(50, LOCALE.t("server", "NSI4", false));

                    this.cacheDir = gb.cacheDir;

                    await new Promise<void>((res, rej) => gb.build(() => {
                        update(100, LOCALE.t("server", "NSI5", false));

                        res();

                        this.documentsCaches[this.globalCaches.uri].hash = "";

                        this.globalCaches.symbols.global.clear();
                        this.globalCaches.backSteps = [];

                        readdirSync(this.cacheDir).forEach(file => {
                            if (file.endsWith(".json") && basename(file).replace(extname(file), "").length === 32)
                                gb.sucessCB()
                        });

                        this.parse(this.documents.get(this.globalCaches.uri)!.getText());

                    }));
                }
            }
        });
    }

    /**
     * @method withServerProgress
     * @summary 服务器进度条。
     * @desc 一个辅助方法，用于帮助{@link buildGlobalSymbols}创建服务器进度条。
     * @typeParam T - 任务返回值。
     * @param {string} title 进度条标题。
     * @param {function} taskCB 任务回调。
     * @returns {Promise<T>} 任务结果。
     * @see buildGlobalSymbols
     * */
    private async withServerProgress<T>(
        title: string,
        taskCB: (progress: {
            update: (percentage: number, message?: string) => Promise<void>;
            id: string
        }) => Promise<T>
    ): Promise<T> {
        const {
            type,
            data: id
        } = await this.connection.sendRequest<PrgNotify.StartResp>("progress/start", { type: "start", data: title });

        this.globalCaches.progress.set(id, true);

        try {
            const result = await taskCB({
                id, update: async (percentage, msg) => {
                    if (this.globalCaches.progress.get(id))
                        await this.connection.sendRequest("progress/update", {
                            type: "update",
                            data: { id, message: msg, percentage }
                        });
                }
            });

            await this.connection.sendRequest("progress/end", { type: "end", data: id });

            return result;
        } catch (e) {
            if (this.globalCaches.progress.get(id))
                await this.connection.sendRequest("progress/end", { type: "end", data: id });

            throw e;
        } finally {
            this.globalCaches.progress.delete(id);
        }
    }

    /**
     * @method transKind
     * @summary 转换符号种类。
     * @desc 一个辅助方法，在{@link completion}中用于将{@link CompletionKind}转换为{@link CompletionItemKind}。
     * @param {CompletionKind} kind 符号种类。
     * @returns {CompletionItemKind} 转换后的符号种类。
     * @see CompletionKind
     * @see CompletionItemKind
     * */
    private transKind(kind: CompletionKind): CompletionItemKind {
        switch (kind) {
            case CompletionKind.Variable:
                return CompletionItemKind.Variable;
            case CompletionKind.Template:
                return CompletionItemKind.Class;
            case CompletionKind.Keyword:
                return CompletionKind.Keyword;
            case CompletionKind.Field:
                return CompletionItemKind.Field;
            default:
                return CompletionItemKind.Text;
        }
    }
}


function uriToPath(uri: string): string {
    return uri.replace("file:///", "").replace("%3A", ":");
}


/**
 * @interface DocCacheValue
 * @summary 文档缓存值。
 * @desc 该接口用于描述文档缓存值。
 * @property {Token[]} tokens 文档的词法分析结果。
 * @property {Program} ast 文档的语法分析结果。
 * @property {NDFError[]} errors 文档的诊断结果。
 * @property {Scope} scope 文档的语义分析结果。
 * @property {string} hash 文档的哈希值。
 * */
interface DocCacheValue {
    tokens: Token[];
    ast: Nullable<Program>;
    errors: NDFError[];
    scope: Nullable<Scope>;
    needImports: Map<string, string[]>;
    imported: boolean;
    hash: string;
}


/**
 * @interface GlobalCache
 * @summary 全局缓存。
 * @desc 该接口用于描述全局缓存。
 * @property {Map<string, Symbol>} symbols 全局符号缓存。
 * @property {string} uri 当前文档的URI。
 * @property {string[]} backSteps 逆推表。
 * @property {{ searched: boolean, workspaceCfg: boolean }} flag 全局缓存标志。
 * */
interface GlobalCache {
    /**
     * @var symbols
     * @summary 全局符号缓存。
     * @desc 该属性用于记录全局符号缓存。
     * @property {Map<string, Symbol>} searched 已搜索的符号。
     * @property {Map<string, RadixTree<SymbolInfo>>} global 全局符号缓存。
     * @see RadixTree
     * @see SymbolInfo
     * */
    symbols: {
        searched: Map<string, Symbol>;
        global: Map<LowercaseAlphabet, RadixTree<SymbolInfo>>;
    };
    uri: string;
    backSteps: string[];
    progress: Map<string, boolean>;
    /**
     * @var flag
     * @summary 全局缓存标志。
     * @desc 该属性用于记录全局缓存标志。
     * @property {boolean} searched 已搜索标志。
     * @property {boolean} workspaceCfg 工作区配置标志。
     * */
    flag: {
        searched: boolean;
        workspaceCfg: boolean;
    };
}


/**
 * @interface Settings
 * @summary 服务器设置。
 * @desc 该接口用于描述服务器设置。
 * @property {number} maxNumberOfProblems 最大诊断数量。
 * @property {Language} language 语言。
 * @property {Level} level 严格模式。
 * @property {boolean} globalSearch 全局搜索。
 * */
export interface Settings {
    maxNumberOfProblems: number;
    language: Language;
    level: Level;
    globalSearch: boolean;
    processNumber: number;
    threadNumber: number;
    asyncWorkerNumber: number;
    autoSpawnImport: boolean;
}


export namespace PrgNotify {
    interface DataProtocol {
        type: string;
        data?: any;
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


    export type ProgressRequ = StartRequ | UpdateRequ | EndRequ;
    export type ProgressResp = StartResp;
}


function serverDebug(obj: Server, fnName: string) {
    if (obj.debug)
        console.log(`[Server] ${fnName}`);
}


const DEFAULT_SETTINGS: Settings = {
    maxNumberOfProblems: 100,
    language: "en-US",
    level: "loose",
    globalSearch: true,
    processNumber: 3,
    threadNumber: cpus().length / 2,
    asyncWorkerNumber: 10,
    autoSpawnImport: true
};


new Server().run();
