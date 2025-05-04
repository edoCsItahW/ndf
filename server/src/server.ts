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
    Connection,
    DidChangeConfigurationNotification,
    DidChangeConfigurationParams,
    DocumentDiagnosticParams, DocumentDiagnosticReport, Hover,
    InitializedParams,
    InitializeError,
    InitializeParams,
    InitializeResult,
    ProposedFeatures, TextDocumentChangeEvent, TextDocumentPositionParams, WorkspaceFolder
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
import { join, resolve, relative, dirname } from "node:path";
import { cpus } from "node:os";
import { createHash } from "node:crypto";
import { Analyser, analyze, InternalNode, LeafNode, Parser, Program, Scope, Symbol, Visitor } from "./parser";
import { IGlobalCache, Language, Level, Nullable } from "./types";
import { Hover as HoverHelper, LOCALE } from "./IDEHelper";
import { GlobalBuilder } from "./IDEHelper/globalBuild";
import { NDFError, NDFWarning } from "./expection";
import { Lexer, Processor, Token } from "./lexer";
import { methodDebug } from "./debug";


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
    private cacheFile: Nullable<string>;
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
                global: {}
            },
            uri: "",
            backSteps: [],
            flag: {
                searched: false,
                workspaceCfg: false
            }
        };
    }

    /**
     * @method run
     * @summary 运行服务器。
     * @desc 该方法用于运行服务器。
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
        // this.connection.onCompletion(this.completion.bind(this));  // 代码完成
        // this.connection.onCompletionResolve(this.completionResolve.bind(this))  // 代码完成解析
        // this.connection.onDocumentFormatting(this.formatting.bind(this))  // 格式化
        // this.connection.onSignatureHelp(this.signatureHelp.bind(this))  // 签名帮助

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

                // 代码完成: 暂不支持
                completionProvider: {
                    resolveProvider: false
                },

                // 文档诊断: 支持
                diagnosticProvider: {
                    interFileDependencies: false,  // 跨文件依赖
                    workspaceDiagnostics: false  // 工作区诊断
                },

                // 格式化: 暂不支持
                documentFormattingProvider: false,

                // 签名帮助: 暂不支持
                signatureHelpProvider: undefined,

                // 语义令牌: 暂不支持
                semanticTokensProvider: undefined,

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

        const hover = new HoverHelper(this.documentsCaches[params.textDocument.uri].scope!);
        const info = hover.handle(node);

        return {
            contents: info ? [{ language: "markdown", value: info }] : []
        };
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
        if (this.globalCaches.backSteps.includes(name))  // 在逆推表中表示搜索失败
            return;

        if (this.globalCaches.symbols.searched.has(name))  // 已在搜索缓存中
            return this.globalCaches.symbols.searched.get(name)!;

        if (this.cacheFile && existsSync(this.cacheFile))  // 存在缓存文件,则尝试读取缓存
            this.globalCaches.symbols.global = JSON.parse(readFileSync(this.cacheFile, "utf-8"));

        if (this.globalCaches.symbols.global)  // 全局缓存存在
            for (const [file, value] of Object.entries(this.globalCaches.symbols.global))
                if (value.symbols.hasOwnProperty(name)) {
                    const symbol = Symbol.fromJSON(value.symbols[name]);

                    this.globalCaches.symbols.searched.set(name, symbol);

                    // 记录需要导入的符号
                    if (
                        this.documentsCaches[this.globalCaches.uri].needImports.has(file)
                        && !this.documentsCaches[this.globalCaches.uri].needImports.get(file)!.includes(name)
                    )
                        this.documentsCaches[this.globalCaches.uri].needImports.get(file)!.push(name);
                    else
                        this.documentsCaches[this.globalCaches.uri].needImports.set(file, [name]);

                    return symbol;
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
        needImports.forEach((names, file) => codes.push(`/// from '\\${relative(this.prjRoot, file)}' import ${names.join(", ")}\n`));

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

            if (existsSync(absPath)) {
                const code = readFileSync(absPath, "utf-8");

                const { scope } = analyze(code);

                names.forEach(name => {
                    const symbol = scope.resolve(name);

                    if (symbol)
                        symbols.push(symbol);
                });

                return symbols;
            }

            return LOCALE.t("server", "NSI2", path);
        } else {  // 标准库导入
            const lib = readFileSync(join(dirname(__dirname), 'lib.d.ndf'), "utf8");

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

        folders?.forEach(folder => {
            if (WorkspaceFolder.is(folder)) {
                const folderPath = uriToPath(folder.uri);

                const gb = new GlobalBuilder(folderPath, {
                    processNum: this.settings.processNumber,
                    threadNum: this.settings.threadNumber,
                    asyncNum: this.settings.asyncWorkerNumber
                });

                this.cacheFile = gb.cacheFile;

                gb.build(() => {
                    if (existsSync(this.cacheFile!))  // 缓存文件存在,则尝试读取缓存
                        this.globalCaches.symbols.global = JSON.parse(readFileSync(this.cacheFile!, "utf-8"));

                    this.documentsCaches[this.globalCaches.uri].hash = "";

                    // 重新进行分析
                    this.parse(this.documents.get(this.globalCaches.uri)!.getText());
                });
            }
        });
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
     * @property {Map<string, IFileCache>} global 全局符号缓存。
     * */
    symbols: {
        searched: Map<string, Symbol>;
        global: IGlobalCache;
    };
    uri: string;
    backSteps: string[];
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
