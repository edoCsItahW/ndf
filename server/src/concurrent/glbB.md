```mermaid
    sequenceDiagram
        participant MP as Main Process
        participant SP as Sub Process(Main Thread)
        participant ST as Sub Thread
        
        autonumber
        
        ST ->> SP: task: tid
        
        SP ->> MP: task: tid
        
        MP ->> SP: task: { tid, task }
        
        SP ->> ST: task: task
        
        create participant Process as process()
        
        ST ->> Process: task: task
        
            create participant Processor as processor()
            
            Process ->> Processor: task: task
            
            Processor ->> ST: result: result
            
                create participant Next as next()
                
                Next ->> ST: 
                
                Process ->> Next: call
                
                destroy Next
                
            destroy Processor
        
        destroy Process
        
    participant A as Async Worker(processFile) 
```