/**
 * Kyrin Framework - Basic HTTP Server
 */


interface ServerOptions {
    port?: number;
    hostname?: string;
    debug?: boolean;
}       

export class KyrinServer {
    private options:ServerOptions;

    constructor(options:ServerOptions={}) {
        this.options = {
            port:options.port || 3000,
            hostname:options.hostname || "localhost",
            debug:options.debug || false
        }
    }

    //ฟังก์ชันสำหรับเริ่มรัน Server
    public start(){
        const server = Bun.serve({
            port:this.options.port,
            hostname:this.options.hostname,
            development:this.options.debug,

            //ฟังก์ชันจัดการ Request ที่เข้ามา
            fetch:async (req)=>{
                //log ข้อมูลเมื่อมีการเรียกเข้ามา (กรณีเปิด debug เป็น true)
               if(this.options.debug){
                console.log(`[${req.method} ${req.url}]`)
               }

            // --- Routing แบบง่าย
            const url = new URL(req.url)
            // น่าจะเป็นส่วนที่ต้อง optimize ในอนาคต //////

            if(url.pathname==='/' && req.method==='GET'){
                return new Response("Hello World")
            }

            if(url.pathname==='/json' && req.method==='GET'){
                return new Response(JSON.stringify({message:"Hello World"}),{
                    headers:{
                        "Content-Type":"application/json"
                    }
                })
            }
            return new Response("Not Found",{
                status:404
            })
            },
            //จัดการ Error กรณี Server พัง
            error:async (err)=>{
                console.error(err)
                return new Response("Internal Server Error",{
                    status:500
                })
            }
        })
        console.log(`Kyrin Server running at http://${this.options.hostname}:${this.options.port}`)
        return server
    }
}


