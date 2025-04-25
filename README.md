# NDF

NDF language is a scripting language used to describe game data. 

NDF语言是一种用于描述游戏数据的脚本语言。


## Features(特点)

Currently, the NDF language has completed its lexical analysis, syntax analysis, semantic analysis, and partial IDE support, representing a milestone progress.

目前,NDF语言已经完成了它的词法分析、语法分析、语义分析、IDE支持(部分)等重要轮子。这是一个里程碑式的进展。

   1. Support for syntax highlighting(支持语法高亮)。
      ![syntax highlighting](/static/highlight.png)

   2. Support for syntax error reporting(支持语法错误提示)。
      ![error reporting](/static/report.png)

   3. Support for hover tooltips(支持悬停提示)。
      ![hover tooltips](/static/hover.png)

   4. Localized Language Support(本地化语言支持)
      ![localized language support](/static/locale.png)

   5. Error Message Severity Level Setting(错误提示等级设置)
      ![level setting](/static/level.png)

> [!NOTE]
> The ndf here does not refer to the ndf file in the SQL file, they are not the same thing.  
> 这里的ndf并非指SQL文件中的ndf文件,它们不是同一个东西。


## Requirements(依赖)

There is currently no requirement, but if necessary, you may need a game that uses that language  

暂时没有依赖,如果非要说有的话,你可能需要一款使用该语言的游戏


## Extension Settings(扩展设置)

There is nothing for the time being.

暂无


## Known Issues(已知问题)

There are currently no known issues.

暂无已知问题


## Todo(待办事项)

- Parser(解析器)
    - [ ] Support type validation for special constructor functions(支持特殊构造函数的类型验证)
    - [ ] Support finding references across all files in the workspace(支持在工作区的所有文件中查找引用)
    - [ ] Support reverse inference of internal type interfaces(支持逆向推导内部类型接口)
    
- IDE
    - [ ] Add auto-completion functionality(添加自动补全功能)
    - [ ] Add code formatting functionality(添加格式化代码功能)


## Release Notes(发布说明)

This is the release note for version 2.0.3. Compared to the previous version, the improvements in this version are focused on the NDF language parser.

Corpus testing has been conducted on the parser, but it is still impossible to guarantee that there are no issues, as Eugen System has not disclosed the complete grammar and semantics of NDF.
Therefore, this parser can only infinitely approach a true NDF interpreter/compiler but is not equivalent to it. Moving forward, more effort will be dedicated to IDE (VS Code) support.

这是版本2.0.3的发布说明。对比上一个版本该版本的开放时间都在NDF的语言分析器上。
同时已经对分析器进行了语料测试,但是依然无法保证完全没有问题,因为Eugen System没有公布NDF的完整语法和语义。
所以该分析器只能无限的接近真正的NDF解释/编译器,但不等于它。并且接下来会将更多精力放在IDE(VS Code)的支持上。


---
